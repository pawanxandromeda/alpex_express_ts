"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkCreatePurchaseOrders = exports.getPOAnalytics = exports.getBatchNumbers = exports.getSlabLimit = exports.completePO = exports.getPPICApprovedBatches = exports.getMDApprovedPOs = exports.getPOByGST = exports.getLatestPoCount = exports.getPOByPoNo = exports.getAllPurchaseOrders = exports.deletePurchaseOrder = exports.updatePurchaseOrder = exports.getPurchaseOrderById = exports.createPurchaseOrderWithCreditCheck = exports.createPurchaseOrder = void 0;
// src/services/purchaseOrder.service.ts
const postgres_1 = __importDefault(require("../../config/postgres"));
const redis_1 = __importDefault(require("../../config/redis"));
const crypto_1 = __importDefault(require("crypto"));
const errorMessages_1 = require("../../common/utils/errorMessages");
const CACHE_TTL = 60; // seconds
const getCacheKey = (prefix, payload) => {
    const hash = crypto_1.default
        .createHash("md5")
        .update(JSON.stringify(payload))
        .digest("hex");
    return `${prefix}:${hash}`;
};
/* ---------------- CREATE ---------------- */
const createPurchaseOrder = async (data) => {
    // Check if PO already exists
    const existing = await postgres_1.default.purchaseOrder.findUnique({
        where: { poNo: data.poNo },
    });
    if (existing)
        throw new errorMessages_1.AppError(errorMessages_1.ERROR_CODES.PO_ALREADY_EXISTS);
    // Find the customer by GST
    const gstNo = data.gstNumber || data.gstNo;
    const customer = await postgres_1.default.customer.findUnique({ where: { gstrNo: gstNo } });
    if (!customer) {
        throw new errorMessages_1.AppError(errorMessages_1.ERROR_CODES.CUSTOMER_NOT_FOUND);
    }
    // Create the purchase order and link to customer via GST
    const po = await postgres_1.default.purchaseOrder.create({
        data: {
            poNo: data.poNo,
            gstNo: customer.gstrNo,
            partyName: data.partyName,
            poDate: data.poDate ? new Date(data.poDate) : undefined,
            poQty: data.poQuantity ? Number(data.poQuantity) : undefined,
            poRate: data.poRate ? Number(data.poRate) : undefined,
            amount: data.totalAmount || data.amount,
            mrp: data.mrp ? Number(data.mrp) : undefined,
            aluAluBlisterStripBottle: data.packType,
            brandName: data.brandName,
            composition: data.composition,
            packStyle: data.packStyle || undefined,
            paymentTerms: data.paymentTerms,
            cyc: data.cyc ? Number(data.cyc) : 0,
            advance: data.advance ? Number(data.advance) : 0,
            section: data.section,
            productNewOld: data.productType,
            batchQty: data.batchQuantity !== null && data.batchQuantity !== undefined && data.batchQuantity !== ""
                ? Number(data.batchQuantity)
                : null,
            showStatus: String(data.showStatus || "Order Pending"),
            specialRequirements: data.specialRequirements || undefined,
        },
        include: { customer: true },
    });
    // Update customer summary fields
    await postgres_1.default.customer.update({
        where: { id: customer.id },
        data: {},
    });
    // Clear cache
    await redis_1.default.del("purchase_orders:list:*");
    return po;
};
exports.createPurchaseOrder = createPurchaseOrder;
const createPurchaseOrderWithCreditCheck = async (data) => {
    // Find customer by GST number
    const gstNo = data.gstNumber || data.gstNo;
    const customer = await postgres_1.default.customer.findUnique({ where: { gstrNo: gstNo } });
    if (!customer) {
        throw new errorMessages_1.AppError(errorMessages_1.ERROR_CODES.CUSTOMER_NOT_FOUND);
    }
    // Blacklist check
    if (customer.isBlacklisted) {
        throw new errorMessages_1.AppError(errorMessages_1.ERROR_CODES.BLACKLISTED_CUSTOMER);
    }
    // Credit approval check
    if (customer.creditApprovalStatus !== "Approved") {
        throw new errorMessages_1.AppError(errorMessages_1.ERROR_CODES.CREDIT_NOT_APPROVED);
    }
    // Check total credit used
    const totalCreditUsed = await (0, exports.getSlabLimit)(customer.gstrNo);
    const newCreditUsage = totalCreditUsed + (data.amount || 0);
    if (newCreditUsage > customer.creditLimit) {
        throw new errorMessages_1.AppError(errorMessages_1.ERROR_CODES.CREDIT_LIMIT_EXCEEDED);
    }
    // Create PO and link to customer
    const po = await postgres_1.default.purchaseOrder.create({
        data: {
            ...data,
            gstNo: customer.gstrNo,
            mdApproval: "Approved",
            accountsApproval: "Approved",
        },
        include: { customer: true },
    });
    // Clear cache
    await redis_1.default.del("purchase_orders:list:*");
    return po;
};
exports.createPurchaseOrderWithCreditCheck = createPurchaseOrderWithCreditCheck;
/* ---------------- GET BY ID ---------------- */
const getPurchaseOrderById = async (id) => {
    const cacheKey = `purchase_orders:single:${id}`;
    const cached = await redis_1.default.get(cacheKey);
    if (cached) {
        return JSON.parse(cached);
    }
    const po = await postgres_1.default.purchaseOrder.findUnique({
        where: { id },
        include: { customer: true },
    });
    if (!po) {
        throw new errorMessages_1.AppError(errorMessages_1.ERROR_CODES.PO_NOT_FOUND);
    }
    await redis_1.default.setex(cacheKey, CACHE_TTL, JSON.stringify(po));
    return po;
};
exports.getPurchaseOrderById = getPurchaseOrderById;
/* ---------------- UPDATE ---------------- */
const updatePurchaseOrder = async (id, data) => {
    const po = await postgres_1.default.purchaseOrder.findUnique({
        where: { id },
    });
    if (!po) {
        throw new errorMessages_1.AppError(errorMessages_1.ERROR_CODES.PO_NOT_FOUND);
    }
    const updated = await postgres_1.default.purchaseOrder.update({
        where: { id },
        data,
    });
    await Promise.all([
        redis_1.default.del(`purchase_orders:single:${id}`),
        redis_1.default.del("purchase_orders:list:*"),
    ]);
    return updated;
};
exports.updatePurchaseOrder = updatePurchaseOrder;
/* ---------------- DELETE ---------------- */
const deletePurchaseOrder = async (id) => {
    const po = await postgres_1.default.purchaseOrder.findUnique({
        where: { id },
    });
    if (!po) {
        throw new errorMessages_1.AppError(errorMessages_1.ERROR_CODES.PO_NOT_FOUND);
    }
    await postgres_1.default.purchaseOrder.delete({ where: { id } });
    await Promise.all([
        redis_1.default.del(`purchase_orders:single:${id}`),
        redis_1.default.del("purchase_orders:list:*"),
    ]);
};
exports.deletePurchaseOrder = deletePurchaseOrder;
/* ---------------- ADVANCED LIST (FAST) ---------------- */
const getAllPurchaseOrders = async (filters, page = 1, limit = 10, sortBy = "createdAt", order = "desc") => {
    try {
        const cacheKey = getCacheKey("purchase_orders:list", {
            filters,
            page,
            limit,
            sortBy,
            order,
        });
        const cached = await redis_1.default.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }
        const where = {};
        if (filters.gstNo)
            where.gstNo = filters.gstNo;
        if (filters.poNo)
            where.poNo = { contains: filters.poNo, mode: "insensitive" };
        if (filters.overallStatus)
            where.overallStatus = filters.overallStatus;
        if (filters.fromDate || filters.toDate) {
            where.poDate = {};
            if (filters.fromDate)
                where.poDate.gte = filters.fromDate;
            if (filters.toDate)
                where.poDate.lte = filters.toDate;
        }
        const [data, total] = await Promise.all([
            postgres_1.default.purchaseOrder.findMany({
                where,
                include: { customer: true },
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { [sortBy]: order },
            }),
            postgres_1.default.purchaseOrder.count({ where }),
        ]);
        const response = {
            data,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
        await redis_1.default.setex(cacheKey, CACHE_TTL, JSON.stringify(response));
        return response;
    }
    catch (error) {
        console.error("Error getting all POs:", error);
        throw error;
    }
};
exports.getAllPurchaseOrders = getAllPurchaseOrders;
const getPOByPoNo = async (poNo) => {
    try {
        const cacheKey = `po:poNo:${poNo}`;
        const cached = await redis_1.default.get(cacheKey);
        if (cached)
            return JSON.parse(cached);
        const po = await postgres_1.default.purchaseOrder.findUnique({
            where: { poNo },
            select: {
                mdApproval: true,
                accountsApproval: true,
                designerApproval: true,
                ppicApproval: true,
                showStatus: true,
                gstNo: true,
                poNo: true,
                poDate: true,
                brandName: true,
                partyName: true,
            },
        });
        if (po)
            await redis_1.default.setex(cacheKey, 120, JSON.stringify(po));
        return po;
    }
    catch (error) {
        console.error("Error getting PO by PoNo:", error);
        throw error;
    }
};
exports.getPOByPoNo = getPOByPoNo;
const getLatestPoCount = async () => {
    try {
        const latest = await postgres_1.default.purchaseOrder.findFirst({
            orderBy: { createdAt: "desc" },
            select: { poNo: true },
        });
        if (!latest?.poNo) {
            console.warn("No PO found in database");
            return 0; // return 0 instead of throwing
        }
        const match = latest.poNo.match(/(\d+)$/);
        if (!match) {
            console.warn("Invalid PO format for latest PO:", latest.poNo);
            return 0; // fallback
        }
        return Number(match[1]);
    }
    catch (error) {
        console.error("Error getting latest PO count:", error);
        return 0; // fallback to 0 on unexpected errors
    }
};
exports.getLatestPoCount = getLatestPoCount;
const getPOByGST = async (gstNo) => {
    try {
        const cacheKey = `po:gst:${gstNo}`;
        const cached = await redis_1.default.get(cacheKey);
        if (cached)
            return JSON.parse(cached);
        const data = await postgres_1.default.purchaseOrder.findMany({ where: { gstNo } });
        await redis_1.default.setex(cacheKey, 120, JSON.stringify(data));
        return data;
    }
    catch (error) {
        console.error("Error getting PO by GST:", error);
        throw error;
    }
};
exports.getPOByGST = getPOByGST;
const getMDApprovedPOs = async () => {
    try {
        const cacheKey = `po:md_approved`;
        const cached = await redis_1.default.get(cacheKey);
        if (cached)
            return JSON.parse(cached);
        const data = await postgres_1.default.purchaseOrder.findMany({
            where: { mdApproval: "Approved" },
        });
        await redis_1.default.setex(cacheKey, 120, JSON.stringify(data));
        return data;
    }
    catch (error) {
        console.error("Error getting MD approved POs:", error);
        throw error;
    }
};
exports.getMDApprovedPOs = getMDApprovedPOs;
const getPPICApprovedBatches = async () => {
    try {
        const cacheKey = `po:ppic_approved_batches`;
        const cached = await redis_1.default.get(cacheKey);
        if (cached)
            return JSON.parse(cached);
        const data = await postgres_1.default.purchaseOrder.findMany({
            where: { ppicApproval: "Approved" },
            select: { batchNo: true },
        });
        const batches = data.map(d => d.batchNo).filter(Boolean);
        await redis_1.default.setex(cacheKey, 120, JSON.stringify(batches));
        return batches;
    }
    catch (error) {
        console.error("Error getting PPIC approved batches:", error);
        throw error;
    }
};
exports.getPPICApprovedBatches = getPPICApprovedBatches;
const completePO = async (poNo) => {
    try {
        const po = await postgres_1.default.purchaseOrder.update({
            where: { poNo },
            data: { overallStatus: "Completed" },
        });
        await redis_1.default.del(`po:poNo:${poNo}`);
        await redis_1.default.del("purchase_orders:list:*"); // Invalidate lists
        return po;
    }
    catch (error) {
        console.error("Error completing PO:", error);
        throw error;
    }
};
exports.completePO = completePO;
const getSlabLimit = async (gstNo) => {
    try {
        const cacheKey = `po:slab:${gstNo}`;
        const cached = await redis_1.default.get(cacheKey);
        if (cached)
            return JSON.parse(cached);
        const result = await postgres_1.default.purchaseOrder.aggregate({
            where: { gstNo },
            _sum: { amount: true },
        });
        const total = result._sum.amount || 0;
        await redis_1.default.setex(cacheKey, 120, JSON.stringify(total));
        return total;
    }
    catch (error) {
        console.error("Error getting slab limit:", error);
        throw error;
    }
};
exports.getSlabLimit = getSlabLimit;
const getBatchNumbers = async () => {
    try {
        const cacheKey = `po:batch_numbers`;
        const cached = await redis_1.default.get(cacheKey);
        if (cached)
            return JSON.parse(cached);
        const data = await postgres_1.default.purchaseOrder.findMany({
            where: { batchNo: { not: null } },
            select: {
                batchNo: true,
                brandName: true,
            },
        });
        await redis_1.default.setex(cacheKey, 120, JSON.stringify(data));
        return data;
    }
    catch (error) {
        console.error("Error getting batch numbers:", error);
        throw error;
    }
};
exports.getBatchNumbers = getBatchNumbers;
const getPOAnalytics = async (fromDate, toDate) => {
    try {
        // Generate cache key
        const cacheKey = getCacheKey("po:analytics", { fromDate, toDate });
        const cached = await redis_1.default.get(cacheKey);
        if (cached)
            return JSON.parse(cached);
        // Build where clause
        const where = {};
        if (fromDate || toDate) {
            where.poDate = {};
            if (fromDate)
                where.poDate.gte = fromDate;
            if (toDate)
                where.poDate.lte = toDate;
        }
        // Fetch analytics in parallel
        const [totalPOs, statusCounts, totalAmount, avgAmount, posPerCustomer, monthlyPOs, topCustomersByAmount, approvalStats,] = await Promise.all([
            // Total POs
            postgres_1.default.purchaseOrder.count({ where }),
            // POs grouped by status
            postgres_1.default.purchaseOrder.groupBy({
                by: ["overallStatus"],
                _count: { id: true },
                where,
            }),
            // Total amount
            postgres_1.default.purchaseOrder.aggregate({
                _sum: { amount: true },
                where,
            }),
            // Average amount
            postgres_1.default.purchaseOrder.aggregate({
                _avg: { amount: true },
                where,
            }),
            // Top 10 customers by PO count
            postgres_1.default.purchaseOrder.groupBy({
                by: ["gstNo"],
                _count: { id: true },
                where,
                orderBy: { _count: { id: "desc" } },
                take: 10,
            }),
            // Monthly POs (last 12 months)
            postgres_1.default.$queryRaw `
        SELECT 
          DATE_TRUNC('month', "poDate") as month,
          COUNT(*) as count
        FROM "PurchaseOrder"
        WHERE (${fromDate ? `"poDate" >= ${fromDate}` : 'TRUE'})
          AND (${toDate ? `"poDate" <= ${toDate}` : 'TRUE'})
        GROUP BY month
        ORDER BY month DESC
        LIMIT 12
      `,
            // Top 10 customers by total amount
            postgres_1.default.purchaseOrder.groupBy({
                by: ["gstNo"],
                _sum: { amount: true },
                where,
                orderBy: { _sum: { amount: "desc" } },
                take: 10,
            }),
            // Approval stats
            postgres_1.default.purchaseOrder.aggregate({
                _count: {
                    mdApproval: true,
                    accountsApproval: true,
                    designerApproval: true,
                    ppicApproval: true,
                },
                where: {
                    ...where,
                    OR: [
                        { mdApproval: "Approved" },
                        { accountsApproval: "Approved" },
                        { designerApproval: "Approved" },
                        { ppicApproval: "Approved" },
                    ],
                },
            }),
        ]);
        // Prepare response
        const response = {
            totalPOs,
            statusCounts: statusCounts.map((s) => ({
                status: s.overallStatus,
                count: s._count.id,
            })),
            totalAmount: totalAmount._sum.amount || 0,
            averageAmount: avgAmount._avg.amount || 0,
            posPerCustomer: posPerCustomer.map((c) => ({
                gstNo: c.gstNo,
                count: c._count.id,
            })),
            monthlyPOs: monthlyPOs.map((m) => ({
                month: m.month.toISOString(),
                count: Number(m.count),
            })),
            topCustomersByAmount: topCustomersByAmount.map((c) => ({
                gstNo: c.gstNo,
                totalAmount: c._sum.amount || 0,
            })),
            approvalStats: {
                mdApproved: approvalStats._count.mdApproval || 0,
                accountsApproved: approvalStats._count.accountsApproval || 0,
                designerApproved: approvalStats._count.designerApproval || 0,
                ppicApproved: approvalStats._count.ppicApproval || 0,
            },
        };
        // Cache result for 5 minutes
        await redis_1.default.setex(cacheKey, 300, JSON.stringify(response));
        return response;
    }
    catch (error) {
        console.error("Error getting PO analytics:", error);
        throw error;
    }
};
exports.getPOAnalytics = getPOAnalytics;
const bulkCreatePurchaseOrders = async (purchaseOrders) => {
    return postgres_1.default.purchaseOrder.createMany({
        data: purchaseOrders,
        skipDuplicates: true,
    });
};
exports.bulkCreatePurchaseOrders = bulkCreatePurchaseOrders;
