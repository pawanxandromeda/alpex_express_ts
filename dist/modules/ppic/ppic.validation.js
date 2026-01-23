"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PPICBatchResponseSchema = exports.PPICFieldMappingSchema = exports.PPICBulkImportSchema = exports.PPICRowSchema = void 0;
const zod_1 = require("zod");
/**
 * PPIC Validation Schemas
 * Comprehensive validation for bulk import operations
 */
// Single row validation
exports.PPICRowSchema = zod_1.z.object({
    poNo: zod_1.z.string().min(1).max(50),
    gstNo: zod_1.z.string().regex(/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z0-9]{3}$/).optional(),
    poDate: zod_1.z.coerce.date().optional(),
    dispatchDate: zod_1.z.coerce.date().optional(),
    brandName: zod_1.z.string().max(100).optional(),
    partyName: zod_1.z.string().max(100).optional(),
    batchNo: zod_1.z.string().max(50).optional(),
    paymentTerms: zod_1.z.string().max(100).optional(),
    invCha: zod_1.z.string().max(100).optional(),
    cylChar: zod_1.z.string().max(100).optional(),
    orderThrough: zod_1.z.string().max(100).optional(),
    address: zod_1.z.string().max(500).optional(),
    composition: zod_1.z.string().max(500).optional(),
    notes: zod_1.z.string().max(1000).optional(),
    rmStatus: zod_1.z.string().max(50).optional(),
    poQty: zod_1.z.number().int().positive().optional(),
    poRate: zod_1.z.number().positive().optional(),
    amount: zod_1.z.number().positive().optional(),
    mrp: zod_1.z.number().positive().optional(),
    section: zod_1.z.string().max(50).optional(),
    specialRequirements: zod_1.z.string().max(500).optional(),
    tabletCapsuleDrySyrupBottle: zod_1.z.string().max(100).optional(),
    roundOvalTablet: zod_1.z.string().max(100).optional(),
    tabletColour: zod_1.z.string().max(50).optional(),
    aluAluBlisterStripBottle: zod_1.z.string().max(100).optional(),
    packStyle: zod_1.z.string().max(100).optional(),
    productNewOld: zod_1.z.string().max(50).optional(),
    qaObservations: zod_1.z.string().max(500).optional(),
    batchQty: zod_1.z.number().int().positive().optional(),
    expiry: zod_1.z.coerce.date().optional(),
    pvcColourBase: zod_1.z.string().max(50).optional(),
    foil: zod_1.z.string().max(50).optional(),
    lotNo: zod_1.z.string().max(50).optional(),
    foilPoDate: zod_1.z.coerce.date().optional(),
    foilSize: zod_1.z.string().max(50).optional(),
    foilPoVendor: zod_1.z.string().max(100).optional(),
    foilBillDate: zod_1.z.coerce.date().optional(),
    foilQuantity: zod_1.z.number().int().positive().optional(),
    cartonPoDate: zod_1.z.coerce.date().optional(),
    cartonPoVendor: zod_1.z.string().max(100).optional(),
    cartonBillDate: zod_1.z.coerce.date().optional(),
    cartonQuantity: zod_1.z.number().int().positive().optional(),
    packingDate: zod_1.z.coerce.date().optional(),
    qtyPacked: zod_1.z.number().int().positive().optional(),
    noOfShippers: zod_1.z.number().int().positive().optional(),
    design: zod_1.z.string().max(500).optional(),
    invoiceNo: zod_1.z.string().max(50).optional(),
    invoiceDate: zod_1.z.coerce.date().optional(),
    changePart: zod_1.z.number().int().optional(),
    cyc: zod_1.z.number().int().optional(),
    advance: zod_1.z.number().optional(),
    foilQuantityOrdered: zod_1.z.number().int().positive().optional(),
    cartonQuantityOrdered: zod_1.z.number().int().positive().optional(),
});
// Bulk import request
exports.PPICBulkImportSchema = zod_1.z.object({
    file: zod_1.z.union([zod_1.z.instanceof(Buffer), zod_1.z.string()]),
    fileType: zod_1.z.enum(["xlsx", "csv", "json"]),
    mappingStrategy: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).optional(),
    autoDetectMapping: zod_1.z.boolean().default(true),
    skipOnError: zod_1.z.boolean().default(false),
    updateIfExists: zod_1.z.boolean().default(false),
});
// Field mapping configuration
exports.PPICFieldMappingSchema = zod_1.z.object({
    sheetColumns: zod_1.z.array(zod_1.z.string()).min(1),
    autoDetect: zod_1.z.boolean().default(true),
    customMappings: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).optional(),
    ignoreColumns: zod_1.z.array(zod_1.z.string()).optional(),
});
// Batch operation response
exports.PPICBatchResponseSchema = zod_1.z.object({
    batchId: zod_1.z.string().uuid(),
    totalRows: zod_1.z.number().int(),
    successCount: zod_1.z.number().int(),
    failureCount: zod_1.z.number().int(),
    status: zod_1.z.enum(["success", "partial", "failed"]),
    createdPOs: zod_1.z.array(zod_1.z.string()),
    errors: zod_1.z
        .array(zod_1.z.object({
        rowIndex: zod_1.z.number().int(),
        poNo: zod_1.z.string().optional(),
        errors: zod_1.z.array(zod_1.z.object({
            field: zod_1.z.string(),
            message: zod_1.z.string(),
            severity: zod_1.z.enum(["error", "warning"]),
        })),
    }))
        .optional(),
    processingTime: zod_1.z.number().int(),
    timestamp: zod_1.z.date(),
});
