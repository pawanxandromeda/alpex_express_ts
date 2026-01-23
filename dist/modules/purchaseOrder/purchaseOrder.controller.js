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
exports.exportPurchaseOrders = exports.importPurchaseOrders = exports.getAnalytics = exports.getBatchNumbers = exports.completePO = exports.getPPICApprovedBatches = exports.getMDApproved = exports.getGstrList = exports.getPOByGST = exports.getSlabLimit = exports.getPOCount = exports.getPOByPoNo = exports.getAllPOs = exports.deletePO = exports.updatePO = exports.getPOById = exports.createPurchaseOrder = exports.createPO = void 0;
const service = __importStar(require("./purchaseOrder.service"));
const customerService = __importStar(require("../customer/customer.service"));
const xlsx_1 = __importDefault(require("xlsx"));
const postgres_1 = __importDefault(require("../../config/postgres"));
const purchaseOrder_import_utils_1 = require("../../common/utils/purchaseOrder.import.utils");
const responseFormatter_1 = require("../../common/utils/responseFormatter");
const errorMessages_1 = require("../../common/utils/errorMessages");
const createPO = async (req, res) => {
    try {
        const body = req.body;
        // Resolve customer via GST
        const customer = await postgres_1.default.customer.findUnique({
            where: { gstrNo: body.gstNumber },
        });
        if (!customer) {
            return (0, responseFormatter_1.sendError)(res, errorMessages_1.ERROR_CODES.CUSTOMER_NOT_FOUND);
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
        const po = customer.paymentTerms === "Cash"
            ? await service.createPurchaseOrder(normalizedData)
            : await service.createPurchaseOrderWithCreditCheck(normalizedData);
        return (0, responseFormatter_1.sendSuccess)(res, po, "Purchase order created successfully", 201);
    }
    catch (error) {
        return (0, responseFormatter_1.handleError)(res, error);
    }
};
exports.createPO = createPO;
/**
 * CREATE Purchase Order with Credit Limit Check
 */
const createPurchaseOrder = async (req, res) => {
    try {
        const poData = req.body;
        if (!poData.customerId || !poData.amount) {
            return (0, responseFormatter_1.sendError)(res, errorMessages_1.ERROR_CODES.MISSING_REQUIRED_FIELD);
        }
        const po = await service.createPurchaseOrderWithCreditCheck(poData);
        return (0, responseFormatter_1.sendSuccess)(res, po, "Purchase order created and auto-approved successfully", 201);
    }
    catch (err) {
        return (0, responseFormatter_1.handleError)(res, err);
    }
};
exports.createPurchaseOrder = createPurchaseOrder;
/**
 * GET PO by ID ✅
 */
const getPOById = async (req, res) => {
    try {
        const po = await service.getPurchaseOrderById(req.params.id);
        res.encryptAndSend(po);
    }
    catch (error) {
        return (0, responseFormatter_1.handleError)(res, error);
    }
};
exports.getPOById = getPOById;
/**
 * UPDATE PO ❌
 */
const updatePO = async (req, res) => {
    try {
        const po = await service.updatePurchaseOrder(req.params.id, req.body);
        return (0, responseFormatter_1.sendSuccess)(res, po, "Purchase order updated successfully", 200);
    }
    catch (error) {
        return (0, responseFormatter_1.handleError)(res, error);
    }
};
exports.updatePO = updatePO;
/**
 * DELETE PO ❌
 */
const deletePO = async (req, res) => {
    try {
        await service.deletePurchaseOrder(req.params.id);
        return (0, responseFormatter_1.sendSuccess)(res, null, "Purchase order deleted successfully", 200);
    }
    catch (error) {
        return (0, responseFormatter_1.handleError)(res, error);
    }
};
exports.deletePO = deletePO;
/**
 * GET all POs ✅
 */
const getAllPOs = async (req, res) => {
    try {
        const { page = 1, limit = 10, sortBy, order, gstNo, poNo, overallStatus, fromDate, toDate, } = req.query;
        const result = await service.getAllPurchaseOrders({
            gstNo: gstNo,
            poNo: poNo,
            overallStatus: overallStatus,
            fromDate: fromDate ? new Date(fromDate) : undefined,
            toDate: toDate ? new Date(toDate) : undefined,
        }, Number(page), Number(limit), sortBy, order);
        res.encryptAndSend(result);
    }
    catch (error) {
        res.encryptAndSend({ message: error.message });
    }
};
exports.getAllPOs = getAllPOs;
/**
 * GET PO by PO Number ✅
 */
const getPOByPoNo = async (req, res) => {
    try {
        const po = await service.getPOByPoNo(req.params.poNo);
        if (!po) {
            return res.encryptAndSend({ message: "PO not found" });
        }
        res.encryptAndSend(po);
    }
    catch (error) {
        res.encryptAndSend({ message: error.message });
    }
};
exports.getPOByPoNo = getPOByPoNo;
/**
 * GET latest PO count ✅
 */
const getPOCount = async (_, res) => {
    try {
        const count = await service.getLatestPoCount();
        res.encryptAndSend({ count });
    }
    catch (error) {
        res.encryptAndSend({ message: error.message });
    }
};
exports.getPOCount = getPOCount;
/**
 * GET Slab limit by GST ✅
 */
const getSlabLimit = async (req, res) => {
    try {
        const totalAmount = await service.getSlabLimit(req.params.gstNo);
        res.encryptAndSend({ totalAmount });
    }
    catch (error) {
        res.encryptAndSend({ message: error.message });
    }
};
exports.getSlabLimit = getSlabLimit;
/**
 * GET POs by GST ✅
 */
const getPOByGST = async (req, res) => {
    try {
        const pos = await service.getPOByGST(req.params.gstNo);
        res.encryptAndSend(pos);
    }
    catch (error) {
        res.encryptAndSend({ message: error.message });
    }
};
exports.getPOByGST = getPOByGST;
/**
 * GET list of customers with GST ✅
 */
const getGstrList = async (_req, res) => {
    try {
        const list = await customerService.getCustomerGSTList();
        res.encryptAndSend(list);
    }
    catch (error) {
        res.encryptAndSend({ message: error.message });
    }
};
exports.getGstrList = getGstrList;
/**
 * GET MD-approved POs ✅
 */
const getMDApproved = async (_req, res) => {
    try {
        const pos = await service.getMDApprovedPOs();
        res.encryptAndSend(pos);
    }
    catch (error) {
        res.encryptAndSend({ message: error.message });
    }
};
exports.getMDApproved = getMDApproved;
/**
 * GET PPIC-approved batches ✅
 */
const getPPICApprovedBatches = async (_req, res) => {
    try {
        const batches = await service.getPPICApprovedBatches();
        res.encryptAndSend(batches);
    }
    catch (error) {
        res.encryptAndSend({ message: error.message });
    }
};
exports.getPPICApprovedBatches = getPPICApprovedBatches;
/**
 * COMPLETE PO ❌
 */
const completePO = async (req, res) => {
    try {
        const po = await service.completePO(req.params.poNo);
        return (0, responseFormatter_1.sendSuccess)(res, po, "Purchase order completed successfully", 200);
    }
    catch (error) {
        return (0, responseFormatter_1.handleError)(res, error);
    }
};
exports.completePO = completePO;
/**
 * GET batch numbers ✅
 */
const getBatchNumbers = async (_req, res) => {
    try {
        const batches = await service.getBatchNumbers();
        res.encryptAndSend(batches);
    }
    catch (error) {
        res.encryptAndSend({ message: error.message });
    }
};
exports.getBatchNumbers = getBatchNumbers;
/**
 * GET PO analytics ✅
 */
const getAnalytics = async (req, res) => {
    try {
        const { fromDate, toDate } = req.query;
        const analytics = await service.getPOAnalytics(fromDate ? new Date(fromDate) : undefined, toDate ? new Date(toDate) : undefined);
        res.encryptAndSend(analytics);
    }
    catch (error) {
        res.encryptAndSend({ message: error.message });
    }
};
exports.getAnalytics = getAnalytics;
const importPurchaseOrders = async (req, res) => {
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
        /* ---------- READ EXCEL ---------- */
        const workbook = xlsx_1.default.read(file.buffer, { type: "buffer" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = xlsx_1.default.utils.sheet_to_json(sheet, { defval: null });
        if (!rows.length) {
            return (0, responseFormatter_1.sendError)(res, errorMessages_1.ERROR_CODES.EMPTY_FILE);
        }
        /* ---------- MAP & NORMALIZE DATA ---------- */
        const purchaseOrders = rows
            .map((row) => {
            const record = {};
            Object.entries(mappings).forEach(([dbField, excelHeader]) => {
                const raw = row[excelHeader];
                if (raw === null || raw === undefined || raw === "") {
                    record[dbField] = null;
                    return;
                }
                // STRING fields
                if ([
                    "gstNo", "poNo", "brandName", "partyName", "batchNo", "paymentTerms",
                    "invCha", "cylChar", "orderThrough", "address", "composition", "notes",
                    "rmStatus", "section", "tabletCapsuleDrySyrupBottle", "roundOvalTablet",
                    "tabletColour", "aluAluBlisterStripBottle", "packStyle", "productNewOld",
                    "qaObservations", "pvcColourBase", "foil", "lotNo", "foilSize",
                    "foilPoVendor", "cartonPoVendor", "design", "overallStatus",
                    "invoiceNo", "showStatus", "mdApproval", "accountsApproval",
                    "designerApproval", "ppicApproval", "salesComments", "customerId",
                ].includes(dbField)) {
                    record[dbField] = (0, purchaseOrder_import_utils_1.toSafeString)(raw);
                    return;
                }
                // INTEGER fields
                if ([
                    "poQty", "batchQty", "foilQuantity", "cartonQuantity",
                    "qtyPacked", "noOfShippers", "changePart", "cyc",
                ].includes(dbField)) {
                    record[dbField] = (0, purchaseOrder_import_utils_1.normalizeNumber)(raw);
                    return;
                }
                // FLOAT fields
                if (["poRate", "amount", "mrp", "advance"].includes(dbField)) {
                    record[dbField] = (0, purchaseOrder_import_utils_1.normalizeNumber)(raw);
                    return;
                }
                // DATE fields
                if ([
                    "poDate", "dispatchDate", "expiry", "foilPoDate", "foilBillDate",
                    "cartonPoDate", "cartonBillDate", "packingDate", "invoiceDate",
                ].includes(dbField)) {
                    record[dbField] = (0, purchaseOrder_import_utils_1.normalizeDate)(raw);
                    return;
                }
                record[dbField] = (0, purchaseOrder_import_utils_1.toSafeString)(raw);
            });
            /* ---- VALIDATION: REQUIRED FIELDS ---- */
            if (!record.poNo || !record.gstNo) {
                return null;
            }
            return record;
        })
            .filter(Boolean);
        if (!purchaseOrders.length) {
            return (0, responseFormatter_1.sendError)(res, errorMessages_1.ERROR_CODES.NO_VALID_RECORDS);
        }
        /* ---------- NORMALIZE + DEDUPLICATE ---------- */
        const uniqueMap = new Map();
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
            return (0, responseFormatter_1.sendSuccess)(res, response, errorMessages_1.ERROR_CODES.IMPORT_PARTIAL_SUCCESS, 200);
        }
        return (0, responseFormatter_1.sendSuccess)(res, response, "All purchase orders imported successfully", 200);
    }
    catch (error) {
        console.error("PO Import Error:", error);
        return (0, responseFormatter_1.handleError)(res, error);
    }
};
exports.importPurchaseOrders = importPurchaseOrders;
const exportPurchaseOrders = async (req, res) => {
    try {
        const purchaseOrders = await postgres_1.default.purchaseOrder.findMany();
        const worksheet = xlsx_1.default.utils.json_to_sheet(purchaseOrders);
        const workbook = xlsx_1.default.utils.book_new();
        xlsx_1.default.utils.book_append_sheet(workbook, worksheet, "PurchaseOrders");
        const buffer = xlsx_1.default.write(workbook, {
            type: "buffer",
            bookType: "xlsx",
        });
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", "attachment; filename=purchase_orders.xlsx");
        res.setHeader("Content-Length", buffer.length);
        return res.status(200).end(buffer);
    }
    catch (error) {
        console.error("Export Purchase Orders Error:", error);
        return res.status(500).json({
            message: "Failed to export purchase orders",
        });
    }
};
exports.exportPurchaseOrders = exportPurchaseOrders;
