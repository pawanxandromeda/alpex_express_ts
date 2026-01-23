"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.blacklistCustomer = exports.requestCreditApproval = exports.bulkCreateCustomers = exports.deleteCustomer = exports.updateCustomer = exports.getCustomerGSTList = exports.getAllCustomers = exports.loginCustomer = exports.createCustomer = void 0;
const postgres_1 = __importDefault(require("../../config/postgres"));
const errorMessages_1 = require("../../common/utils/errorMessages");
const createCustomer = async (data) => {
    const existing = await postgres_1.default.customer.findUnique({
        where: { gstrNo: data.gstrNo },
    });
    if (existing) {
        throw new errorMessages_1.AppError(errorMessages_1.ERROR_CODES.CUSTOMER_ALREADY_EXISTS);
    }
    // Direct mapping to match your Prisma schema
    return postgres_1.default.customer.create({
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
exports.createCustomer = createCustomer;
const loginCustomer = async (gstrNo, customerID) => {
    const customer = await postgres_1.default.customer.findFirst({
        where: { gstrNo },
    });
    if (!customer)
        throw new errorMessages_1.AppError(errorMessages_1.ERROR_CODES.CUSTOMER_NOT_FOUND);
    return customer;
};
exports.loginCustomer = loginCustomer;
const getAllCustomers = async () => {
    return postgres_1.default.customer.findMany({
        select: {
            id: true,
            customerName: true,
            address: true,
            creditLimit: true,
            paymentTerms: true,
            throughVia: true,
            gstrNo: true,
            kycProfile: true,
            contacts: true,
            isBlacklisted: true,
            relationshipStatus: true,
            gstCopy: true,
            dlExpiry: true,
            createdAt: true,
            updatedAt: true
        }
    });
};
exports.getAllCustomers = getAllCustomers;
const getCustomerGSTList = async () => {
    return postgres_1.default.customer.findMany({
        select: {
            gstrNo: true,
            kycProfile: true,
            customerName: true,
        },
    });
};
exports.getCustomerGSTList = getCustomerGSTList;
const updateCustomer = async (id, data) => {
    const customer = await postgres_1.default.customer.findUnique({
        where: { id },
    });
    if (!customer) {
        throw new errorMessages_1.AppError(errorMessages_1.ERROR_CODES.CUSTOMER_NOT_FOUND);
    }
    return postgres_1.default.customer.update({
        where: { id },
        data,
    });
};
exports.updateCustomer = updateCustomer;
const deleteCustomer = async (id) => {
    const customer = await postgres_1.default.customer.findUnique({
        where: { id },
    });
    if (!customer) {
        throw new errorMessages_1.AppError(errorMessages_1.ERROR_CODES.CUSTOMER_NOT_FOUND);
    }
    return postgres_1.default.customer.delete({
        where: { id },
    });
};
exports.deleteCustomer = deleteCustomer;
function safeDate(value) {
    if (!value)
        return null;
    // Handle Mongo / Excel style objects
    if (typeof value === "object" && value.value) {
        value = value.value;
    }
    const date = new Date(value);
    if (isNaN(date.getTime()) ||
        date.getFullYear() > 2100 ||
        date.getFullYear() < 1900) {
        return null;
    }
    return date;
}
const bulkCreateCustomers = async (customers) => {
    const transformedCustomers = customers.map(customer => {
        // Start with existing contacts if provided
        const contacts = Array.isArray(customer.contacts) ? [...customer.contacts] : [];
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
    return postgres_1.default.customer.createMany({
        data: transformedCustomers,
        skipDuplicates: true,
    });
};
exports.bulkCreateCustomers = bulkCreateCustomers;
const requestCreditApproval = async (customerId, creditLimit) => {
    const customer = await postgres_1.default.customer.findUnique({
        where: { id: customerId },
    });
    if (!customer)
        throw new errorMessages_1.AppError(errorMessages_1.ERROR_CODES.CUSTOMER_NOT_FOUND);
    if (customer.isBlacklisted) {
        throw new errorMessages_1.AppError(errorMessages_1.ERROR_CODES.BLACKLISTED_CUSTOMER, "This customer is blacklisted and cannot request credit approval.");
    }
    return postgres_1.default.customer.update({
        where: { id: customerId },
        data: {
            creditLimit,
            creditApprovalStatus: "Pending",
        },
    });
};
exports.requestCreditApproval = requestCreditApproval;
const blacklistCustomer = async (customerId, blacklistReason) => {
    const customer = await postgres_1.default.customer.findUnique({
        where: { id: customerId },
    });
    if (!customer)
        throw new errorMessages_1.AppError(errorMessages_1.ERROR_CODES.CUSTOMER_NOT_FOUND);
    return postgres_1.default.customer.update({
        where: { id: customerId },
        data: {
            isBlacklisted: true,
            blacklistReason: blacklistReason,
            blacklistedAt: new Date(),
        },
    });
};
exports.blacklistCustomer = blacklistCustomer;
