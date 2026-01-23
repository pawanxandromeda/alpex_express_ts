"use strict";
/**
 * PPIC Service - Advanced Bulk Purchase Order Import Service
 * Handles large-scale data imports with intelligent mapping and error recovery
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PPICService = void 0;
const postgres_1 = __importDefault(require("../../config/postgres"));
const errorMessages_1 = require("../../common/utils/errorMessages");
const uuid_1 = require("uuid");
const ppic_parser_1 = require("./ppic.parser");
class PPICService {
    /**
     * Parse sheet data (Excel, CSV, JSON)
     */
    static parseSheetData(buffer, fileType) {
        try {
            if (fileType === "json") {
                const data = JSON.parse(buffer.toString());
                const rows = Array.isArray(data) ? data : data.data || [];
                const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
                return { headers, rows };
            }
            if (fileType === "csv") {
                const lines = buffer.toString().split("\n");
                const headers = lines[0].split(",").map((h) => h.trim());
                const rows = lines.slice(1).map((line) => {
                    const values = line.split(",").map((v) => v.trim());
                    const row = {};
                    headers.forEach((header, i) => {
                        row[header] = values[i] || null;
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
                }
                catch (err) {
                    throw new Error(`Failed to parse XLSX: ${err.message}`);
                }
            }
            throw new Error(`Unsupported file type: ${fileType}`);
        }
        catch (err) {
            throw new errorMessages_1.AppError(`Failed to parse sheet data: ${err.message}`);
        }
    }
    /**
     * Auto-detect field mapping from sheet headers
     */
    static detectFieldMapping(headers) {
        return ppic_parser_1.MappingBuilder.buildMapping(headers);
    }
    /**
     * Validate and parse a single row
     * NOTE: Validation is lenient - accepts partial/incomplete data
     */
    static validateRow(rowData, mapping, rowIndex) {
        const row = {
            rowIndex,
            data: {},
            errors: [],
            status: "success",
        };
        const { data, errors } = ppic_parser_1.SchemaMapper.mapAndValidate(rowData, mapping);
        row.data = data;
        row.errors = errors.map((e) => ({
            ...e,
            severity: "error",
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
     */
    static async createPurchaseOrders(rows, options = {}) {
        const batchId = (0, uuid_1.v4)();
        const successful = [];
        const failed = [];
        // Process all rows (even warning rows) - only skip error rows if explicitly requested
        const rowsToProcess = options.skipOnError
            ? rows.filter((r) => r.status === "error")
            : rows;
        // Process in batches (without prisma transactions - use sequential processing)
        const batchSize = options.batchSize || 50;
        for (let i = 0; i < rowsToProcess.length; i += batchSize) {
            const batch = rowsToProcess.slice(i, i + batchSize);
            try {
                // Process sequentially instead of transaction
                const results = await Promise.all(batch.map((row) => this.createSinglePurchaseOrder(row, options)));
                results.forEach((result, idx) => {
                    if (result.success) {
                        batch[idx].poId = result.poId;
                        batch[idx].status = "success";
                        successful.push(batch[idx]);
                    }
                    else {
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
            }
            catch (err) {
                // Batch processing failed - mark all rows as failed
                batch.forEach((row) => {
                    row.errors = [
                        ...row.errors,
                        {
                            field: "transaction",
                            message: `Batch processing failed: ${err.message}`,
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
     * NOTE: Lenient creation - accepts partial data without gstNo or poNo
     */
    static async createSinglePurchaseOrder(row, options) {
        try {
            if (row.status === "error") {
                return {
                    success: false,
                    error: "Row has validation errors",
                };
            }
            const data = row.data;
            // Generate a unique poNo if not provided
            if (!data.poNo) {
                data.poNo = `AUTO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            }
            // If gstNo exists, verify customer - otherwise create without customer link
            let customerId = null;
            if (data.gstNo) {
                const customer = await postgres_1.default.customer.findUnique({
                    where: { gstrNo: data.gstNo },
                });
                if (customer) {
                    customerId = customer.id;
                }
                // If customer not found, continue without link (lenient)
            }
            // Check if PO already exists
            const existingPO = await postgres_1.default.purchaseOrder.findUnique({
                where: { poNo: data.poNo },
            });
            if (existingPO) {
                if (!options.updateIfExists) {
                    return {
                        success: false,
                        error: `PO ${data.poNo} already exists`,
                    };
                }
                // Update existing PO
                const updateData = this.sanitizeData(data);
                const updatedPO = await postgres_1.default.purchaseOrder.update({
                    where: { poNo: data.poNo },
                    data: updateData,
                });
                return {
                    success: true,
                    poId: updatedPO.id,
                };
            }
            // Create new PO
            const createData = {
                poNo: data.poNo,
                ...this.sanitizeData(data),
            };
            // Only set gstNo if it exists
            if (data.gstNo) {
                createData.gstNo = data.gstNo;
            }
            // Link customer if found
            if (customerId) {
                createData.customerId = customerId;
            }
            const newPO = await postgres_1.default.purchaseOrder.create({
                data: createData,
            });
            return {
                success: true,
                poId: newPO.id,
            };
        }
        catch (err) {
            return {
                success: false,
                error: err.message,
            };
        }
    }
    /**
     * Sanitize data for database insertion
     * Filters out unknown fields that don't exist in PurchaseOrder schema
     */
    static sanitizeData(data) {
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
            "dispatchStatus", "timestamp", "createdAt", "updatedAt"
        ]);
        const sanitized = {};
        for (const [key, value] of Object.entries(data)) {
            // Skip unknown fields
            if (!validFields.has(key))
                continue;
            // Skip null/undefined
            if (value === null || value === undefined)
                continue;
            // Handle special types
            if (value instanceof Date) {
                sanitized[key] = value;
            }
            else if (typeof value === "string") {
                const trimmed = value.trim();
                if (trimmed)
                    sanitized[key] = trimmed;
            }
            else if (typeof value === "number") {
                sanitized[key] = value;
            }
            else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }
    /**
     * Main bulk import orchestration
     */
    static async bulkImport(buffer, fileType, options = {}) {
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
            const validatedRows = rows.map((row, idx) => this.validateRow(row, mapping, idx + 1));
            // 4. Create purchase orders
            const { successful, failed, batchId } = await this.createPurchaseOrders(validatedRows, options);
            // 5. Build response
            const processingTime = Date.now() - startTime;
            const status = failed.length === 0 ? "success" : failed.length < successful.length ? "partial" : "failed";
            return {
                batchId,
                totalRows: validatedRows.length,
                successCount: successful.length,
                failureCount: failed.length,
                status,
                createdPOs: successful.map((r) => r.poId),
                errors: failed.map((r) => ({
                    rowIndex: r.rowIndex,
                    poNo: r.data.poNo,
                    errors: r.errors,
                })),
                processingTime,
                timestamp: new Date(),
            };
        }
        catch (err) {
            const processingTime = Date.now() - startTime;
            throw new Error(`Bulk import failed: ${err.message}`);
        }
    }
    /**
     * Get import status/details
     */
    static async getImportStatus(batchId) {
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
    static testMapping(sampleRows, mapping) {
        const validatedRows = sampleRows.map((row, idx) => this.validateRow(row, mapping, idx + 1));
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
    static async getAllImportedPOs(page = 1, limit = 10, sortBy = "createdAt", sortOrder = "desc") {
        try {
            // Validate pagination parameters
            const pageNum = Math.max(1, page);
            const limitNum = Math.max(1, Math.min(limit, 100)); // Max 100 per page
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
            const sortField = validSortFields.includes(sortBy) ? sortBy : "createdAt";
            // Get total count
            const total = await postgres_1.default.purchaseOrder.count();
            // Get paginated data
            const data = await postgres_1.default.purchaseOrder.findMany({
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
            return {
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
        }
        catch (err) {
            throw new Error(`Failed to fetch purchase orders: ${err.message}`);
        }
    }
    /**
     * Get purchase order by ID
     */
    static async getImportedPOById(poId) {
        try {
            const po = await postgres_1.default.purchaseOrder.findUnique({
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
        }
        catch (err) {
            throw new Error(`Failed to fetch purchase order: ${err.message}`);
        }
    }
    /**
     * Get purchase order by PO number
     */
    static async getImportedPOByNumber(poNo) {
        try {
            const po = await postgres_1.default.purchaseOrder.findUnique({
                where: { poNo },
                include: {
                    customer: true,
                },
            });
            if (!po) {
                throw new Error(`Purchase order ${poNo} not found`);
            }
            return po;
        }
        catch (err) {
            throw new Error(`Failed to fetch purchase order: ${err.message}`);
        }
    }
    /**
     * Search purchase orders with filters and pagination
     */
    static async searchPOs(filters, page = 1, limit = 10) {
        try {
            const pageNum = Math.max(1, page);
            const limitNum = Math.max(1, Math.min(limit, 100));
            const skip = (pageNum - 1) * limitNum;
            // Build where clause
            const where = {};
            if (filters.gstNo)
                where.gstNo = filters.gstNo;
            if (filters.poNo)
                where.poNo = { contains: filters.poNo, mode: "insensitive" };
            if (filters.brandName)
                where.brandName = { contains: filters.brandName, mode: "insensitive" };
            if (filters.status)
                where.overallStatus = filters.status;
            if (filters.dateFrom || filters.dateTo) {
                where.poDate = {};
                if (filters.dateFrom)
                    where.poDate.gte = new Date(filters.dateFrom);
                if (filters.dateTo)
                    where.poDate.lte = new Date(filters.dateTo);
            }
            const total = await postgres_1.default.purchaseOrder.count({ where });
            const data = await postgres_1.default.purchaseOrder.findMany({
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
        }
        catch (err) {
            throw new Error(`Search failed: ${err.message}`);
        }
    }
    /**
     * Export purchase orders to CSV, XLSX, or JSON
     */
    static async exportPOs(format, filters = {}) {
        try {
            // Build where clause
            const where = {};
            if (filters.gstNo)
                where.gstNo = filters.gstNo;
            if (filters.poNo)
                where.poNo = { contains: filters.poNo, mode: "insensitive" };
            if (filters.brandName)
                where.brandName = { contains: filters.brandName, mode: "insensitive" };
            if (filters.status)
                where.overallStatus = filters.status;
            if (filters.dateFrom || filters.dateTo) {
                where.poDate = {};
                if (filters.dateFrom)
                    where.poDate.gte = new Date(filters.dateFrom);
                if (filters.dateTo)
                    where.poDate.lte = new Date(filters.dateTo);
            }
            // Fetch all matching purchase orders
            const pos = await postgres_1.default.purchaseOrder.findMany({
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
        }
        catch (err) {
            throw new Error(`Export failed: ${err.message}`);
        }
    }
    /**
     * Generate CSV from purchase orders
     */
    static generateCSV(pos) {
        if (pos.length === 0) {
            return Buffer.from("No data");
        }
        // Get all unique keys from first PO
        const headers = new Set();
        pos.forEach((po) => {
            Object.keys(po).forEach((key) => {
                if (key !== "customer")
                    headers.add(key);
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
                let value = "";
                if (header === "customerName") {
                    value = po.customer?.customerName || "";
                }
                else if (header === "customerEmail") {
                    value = po.customer?.contactEmail || "";
                }
                else {
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
    static generateXLSX(pos) {
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
            flatData.forEach((item) => {
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
        }
        catch (err) {
            throw new Error(`XLSX generation failed: ${err.message}`);
        }
    }
}
exports.PPICService = PPICService;
