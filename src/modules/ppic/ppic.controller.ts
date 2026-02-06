/**
 * PPIC Controller - Request handling for bulk import operations
 */

import { Request, Response, NextFunction } from "express";
import { PPICService } from "./ppic.service";
import { sendSuccess, sendError } from "../../common/utils/responseFormatter";
import { ERROR_CODES } from "../../common/utils/errorMessages";

class PPICController {
  /**
   * Upload and process bulk import
   * POST /api/ppic/import
   */
async bulkImport(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      return sendError(res, ERROR_CODES.FILE_REQUIRED);
    }
    const fileType = (req.query.fileType as string) || this.detectFileType(req.file.originalname);
    const skipOnError = req.query.skipOnError === "true";
    const updateIfExists = req.query.updateIfExists === "true";
    const autoDetectMapping = req.query.autoDetectMapping !== "false";

    // Parse mappingStrategy if provided
    let customMappings: Record<string, string> | undefined;
    if (req.body.mappingStrategy) {
      try {
        customMappings = JSON.parse(req.body.mappingStrategy);
      } catch (parseErr) {
        return sendError(res, ERROR_CODES.VALIDATION_ERROR, `Invalid mappingStrategy format: ${(parseErr as Error).message}`);
      }
    }

    // Validate file type
    if (!["xlsx", "csv", "json"].includes(fileType)) {
      return sendError(res, ERROR_CODES.INVALID_FILE_FORMAT);
    }

    // Process bulk import
    const result = await PPICService.bulkImport(req.file.buffer, fileType as any, {
      mappingStrategy: customMappings,
      skipOnError,
      updateIfExists,
      autoDetectMapping,
    });
    return sendSuccess(
      res,
      result,
      `Bulk import completed. Success: ${result.successCount}, Failed: ${result.failureCount}`,
      200
    );
  } catch (err) {
    next(err);
  }
}

  /**
   * Auto-detect field mapping from file
   * POST /api/ppic/detect-mapping
   */
  async detectMapping(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return sendError(res, ERROR_CODES.FILE_REQUIRED);
      }

      const fileType = (req.query.fileType as string) || this.detectFileType(req.file.originalname);

      const { headers } = PPICService.parseSheetData(req.file.buffer, fileType as any);
      const mapping = PPICService.detectFieldMapping(headers);

        return res.status(200).json({
          success: true,
          message: "Field mapping detected successfully",
          data: {
            detectedHeaders: headers,
            suggestedMapping: mapping,
            confidence: Object.keys(mapping).length / headers.length,
          },
        });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Test mapping with sample rows
   * POST /api/ppic/test-mapping
   */
  async testMapping(req: Request, res: Response, next: NextFunction) {
    try {
      const { sampleRows, mapping } = req.body;

      if (!sampleRows || !Array.isArray(sampleRows) || sampleRows.length === 0) {
        return sendError(res, ERROR_CODES.VALIDATION_ERROR, "sampleRows must be a non-empty array");
      }

      if (!mapping || typeof mapping !== "object") {
        return sendError(res, ERROR_CODES.VALIDATION_ERROR, "mapping must be a valid object");
      }

      const result = PPICService.testMapping(sampleRows, mapping);

      return sendSuccess(res, result, "Mapping test completed");
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get import batch status
   * GET /api/ppic/batch/:batchId
   */
  async getBatchStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const batchId = req.params.batchId as string;

      const status = await PPICService.getImportStatus(batchId);

      return sendSuccess(res, status, "Batch status retrieved");
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get available PO fields for mapping reference
   * GET /api/ppic/po-fields
   */
  async getPOFields(req: Request, res: Response, next: NextFunction) {
    try {
      const fields = {
        required: ["poNo", "gstNo"],
        dates: [
          "poDate",
          "dispatchDate",
          "expiry",
          "foilPoDate",
          "foilBillDate",
          "cartonPoDate",
          "cartonBillDate",
          "packingDate",
          "invoiceDate",
        ],
        integers: [
          "poQty",
          "batchQty",
          "foilQuantity",
          "cartonQuantity",
          "qtyPacked",
          "noOfShippers",
          "changePart",
          "cyc",
          "foilQuantityOrdered",
          "cartonQuantityOrdered",
        ],
        floats: ["poRate", "amount", "mrp", "advance"],
        strings: [
          "brandName",
          "partyName",
          "batchNo",
          "paymentTerms",
          "invCha",
          "cylChar",
          "orderThrough",
          "address",
          "composition",
          "notes",
          "rmStatus",
          "section",
          "specialRequirements",
          "tabletCapsuleDrySyrupBottle",
          "roundOvalTablet",
          "tabletColour",
          "aluAluBlisterStripBottle",
          "packStyle",
          "productNewOld",
          "qaObservations",
          "pvcColourBase",
          "foil",
          "lotNo",
          "foilSize",
          "foilPoVendor",
          "cartonPoVendor",
          "design",
          "invoiceNo",
        ],
      };

      return sendSuccess(res, fields, "Available PO fields");
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get all purchase orders with pagination
   * GET /api/ppic/pos?page=1&limit=50&sortBy=createdAt&sortOrder=desc
   */
async getAllPOs(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const result = await PPICService.getAllImportedPOs(
      page,
      limit,
      "createdAt",
      "desc"
    );

    // Send data and pagination separately
    (res as any).encryptAndSend({
      success: true,
      message: "Purchase orders retrieved successfully",
      data: result.data,         // the records for this page
      pagination: result.pagination, // pagination info
    });
  } catch (err) {
    (res as any).encryptAndSend({
      success: false,
      message: err instanceof Error ? err.message : "Failed to fetch purchase orders",
    });
  }
}



  /**
   * Get purchase order by ID
   * GET /api/ppic/pos/:id
   */
  async getPOById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      if (!id) {
        return sendError(
          res,
          ERROR_CODES.VALIDATION_ERROR,
          "Purchase order ID is required"
        );
      }

      const po = await PPICService.getImportedPOById(id);
      return sendSuccess(res, po, "Purchase order retrieved successfully");
    } catch (err) {
      if ((err as Error).message.includes("not found")) {
        return sendError(res, ERROR_CODES.NOT_FOUND, (err as Error).message);
      }
      next(err);
    }
  }

  /**
   * Get purchase order by PO number
   * GET /api/ppic/pos/number/:poNo
   */
  // async getPOByNumber(req: Request, res: Response, next: NextFunction) {
  //   try {
  //     const poNo = Array.isArray(req.params.poNo) ? req.params.poNo[0] : req.params.poNo;

  //     if (!poNo) {
  //       return sendError(
  //         res,
  //         ERROR_CODES.VALIDATION_ERROR,
  //         "PO number is required"
  //       );
  //     }

  //     const po = await PPICService.getImportedPOByNumber(poNo);
  //     return sendSuccess(res, po, "Purchase order retrieved successfully");
  //   } catch (err) {
  //     if ((err as Error).message.includes("not found")) {
  //       return sendError(res, ERROR_CODES.NOT_FOUND, (err as Error).message);
  //     }
  //     next(err);
  //   }
  // }

  /**
   * Search purchase orders with filters
   * GET /api/ppic/pos/search?gstNo=XXX&poNo=XXX&status=XXX&page=1&limit=50
   */
  async searchPOs(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const filters = {
        gstNo: req.query.gstNo as string,
        poNo: req.query.poNo as string,
        brandName: req.query.brandName as string,
        status: req.query.status as string,
        dateFrom: req.query.dateFrom as string,
        dateTo: req.query.dateTo as string,
      };

      const result = await PPICService.searchPOs(filters, page, limit);
      return sendSuccess(res, result, "Search completed successfully");
    } catch (err) {
      next(err);
    }
  }
    /**
   * Mark purchase order as RFD
   * PATCH /api/ppic/pos/:id/mark-rfd
   */
  async markRFD(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (!id) {
        return sendError(res, ERROR_CODES.VALIDATION_ERROR, "Purchase Order ID is required");
      }

      const updatedPO = await PPICService.markRFD(id as string);
      return sendSuccess(res, updatedPO, "Purchase order marked as RFD", 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Mark purchase order as cancelled
   * PATCH /api/ppic/pos/:id/mark-cancelled
   */
  async markCancelled(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (!id) {
        return sendError(res, ERROR_CODES.VALIDATION_ERROR, "Purchase Order ID is required");
      }

      const updatedPO = await PPICService.markCancelled(id as string);
      return sendSuccess(res, updatedPO, "Purchase order marked as cancelled", 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Export purchase orders to CSV/XLSX/JSON
   * GET /api/ppic/export?format=csv&gstNo=XXX&poNo=XXX&status=XXX
   */
  async exportPOs(req: Request, res: Response, next: NextFunction) {
    try {
      const format = (req.query.format as string) || "csv";
      const filters = {
        gstNo: req.query.gstNo as string,
        poNo: req.query.poNo as string,
        brandName: req.query.brandName as string,
        status: req.query.status as string,
        dateFrom: req.query.dateFrom as string,
        dateTo: req.query.dateTo as string,
      };

      if (!["csv", "xlsx", "json"].includes(format)) {
        return sendError(
          res,
          ERROR_CODES.VALIDATION_ERROR,
          "Format must be csv, xlsx, or json"
        );
      }

      const buffer = await PPICService.exportPOs(format as "csv" | "xlsx" | "json", filters);
      
      const mimeTypes: Record<string, string> = {
        csv: "text/csv",
        xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        json: "application/json",
      };

      const fileExtensions: Record<string, string> = {
        csv: "csv",
        xlsx: "xlsx",
        json: "json",
      };

      const timestamp = new Date().toISOString().split("T")[0];
      const filename = `ppic_export_${timestamp}.${fileExtensions[format]}`;

      res.setHeader("Content-Type", mimeTypes[format]);
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Helper: Detect file type from filename
   */
  private detectFileType(
    filename: string
  ): "xlsx" | "csv" | "json" | "unknown" {
    const ext = filename.split(".").pop()?.toLowerCase();
    if (ext === "xlsx" || ext === "xls") return "xlsx";
    if (ext === "csv") return "csv";
    if (ext === "json") return "json";
    return "unknown";
  }
}


export const ppicController = new PPICController();
