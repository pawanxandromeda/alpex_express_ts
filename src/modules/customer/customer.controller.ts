import axios from "axios";

// API: Lookup customer data by GST from Excel

import { Request, Response } from "express";
import * as service from "./customer.service";
import { createCustomerSchema, updateCustomerSchema, creditApprovalSchema, blacklistCustomerSchema } from "./customer.validation";
import jwt from "jsonwebtoken";
import XLSX from "xlsx";
import {
  toSafeString,
  normalizeNumber,
  normalizeDate,
  normalizePhones,
  normalizeEmails,
  parseContacts,
  buildCustomerMapping,
} from "./../../common/utils/customer.import.utils";
import { sendSuccess, sendError, handleError } from "../../common/utils/responseFormatter";
import { ERROR_CODES } from "../../common/utils/errorMessages";
import { AuthRequest } from "../../common/middleware/auth.middleware";


export const createCustomer = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const payload = createCustomerSchema.parse(req.body);

    const customer = await service.createCustomer(
      payload,
      req.user.id,     
      req.user.name     
    );

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

export const getCustomers = async (req: AuthRequest, res: Response) => {
  if (!req.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const customer = await service.getAllCustomers(req.user.id, req.user.role);
  console.log("Fetched customer for user:", req.user.id, customer);
  (res as any).encryptAndSend(customer);
};


export const getGSTCustomers = async (_: Request, res: Response) => {
  res.json(await service.getCustomerGSTList());
};

export const updateCustomer = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const payload = updateCustomerSchema.parse(req.body);
    const customer = await service.updateCustomer(req.params.id as string, payload);
    return sendSuccess(res, customer, "Customer updated successfully", 200);
  } catch (err: any) {
    return handleError(res, err);
  }
};

export const deleteCustomer = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    await service.deleteCustomer(req.params.id as string);
    return sendSuccess(res, null, "Customer deleted successfully", 200);
  } catch (err: any) {
    return handleError(res, err);
  }
};

export const importCustomers = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    let mappings: any = req.body.mappings;

    const file = req.file;
    if (!file) {
      return sendError(res, ERROR_CODES.FILE_REQUIRED);
    }

    const workbook = XLSX.read(file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: null });

    // If mappings not provided, auto-detect using headers
    if (!mappings) {
      const headers = XLSX.utils.sheet_to_json<any>(sheet, { header: 1 })[0] || [];
      mappings = buildCustomerMapping(headers);
    }
    if (typeof mappings === "string") {
      mappings = JSON.parse(mappings);
    }

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

    const result = await service.bulkCreateCustomers(customers, req.user.id);

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



export const exportCustomers = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const customers = await service.getAllCustomers(req.user.id);

    if (!customers || customers.length === 0) {
      return res.status(404).json({ message: "No customers found" });
    }

    // Transform customers for export - include all fields
    const exportData = customers.map((customer: any) => ({
      id: customer.id,
      customerName: customer.customerName,
      address: customer.address || '',
      creditLimit: customer.creditLimit,
      paymentTerms: customer.paymentTerms,
      throughVia: customer.throughVia || '',
      gstrNo: customer.gstrNo,
      kycProfile: customer.kycProfile || '',
      isBlacklisted: customer.isBlacklisted ? 'Yes' : 'No',
      relationshipStatus: customer.relationshipStatus || '',
      gstCopy: customer.gstCopy || '',
      drugLicense: customer.drugLicense || '',
      dlExpiry: customer.dlExpiry ? new Date(customer.dlExpiry).toLocaleDateString() : '',
      contactName: customer.contactName || '',
      contactEmail: customer.contactEmail || '',
      contactPhone: customer.contactPhone || '',
      createdAt: new Date(customer.createdAt).toLocaleDateString(),
      updatedAt: new Date(customer.updatedAt).toLocaleDateString(),
    }));

    // XLSX expects array of objects
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="customers.xlsx"'
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.send(buffer);
  } catch (err: any) {
    return handleError(res, err);
  }
};

export const requestCreditApproval = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const payload = creditApprovalSchema.parse(req.body);
    const updatedCustomer = await service.requestCreditApproval(payload.customerId, payload.creditLimit);

    return sendSuccess(res, updatedCustomer, "Credit approval request submitted successfully", 200);
  } catch (err: any) {
    return handleError(res, err);
  }
};

export const blacklistCustomer = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const payload = blacklistCustomerSchema.parse(req.body);
    const updatedCustomer = await service.blacklistCustomer(payload.customerId, payload.blacklistReason);

    return sendSuccess(res, updatedCustomer, "Customer has been blacklisted successfully", 200);
  } catch (err: any) {
    return handleError(res, err);
  }
};



/* ─────────────────────────────────────────────
   HEADER NORMALIZER
───────────────────────────────────────────── */
const normalizeHeader = (h: string) =>
  h
    .toString()
    .replace(/\ufeff/g, "")
    .replace(/\r?\n|\r/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

/* ─────────────────────────────────────────────
   COLUMN KEYWORDS (SAFE & NON-CONFLICTING)
───────────────────────────────────────────── */
const COLUMN_KEYWORDS: Record<string, string[]> = {
  gst: ["gstin", "gstinuin", "receivergstin", "gst"],

  email: ["email", "emailid", "emailaddress", "mailid"],

  phone: ["mobile", "mobileno", "phoneno", "contactno", "tel"],

  address: [
    "address",
    "registeredaddress",
    "principalplace",
    "placeofbusiness",
  ],

  legalName: [
    "legalname",
    "legalbusinessname",
    "registeredname",
    "companyname",
  ],

  businessName: ["tradename", "businessname", "trade"],

  turnover: ["annualturnover", "turnover", "revenue"],

  promoters: [
    "promoter",
    "director",
    "partner",
    "owner",
    "proprietor",
  ],
};

/* ─────────────────────────────────────────────
   COLUMN DETECTION (SCORED MATCHING)
───────────────────────────────────────────── */
function detectColumns(headers: string[]) {
  const validHeaders = headers.filter(
    h => h && h.length > 1 && !/^[A-Z]$/.test(h)
  );

  const normalized = validHeaders.map(h => ({
    original: h,
    norm: normalizeHeader(h),
  }));

  const detected: Record<string, any> = {};

  for (const [field, keywords] of Object.entries(COLUMN_KEYWORDS)) {
    if (field === "promoters") {
      detected.promoters = normalized
        .filter(h => keywords.some(k => h.norm.includes(k)))
        .map(h => h.original);
    } else {
      const matches = normalized
        .map(h => ({
          header: h.original,
          score: keywords.filter(k => h.norm.includes(k)).length,
        }))
        .filter(m => m.score > 0)
        .sort((a, b) => b.score - a.score);

      if (matches.length) detected[field] = matches[0].header;
    }
  }

  return detected;
}

/* ─────────────────────────────────────────────
   VALUE BASED FALLBACKS
───────────────────────────────────────────── */
const isEmail = (v: any) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v?.toString() || "");

const isPhone = (v: any) =>
  /^[6-9]\d{9}$/.test(v?.toString().replace(/\D/g, "") || "");

function detectGSTColumnByValue(rows: any[]): string | null {
  const gstRegex =
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

  const keys = Object.keys(rows[0] || {});
  const sample = rows.slice(0, 25);

  for (const key of keys) {
    for (const row of sample) {
      const val = row[key]?.toString().replace(/\s/g, "").toUpperCase();
      if (gstRegex.test(val)) return key;
    }
  }
  return null;
}

/* ─────────────────────────────────────────────
   MAIN API
───────────────────────────────────────────── */
export const lookupCustomerByGST = async (req: Request, res: Response) => {
  try {
    const gstNo = (req.query.gstNo || req.body.gstNo || "")
      .toString()
      .replace(/\s/g, "")
      .toUpperCase();

    if (!gstNo) {
      return res.status(400).json({
        success: false,
        message: "GST number required",
      });
    }

    /* ───── LOAD EXCEL ───── */
    const excelUrl = process.env.CUSTOMER_REFERENCE_URL!;
    const response = await axios.get(excelUrl, {
      responseType: "arraybuffer",
      timeout: 8000,
    });

    const workbook = XLSX.read(response.data, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    const rawData = XLSX.utils.sheet_to_json<any>(sheet, { header: 1 });

    /* ───── FIND HEADER ROW ───── */
    let headerRowIndex = -1;
    let actualHeaderRow: string[] = [];

    for (let i = 0; i < Math.min(5, rawData.length); i++) {
      const rowStr = rawData[i].join(" ").toLowerCase();
      if (rowStr.includes("gst") || rowStr.includes("email")) {
        headerRowIndex = i;
        actualHeaderRow = rawData[i];
        break;
      }
    }

    if (!actualHeaderRow.length) {
      return res.status(500).json({
        success: false,
        message: "Header row not found",
      });
    }

    /* ───── BUILD ROW OBJECTS ───── */
    const rows = rawData
      .slice(headerRowIndex + 1)
      .map((row: any[]) => {
        const obj: Record<string, any> = {};
        actualHeaderRow.forEach((h, i) => {
          if (h && i < row.length) obj[h] = row[i];
        });
        return obj;
      })
      .filter(r => Object.keys(r).length);

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "No data rows found",
      });
    }

    /* ───── DETECT COLUMNS ───── */
    const columns = detectColumns(actualHeaderRow);

    let gstColumn = columns.gst || detectGSTColumnByValue(rows);
    if (!gstColumn) {
      return res.status(500).json({
        success: false,
        message: "GST column not detected",
      });
    }

    /* ───── FIND MATCH ───── */
    const match = rows.find(r =>
      r[gstColumn]
        ?.toString()
        .replace(/\s/g, "")
        .toUpperCase() === gstNo
    );

    if (!match) {
      return res.status(404).json({
        success: false,
        message: "GST not found",
      });
    }

    /* ───── VALUE FALLBACKS ───── */
    if (!columns.email) {
      columns.email = Object.keys(match).find(k => isEmail(match[k]));
    }

    if (!columns.phone) {
      columns.phone = Object.keys(match).find(k => isPhone(match[k]));
    }

    /* ───── PROMOTERS ───── */
    let promoters: string[] = [];
    if (Array.isArray(columns.promoters)) {
      promoters = columns.promoters
        .map(c => match[c])
        .filter(Boolean)
        .map(v => v.toString().trim());
    }

    /* ───── RESPONSE ───── */
    const data = {
      gstNo,
      legalName: columns.legalName ? match[columns.legalName] : null,
      businessName: columns.businessName ? match[columns.businessName] : null,
      annualTurnover: columns.turnover ? match[columns.turnover] : null,
      contactEmail: columns.email ? match[columns.email] : null,
      contactPhone: columns.phone
        ? match[columns.phone]?.toString().replace(/\D/g, "")
        : null,
      address: columns.address ? match[columns.address] : null,
      promoters,
    };

    return res.json({
      success: true,
      message: "GST data fetched successfully",
      data,
    });
  } catch (err) {
    console.error("❌ GST LOOKUP ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

export const bulkAssignCustomers = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { customerIds, assignedToEmployeeId, reason, remarks } = req.body;

    if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0) {
      return sendError(res, ERROR_CODES.VALIDATION_ERROR, "customerIds must be a non-empty array");
    }

    if (!assignedToEmployeeId) {
      return sendError(res, ERROR_CODES.MISSING_REQUIRED_FIELD, "assignedToEmployeeId is required");
    }

    const results = await service.bulkAssignCustomers(
      customerIds,
      assignedToEmployeeId,
      req.user.id,
      reason,
      remarks
    );

    return sendSuccess(
      res,
      results,
      "Bulk assignment completed",
      200
    );
  } catch (err: any) {
    return handleError(res, err);
  }
};

export const getCustomerAssignmentHistory = async (req: AuthRequest, res: Response) => {
  try {
    const { customerId } = req.params as { customerId: string };

    const history = await service.getCustomerAssignmentHistory(customerId);

    return sendSuccess(
      res,
      history,
      "Customer assignment history retrieved successfully",
      200
    );
  } catch (err: any) {
    return handleError(res, err);
  }
};
