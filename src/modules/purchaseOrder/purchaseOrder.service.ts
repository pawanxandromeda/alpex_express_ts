// src/services/purchaseOrder.service.ts
import prisma from "../../config/postgres";
import redis from "../../config/redis";
import crypto from "crypto";
import { AppError, ERROR_CODES } from "../../common/utils/errorMessages";
import {
  createAuditAction,
  addActionToLog,
  getAuditLog,
  trackFieldChanges,
} from "../../common/utils/auditLog";

const CACHE_TTL = 60; // seconds

const getCacheKey = (prefix: string, payload: any) => {
  const hash = crypto
    .createHash("md5")
    .update(JSON.stringify(payload))
    .digest("hex");
  return `${prefix}:${hash}`;
};

/* ---------------- CREATE ---------------- */
export const createPurchaseOrder = async (data: any) => {
  // Check if PO already exists
 

  // Find the customer by GST
  const gstNo = data.gstNumber || data.gstNo;
  const customer = await prisma.customer.findUnique({ where: { gstrNo: gstNo } });

  if (!customer) {
    throw new AppError(ERROR_CODES.CUSTOMER_NOT_FOUND);
  }

  // Create the purchase order and link to customer via GST
  const po = await prisma.purchaseOrder.create({
    data: {
      poNo: data.poNo,
      gstNo: customer.gstrNo,
      partyName: data.partyName,
      poDate: data.poDate,
      poQty: data.poQuantity ,
      poRate: data.poRate,
      amount: data.totalAmount || data.amount,
      mrp: data.mrp ? String(data.mrp) : undefined,
      aluAluBlisterStripBottle: data.packType,
      brandName: data.brandName,
      composition: data.composition,
      packStyle: data.packStyle || undefined,
      paymentTerms: data.paymentTerms,
      cyc: data.cyc,
      advance: data.advance,
      section: data.section,
      productNewOld: data.productType,
      batchQty:
        data.batchQuantity ,
      showStatus: String(data.showStatus || "Order Pending"),
      specialRequirements: data.specialRequirements || undefined,
      // Initialize timestamp with creation action
      timestamp: JSON.stringify(
        addActionToLog(
          null,
          createAuditAction({
            actionType: "CREATE",
            performedBy: {
              name: data.createdBy || "System",
              department: data.createdByDept || "System",
            },
            description: `Purchase Order created for customer ${customer.customerName} (GST: ${customer.gstrNo})`,
            remarks: data.remarks,
          })
        )
      ),
    },
    include: { customer: true },
  });

  // Update customer summary fields
  await prisma.customer.update({
    where: { id: customer.id },
    data: {},
  });

  // Clear cache
  await redis.del("purchase_orders:list:*");

  return po;
};


export const createPurchaseOrderWithCreditCheck = async (data: any) => {
  // Find customer by GST number
  const gstNo = data.gstNumber || data.gstNo;
  const customer = await prisma.customer.findUnique({ where: { gstrNo: gstNo } });

  if (!customer) {
    throw new AppError(ERROR_CODES.CUSTOMER_NOT_FOUND);
  }

  // Blacklist check
  if (customer.isBlacklisted) {
    throw new AppError(ERROR_CODES.BLACKLISTED_CUSTOMER);
  }

  // Credit approval check
  if (customer.creditApprovalStatus !== "Approved") {
    throw new AppError(ERROR_CODES.CREDIT_NOT_APPROVED);
  }

  // Check total credit used
  const totalCreditUsed = await getSlabLimit(customer.gstrNo);
  const newCreditUsage = totalCreditUsed + (parseFloat(String(data.amount || 0)));

  if (newCreditUsage > customer.creditLimit) {
    throw new AppError(ERROR_CODES.CREDIT_LIMIT_EXCEEDED);
  }

  // Create PO and link to customer
  const po = await prisma.purchaseOrder.create({
    data: {
      ...data,
      gstNo: customer.gstrNo,
      mdApproval: "Approved",
      accountsApproval: "Approved",
      // Initialize timestamp with creation and auto-approval actions
      timestamp: JSON.stringify(
        addActionToLog(
          addActionToLog(
            null,
            createAuditAction({
              actionType: "CREATE",
              performedBy: {
                name: data.createdBy || "System",
                department: data.createdByDept || "System",
              },
              description: `Purchase Order created with credit check for customer ${customer.customerName} (GST: ${customer.gstrNo})`,
            })
          ),
          createAuditAction({
            actionType: "AUTO_APPROVE",
            performedBy: {
              name: "System",
              department: "System",
            },
            description: "Automatically approved - Credit check passed and PO meets auto-approval criteria",
            approvalStatus: {
              mdApproval: "Approved",
              accountsApproval: "Approved",
            },
          })
        )
      ),
    },
    include: { customer: true },
  });

  // Clear cache
  await redis.del("purchase_orders:list:*");

  return po;
};




/* ---------------- GET BY ID ---------------- */
export const getPurchaseOrderById = async (id: string) => {
  const cacheKey = `purchase_orders:single:${id}`;

  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: { customer: true },
  });

  if (!po) {
    throw new AppError(ERROR_CODES.PO_NOT_FOUND);
  }

  await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(po));

  return po;
};

/* ---------------- UPDATE ---------------- */
export const updatePurchaseOrder = async (id: string, data: any) => {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
  });

  if (!po) {
    throw new AppError(ERROR_CODES.PO_NOT_FOUND);
  }

  // Track which fields were changed
  const changes = trackFieldChanges(po, data);

  // Get existing audit log
  const auditLog = getAuditLog(po.timestamp);

  // Create new action for this update
  const updateAction = createAuditAction({
    actionType: "UPDATE",
    performedBy: {
      employeeId: data.updatedBy || undefined,
      name: data.updatedByName || "System",
      department: data.updatedByDept || "System",
    },
    description: `Purchase Order updated - ${Object.keys(changes).length} field(s) modified`,
    changes: Object.keys(changes).length > 0 ? changes : undefined,
    remarks: data.updateRemarks,
  });

  // Add action to log
  const updatedLog = addActionToLog(auditLog, updateAction);

  // Remove audit fields from data so they're not saved directly
  const { updatedBy, updatedByName, updatedByDept, updateRemarks, ...cleanData } = data;

  const updated = await prisma.purchaseOrder.update({
    where: { id },
    data: {
      ...cleanData,
      timestamp: JSON.stringify(updatedLog),
    },
  });

  await Promise.all([
    redis.del(`purchase_orders:single:${id}`),
    redis.del("purchase_orders:list:*"),
  ]);

  return updated;
};

/* ---------------- DELETE ---------------- */
export const deletePurchaseOrder = async (id: string) => {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
  });

  if (!po) {
    throw new AppError(ERROR_CODES.PO_NOT_FOUND);
  }

  await prisma.purchaseOrder.delete({ where: { id } });

  await Promise.all([
    redis.del(`purchase_orders:single:${id}`),
    redis.del("purchase_orders:list:*"),
  ]);
};

/* ---------------- ADVANCED LIST (FAST) ---------------- */
export const getAllPurchaseOrders = async (
  filters: any,
  page = 1,
  limit = 10,
  sortBy = "createdAt",
  order: "asc" | "desc" = "desc"
) => {
  try {
    const cacheKey = getCacheKey("purchase_orders:list", {
      filters,
      page,
      limit,
      sortBy,
      order,
    });

    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const where: any = {};

    if (filters.gstNo) where.gstNo = filters.gstNo;
    if (filters.poNo)
      where.poNo = { contains: filters.poNo, mode: "insensitive" };
    if (filters.overallStatus)
      where.overallStatus = filters.overallStatus;

    if (filters.fromDate || filters.toDate) {
      where.poDate = {};
      if (filters.fromDate) where.poDate.gte = filters.fromDate;
      if (filters.toDate) where.poDate.lte = filters.toDate;
    }

    const [data, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: { customer: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: order },
      }),
      prisma.purchaseOrder.count({ where }),
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

    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(response));

    return response;
  } catch (error) {
    console.error("Error getting all POs:", error);
    throw error;
  }
};

// export const getPOByPoNo = async (poNo: string) => {
//   try {
//     const cacheKey = `po:poNo:${poNo}`;
//     const cached = await redis.get(cacheKey);
//     if (cached) return JSON.parse(cached);

//     const po = await prisma.purchaseOrder.findUnique({
//       where: { poNo },
//       select: {
//         mdApproval: true,
//         accountsApproval: true,
//         designerApproval: true,
//         ppicApproval: true,
//         showStatus: true,
//         gstNo: true,
//         poNo: true,
//         poDate: true,
//         brandName: true,
//         partyName: true,
//       },
//     });

//     if (po) await redis.setex(cacheKey, 120, JSON.stringify(po));
//     return po;
//   } catch (error) {
//     console.error("Error getting PO by PoNo:", error);
//     throw error;
//   }
// };

export const getLatestPoCount = async (): Promise<number> => {
  try {
    const latest = await prisma.purchaseOrder.findFirst({
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
  } catch (error) {
    console.error("Error getting latest PO count:", error);
    return 0; // fallback to 0 on unexpected errors
  }
};

export const getPOByGST = async (gstNo: string) => {
  try {
    const cacheKey = `po:gst:${gstNo}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const data = await prisma.purchaseOrder.findMany({ where: { gstNo } });

    await redis.setex(cacheKey, 120, JSON.stringify(data));
    return data;
  } catch (error) {
    console.error("Error getting PO by GST:", error);
    throw error;
  }
};

export const getMDApprovedPOs = async () => {
  try {
    const cacheKey = `po:md_approved`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const data = await prisma.purchaseOrder.findMany({
      where: { mdApproval: "Approved" },
    });

    await redis.setex(cacheKey, 120, JSON.stringify(data));
    return data;
  } catch (error) {
    console.error("Error getting MD approved POs:", error);
    throw error;
  }
};

export const getPPICApprovedBatches = async () => {
  try {
    const cacheKey = `po:ppic_approved_batches`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const data = await prisma.purchaseOrder.findMany({
      where: { ppicApproval: "Approved" },
      select: { batchNo: true },
    });

    const batches = data.map(d => d.batchNo).filter(Boolean);
    await redis.setex(cacheKey, 120, JSON.stringify(batches));
    return batches;
  } catch (error) {
    console.error("Error getting PPIC approved batches:", error);
    throw error;
  }
};

// export const completePO = async (poNo: string) => {
//   try {
//     const po = await prisma.purchaseOrder.findUnique({
//       where: { poNo },
//     });

//     if (!po) {
//       throw new AppError(ERROR_CODES.PO_NOT_FOUND);
//     }

//     // Get existing audit log
//     const auditLog = getAuditLog(po.timestamp);

//     // Create completion action
//     const completionAction = createAuditAction({
//       actionType: "COMPLETE",
//       performedBy: {
//         name: "System",
//         department: "System",
//       },
//       description: "Purchase Order marked as completed",
//     });

//     // Add action to log
//     const updatedLog = addActionToLog(auditLog, completionAction);

//     const completedPo = await prisma.purchaseOrder.update({
//       where: { poNo },
//       data: {
//         overallStatus: "Completed",
//         timestamp: JSON.stringify(updatedLog),
//       },
//     });

//     await redis.del(`po:poNo:${poNo}`);
//     await redis.del("purchase_orders:list:*"); // Invalidate lists
//     return completedPo;
//   } catch (error) {
//     console.error("Error completing PO:", error);
//     throw error;
//   }
// };

export const getSlabLimit = async (gstNo: string) => {
  try {
    const cacheKey = `po:slab:${gstNo}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    // Get all POs for this GST and manually sum amounts (since they're now strings)
    const pos = await prisma.purchaseOrder.findMany({
      where: { gstNo },
      select: { amount: true },
    });

    const total = pos.reduce((sum, po) => {
      const amount = po.amount ? parseFloat(String(po.amount)) : 0;
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    await redis.setex(cacheKey, 120, JSON.stringify(total));
    return total;
  } catch (error) {
    console.error("Error getting slab limit:", error);
    throw error;
  }
};

export const getBatchNumbers = async () => {
  try {
    const cacheKey = `po:batch_numbers`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const data = await prisma.purchaseOrder.findMany({
      where: { batchNo: { not: null } },
      select: {
        batchNo: true,
        brandName: true,
      },
    });

    await redis.setex(cacheKey, 120, JSON.stringify(data));
    return data;
  } catch (error) {
    console.error("Error getting batch numbers:", error);
    throw error;
  }
};



export const getPOAnalytics = async (fromDate?: Date, toDate?: Date) => {
  try {
    // Generate cache key
    const cacheKey = getCacheKey("po:analytics", { fromDate, toDate });
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    // Build where clause
    const where: any = {};
    if (fromDate || toDate) {
      where.poDate = {};
      if (fromDate) where.poDate.gte = fromDate;
      if (toDate) where.poDate.lte = toDate;
    }

    // Fetch analytics in parallel
    const [
      totalPOs,
      statusCounts,
      allPOs,  // Fetch all POs to calculate amounts manually
      posPerCustomer,
      monthlyPOs,
      approvalStats,
    ] = await Promise.all([
      // Total POs
      prisma.purchaseOrder.count({ where }),

      // POs grouped by status
      prisma.purchaseOrder.groupBy({
        by: ["overallStatus"],
        _count: { id: true },
        where,
      }),

      // Fetch all POs for manual amount calculation
      prisma.purchaseOrder.findMany({
        select: { amount: true, gstNo: true },
        where,
      }),

      // Top 10 customers by PO count
      prisma.purchaseOrder.groupBy({
        by: ["gstNo"],
        _count: { id: true },
        where,
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),

      // Monthly POs (last 12 months)
      prisma.$queryRaw<Array<{ month: Date; count: bigint }>>`
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

      // Approval stats
      prisma.purchaseOrder.aggregate({
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
      totalAmount: allPOs.reduce((sum, po) => {
        const amount = po.amount ? parseFloat(String(po.amount)) : 0;
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0),
      averageAmount: allPOs.length > 0 ? (allPOs.reduce((sum, po) => {
        const amount = po.amount ? parseFloat(String(po.amount)) : 0;
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0) / allPOs.length) : 0,
      posPerCustomer: posPerCustomer.map((c) => ({
        gstNo: c.gstNo,
        count: c._count.id,
      })),
      monthlyPOs: monthlyPOs.map((m) => ({
        month: m.month.toISOString(),
        count: Number(m.count),
      })),
      topCustomersByAmount: posPerCustomer  // Use posPerCustomer but calculate amounts
        .map((c) => {
          const customerPOs = allPOs.filter(po => po.gstNo === c.gstNo);
          const totalAmount = customerPOs.reduce((sum, po) => {
            const amount = po.amount ? parseFloat(String(po.amount)) : 0;
            return sum + (isNaN(amount) ? 0 : amount);
          }, 0);
          return { gstNo: c.gstNo, totalAmount };
        })
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 10),
      approvalStats: {
        mdApproved: approvalStats._count.mdApproval || 0,
        accountsApproved: approvalStats._count.accountsApproval || 0,
        designerApproved: approvalStats._count.designerApproval || 0,
        ppicApproved: approvalStats._count.ppicApproval || 0,
      },
    };

    // Cache result for 5 minutes
    await redis.setex(cacheKey, 300, JSON.stringify(response));

    return response;
  } catch (error) {
    console.error("Error getting PO analytics:", error);
    throw error;
  }
};

export const bulkCreatePurchaseOrders = async (purchaseOrders: any[]) => {
  // Create audit logs for bulk import
  const enrichedOrders = purchaseOrders.map((po) => {
    const importAction = createAuditAction({
      actionType: "BULK_IMPORT",
      performedBy: {
        name: po.importedBy || "System",
        department: po.importedByDept || "System",
      },
      description: `Purchase Order imported via bulk upload - PO#: ${po.poNo}`,
      remarks: po.importRemarks,
    });

    const auditLog = addActionToLog(null, importAction);

    return {
      ...po,
      timestamp: JSON.stringify(auditLog),
    };
  });

  const result = await prisma.purchaseOrder.createMany({
    data: enrichedOrders,
    skipDuplicates: true,
  });

  // Clear cache for bulk operations
  await redis.del("purchase_orders:list:*");

  return result;
};

