import { z } from "zod";

/**
 * PPIC Validation Schemas
 * Comprehensive validation for bulk import operations
 */

// Single row validation
export const PPICRowSchema = z.object({
  poNo: z.string().min(1).max(50),
  gstNo: z.string().regex(/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z0-9]{3}$/).optional(),
  poDate: z.coerce.date().optional(),
  dispatchDate: z.coerce.date().optional(),
  brandName: z.string().max(100).optional(),
  partyName: z.string().max(100).optional(),
  batchNo: z.string().max(50).optional(),
  paymentTerms: z.string().max(100).optional(),
  invCha: z.string().max(100).optional(),
  cylChar: z.string().max(100).optional(),
  orderThrough: z.string().max(100).optional(),
  address: z.string().max(500).optional(),
  composition: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
  rmStatus: z.string().max(50).optional(),
  poQty: z.string().optional(),
  poRate: z.string().optional(),
  amount: z.string().optional(),
  mrp: z.string().optional(),
  section: z.string().max(50).optional(),
  specialRequirements: z.string().max(500).optional(),
  tabletCapsuleDrySyrupBottle: z.string().max(100).optional(),
  roundOvalTablet: z.string().max(100).optional(),
  tabletColour: z.string().max(50).optional(),
  aluAluBlisterStripBottle: z.string().max(100).optional(),
  packStyle: z.string().max(100).optional(),
  productNewOld: z.string().max(50).optional(),
  qaObservations: z.string().max(500).optional(),
  batchQty: z.string().optional(),
  expiry: z.coerce.date().optional(),
  pvcColourBase: z.string().max(50).optional(),
  foil: z.string().max(50).optional(),
  lotNo: z.string().max(50).optional(),
  foilPoDate: z.coerce.date().optional(),
  foilSize: z.string().max(50).optional(),
  foilPoVendor: z.string().max(100).optional(),
  foilBillDate: z.coerce.date().optional(),
  foilQuantity: z.number().int().positive().optional(),
  cartonPoDate: z.coerce.date().optional(),
  cartonPoVendor: z.string().max(100).optional(),
  cartonBillDate: z.coerce.date().optional(),
  cartonQuantity: z.number().int().positive().optional(),
  packingDate: z.coerce.date().optional(),
  qtyPacked: z.number().int().positive().optional(),
  noOfShippers: z.number().int().positive().optional(),
  design: z.string().max(500).optional(),
  invoiceNo: z.string().max(50).optional(),
  invoiceDate: z.coerce.date().optional(),
  changePart: z.number().int().optional(),
  cyc: z.number().int().optional(),
  advance: z.number().optional(),
  foilQuantityOrdered: z.number().int().positive().optional(),
  cartonQuantityOrdered: z.number().int().positive().optional(),
});

// Bulk import request
export const PPICBulkImportSchema = z.object({
  file: z.union([z.instanceof(Buffer), z.string()]),
  fileType: z.enum(["xlsx", "csv", "json"]),
  mappingStrategy: z.record(z.string(), z.string()).optional(),
  autoDetectMapping: z.boolean().default(true),
  skipOnError: z.boolean().default(false),
  updateIfExists: z.boolean().default(false),
});

// Field mapping configuration
export const PPICFieldMappingSchema = z.object({
  sheetColumns: z.array(z.string()).min(1),
  autoDetect: z.boolean().default(true),
  customMappings: z.record(z.string(), z.string()).optional(),
  ignoreColumns: z.array(z.string()).optional(),
});

// Batch operation response
export const PPICBatchResponseSchema = z.object({
  batchId: z.string().uuid(),
  totalRows: z.number().int(),
  successCount: z.number().int(),
  failureCount: z.number().int(),
  status: z.enum(["success", "partial", "failed"]),
  createdPOs: z.array(z.string()),
  errors: z
    .array(
      z.object({
        rowIndex: z.number().int(),
        poNo: z.string().optional(),
        errors: z.array(
          z.object({
            field: z.string(),
            message: z.string(),
            severity: z.enum(["error", "warning"]),
          })
        ),
      })
    )
    .optional(),
  processingTime: z.number().int(),
  timestamp: z.date(),
});

export type PPICRow = z.infer<typeof PPICRowSchema>;
export type PPICBulkImport = z.infer<typeof PPICBulkImportSchema>;
export type PPICFieldMapping = z.infer<typeof PPICFieldMappingSchema>;
export type PPICBatchResponse = z.infer<typeof PPICBatchResponseSchema>;
