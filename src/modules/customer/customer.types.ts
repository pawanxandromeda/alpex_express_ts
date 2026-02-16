// src/modules/customer/customer.types.ts

export interface BackendCustomer {
  id: string;
  customerName: string;
  address?: string;
  creditLimit: number;
  creditApprovalStatus: string;
  paymentTerms: string;
  throughVia?: string;
  gstrNo: string;
  createdByEmployeeId?: string;
  kycProfile?: string | null;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  contacts?: any;
  remarks?: string;
  relationshipStatus?: string | null;
  gstCopy?: string | null;
  drugLicense?: string;
  dlExpiry?: Date | string | null;
  isBlacklisted: boolean;
  blacklistReason?: string | null;
  blacklistedAt?: Date | null;
  annualTurnover?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateCustomerDto {
  customerName: string;
  gstrNo: string;
  paymentTerms?: string;
  throughVia?: string;
  drugLicense?: string;
  dlExpiry?: string;
  address?: string;
  creditLimit?: number;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  contacts?: Array<{
    name?: string;
    phone?: string;
    email?: string;
    role?: string;
  }>;
  remarks?: string;
  relationshipStatus?: string;
  isBlacklisted?: boolean;
  blacklistReason?: string;
  kycProfile?: string;
  gstCopy?: string;
  annualTurnover?: string;
}

export interface ImportMappings {
  customerName: string;
  gstrNo: string;
  paymentTerms: string;
  throughVia: string;
  drugLicense: string;
  dlExpiry: string;
  address: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  [key: string]: string;
}

export interface ImportResult {
  success: boolean;
  message: string;
  data?: {
    totalRows: number;
    inserted: number;
    skipped: number;
  };
  error?: {
    code: string;
    message?: string;
  };
}

export interface GSTLookupResult {
  success: boolean;
  message: string;
  data?: Partial<BackendCustomer>;
}

export interface CreditApprovalRequest {
  customerId: string;
  creditLimit: number;
}

export interface BlacklistRequest {
  customerId: string;
  blacklistReason: string;
}

export interface Contact {
  name?: string;
  phone?: string;
  email?: string;
  role?: string;
}
