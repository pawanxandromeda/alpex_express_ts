"use strict";
/**
 * PPIC Controller - Request handling for bulk import operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ppicController = void 0;
const ppic_service_1 = require("./ppic.service");
const responseFormatter_1 = require("../../common/utils/responseFormatter");
const errorMessages_1 = require("../../common/utils/errorMessages");
class PPICController {
    /**
     * Upload and process bulk import
     * POST /api/ppic/import
     */
    async bulkImport(req, res, next) {
        try {
            if (!req.file) {
                return (0, responseFormatter_1.sendError)(res, errorMessages_1.ERROR_CODES.FILE_REQUIRED);
            }
            const fileType = req.query.fileType || this.detectFileType(req.file.originalname);
            const skipOnError = req.query.skipOnError === "true";
            const updateIfExists = req.query.updateIfExists === "true";
            const autoDetectMapping = req.query.autoDetectMapping !== "false";
            // Parse mappingStrategy if provided
            let customMappings;
            if (req.body.mappingStrategy) {
                try {
                    customMappings = JSON.parse(req.body.mappingStrategy);
                }
                catch (parseErr) {
                    return (0, responseFormatter_1.sendError)(res, errorMessages_1.ERROR_CODES.VALIDATION_ERROR, `Invalid mappingStrategy format: ${parseErr.message}`);
                }
            }
            // Validate file type
            if (!["xlsx", "csv", "json"].includes(fileType)) {
                return (0, responseFormatter_1.sendError)(res, errorMessages_1.ERROR_CODES.INVALID_FILE_FORMAT);
            }
            // Process bulk import
            const result = await ppic_service_1.PPICService.bulkImport(req.file.buffer, fileType, {
                mappingStrategy: customMappings,
                skipOnError,
                updateIfExists,
                autoDetectMapping,
            });
            return (0, responseFormatter_1.sendSuccess)(res, result, `Bulk import completed. Success: ${result.successCount}, Failed: ${result.failureCount}`, 200);
        }
        catch (err) {
            next(err);
        }
    }
    /**
     * Auto-detect field mapping from file
     * POST /api/ppic/detect-mapping
     */
    async detectMapping(req, res, next) {
        try {
            if (!req.file) {
                return (0, responseFormatter_1.sendError)(res, errorMessages_1.ERROR_CODES.FILE_REQUIRED);
            }
            const fileType = req.query.fileType || this.detectFileType(req.file.originalname);
            const { headers } = ppic_service_1.PPICService.parseSheetData(req.file.buffer, fileType);
            const mapping = ppic_service_1.PPICService.detectFieldMapping(headers);
            return res.status(200).json({
                success: true,
                message: "Field mapping detected successfully",
                data: {
                    detectedHeaders: headers,
                    suggestedMapping: mapping,
                    confidence: Object.keys(mapping).length / headers.length,
                },
            });
        }
        catch (err) {
            next(err);
        }
    }
    /**
     * Test mapping with sample rows
     * POST /api/ppic/test-mapping
     */
    async testMapping(req, res, next) {
        try {
            const { sampleRows, mapping } = req.body;
            if (!sampleRows || !Array.isArray(sampleRows) || sampleRows.length === 0) {
                return (0, responseFormatter_1.sendError)(res, errorMessages_1.ERROR_CODES.VALIDATION_ERROR, "sampleRows must be a non-empty array");
            }
            if (!mapping || typeof mapping !== "object") {
                return (0, responseFormatter_1.sendError)(res, errorMessages_1.ERROR_CODES.VALIDATION_ERROR, "mapping must be a valid object");
            }
            const result = ppic_service_1.PPICService.testMapping(sampleRows, mapping);
            return (0, responseFormatter_1.sendSuccess)(res, result, "Mapping test completed");
        }
        catch (err) {
            next(err);
        }
    }
    /**
     * Get import batch status
     * GET /api/ppic/batch/:batchId
     */
    async getBatchStatus(req, res, next) {
        try {
            const batchId = req.params.batchId;
            const status = await ppic_service_1.PPICService.getImportStatus(batchId);
            return (0, responseFormatter_1.sendSuccess)(res, status, "Batch status retrieved");
        }
        catch (err) {
            next(err);
        }
    }
    /**
     * Get available PO fields for mapping reference
     * GET /api/ppic/po-fields
     */
    async getPOFields(req, res, next) {
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
            return (0, responseFormatter_1.sendSuccess)(res, fields, "Available PO fields");
        }
        catch (err) {
            next(err);
        }
    }
    /**
     * Get all purchase orders with pagination
     * GET /api/ppic/pos?page=1&limit=10&sortBy=createdAt&sortOrder=desc
     */
    async getAllPOs(req, res, next) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const result = await ppic_service_1.PPICService.getAllImportedPOs(page, limit, "createdAt", "desc");
            res.encryptAndSend({
                success: true,
                message: "Purchase orders retrieved successfully",
                data: result,
            });
        }
        catch (err) {
            res.encryptAndSend({
                success: false,
                message: err instanceof Error ? err.message : "Failed to fetch purchase orders",
            });
        }
    }
    /**
     * Get purchase order by ID
     * GET /api/ppic/pos/:id
     */
    async getPOById(req, res, next) {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            if (!id) {
                return (0, responseFormatter_1.sendError)(res, errorMessages_1.ERROR_CODES.VALIDATION_ERROR, "Purchase order ID is required");
            }
            const po = await ppic_service_1.PPICService.getImportedPOById(id);
            return (0, responseFormatter_1.sendSuccess)(res, po, "Purchase order retrieved successfully");
        }
        catch (err) {
            if (err.message.includes("not found")) {
                return (0, responseFormatter_1.sendError)(res, errorMessages_1.ERROR_CODES.NOT_FOUND, err.message);
            }
            next(err);
        }
    }
    /**
     * Get purchase order by PO number
     * GET /api/ppic/pos/number/:poNo
     */
    async getPOByNumber(req, res, next) {
        try {
            const poNo = Array.isArray(req.params.poNo) ? req.params.poNo[0] : req.params.poNo;
            if (!poNo) {
                return (0, responseFormatter_1.sendError)(res, errorMessages_1.ERROR_CODES.VALIDATION_ERROR, "PO number is required");
            }
            const po = await ppic_service_1.PPICService.getImportedPOByNumber(poNo);
            return (0, responseFormatter_1.sendSuccess)(res, po, "Purchase order retrieved successfully");
        }
        catch (err) {
            if (err.message.includes("not found")) {
                return (0, responseFormatter_1.sendError)(res, errorMessages_1.ERROR_CODES.NOT_FOUND, err.message);
            }
            next(err);
        }
    }
    /**
     * Search purchase orders with filters
     * GET /api/ppic/pos/search?gstNo=XXX&poNo=XXX&status=XXX&page=1&limit=10
     */
    async searchPOs(req, res, next) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const filters = {
                gstNo: req.query.gstNo,
                poNo: req.query.poNo,
                brandName: req.query.brandName,
                status: req.query.status,
                dateFrom: req.query.dateFrom,
                dateTo: req.query.dateTo,
            };
            const result = await ppic_service_1.PPICService.searchPOs(filters, page, limit);
            return (0, responseFormatter_1.sendSuccess)(res, result, "Search completed successfully");
        }
        catch (err) {
            next(err);
        }
    }
    /**
     * Export purchase orders to CSV/XLSX/JSON
     * GET /api/ppic/export?format=csv&gstNo=XXX&poNo=XXX&status=XXX
     */
    async exportPOs(req, res, next) {
        try {
            const format = req.query.format || "csv";
            const filters = {
                gstNo: req.query.gstNo,
                poNo: req.query.poNo,
                brandName: req.query.brandName,
                status: req.query.status,
                dateFrom: req.query.dateFrom,
                dateTo: req.query.dateTo,
            };
            if (!["csv", "xlsx", "json"].includes(format)) {
                return (0, responseFormatter_1.sendError)(res, errorMessages_1.ERROR_CODES.VALIDATION_ERROR, "Format must be csv, xlsx, or json");
            }
            const buffer = await ppic_service_1.PPICService.exportPOs(format, filters);
            const mimeTypes = {
                csv: "text/csv",
                xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                json: "application/json",
            };
            const fileExtensions = {
                csv: "csv",
                xlsx: "xlsx",
                json: "json",
            };
            const timestamp = new Date().toISOString().split("T")[0];
            const filename = `ppic_export_${timestamp}.${fileExtensions[format]}`;
            res.setHeader("Content-Type", mimeTypes[format]);
            res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
            res.send(buffer);
        }
        catch (err) {
            next(err);
        }
    }
    /**
     * Helper: Detect file type from filename
     */
    detectFileType(filename) {
        const ext = filename.split(".").pop()?.toLowerCase();
        if (ext === "xlsx" || ext === "xls")
            return "xlsx";
        if (ext === "csv")
            return "csv";
        if (ext === "json")
            return "json";
        return "unknown";
    }
}
exports.ppicController = new PPICController();
