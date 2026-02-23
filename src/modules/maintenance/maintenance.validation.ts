import Joi from "joi";

// ============ MACHINE SCHEMAS ============

export const createMachineTypeSchema = Joi.object({
  name: Joi.string().required(),
  code: Joi.string().required(),
  category: Joi.string().required(),
  description: Joi.string().optional(),
  manufacturer: Joi.string().optional(),
  modelNumber: Joi.string().optional(),
  capacity: Joi.string().optional(),
  powerRequirement: Joi.string().optional(),
  maintenanceFrequency: Joi.string().optional(),
  customFieldStructure: Joi.object().optional(),
});

export const createMachineSchema = Joi.object({
  name: Joi.string().required(),
  code: Joi.string().required(),
  machineTypeId: Joi.string().required(),
  serialNumber: Joi.string().optional(),
  location: Joi.string().required(),
  department: Joi.string().required(),
  purchaseDate: Joi.date().optional(),
  purchasePrice: Joi.number().optional(),
  supplier: Joi.string().optional(),
  warrantyExpiry: Joi.date().optional(),
  installationDate: Joi.date().optional(),
  documentation: Joi.string().optional(),
  powerRequirement: Joi.string().optional(),
  spaceRequired: Joi.string().optional(),
  customFields: Joi.object().optional(),
});

export const updateMachineSchema = Joi.object({
  name: Joi.string().optional(),
  location: Joi.string().optional(),
  department: Joi.string().optional(),
  status: Joi.string().optional(),
  lastMaintenanceDate: Joi.date().optional(),
  nextScheduledMaintenance: Joi.date().optional(),
  operatingHours: Joi.number().optional(),
  utilizationRate: Joi.number().optional(),
  assignedToEmployeeId: Joi.string().optional(),
  customFields: Joi.object().optional(),
});

export const updateMachineStatusSchema = Joi.object({
  status: Joi.string()
    .valid("Operational", "UnderMaintenance", "Breakdown", "Inactive", "Reserved")
    .required(),
  currentActivity: Joi.string().optional(),
});

// ============ MAINTENANCE SCHEMAS ============

export const createMaintenanceRecordSchema = Joi.object({
  machineId: Joi.string().required(),
  maintenanceType: Joi.string()
    .valid("Preventive", "Corrective", "Predictive", "Emergency")
    .required(),
  scheduledDate: Joi.date().required(),
  description: Joi.string().required(),
  assignedToEmployeeId: Joi.string().optional(),
  estimatedDurationHours: Joi.number().optional(),
});

export const completeMaintenanceSchema = Joi.object({
  completionDate: Joi.date().required(),
  findings: Joi.string().required(),
  workDone: Joi.string().required(),
  actualDurationHours: Joi.number().required(),
  downtime: Joi.number().optional(),
  laborCost: Joi.number().optional(),
  materialCost: Joi.number().optional(),
  nextMaintenanceDate: Joi.date().optional(),
  partsUsed: Joi.array()
    .items(
      Joi.object({
        partId: Joi.string().required(),
        quantityUsed: Joi.number().required(),
        unitCost: Joi.number().optional(),
      })
    )
    .optional(),
  brokenParts: Joi.array()
    .items(
      Joi.object({
        partId: Joi.string().optional(),
        partName: Joi.string().required(),
        originalQuantity: Joi.number().required(),
        disposition: Joi.string().required(),
        dispositionNotes: Joi.string().optional(),
      })
    )
    .optional(),
});

// ============ PARTS SCHEMAS ============

export const createPartSchema = Joi.object({
  name: Joi.string().required(),
  code: Joi.string().required(),
  description: Joi.string().optional(),
  category: Joi.string().required(),
  partNumber: Joi.string().optional(),
  manufacturer: Joi.string().optional(),
  supplierIds: Joi.array().items(Joi.string()).optional(),
  quantityInStock: Joi.number().optional(),
  minimumStock: Joi.number().optional(),
  reorderPoint: Joi.number().optional(),
  reorderQuantity: Joi.number().optional(),
  unitCost: Joi.number().optional(),
  sellingPrice: Joi.number().optional(),
});

export const createPartOrderSchema = Joi.object({
  partId: Joi.string().required(),
  supplierId: Joi.string().required(),
  supplierName: Joi.string().required(),
  quantity: Joi.number().required(),
  unitPrice: Joi.number().optional(),
  expectedDelivery: Joi.date().optional(),
  purchaseOrderNumber: Joi.string().optional(),
  notes: Joi.string().optional(),
});

export const receivePartOrderSchema = Joi.object({
  quantityReceived: Joi.number().required(),
});

// ============ FIXED ASSETS SCHEMAS ============

export const createFixedAssetSchema = Joi.object({
  name: Joi.string().required(),
  code: Joi.string().required(),
  assetCategory: Joi.string().required(),
  description: Joi.string().optional(),
  manufacturer: Joi.string().optional(),
  modelNumber: Joi.string().optional(),
  serialNumber: Joi.string().optional(),
  currentLocation: Joi.string().required(),
  quantity: Joi.number().optional(),
  minThreshold: Joi.number().optional(),
  purchaseDate: Joi.date().optional(),
  purchasePrice: Joi.number().optional(),
  supplier: Joi.string().optional(),
  condition: Joi.string().optional(),
  notes: Joi.string().optional(),
});

export const checkOutAssetSchema = Joi.object({
  usedByEmployeeId: Joi.string().optional(),
  usedBy: Joi.string().optional(),
  usedForMachineId: Joi.string().optional(),
  usedForDescription: Joi.string().optional(),
});

export const checkInAssetSchema = Joi.object({
  condition: Joi.string().optional(),
  notes: Joi.string().optional(),
});

// Validation Middleware Factory
export const validateSchema = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const messages = error.details.map((detail: any) => detail.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: messages,
      });
    }

    req.body = value;
    next();
  };
};

export default {
  createMachineTypeSchema,
  createMachineSchema,
  updateMachineSchema,
  updateMachineStatusSchema,
  createMaintenanceRecordSchema,
  completeMaintenanceSchema,
  createPartSchema,
  createPartOrderSchema,
  receivePartOrderSchema,
  createFixedAssetSchema,
  checkOutAssetSchema,
  checkInAssetSchema,
  validateSchema,
};
