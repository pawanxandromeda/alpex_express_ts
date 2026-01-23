"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.blacklistCustomer = exports.requestCreditApproval = exports.exportCustomers = exports.importCustomers = exports.deleteCustomer = exports.updateCustomer = exports.getGSTCustomers = exports.getCustomers = exports.verifyToken = exports.loginCustomer = exports.createCustomer = void 0;
const service = __importStar(require("./customer.service"));
const customer_validation_1 = require("./customer.validation");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const xlsx_1 = __importDefault(require("xlsx"));
const customer_import_utils_1 = require("./../../common/utils/customer.import.utils");
const responseFormatter_1 = require("../../common/utils/responseFormatter");
const errorMessages_1 = require("../../common/utils/errorMessages");
const createCustomer = async (req, res) => {
    try {
        const payload = customer_validation_1.createCustomerSchema.parse(req.body);
        const customer = await service.createCustomer(payload);
        return (0, responseFormatter_1.sendSuccess)(res, customer, "Customer created successfully", 201);
    }
    catch (err) {
        return (0, responseFormatter_1.handleError)(res, err);
    }
};
exports.createCustomer = createCustomer;
const loginCustomer = async (req, res) => {
    try {
        const { gstrNo, customerID } = req.body;
        const customer = await service.loginCustomer(gstrNo, customerID);
        const token = jsonwebtoken_1.default.sign({ customerId: customer.id }, process.env.JWT_SECRET, { expiresIn: "1d" });
        return (0, responseFormatter_1.sendSuccess)(res, { token }, "Login successful", 200);
    }
    catch (err) {
        return (0, responseFormatter_1.handleError)(res, err);
    }
};
exports.loginCustomer = loginCustomer;
const verifyToken = (req, res) => {
    try {
        const decoded = jsonwebtoken_1.default.verify(req.body.token, process.env.JWT_SECRET);
        res.json({ valid: true, decoded });
    }
    catch {
        res.status(401).json({ valid: false });
    }
};
exports.verifyToken = verifyToken;
const getCustomers = async (_, res) => {
    const customers = await service.getAllCustomers();
    res.encryptAndSend(customers);
};
exports.getCustomers = getCustomers;
const getGSTCustomers = async (_, res) => {
    res.json(await service.getCustomerGSTList());
};
exports.getGSTCustomers = getGSTCustomers;
const updateCustomer = async (req, res) => {
    try {
        const payload = customer_validation_1.updateCustomerSchema.parse(req.body);
        const customer = await service.updateCustomer(req.params.id, payload);
        return (0, responseFormatter_1.sendSuccess)(res, customer, "Customer updated successfully", 200);
    }
    catch (err) {
        return (0, responseFormatter_1.handleError)(res, err);
    }
};
exports.updateCustomer = updateCustomer;
const deleteCustomer = async (req, res) => {
    try {
        await service.deleteCustomer(req.params.id);
        return (0, responseFormatter_1.sendSuccess)(res, null, "Customer deleted successfully", 200);
    }
    catch (err) {
        return (0, responseFormatter_1.handleError)(res, err);
    }
};
exports.deleteCustomer = deleteCustomer;
const importCustomers = async (req, res) => {
    try {
        let mappings = req.body.mappings;
        if (!mappings) {
            return (0, responseFormatter_1.sendError)(res, errorMessages_1.ERROR_CODES.MAPPINGS_REQUIRED);
        }
        if (typeof mappings === "string") {
            mappings = JSON.parse(mappings);
        }
        const file = req.file;
        if (!file) {
            return (0, responseFormatter_1.sendError)(res, errorMessages_1.ERROR_CODES.FILE_REQUIRED);
        }
        const workbook = xlsx_1.default.read(file.buffer, { type: "buffer" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = xlsx_1.default.utils.sheet_to_json(sheet, { defval: null });
        if (!rows.length) {
            return (0, responseFormatter_1.sendError)(res, errorMessages_1.ERROR_CODES.EMPTY_FILE);
        }
        const customers = rows
            .map((row) => {
            const record = {};
            Object.entries(mappings).forEach(([dbField, excelHeader]) => {
                const raw = row[excelHeader];
                switch (dbField) {
                    case "contactPhone":
                        record.contactPhone = (0, customer_import_utils_1.normalizePhones)(raw)[0] || null;
                        break;
                    case "contactEmail":
                        record.contactEmail = (0, customer_import_utils_1.normalizeEmails)(raw)[0] || null;
                        break;
                    case "contacts":
                        record.contacts = (0, customer_import_utils_1.parseContacts)(row);
                        break;
                    case "creditLimit":
                        record.creditLimit = (0, customer_import_utils_1.normalizeNumber)(raw);
                        break;
                    case "dlExpiry":
                        record.dlExpiry = (0, customer_import_utils_1.normalizeDate)(raw);
                        break;
                    default:
                        record[dbField] = (0, customer_import_utils_1.toSafeString)(raw);
                }
            });
            if (!record.customerName || !record.gstrNo)
                return null;
            return record;
        })
            .filter(Boolean);
        if (!customers.length) {
            return (0, responseFormatter_1.sendError)(res, errorMessages_1.ERROR_CODES.NO_VALID_RECORDS);
        }
        const result = await service.bulkCreateCustomers(customers);
        const response = {
            success: true,
            message: "Bulk customer import completed",
            data: {
                totalRows: rows.length,
                inserted: result.count,
                skipped: rows.length - result.count,
            },
        };
        if (result.count < customers.length) {
            return (0, responseFormatter_1.sendSuccess)(res, response.data, errorMessages_1.ERROR_CODES.IMPORT_PARTIAL_SUCCESS, 200);
        }
        return (0, responseFormatter_1.sendSuccess)(res, response.data, "All customers imported successfully", 200);
    }
    catch (error) {
        console.error("Customer Import Error:", error);
        return (0, responseFormatter_1.handleError)(res, error);
    }
};
exports.importCustomers = importCustomers;
const exportCustomers = async (_, res) => {
    const customers = await service.getAllCustomers();
    const worksheet = xlsx_1.default.utils.json_to_sheet(customers);
    const workbook = xlsx_1.default.utils.book_new();
    xlsx_1.default.utils.book_append_sheet(workbook, worksheet, "Customers");
    const buffer = xlsx_1.default.write(workbook, {
        type: "buffer",
        bookType: "xlsx",
    });
    res.setHeader("Content-Disposition", "attachment; filename=customers.xlsx");
    res.send(buffer);
};
exports.exportCustomers = exportCustomers;
const requestCreditApproval = async (req, res) => {
    try {
        const { customerId, creditLimit } = req.body;
        if (!customerId || !creditLimit) {
            return (0, responseFormatter_1.sendError)(res, errorMessages_1.ERROR_CODES.MISSING_REQUIRED_FIELD);
        }
        const updatedCustomer = await service.requestCreditApproval(customerId, creditLimit);
        return (0, responseFormatter_1.sendSuccess)(res, updatedCustomer, "Credit approval request submitted successfully", 200);
    }
    catch (err) {
        return (0, responseFormatter_1.handleError)(res, err);
    }
};
exports.requestCreditApproval = requestCreditApproval;
const blacklistCustomer = async (req, res) => {
    try {
        const { customerId, blacklistReason } = req.body;
        if (!customerId || !blacklistReason) {
            return (0, responseFormatter_1.sendError)(res, errorMessages_1.ERROR_CODES.MISSING_REQUIRED_FIELD);
        }
        const updatedCustomer = await service.blacklistCustomer(customerId, blacklistReason);
        return (0, responseFormatter_1.sendSuccess)(res, updatedCustomer, "Customer has been blacklisted successfully", 200);
    }
    catch (err) {
        return (0, responseFormatter_1.handleError)(res, err);
    }
};
exports.blacklistCustomer = blacklistCustomer;
