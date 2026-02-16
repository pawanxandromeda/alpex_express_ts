// In customer.validation.ts
import { z } from 'zod';

export const createCustomerSchema = z.object({
  annualTurnover: z.string().optional(),
  customerName: z.string().min(1, "Customer name is required"),
  gstrNo: z.string().min(1, "GST number is required"),
  paymentTerms: z.string().default("Cash"),
  throughVia: z.string().optional(),
  drugLicense: z.string().optional(),
  dlExpiry: z.string().optional(),
  address: z.string().optional(),
  creditLimit: z.number().optional().default(0),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().optional(),
  contacts: z.array(z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    role: z.string().optional()
  })).optional(),
  remarks: z.string().optional(),
  relationshipStatus: z.string().optional(),
  isBlacklisted: z.boolean().optional().default(false),
  blacklistReason: z.string().optional(),
  kycProfile: z.string().optional(),
  gstCopy: z.string().optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const creditApprovalSchema = z.object({
  customerId: z.string().min(1, "Customer ID is required"),
  creditLimit: z.number().positive("Credit limit must be positive"),
});

export const blacklistCustomerSchema = z.object({
  customerId: z.string().min(1, "Customer ID is required"),
  blacklistReason: z.string().min(1, "Blacklist reason is required"),
});