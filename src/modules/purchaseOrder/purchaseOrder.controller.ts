import { Request, Response } from "express";
import * as service from "./purchaseOrder.service";
import * as customerService from "../customer/customer.service";
import XLSX from "xlsx";
import prisma from "../../config/postgres";
import {
  toSafeString,
  normalizeNumber,
  normalizeDate,
  normalizeBoolean,
} from "../../common/utils/purchaseOrder.import.utils";
import { sendSuccess, sendError, handleError } from "../../common/utils/responseFormatter";
import { ERROR_CODES } from "../../common/utils/errorMessages";


export const createPO = async (req: Request, res: Response) => {
  try {
    const body = req.body;

    // Resolve customer via GST
    const customer = await prisma.customer.findUnique({
      where: { gstrNo: body.gstNumber },
    });

    if (!customer) {
      return sendError(res, ERROR_CODES.CUSTOMER_NOT_FOUND);
    }

    // Normalize payload
    const normalizedData = {
      ...body,
      customerId: customer.id,
      amount: Number(body.totalAmount),
      batchQty: body.batchQuantity
        ? Number(body.batchQuantity)
        : null,
      poDate: body.poDate ? new Date(body.poDate) : undefined,
    };

    // Decide internally (CASH vs CREDIT)
    const po =
      customer.paymentTerms === "Cash"
        ? await service.createPurchaseOrder(normalizedData)
        : await service.createPurchaseOrderWithCreditCheck(normalizedData);

    return sendSuccess(res, po, "Purchase order created successfully", 201);
  } catch (error: any) {
    return handleError(res, error);
  }
};

/**
 * CREATE Purchase Order with Credit Limit Check
 */
export const createPurchaseOrder = async (req: Request, res: Response) => {
  try {
    const poData = req.body;

    if (!poData.customerId || !poData.amount) {
      return sendError(res, ERROR_CODES.MISSING_REQUIRED_FIELD);
    }

    const po = await service.createPurchaseOrderWithCreditCheck(poData);

    return sendSuccess(res, po, "Purchase order created and auto-approved successfully", 201);
  } catch (err: any) {
    return handleError(res, err);
  }
};

/**
 * GET PO by ID ✅
 */
export const getPOById = async (req: Request, res: Response) => {
  try {
    const po = await service.getPurchaseOrderById(req.params.id as string);
    (res as any).encryptAndSend(po);
  } catch (error: any) {
    return handleError(res, error);
  }
};

/**
 * UPDATE PO ❌
 */
export const updatePO = async (req: Request, res: Response) => {
  try {
    const po = await service.updatePurchaseOrder(req.params.id as string, req.body);
    return sendSuccess(res, po, "Purchase order updated successfully", 200);
  } catch (error: any) {
    return handleError(res, error);
  }
};

/**
 * DELETE PO ❌
 */
export const deletePO = async (req: Request, res: Response) => {
  try {
    await service.deletePurchaseOrder(req.params.id as string);
    return sendSuccess(res, null, "Purchase order deleted successfully", 200);
  } catch (error: any) {
    return handleError(res, error);
  }
};

/**
 * GET all POs ✅
 */
export const getAllPOs = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy,
      order,
      gstNo,
      poNo,
      overallStatus,
      fromDate,
      toDate,
    } = req.query;

    const result = await service.getAllPurchaseOrders(
      {
        gstNo: gstNo as string,
        poNo: poNo as string,
        overallStatus: overallStatus as string,
        fromDate: fromDate ? new Date(fromDate as string) : undefined,
        toDate: toDate ? new Date(toDate as string) : undefined,
      },
      Number(page),
      Number(limit),
      sortBy as string,
      order as "asc" | "desc"
    );

    (res as any).encryptAndSend(result);
  } catch (error: any) {
    (res as any).encryptAndSend({ message: error.message });
  }
};

/**
 * GET PO by PO Number ✅
 */
// export const getPOByPoNo = async (req: Request, res: Response) => {
//   try {
//     const po = await service.getPOByPoNo(req.params.poNo as string);
//     if (!po) {
//       return (res as any).encryptAndSend({ message: "PO not found" });
//     }
//     (res as any).encryptAndSend(po);
//   } catch (error: any) {
//     (res as any).encryptAndSend({ message: error.message });
//   }
// };

/**
 * GET latest PO count ✅
 */
export const getPOCount = async (_: Request, res: Response) => {
  try {
    const count = await service.getLatestPoCount();
    (res as any).encryptAndSend({ count });
  } catch (error: any) {
    (res as any).encryptAndSend({ message: error.message });
  }
};

/**
 * GET Slab limit by GST ✅
 */
export const getSlabLimit = async (req: Request, res: Response) => {
  try {
    const totalAmount = await service.getSlabLimit(req.params.gstNo as string );
    (res as any).encryptAndSend({ totalAmount });
  } catch (error: any) {
    (res as any).encryptAndSend({ message: error.message });
  }
};

/**
 * GET POs by GST ✅
 */
export const getPOByGST = async (req: Request, res: Response) => {
  try {
    const pos = await service.getPOByGST(req.params.gstNo as string);
    (res as any).encryptAndSend(pos);
  } catch (error: any) {
    (res as any).encryptAndSend({ message: error.message });
  }
};

/**
 * GET list of customers with GST ✅
 */
export const getGstrList = async (_req: Request, res: Response) => {
  try {
    const list = await customerService.getCustomerGSTList();
    (res as any).encryptAndSend(list);
  } catch (error: any) {
    (res as any).encryptAndSend({ message: error.message });
  }
};

/**
 * GET MD-approved POs ✅
 */
export const getMDApproved = async (_req: Request, res: Response) => {
  try {
    const pos = await service.getMDApprovedPOs();
    (res as any).encryptAndSend(pos);
  } catch (error: any) {
    (res as any).encryptAndSend({ message: error.message });
  }
};

/**
 * GET PPIC-approved batches ✅
 */
export const getPPICApprovedBatches = async (_req: Request, res: Response) => {
  try {
    const batches = await service.getPPICApprovedBatches();
    (res as any).encryptAndSend(batches);
  } catch (error: any) {
    (res as any).encryptAndSend({ message: error.message });
  }
};

/**
 * COMPLETE PO ❌
 */
// export const completePO = async (req: Request, res: Response) => {
//   try {
//     const po = await service.completePO(req.params.poNo as string);
//     return sendSuccess(res, po, "Purchase order completed successfully", 200);
//   } catch (error: any) {
//     return handleError(res, error);
//   }
// };

/**
 * GET batch numbers ✅
 */
export const getBatchNumbers = async (_req: Request, res: Response) => {
  try {
    const batches = await service.getBatchNumbers();
    (res as any).encryptAndSend(batches);
  } catch (error: any) {
    (res as any).encryptAndSend({ message: error.message });
  }
};

/**
 * GET PO analytics ✅
 */
export const getAnalytics = async (req: Request, res: Response) => {
  try {
    const { fromDate, toDate } = req.query;
    const analytics = await service.getPOAnalytics(
      fromDate ? new Date(fromDate as string) : undefined,
      toDate ? new Date(toDate as string) : undefined
    );
    (res as any).encryptAndSend(analytics);
  } catch (error: any) {
    (res as any).encryptAndSend({ message: error.message });
  }
};


export const importPurchaseOrders = async (req: Request, res: Response) => {
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

    /* ---------- READ EXCEL ---------- */
    const workbook = XLSX.read(file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: null });

    if (!rows.length) {
      return sendError(res, ERROR_CODES.EMPTY_FILE);
    }

    /* ---------- MAP & NORMALIZE DATA ---------- */
    const purchaseOrders = rows
      .map((row) => {
        const record: any = {};

        Object.entries(mappings).forEach(([dbField, excelHeader]) => {
          const raw = row[excelHeader as string];

          if (raw === null || raw === undefined || raw === "") {
            record[dbField] = null;
            return;
          }

          // STRING fields
          if (
            [
              "gstNo", "poNo", "brandName", "partyName", "batchNo", "paymentTerms",
              "invCha", "cylChar", "orderThrough", "address", "composition", "notes",
              "rmStatus", "section", "tabletCapsuleDrySyrupBottle", "roundOvalTablet",
              "tabletColour", "aluAluBlisterStripBottle", "packStyle", "productNewOld",
              "qaObservations", "pvcColourBase", "foil", "lotNo", "foilSize",
              "foilPoVendor", "cartonPoVendor", "design", "overallStatus",
              "invoiceNo", "showStatus", "mdApproval", "accountsApproval",
              "designerApproval", "ppicApproval", "salesComments", "customerId",
            ].includes(dbField)
          ) {
            record[dbField] = toSafeString(raw);
            return;
          }

          // INTEGER fields
          if (
            [
              "poQty", "batchQty", "foilQuantity", "cartonQuantity",
              "qtyPacked", "noOfShippers", "changePart", "cyc",
            ].includes(dbField)
          ) {
            record[dbField] = normalizeNumber(raw);
            return;
          }

          // FLOAT fields
          if (["poRate", "amount", "mrp", "advance"].includes(dbField)) {
            record[dbField] = normalizeNumber(raw);
            return;
          }

          // DATE fields
          if (
            [
              "poDate", "dispatchDate", "expiry", "foilPoDate", "foilBillDate",
              "cartonPoDate", "cartonBillDate", "packingDate", "invoiceDate",
            ].includes(dbField)
          ) {
            record[dbField] = normalizeDate(raw);
            return;
          }

          record[dbField] = toSafeString(raw);
        });

        /* ---- VALIDATION: REQUIRED FIELDS ---- */
        if (!record.poNo || !record.gstNo) {
          return null;
        }

        return record;
      })
      .filter(Boolean);

    if (!purchaseOrders.length) {
      return sendError(res, ERROR_CODES.NO_VALID_RECORDS);
    }

    /* ---------- NORMALIZE + DEDUPLICATE ---------- */
    const uniqueMap = new Map<string, any>();

    for (const po of purchaseOrders) {
      const normalized = {
        ...po,
        poNo: po.poNo?.toUpperCase().trim() || "",
        gstNo: po.gstNo?.toUpperCase().trim() || "",

        // Set defaults for approval fields
        paymentTerms: po.paymentTerms || "NA",
        orderThrough: po.orderThrough || "Direct",
        rmStatus: po.rmStatus || "Pending",
        overallStatus: po.overallStatus || "Open",
        mdApproval: po.mdApproval || "Pending",
        accountsApproval: po.accountsApproval || "Pending",
        designerApproval: po.designerApproval || "Pending",
        ppicApproval: po.ppicApproval || "Pending",
      };

      const key = `${normalized.poNo}_${normalized.gstNo}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, normalized);
      }
    }

    const normalizedOrders = Array.from(uniqueMap.values());

    /* ---------- INSERT ---------- */
    const result = await service.bulkCreatePurchaseOrders(normalizedOrders);

    const response = {
      totalRows: rows.length,
      inserted: result.count,
      skipped: rows.length - result.count,
    };

    if (result.count < purchaseOrders.length) {
      return sendSuccess(res, response, ERROR_CODES.IMPORT_PARTIAL_SUCCESS, 200);
    }

    return sendSuccess(res, response, "All purchase orders imported successfully", 200);
  } catch (error: any) {
    console.error("PO Import Error:", error);
    return handleError(res, error);
  }
};


export const exportPurchaseOrders = async (req: Request, res: Response) => {
  try {
    const purchaseOrders = await prisma.purchaseOrder.findMany();

    const worksheet = XLSX.utils.json_to_sheet(purchaseOrders);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "PurchaseOrders");

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=purchase_orders.xlsx"
    );
    res.setHeader("Content-Length", buffer.length);

    return res.status(200).end(buffer);
  } catch (error) {
    console.error("Export Purchase Orders Error:", error);
    return res.status(500).json({
      message: "Failed to export purchase orders",
    });
  }
};
