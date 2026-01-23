// In customer.validation.ts
import { z } from 'zod';

export const createCustomerSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  gstrNo: z.string().min(1, "GST number is required"),
  paymentTerms: z.string().default("Cash"),
  throughVia: z.string().optional(),
  drugLicense: z.string().optional(), // Changed from drugLicenseNumber
  dlExpiry: z.string().optional(), // Changed from drugLicenseExpiry
  address: z.string().optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().optional(),
  contacts: z.array(z.object({
    name: z.string(),
    phone: z.string(),
    email: z.string(),
    role: z.string()
  })).optional(),
  remarks: z.string().optional(),
  relationshipStatus: z.string().default("Moderate"),
  isBlacklisted: z.boolean().default(false),
  blacklistReason: z.string().optional(),
  creditLimit: z.number().default(0),
  kycProfile: z.string().optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();