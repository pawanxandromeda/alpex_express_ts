// src/services/accounts.service.ts
import prisma from "../../config/postgres";
import redis, { ensureRedisConnection } from "../../config/redis";
import { randomUUID, createHash } from "crypto";
import {
  createAuditAction,
  addActionToLog,
  getAuditLog,
} from "../../common/utils/auditLog";

const CACHE_TTL = 60; // seconds

const getCacheKey = (prefix: string, payload: any) => {
  const hash = createHash("md5")
    .update(JSON.stringify(payload))
    .digest("hex");
  return `${prefix}:${hash}`;
};

const toISO = (d: any) => (d ? new Date(d).toISOString() : null);

const computeDueDays = (dueDate: string | undefined | null) => {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const now = new Date();
  // difference in days (positive => days remaining, negative => overdue)
  const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
};



export const getBills = async (page = 1, limit = 10) => {
  const cacheKey = getCacheKey("bills:list", { page, limit });

  try {
    if (redis) {
      try {
        await ensureRedisConnection();
        const cached = await redis.get(cacheKey);
        if (cached) return JSON.parse(cached);
      } catch (redisError) {
        const message = redisError instanceof Error ? redisError.message : String(redisError);
        console.warn(`⚠️ Redis cache lookup failed: ${message}`);
      }
    }
  } catch (error) {
    console.error("Error accessing cache:", error);
  }

  const pos: any[] = await prisma.purchaseOrder.findMany({
    orderBy: { createdAt: "desc" },
    include: { customer: true },
  });

  const total = pos.length;
  const start = (page - 1) * limit;

  const data = pos.slice(start, start + limit).map((po, idx) => {
    // Convert string amounts to numbers for calculations
    const billAmt = po.amount ? parseFloat(String(po.amount)) : 0;
    const receivedAmount = po.advance ? parseFloat(String(po.advance)) : 0;
    const balanceAmount = billAmt - receivedAmount;

    return {
      sNo: start + idx + 1,

      // REQUIRED BILL COLUMNS (FROM PO)
      billDate: po.invoiceDate ?? po.poDate ?? null,
      billNo: po.invoiceNo ?? po.poNo,
      partyName: po.partyName ?? po.customer?.customerName ?? null,
      billAmt,
      receivedAmount,
      balanceAmount,
      dueDate: null,
      pdcAmount: null,
      pdcDate: null,
      chqNo: null,
      pdcReceiveDate: null,
      dueDays: null,
      marketingPersonnelName: po.orderThrough ?? null,
      accountsComments: null,
      chequesExpected: null,
      remarks: po.notes ?? null,
      salesComments: po.salesComments ?? null,
    };
  });

  const response = {
    data,
    total,
    page,
    limit,
  };

  // Cache the result (non-blocking)
  if (redis) {
    redis
      .setex(cacheKey, CACHE_TTL, JSON.stringify(response))
      .catch((err) => console.warn(`⚠️ Failed to cache bills: ${err.message}`));
  }

  return response;
};

export const createBill = async (payload: any) => {
  const { purchaseOrderId, salesComments } = payload;
  if (!purchaseOrderId) throw new Error("purchaseOrderId required in payload");

  const po: any = await prisma.purchaseOrder.findUnique({
    where: { id: purchaseOrderId },
    select: {
      id: true,
      accountBills: true,
      partyName: true,
      amount: true,
      timestamp: true,
    },
  });
  if (!po) throw new Error("PurchaseOrder not found");

  const existing = Array.isArray(po.accountBills) ? po.accountBills : [];
  const newBill = {
    id: randomUUID(),
    billDate: payload.billDate ? toISO(payload.billDate) : toISO(payload.createdAt) || new Date().toISOString(),
    billNo: payload.billNo ?? null,
    partyName: payload.partyName ?? po.partyName ?? null,
    billAmt: payload.billAmt ?? payload.amount ?? payload.billAmount ?? 0,
    receivedAmount: payload.receivedAmount ?? 0,
    balanceAmount: payload.balanceAmount ?? null,
    dueDate: payload.dueDate ? toISO(payload.dueDate) : null,
    pdcAmount: payload.pdcAmount ?? null,
    pdcDate: payload.pdcDate ? toISO(payload.pdcDate) : null,
    chqNo: payload.chqNo ?? payload.chequeNumber ?? null,
    pdcReceiveDate: payload.pdcReceiveDate ? toISO(payload.pdcReceiveDate) : null,
    dueDays: payload.dueDays ?? null,
    marketingPersonnelName: payload.marketingPersonnelName ?? payload.mktPersonnel ?? null,
    accountsComments: payload.accountsComments ?? null,
    chequesExpected: typeof payload.chequesExpected === "boolean" ? payload.chequesExpected : null,
    remarks: payload.remarks ?? null,
    salesComments: payload.salesComments ?? null,
    disputes: [],
    createdAt: new Date().toISOString(),
  };

  // Get existing audit log
  const auditLog = getAuditLog(po.timestamp);

  // Create audit action for bill creation
  const billCreateAction = createAuditAction({
    actionType: "BILL_CREATED",
    performedBy: {
      name: payload.createdBy || "System",
      department: "Accounts",
    },
    description: `Bill created - Bill#: ${newBill.billNo}, Amount: ${newBill.billAmt}`,
    remarks: payload.accountsComments,
  });

  // Add action to audit log
  const updatedLog = addActionToLog(auditLog, billCreateAction);

  const updatedPo = await prisma.purchaseOrder.update({
    where: { id: purchaseOrderId },
    data: {
      accountBills: [...existing, newBill],
      salesComments: salesComments ?? po.salesComments,
      timestamp: JSON.stringify(updatedLog),
    } as any,
  });

  // Invalidate related cache keys (non-blocking)
  if (redis) {
    Promise.all([
      redis.del(`purchase_orders:single:${purchaseOrderId}`),
      redis.del("purchase_orders:list:*"),
      redis.del("bills:list:*"),
      redis.del(`bills:by_po:${purchaseOrderId}`),
    ]).catch((err) => {
      console.warn(`⚠️ Failed to invalidate cache: ${err.message}`);
    });
  }

  return newBill;
};

export const raiseDispute = async (billId: string, employeeId: string, comments: string) => {
  // find PO containing the bill
  const pos: any[] = await prisma.purchaseOrder.findMany({
    select: {
      id: true,
      accountBills: true,
      timestamp: true,
    },
  });

  for (const po of pos) {
    const bills = Array.isArray(po.accountBills) ? po.accountBills : [];
    const idx = bills.findIndex((b: any) => b.id === billId);
    if (idx !== -1) {
      const bill = bills[idx];
      const disputes = Array.isArray(bill.disputes) ? bill.disputes : [];
      const newDispute = { id: randomUUID(), employeeId, comments, createdAt: new Date().toISOString() };
      bill.disputes = [...disputes, newDispute];
      bills[idx] = bill;

      // Get existing audit log
      const auditLog = getAuditLog(po.timestamp);

      // Create audit action for dispute raise
      const disputeAction = createAuditAction({
        actionType: "BILL_DISPUTE_RAISED",
        performedBy: {
          employeeId,
          name: "Employee",
          department: "Accounts",
        },
        description: `Dispute raised on Bill#: ${bill.billNo}`,
        remarks: comments,
      });

      // Add action to audit log
      const updatedLog = addActionToLog(auditLog, disputeAction);

      await prisma.purchaseOrder.update({
        where: { id: po.id },
        data: {
          accountBills: bills,
          timestamp: JSON.stringify(updatedLog),
        } as any,
      });

      // Invalidate related cache keys (non-blocking)
      if (redis) {
        Promise.all([
          redis.del(`purchase_orders:single:${po.id}`),
          redis.del("purchase_orders:list:*"),
          redis.del("bills:list:*"),
          redis.del(`bills:by_po:${po.id}`),
        ]).catch((err) => {
          console.warn(`⚠️ Failed to invalidate cache: ${err.message}`);
        });
      }

      return newDispute;
    }
  }

  throw new Error("Bill not found");
};


export const raisePoDispute = async (
  poId: string,
  employeeId: string,
  comments: string
) => {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
    select: {
      id: true,
      mdApproval: true,
      poDisputes: true,
      timestamp: true,
    },
  });

  if (!po) {
    throw new Error("PurchaseOrder not found");
  }

  if ((po.mdApproval || "").toLowerCase() !== "rejected") {
    throw new Error("PO is not rejected; cannot raise PO-level dispute");
  }

  const existing = Array.isArray(po.poDisputes) ? po.poDisputes : [];

  const newDispute = {
    id: randomUUID(),
    employeeId,
    comments,
    createdAt: new Date().toISOString(),
  };

  // Get existing audit log
  const auditLog = getAuditLog(po.timestamp);

  // Create audit action for PO dispute raise
  const poDisputeAction = createAuditAction({
    actionType: "PO_DISPUTE_RAISED",
    performedBy: {
      employeeId,
      name: "Employee",
      department: "Accounts",
    },
    description: "Dispute raised on Purchase Order",
    remarks: comments,
  });

  // Add action to audit log
  const updatedLog = addActionToLog(auditLog, poDisputeAction);

  await prisma.purchaseOrder.update({
    where: { id: poId },
    data: {
      poDisputes: [...existing, newDispute],
      timestamp: JSON.stringify(updatedLog),
    } as any,
  });

  return newDispute;
};


// export const addSalesComment = async (poNo: string, comment: string) => {

//   const po = await prisma.purchaseOrder.findUnique({
//     where: { poNo },
//     select: {
//       id: true,
//       salesComments: true,
//       timestamp: true,
//     },
//   });
//   if (!po) throw new Error("PurchaseOrder not found");

//   // Get existing audit log
//   const auditLog = getAuditLog(po.timestamp);

//   // Create audit action for sales comment
//   const commentAction = createAuditAction({
//     actionType: "SALES_COMMENT_ADDED",
//     performedBy: {
//       name: "Sales",
//       department: "Sales",
//     },
//     description: "Sales comment added to Purchase Order",
//     remarks: comment,
//   });

//   // Add action to audit log
//   const updatedLog = addActionToLog(auditLog, commentAction);

//   // Update salesComments
//   const updated = await prisma.purchaseOrder.update({
//     where: { poNo },
//     data: {
//       salesComments: comment,
//       timestamp: JSON.stringify(updatedLog),
//     },
//   });

//   await Promise.all([
//     redis.del(`po:poNo:${poNo}`),
//     redis.del(`purchase_orders:single:${po.id}`),
//     redis.del("purchase_orders:list:*"),
//   ]);

//   return updated;
// };

export const getBillsByPo = async (poId: string, page = 1, limit = 100) => {
  const cacheKey = getCacheKey("bills:by_po", { poId, page, limit });

  try {
    if (redis) {
      try {
        await ensureRedisConnection();
        const cached = await redis.get(cacheKey);
        if (cached) return JSON.parse(cached);
      } catch (redisError) {
        const message = redisError instanceof Error ? redisError.message : String(redisError);
        console.warn(`⚠️ Redis cache lookup failed: ${message}`);
      }
    }
  } catch (error) {
    console.error("Error accessing cache:", error);
  }

  const po: any = await prisma.purchaseOrder.findUnique({ where: { id: poId }, include: { customer: true } });
  if (!po) throw new Error("PurchaseOrder not found");

  const bills = Array.isArray(po.accountBills) ? po.accountBills : [];
  const rows = bills.map((b: any, idx: number) => {
    const billDate = b.billDate || b.createdAt || null;
    const billNo = b.billNo || b.id;
    const billAmt = typeof b.billAmt === "number" ? b.billAmt : parseFloat(String(b.amount ?? po.amount ?? 0));
    const receivedAmount = typeof b.receivedAmount === "number" ? b.receivedAmount : 0;
    const balanceAmount = typeof b.balanceAmount === "number" ? b.balanceAmount : billAmt - receivedAmount;

    return {
      id: b.id,
      purchaseOrderId: po.id,
      poNo: po.poNo,
      sNo: idx + 1,
      billDate,
      billNo,
      partyName: b.partyName ?? po.partyName ?? po.customer?.customerName ?? null,
      billAmt,
      receivedAmount,
      balanceAmount,
      dueDate: b.dueDate ?? null,
      pdcAmount: b.pdcAmount ?? null,
      pdcDate: b.pdcDate ?? null,
      chqNo: b.chqNo ?? b.chequeNumber ?? null,
      pdcReceiveDate: b.pdcReceiveDate ?? null,
      dueDays: computeDueDays(b.dueDate ?? null),
      marketingPersonnelName: b.marketingPersonnelName ?? po.orderThrough ?? null,
      accountsComments: b.accountsComments ?? null,
      chequesExpected: typeof b.chequesExpected === "boolean" ? b.chequesExpected : null,
      remarks: b.remarks ?? null,
      salesComments: po.salesComments ?? b.salesComments ?? null,
      raw: b,
      createdAt: b.createdAt ?? null,
    };
  });

  const total = rows.length;
  const start = (page - 1) * limit;
  const data = rows.slice(start, start + limit);

  const poSummary = {
    id: po.id,
    poNo: po.poNo,
    poDate: po.poDate ? new Date(po.poDate).toISOString() : null,
    amount: po.amount ?? null,
    overallStatus: po.overallStatus ?? null,
    invoiceNo: po.invoiceNo ?? null,
    invoiceDate: po.invoiceDate ? new Date(po.invoiceDate).toISOString() : null,
    customerName: po.customer?.customerName ?? null,
    gstNo: po.gstNo ?? null,
    salesComments: po.salesComments ?? null,
  };

  const response = { data, total, page, limit, po: poSummary };

  // Cache the result (non-blocking)
  if (redis) {
    redis
      .setex(cacheKey, CACHE_TTL, JSON.stringify(response))
      .catch((err) => console.warn(`⚠️ Failed to cache bills: ${err.message}`));
  }

  return response;
};