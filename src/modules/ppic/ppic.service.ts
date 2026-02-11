/**
 * PPIC Service - Advanced Bulk Purchase Order Import Service
 * Handles large-scale data imports with intelligent mapping and error recovery
 */

import prisma from "../../config/postgres";
import { AppError, ERROR_CODES } from "../../common/utils/errorMessages";
import { v4 as uuidv4 } from "uuid";
import {
  FuzzyMatcher,
  DataNormalizer,
  SchemaMapper,
  MappingBuilder,
} from "./ppic.parser";
import { PPICRow, PPICBatchResponse } from "./ppic.validation";
import {
  createAuditAction,
  addActionToLog,
  getAuditLog,
} from "../../common/utils/auditLog";

export interface ImportRow {
  rowIndex: number;
  data: Record<string, any>;
  errors: Array<{ field: string; message: string; severity: "error" | "warning" }>;
  status: "success" | "error" | "warning";
  poId?: string;
}

export interface BatchImportOptions {
  mappingStrategy?: Record<string, string>;
  autoDetectMapping?: boolean;
  skipOnError?: boolean;
  updateIfExists?: boolean;
  batchSize?: number;
  concurrency?: number;
}

export class PPICService {
  /**
   * Parse sheet data (Excel, CSV, JSON)
   */
  static parseSheetData(
    buffer: Buffer,
    fileType: "xlsx" | "csv" | "json"
  ): { headers: string[]; rows: Record<string, any>[] } {
    try {
      if (fileType === "json") {
        const data = JSON.parse(buffer.toString());
        const rows = Array.isArray(data) ? data : data.data || [];
        const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
        return { headers, rows };
      }

      if (fileType === "csv") {
        const lines = buffer.toString().split("\n").filter(line => line.trim());
        const headers = lines[0].split(",").map((h) => h.trim());
        const rows = lines.slice(1).map((line) => {
          const values = line.split(",").map((v) => v.trim());
          const row: Record<string, any> = {};
          headers.forEach((header, i) => {
            row[header] = values[i] !== undefined && values[i] !== '' ? values[i] : null;
          });
          return row;
        });
        return { headers, rows };
      }

      if (fileType === "xlsx") {
        // Using xlsx library
        // NOTE: Make sure 'xlsx' is installed: npm install xlsx
        try {
          const XLSX = require("xlsx");
          const workbook = XLSX.read(buffer, { type: "buffer" });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json(worksheet);
          const headers = Object.keys(data[0] || {});
          return { headers, rows: data };
        } catch (err) {
          throw new Error(`Failed to parse XLSX: ${(err as Error).message}`);
        }
      }

      throw new Error(`Unsupported file type: ${fileType}`);
    } catch (err) {
      throw new AppError(
        `Failed to parse sheet data: ${(err as Error).message}`
      );
    }
  }

  /**
   * Auto-detect field mapping from sheet headers
   */
  static detectFieldMapping(headers: string[]): Record<string, string> {
    return MappingBuilder.buildMapping(headers);
  }

  /**
   * Validate and parse a single row
   * NOTE: Validation is lenient - accepts partial/incomplete data
   */
  static validateRow(
    rowData: Record<string, any>,
    mapping: Record<string, string>,
    rowIndex: number
  ): ImportRow {
    const row: ImportRow = {
      rowIndex,
      data: {},
      errors: [],
      status: "success",
    };

    const { data, errors } = SchemaMapper.mapAndValidate(rowData, mapping);

    row.data = data;
    row.errors = errors.map((e) => ({
      ...e,
      severity: "error" as const,
    }));

    // NOTE: No critical field validation - accept any data present
    // Users can fill in missing fields later
    if (row.errors.length > 0) {
      row.status = "warning"; // Only warning, not error
    }

    return row;
  }

  /**
   * Batch create purchase orders with transaction support
   * NOTE: Processes all rows including warning rows (lenient import)
   * IMPORTANT: Only saves fields present in the sheet header, leaves others null
   */
  static async createPurchaseOrders(
    rows: ImportRow[],
    options: BatchImportOptions = {},
    sheetHeaders: string[] = []
  ): Promise<{
    successful: ImportRow[];
    failed: ImportRow[];
    batchId: string;
  }> {
    const batchId = uuidv4();
    const successful: ImportRow[] = [];
    const failed: ImportRow[] = [];

    // Process all rows (even warning rows) - only skip error rows if explicitly requested
    const rowsToProcess = options.skipOnError
      ? rows.filter((r) => r.status !== "error")
      : rows;

    // Process in batches (without prisma transactions - use sequential processing)
    const batchSize = options.batchSize || 50;
    for (let i = 0; i < rowsToProcess.length; i += batchSize) {
      const batch = rowsToProcess.slice(i, i + batchSize);

      try {
        // Process sequentially instead of transaction
        const results = await Promise.all(
          batch.map((row) =>
            this.createSinglePurchaseOrder(row, options, sheetHeaders)
          )
        );

        results.forEach((result, idx) => {
          if (result.success) {
            batch[idx].poId = result.poId;
            batch[idx].status = "success";
            successful.push(batch[idx]);
          } else {
            batch[idx].errors = [
              ...batch[idx].errors,
              {
                field: "general",
                message: result.error || "",
                severity: "error",
              },
            ];
            batch[idx].status = "error";
            failed.push(batch[idx]);
          }
        });
      } catch (err) {
        // Batch processing failed - mark all rows as failed
        batch.forEach((row) => {
          row.errors = [
            ...row.errors,
            {
              field: "transaction",
              message: `Batch processing failed: ${(err as Error).message}`,
              severity: "error",
            },
          ];
          row.status = "error";
          failed.push(row);
        });
      }
    }

    return { successful, failed, batchId };
  }

  /**
   * Create a single purchase order (for use in transactions)
   * NOTE: Only saves fields present in the sheet header, leaves others null
   * Does NOT generate poNo or batchNo - saves exact data from sheet
   */
private static async createSinglePurchaseOrder(
  row: ImportRow,
  options: BatchImportOptions,
  sheetHeaders: string[] = []
): Promise<{ success: boolean; poId?: string; error?: string }> {
  try {
    if (row.status === "error") {
      return { success: false, error: "Row has validation errors" };
    }

    const data = row.data as any;

    // Link customer if gstNo exists
    let customerId = null;
    if (data.gstNo) {
      const customer = await prisma.customer.findUnique({
        where: { gstrNo: data.gstNo },
      });
      if (customer) customerId = customer.id;
    }

    // Sanitize data - only keep fields present in sheet headers
    const createData: any = this.sanitizeData(data, sheetHeaders);

    if (customerId) createData.customerId = customerId;
    if (data.gstNo) createData.gstNo = data.gstNo;

    // Create audit log
    const ppicCreateAction = createAuditAction({
      actionType: "PPIC_CREATE",
      performedBy: { name: "PPIC System", department: "PPIC" },
      description: `Purchase Order created via PPIC bulk import - Row #${row.rowIndex}`,
    });

    createData.timestamp = JSON.stringify(addActionToLog(null, ppicCreateAction));

    // Save PO
    const newPO = await prisma.purchaseOrder.create({ data: createData });

    return { success: true, poId: newPO.id };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}



  /**
   * Sanitize data for database insertion
   * IMPORTANT: Only keeps fields that exist in the PurchaseOrder schema
   * Unknown sheet fields are stored in rawImportedData JSON field
   * Preserves exact values as they appear in the sheet
   */
  private static sanitizeData(data: Record<string, any>, sheetHeaders: string[] = []): Record<string, any> {
    // Valid fields in PurchaseOrder schema
    const validFields = new Set([
      "id", "gstNo", "customerId", "poNo", "poDate", "dispatchDate", "brandName",
      "partyName", "batchNo", "paymentTerms", "invCha", "cylChar", "orderThrough",
      "address", "composition", "notes", "rmStatus", "poQty", "poRate", "amount",
      "mrp", "section", "specialRequirements", "tabletCapsuleDrySyrupBottle",
      "roundOvalTablet", "tabletColour", "aluAluBlisterStripBottle", "packStyle",
      "productNewOld", "qaObservations", "batchQty", "expiry", "pvcColourBase",
      "foil", "lotNo", "foilPoDate", "foilSize", "foilPoVendor", "foilBillDate",
      "foilQuantity", "cartonPoDate", "cartonPoVendor", "cartonBillDate",
      "cartonQuantity", "packingDate", "qtyPacked", "noOfShippers", "design",
      "overallStatus", "invoiceNo", "invoiceDate", "changePart", "cyc", "advance",
      "showStatus", "mdApproval", "accountsApproval", "designerApproval",
      "ppicApproval", "designerActions", "accountBills", "salesComments",
      "poDisputes", "foilQuantityOrdered", "cartonQuantityOrdered",
      "dispatchStatus", "productionStatus", "timestamp", "createdAt", "updatedAt", "rawImportedData"
    ]);

    // Fields to skip (S. NO., empty columns, etc.)
    const skipFields = new Set(["S. NO.", "__EMPTY_1", "__EMPTY"]);

    const sanitized: Record<string, any> = {};
    const unmappedData: Record<string, any> = {};

    // Process each field in the data
    for (const [key, value] of Object.entries(data)) {
      // Skip null/undefined/empty
      if (value === null || value === undefined || value === '') continue;

      // Skip unnecessary fields
      if (skipFields.has(key)) continue;

      // Check if field exists in PurchaseOrder schema
      if (validFields.has(key)) {
        // Valid field - add to sanitized output
        if (key === "timestamp") {
          // timestamp is already processed, skip it
          continue;
        }
        if (key === "expiry" && (value !== null && value !== undefined)) {
          const norm = String(value)
            .trim()
            .replace(/([A-Za-z]+)?\s*(\d+)\s*([A-Za-z]+)?/g, "$1 $2 $3")
            .replace(/\s+/g, " ")
            .trim();

          const match = norm.match(/(\d+)\s*(year|years|yr|yrs|month|months|mo|mos|day|days|d)/i);
          if (match) {
            const num = parseInt(match[1], 10);
            const unit = match[2].toLowerCase();

            let baseDate: Date;
            if (data && data.packingDate) baseDate = new Date(String(data.packingDate));
            else if (data && data.poDate) baseDate = new Date(String(data.poDate));
            else baseDate = new Date();
            if (isNaN(baseDate.getTime())) baseDate = new Date();

            const expiryDate = new Date(baseDate);
            if (unit.startsWith("year") || unit.startsWith("yr")) {
              expiryDate.setFullYear(expiryDate.getFullYear() + num);
            } else if (unit.startsWith("month") || unit.startsWith("mo")) {
              expiryDate.setMonth(expiryDate.getMonth() + num);
            } else {
              expiryDate.setDate(expiryDate.getDate() + num);
            }

            sanitized[key] = expiryDate;
          } else {
            sanitized[key] = norm;
          }
        } else {
          sanitized[key] = value;
        }
      } else {
        // Unknown field - store in unmappedData for rawImportedData
        unmappedData[key] = value;
      }
    }

    // Store any unmapped fields in rawImportedData JSON field
    if (Object.keys(unmappedData).length > 0) {
      sanitized.rawImportedData = unmappedData;
    }

    return sanitized;
  }

  /**
   * Main bulk import orchestration
   */
  static async bulkImport(
    buffer: Buffer,
    fileType: "xlsx" | "csv" | "json",
    options: BatchImportOptions = {}
  ): Promise<PPICBatchResponse> {
    const startTime = Date.now();

    try {
      // 1. Parse sheet
      const { headers, rows } = this.parseSheetData(buffer, fileType);

      if (rows.length === 0) {
        throw new Error("No data found in sheet");
      }

      // 2. Determine field mapping
      let mapping = options.mappingStrategy || {};
      if (options.autoDetectMapping !== false && Object.keys(mapping).length === 0) {
        mapping = this.detectFieldMapping(headers);
      }

      if (Object.keys(mapping).length === 0) {
        throw new Error("Could not determine field mapping");
      }

      // 3. Validate all rows
      const validatedRows: ImportRow[] = rows.map((row, idx) =>
        this.validateRow(row, mapping, idx + 1)
      );

      // 4. Create purchase orders (pass sheet headers)
      const { successful, failed, batchId } = await this.createPurchaseOrders(
        validatedRows,
        options,
        headers
      );

      // 5. Build response
      const processingTime = Date.now() - startTime;
      const status = failed.length === 0 ? "success" : failed.length < successful.length ? "partial" : "failed";

      return {
        batchId,
        totalRows: validatedRows.length,
        successCount: successful.length,
        failureCount: failed.length,
        status,
        createdPOs: successful.map((r) => r.poId!),
        errors: failed.map((r) => ({
          rowIndex: r.rowIndex,
          poNo: r.data.poNo,
          errors: r.errors,
        })),
        processingTime,
        timestamp: new Date(),
      };
    } catch (err) {
      const processingTime = Date.now() - startTime;
      throw new Error(
        `Bulk import failed: ${(err as Error).message}`
      );
    }
  }

  /**
   * Get import status/details
   */
  static async getImportStatus(batchId: string): Promise<any> {
    // This would typically query a batch_imports table
    // For now, returning a placeholder
    return {
      batchId,
      status: "completed",
      details: "Batch import completed successfully",
    };
  }

  /**
   * Test field mapping with sample data
   */
  static testMapping(
    sampleRows: Record<string, any>[],
    mapping: Record<string, string>
  ): {
    validatedRows: ImportRow[];
    summary: { total: number; valid: number; errors: number };
  } {
    const validatedRows = sampleRows.map((row, idx) =>
      this.validateRow(row, mapping, idx + 1)
    );

    return {
      validatedRows,
      summary: {
        total: validatedRows.length,
        valid: validatedRows.filter((r) => r.status === "success").length,
        errors: validatedRows.filter((r) => r.status === "error").length,
      },
    };
  }

  /**
   * Get all imported purchase orders with pagination
   */
static async getAllImportedPOs(
  page: number = 1,
  limit: number = 50,
  sortBy: string = "createdAt",
  sortOrder: "asc" | "desc" = "desc"
): Promise<{
  data: any[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}> {
  try {
    // Validate pagination parameters
    const pageNum = Math.max(1, page);
    const limitNum = Math.max(1, Math.min(limit, 100));
    const skip = (pageNum - 1) * limitNum;

    // Valid sort fields
    const validSortFields = [
      "createdAt",
      "updatedAt",
      "poNo",
      "poDate",
      "amount",
      "poQty",
    ];
    const sortField = validSortFields.includes(sortBy)
      ? sortBy
      : "createdAt";

    // Get total count
    const total = await prisma.purchaseOrder.count();

    // Get paginated data
    const data = await prisma.purchaseOrder.findMany({
      skip,
      take: limitNum,
      orderBy: {
        [sortField]: sortOrder,
      },
      include: {
        customer: {
          select: {
            id: true,
            customerName: true,
            gstrNo: true,
            contactEmail: true,
            contactPhone: true,
          },
        },
      },
    });

    const totalPages = Math.ceil(total / limitNum);
    const hasNext = pageNum < totalPages;
    const hasPrev = pageNum > 1;

    const result = {
      data,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
        hasNext,
        hasPrev,
      },
    };

    // 🔥 CONSOLE OUTPUT
    console.log("📦 getAllImportedPOs RESULT:");
    console.log(JSON.stringify(result, null, 2));

    return result;
  } catch (err) {
    console.error("❌ Error in getAllImportedPOs:", err);
    throw new Error(
      `Failed to fetch purchase orders: ${(err as Error).message}`
    );
  }
}


  /**
   * Get purchase order by ID
   */
  static async getImportedPOById(poId: string): Promise<any> {
    try {
      const po = await prisma.purchaseOrder.findUnique({
        where: { id: poId },
        include: {
          customer: {
            select: {
              id: true,
              customerName: true,
              gstrNo: true,
              creditLimit: true,
              creditApprovalStatus: true,
              contactEmail: true,
              contactPhone: true,
              address: true,
            },
          },
        },
      });

      if (!po) {
        throw new Error(`Purchase order with ID ${poId} not found`);
      }

      return po;
    } catch (err) {
      throw new Error(`Failed to fetch purchase order: ${(err as Error).message}`);
    }
  }

  /**
   * Get purchase order by PO number
   */
  // static async getImportedPOByNumber(poNo: string): Promise<any> {
  //   try {
  //     const po = await prisma.purchaseOrder.findUnique({
  //       where: { poNo },
  //       include: {
  //         customer: true,
  //       },
  //     });

  //     if (!po) {
  //       throw new Error(`Purchase order ${poNo} not found`);
  //     }

  //     return po;
  //   } catch (err) {
  //     throw new Error(`Failed to fetch purchase order: ${(err as Error).message}`);
  //   }
  // }

  /**
   * Search purchase orders with filters and pagination
   */
  static async searchPOs(
    filters: {
      gstNo?: string;
      poNo?: string;
      brandName?: string;
      status?: string;
      dateFrom?: string;
      dateTo?: string;
    },
    page: number = 1,
    limit: number = 50
  ): Promise<{
    data: any[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    try {
      const pageNum = Math.max(1, page);
      const limitNum = Math.max(1, Math.min(limit, 100));
      const skip = (pageNum - 1) * limitNum;

      // Build where clause
      const where: any = {};

      if (filters.gstNo) where.gstNo = filters.gstNo;
      if (filters.poNo)
        where.poNo = { contains: filters.poNo, mode: "insensitive" };
      if (filters.brandName)
        where.brandName = { contains: filters.brandName, mode: "insensitive" };
      if (filters.status) where.overallStatus = filters.status;

      if (filters.dateFrom || filters.dateTo) {
        where.poDate = {};
        if (filters.dateFrom)
          where.poDate.gte = new Date(filters.dateFrom);
        if (filters.dateTo) where.poDate.lte = new Date(filters.dateTo);
      }

      const total = await prisma.purchaseOrder.count({ where });

      const data = await prisma.purchaseOrder.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: "desc" },
        include: {
          customer: {
            select: {
              customerName: true,
              gstrNo: true,
              contactEmail: true,
            },
          },
        },
      });

      return {
        data,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      };
    } catch (err) {
      throw new Error(`Search failed: ${(err as Error).message}`);
    }
  }

  /**
   * Export purchase orders to CSV, XLSX, or JSON
   */
  static async exportPOs(
    format: "csv" | "xlsx" | "json",
    filters: Record<string, any> = {}
  ): Promise<Buffer> {
    try {
      // Build where clause
      const where: any = {};

      if (filters.gstNo) where.gstNo = filters.gstNo;
      if (filters.poNo)
        where.poNo = { contains: filters.poNo, mode: "insensitive" };
      if (filters.brandName)
        where.brandName = { contains: filters.brandName, mode: "insensitive" };
      if (filters.status) where.overallStatus = filters.status;

      if (filters.dateFrom || filters.dateTo) {
        where.poDate = {};
        if (filters.dateFrom)
          where.poDate.gte = new Date(filters.dateFrom);
        if (filters.dateTo) where.poDate.lte = new Date(filters.dateTo);
      }

      // Fetch all matching purchase orders
      const pos = await prisma.purchaseOrder.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          customer: {
            select: {
              customerName: true,
              gstrNo: true,
              contactEmail: true,
            },
          },
        },
      });

      if (pos.length === 0) {
        throw new Error("No purchase orders found with the given filters");
      }

      if (format === "json") {
        return Buffer.from(JSON.stringify(pos, null, 2));
      }

      if (format === "csv") {
        return this.generateCSV(pos);
      }

      if (format === "xlsx") {
        return this.generateXLSX(pos);
      }

      throw new Error(`Unsupported format: ${format}`);
    } catch (err) {
      throw new Error(`Export failed: ${(err as Error).message}`);
    }
  }

  /**
   * Generate CSV from purchase orders
   */
  private static generateCSV(pos: any[]): Buffer {
    if (pos.length === 0) {
      return Buffer.from("No data");
    }

    // Get all unique keys from first PO
    const headers = new Set<string>();
    pos.forEach((po) => {
      Object.keys(po).forEach((key) => {
        if (key !== "customer") headers.add(key);
      });
      if (po.customer) {
        headers.add("customerName");
        headers.add("customerEmail");
      }
    });

    const headerArray = Array.from(headers);

    // Build CSV
    let csv = headerArray.join(",") + "\n";

    pos.forEach((po) => {
      const row = headerArray.map((header) => {
        let value: any = "";
        if (header === "customerName") {
          value = po.customer?.customerName || "";
        } else if (header === "customerEmail") {
          value = po.customer?.contactEmail || "";
        } else {
          value = po[header] || "";
        }

        // Convert to string and format
        let strValue = String(value);
        if (value instanceof Date || (typeof value === "object" && value !== null && "toISOString" in value)) {
          strValue = new Date(value).toISOString();
        }

        // Escape quotes and wrap in quotes if contains comma or newline
        if (strValue.includes(",") || strValue.includes("\n")) {
          strValue = `"${strValue.replace(/"/g, '""')}"`;
        }

        return strValue;
      });

      csv += row.join(",") + "\n";
    });

    return Buffer.from(csv);
  }

  /**
   * Generate XLSX from purchase orders
   */
  private static generateXLSX(pos: any[]): Buffer {
    try {
      const XLSX = require("xlsx");

      // Flatten data for XLSX
      const flatData = pos.map((po) => ({
        ...po,
        customerName: po.customer?.customerName || "",
        customerEmail: po.customer?.contactEmail || "",
        customer: undefined, // Remove nested object
      }));

      // Remove undefined/null nested objects
      flatData.forEach((item: any) => {
        Object.keys(item).forEach((key) => {
          if (item[key] === undefined || (typeof item[key] === "object" && key === "customer")) {
            delete item[key];
          }
        });
      });

      const worksheet = XLSX.utils.json_to_sheet(flatData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "PurchaseOrders");

      return XLSX.write(workbook, { type: "buffer" });
    } catch (err) {
      throw new Error(`XLSX generation failed: ${(err as Error).message}`);
    }
  }

  /**
   * Mark purchase order as RFD (Request for Debit)
   */
  static async markRFD(poId: string) {
    try {
      const updatedPO = await prisma.purchaseOrder.update({
        where: { id: poId },
        data: { isRFD: true },
        include: { customer: true },
      });
      return updatedPO;
    } catch (err) {
      throw new AppError(`Failed to mark RFD: ${(err as Error).message}`);
    }
  }

  /**
   * Mark purchase order as cancelled
   */
  static async markCancelled(poId: string) {
    try {
      const updatedPO = await prisma.purchaseOrder.update({
        where: { id: poId },
        data: { isCancelled: true },
        include: { customer: true },
      });
      return updatedPO;
    } catch (err) {
      throw new AppError(`Failed to mark as cancelled: ${(err as Error).message}`);
    }
  }

  static async markDispatched(poId: string) {
    try {
      const updatedPO = await prisma.purchaseOrder.update({
        where: { id: poId },
        data: { dispatchStatus: "Dispatched" },
        include: { customer: true },
      });
      return updatedPO;
    } catch (err) {
      throw new AppError(`Failed to mark as dispatched: ${(err as Error).message}`);
    }
  }

  /**
   * Bulk mark purchase orders as RFD
   */
  static async bulkMarkRFD(poIds: string[]) {
    try {
      return await prisma.purchaseOrder.updateMany({
        where: { id: { in: poIds } },
        data: { isRFD: true },
      });
    } catch (err) {
      throw new AppError(`Failed to bulk mark RFD: ${(err as Error).message}`);
    }
  }

  /**
   * Bulk mark purchase orders as cancelled
   */
  static async bulkMarkCancelled(poIds: string[]) {
    try {
      return await prisma.purchaseOrder.updateMany({
        where: { id: { in: poIds } },
        data: { isCancelled: true },
      });
    } catch (err) {
      throw new AppError(`Failed to bulk mark cancelled: ${(err as Error).message}`);
    }
  }

  /**
   * Bulk mark purchase orders as dispatched
   */
  static async bulkMarkDispatched(poIds: string[]) {
    try {
      return await prisma.purchaseOrder.updateMany({
        where: { id: { in: poIds } },
        data: { dispatchStatus: "Dispatched" },
      });
    } catch (err) {
      throw new AppError(`Failed to bulk mark dispatched: ${(err as Error).message}`);
    }
  }
}

