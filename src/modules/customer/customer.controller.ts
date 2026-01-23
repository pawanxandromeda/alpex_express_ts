import { Request, Response } from "express";
import * as service from "./customer.service";
import { createCustomerSchema, updateCustomerSchema } from "./customer.validation";
import jwt from "jsonwebtoken";
import XLSX from "xlsx";
import {
  toSafeString,
  normalizeNumber,
  normalizeDate,
  normalizePhones,
  normalizeEmails,
  parseContacts,
} from "./../../common/utils/customer.import.utils";
import { sendSuccess, sendError, handleError } from "../../common/utils/responseFormatter";
import { ERROR_CODES } from "../../common/utils/errorMessages";


export const createCustomer = async (req: Request, res: Response) => {
  try {
    const payload = createCustomerSchema.parse(req.body);
    const customer = await service.createCustomer(payload);
    return sendSuccess(res, customer, "Customer created successfully", 201);
  } catch (err: any) {
    return handleError(res, err);
  }
};

export const loginCustomer = async (req: Request, res: Response) => {
  try {
    const { gstrNo, customerID } = req.body;

    const customer = await service.loginCustomer(gstrNo, customerID);

    const token = jwt.sign(
      { customerId: customer.id },
      process.env.JWT_SECRET!,
      { expiresIn: "1d" }
    );

    return sendSuccess(res, { token }, "Login successful", 200);
  } catch (err: any) {
    return handleError(res, err);
  }
};

export const verifyToken = (req: Request, res: Response) => {
  try {
    const decoded = jwt.verify(req.body.token, process.env.JWT_SECRET!);
    res.json({ valid: true, decoded });
  } catch {
    res.status(401).json({ valid: false });
  }
};

export const getCustomers = async (_: Request, res: Response) => {
  const customers = await service.getAllCustomers();
  (res as any).encryptAndSend(customers);
};

export const getGSTCustomers = async (_: Request, res: Response) => {
  res.json(await service.getCustomerGSTList());
};

export const updateCustomer = async (req: Request, res: Response) => {
  try {
    const payload = updateCustomerSchema.parse(req.body);
    const customer = await service.updateCustomer(req.params.id as string, payload);
    return sendSuccess(res, customer, "Customer updated successfully", 200);
  } catch (err: any) {
    return handleError(res, err);
  }
};

export const deleteCustomer = async (req: Request, res: Response) => {
  try {
    await service.deleteCustomer(req.params.id as string);
    return sendSuccess(res, null, "Customer deleted successfully", 200);
  } catch (err: any) {
    return handleError(res, err);
  }
};

export const importCustomers = async (req: Request, res: Response) => {
  try {
    let mappings: any = req.body.mappings;

    if (!mappings) {
      return sendError(res, ERROR_CODES.MAPPINGS_REQUIRED);
    }

    if (typeof mappings === "string") {
      mappings = JSON.parse(mappings);
    }

    const file = req.file;
    if (!file) {
      return sendError(res, ERROR_CODES.FILE_REQUIRED);
    }

    const workbook = XLSX.read(file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: null });

    if (!rows.length) {
      return sendError(res, ERROR_CODES.EMPTY_FILE);
    }

    const customers = rows
      .map((row) => {
        const record: any = {};

        Object.entries(mappings).forEach(([dbField, excelHeader]) => {
          const raw = row[excelHeader as string];

          switch (dbField) {
            case "contactPhone":
              record.contactPhone = normalizePhones(raw)[0] || null;
              break;

            case "contactEmail":
              record.contactEmail = normalizeEmails(raw)[0] || null;
              break;

            case "contacts":
              record.contacts = parseContacts(row);
              break;

            case "creditLimit":
              record.creditLimit = normalizeNumber(raw);
              break;

            case "dlExpiry":
              record.dlExpiry = normalizeDate(raw);
              break;

            default:
              record[dbField] = toSafeString(raw);
          }
        });

        if (!record.customerName || !record.gstrNo) return null;
        return record;
      })
      .filter(Boolean);

    if (!customers.length) {
      return sendError(res, ERROR_CODES.NO_VALID_RECORDS);
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
      return sendSuccess(res, response.data, ERROR_CODES.IMPORT_PARTIAL_SUCCESS, 200);
    }

    return sendSuccess(res, response.data, "All customers imported successfully", 200);
  } catch (error: any) {
    console.error("Customer Import Error:", error);
    return handleError(res, error);
  }
};


export const exportCustomers = async (_: Request, res: Response) => {
  const customers = await service.getAllCustomers();

  const worksheet = XLSX.utils.json_to_sheet(customers);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");

  const buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });

  res.setHeader(
    "Content-Disposition",
    "attachment; filename=customers.xlsx"
  );
  res.send(buffer);
};

export const requestCreditApproval = async (req: Request, res: Response) => {
  try {
    const { customerId, creditLimit } = req.body;

    if (!customerId || !creditLimit) {
      return sendError(res, ERROR_CODES.MISSING_REQUIRED_FIELD);
    }

    const updatedCustomer = await service.requestCreditApproval(customerId, creditLimit);

    return sendSuccess(res, updatedCustomer, "Credit approval request submitted successfully", 200);
  } catch (err: any) {
    return handleError(res, err);
  }
};

export const blacklistCustomer = async (req: Request, res: Response) => {
  try {
    const { customerId, blacklistReason } = req.body;

    if (!customerId || !blacklistReason) {
      return sendError(res, ERROR_CODES.MISSING_REQUIRED_FIELD);
    }

    const updatedCustomer = await service.blacklistCustomer(customerId, blacklistReason);

    return sendSuccess(res, updatedCustomer, "Customer has been blacklisted successfully", 200);
  } catch (err: any) {
    return handleError(res, err);
  }
};
