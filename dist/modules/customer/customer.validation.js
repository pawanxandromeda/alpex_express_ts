"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCustomerSchema = exports.createCustomerSchema = void 0;
// In customer.validation.ts
const zod_1 = require("zod");
exports.createCustomerSchema = zod_1.z.object({
    customerName: zod_1.z.string().min(1, "Customer name is required"),
    gstrNo: zod_1.z.string().min(1, "GST number is required"),
    paymentTerms: zod_1.z.string().default("Cash"),
    throughVia: zod_1.z.string().optional(),
    drugLicense: zod_1.z.string().optional(), // Changed from drugLicenseNumber
    dlExpiry: zod_1.z.string().optional(), // Changed from drugLicenseExpiry
    address: zod_1.z.string().optional(),
    contactName: zod_1.z.string().optional(),
    contactPhone: zod_1.z.string().optional(),
    contactEmail: zod_1.z.string().optional(),
    contacts: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        phone: zod_1.z.string(),
        email: zod_1.z.string(),
        role: zod_1.z.string()
    })).optional(),
    remarks: zod_1.z.string().optional(),
    relationshipStatus: zod_1.z.string().default("Moderate"),
    isBlacklisted: zod_1.z.boolean().default(false),
    blacklistReason: zod_1.z.string().optional(),
    creditLimit: zod_1.z.number().default(0),
    kycProfile: zod_1.z.string().optional(),
});
exports.updateCustomerSchema = exports.createCustomerSchema.partial();
