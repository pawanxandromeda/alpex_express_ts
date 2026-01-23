import prisma from "../../config/postgres";
import { AppError, ERROR_CODES } from "../../common/utils/errorMessages";

export const createCustomer = async (data: any) => {
  const existing = await prisma.customer.findUnique({
    where: { gstrNo: data.gstrNo },
  });

  if (existing) {
    throw new AppError(ERROR_CODES.CUSTOMER_ALREADY_EXISTS);
  }

  // Direct mapping to match your Prisma schema
  return prisma.customer.create({
    data: {
      customerName: data.customerName,
      gstrNo: data.gstrNo,
      paymentTerms: data.paymentTerms || "Cash",
      throughVia: data.throughVia || null,
      drugLicense: data.drugLicense || null, // Use drugLicense (not drugLicenseNumber)
      dlExpiry: data.dlExpiry ? new Date(data.dlExpiry) : null, // Use dlExpiry (not drugLicenseExpiry)
      address: data.address || null,
      contacts: data.contacts || [],
      remarks: data.remarks || null,
      relationshipStatus: data.relationshipStatus || "Moderate",
      isBlacklisted: data.isBlacklisted || false,
      blacklistReason: data.blacklistReason || null,
      creditLimit: data.creditLimit || 0,
      contactName: data.contactName || null,
      contactPhone: data.contactPhone || null,
      contactEmail: data.contactEmail || null,
      creditApprovalStatus: "Pending", // Default from schema
      kycProfile: data.kycProfile || null,
      gstCopy: data.gstCopy || null,
    }
  });
};
export const loginCustomer = async (gstrNo: string, customerID: string) => {
  const customer = await prisma.customer.findFirst({
    where: { gstrNo},
  });

  if (!customer) throw new AppError(ERROR_CODES.CUSTOMER_NOT_FOUND);

  return customer;
};

export const getAllCustomers = async () => {
  return prisma.customer.findMany({
    select: {
      id: true,
      
      customerName: true,
      address: true,
      creditLimit: true,
      paymentTerms: true,
      throughVia: true,
      gstrNo: true,
      kycProfile: true,
      contacts:true,
      isBlacklisted: true,
      relationshipStatus: true,
      gstCopy: true,
      dlExpiry: true,
      createdAt: true,
      updatedAt: true
    }
  });
};


export const getCustomerGSTList = async () => {
  return prisma.customer.findMany({
    select: {
      gstrNo: true,
      kycProfile: true,
      customerName: true,
    },
  });
};

export const updateCustomer = async (id: string, data: any) => {
  const customer = await prisma.customer.findUnique({
    where: { id },
  });

  if (!customer) {
    throw new AppError(ERROR_CODES.CUSTOMER_NOT_FOUND);
  }

  return prisma.customer.update({
    where: { id },
    data,
  });
};

export const deleteCustomer = async (id: string) => {
  const customer = await prisma.customer.findUnique({
    where: { id },
  });

  if (!customer) {
    throw new AppError(ERROR_CODES.CUSTOMER_NOT_FOUND);
  }

  return prisma.customer.delete({
    where: { id },
  });
};
function safeDate(value: any): Date | null {
  if (!value) return null;

  // Handle Mongo / Excel style objects
  if (typeof value === "object" && value.value) {
    value = value.value;
  }

  const date = new Date(value);

  if (
    isNaN(date.getTime()) ||
    date.getFullYear() > 2100 ||
    date.getFullYear() < 1900
  ) {
    return null;
  }

  return date;
}


export const bulkCreateCustomers = async (customers: any[]) => {
  const transformedCustomers = customers.map(customer => {
    // Start with existing contacts if provided
    const contacts: any[] = Array.isArray(customer.contacts) ? [...customer.contacts] : [];

    // Merge standalone contact fields into contacts array
    if (customer.contactName || customer.contactEmail || customer.contactPhone) {
      contacts.push({
        name: customer.contactName || null,
        email: customer.contactEmail || null,
        phone: customer.contactPhone || null,
        role: customer.contactRole || null, // optional role field
      });
    }

    return {
      customerName: customer.customerName,
      gstrNo: customer.gstrNo || null,
      paymentTerms: customer.paymentTerms || "Cash",
      throughVia: customer.throughVia || null,
      drugLicense: customer.drugLicense || null,
      dlExpiry: safeDate(customer.dlExpiry),
      address: customer.address || null,
      contacts: JSON.stringify(contacts), // ✅ save as JSON string
      remarks: customer.remarks || null,
      relationshipStatus: customer.relationshipStatus || "Moderate",
      isBlacklisted: Boolean(customer.isBlacklisted),
      blacklistReason: customer.blacklistReason || null,
      creditLimit: Number(customer.creditLimit) || 0,
      kycProfile: customer.kycProfile || null,
      creditApprovalStatus: "Pending",
      gstCopy: customer.gstCopy || null,
    };
  });

  return prisma.customer.createMany({
    data: transformedCustomers,
    skipDuplicates: true,
  });
};

export const requestCreditApproval = async (
  customerId: string,
  creditLimit: number
) => {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });

  if (!customer) throw new AppError(ERROR_CODES.CUSTOMER_NOT_FOUND);

  if (customer.isBlacklisted) {
    throw new AppError(ERROR_CODES.BLACKLISTED_CUSTOMER, "This customer is blacklisted and cannot request credit approval.");
  }

  return prisma.customer.update({
    where: { id: customerId },
    data: {
      creditLimit,
      creditApprovalStatus: "Pending",
    },
  });
};


export const blacklistCustomer = async (
  customerId: string,
  blacklistReason: string
) => {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });

  if (!customer) throw new AppError(ERROR_CODES.CUSTOMER_NOT_FOUND);

  return prisma.customer.update({
    where: { id: customerId },
    data: {
      isBlacklisted: true,
      blacklistReason: blacklistReason,
      blacklistedAt: new Date(),
    },
  });
};


