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
import {
  CACHE_TTL,
  CACHE_KEYS,
  CACHE_INVALIDATION_MAP,
  invalidateCache,
  invalidateBatchKeys,
  getOrSet,
  setWithWriteThrough,
  warmCache,
} from "../../common/utils/cacheManager";

interface TimestampAction {
  actionType: string;
  performedBy: {
    employeeId?: string;
    name: string;
    department: string;
  };
  description: string;
  timestamp: Date;
  changes?: any;
  remarks?: string;
}

interface TimestampData {
  createdAt?: Date;
  createdBy?: string;
  createdByDept?: string;
  importedBy?: string;
  importedByDept?: string;
  actions: TimestampAction[];
}

const getCacheKey = (prefix: string, payload: any) => {
  const hash = crypto
    .createHash("md5")
    .update(JSON.stringify(payload))
    .digest("hex");
  return `${prefix}:${hash}`;
};

/* ---------------- CREATE ---------------- */
export const createPurchaseOrder = async (data: any) => {
  try {
    console.log("Creating PO with data:", data);
    
    // Check if PO already exists
    if (data.poNo) {
      const existingPO = await prisma.purchaseOrder.findFirst({
        where: { poNo: data.poNo, gstNo: data.gstNo },
      });
      
      if (existingPO) {
        throw new AppError(ERROR_CODES.PO_ALREADY_EXISTS);
      }
    }

    // Find the customer by GST
    const gstNo = data.gstNo;
    const customer = await prisma.customer.findUnique({ 
      where: { gstrNo: gstNo } 
    });

    if (!customer) {
      throw new AppError(ERROR_CODES.CUSTOMER_NOT_FOUND);
    }

    // Prepare timestamp with audit log
    const timestampData: TimestampData = {
      createdAt: new Date(),
      createdBy: data.createdBy || "System",
      createdByDept: data.createdByDept || "System",
      actions: [{
        actionType: "CREATE",
        performedBy: {
          name: data.createdBy || "System",
          department: data.createdByDept || "System",
        },
        description: `Purchase Order created for customer ${customer.customerName} (GST: ${customer.gstrNo})`,
        timestamp: new Date(),
        remarks: data.remarks,
      }]
    };

    // Create the purchase order
    const po = await prisma.purchaseOrder.create({
      data: {
        // Customer info
        gstNo: data.gstNo,
        customerId: data.customerId,
        
        // Basic PO info
        poNo: data.poNo,
        poDate: data.poDate || new Date(),
        brandName: data.brandName,
        partyName: data.partyName,
        
        // Product details
        composition: data.composition,
        poQty: data.poQty,
        poRate: data.poRate,
        amount: data.amount,
        mrp: data.mrp,
        batchQty: data.batchQty,
        
        // Payment and terms
        paymentTerms: data.paymentTerms,
        cyc: data.cyc,
        advance: data.advance,
        
        // Packaging
        aluAluBlisterStripBottle: data.aluAluBlisterStripBottle,
        packStyle: data.packStyle,
        
        // Categorization
        section: data.section,
        productNewOld: data.productNewOld,
        
        // Status fields
        showStatus: data.showStatus || "Order Pending",
        rmStatus: data.rmStatus || "Pending",
        overallStatus: data.overallStatus || "Open",
        productionStatus: data.productionStatus || "Pending",
        dispatchStatus: data.dispatchStatus || "Pending",
        
        // Additional info
        specialRequirements: data.specialRequirements,
        salesComments: data.salesComments,
        orderThrough: data.orderThrough || "Direct",
        
        // Timestamp (audit log)
        timestamp: timestampData as any,
        
        // Initialize approval fields
        mdApproval: "Pending",
        accountsApproval: "Pending",
        designerApproval: "Pending",
        ppicApproval: "Pending",
      },
      include: { customer: true },
    });

    console.log("PO created successfully:", po.id);

    // Update customer summary if needed
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        // Add any customer summary updates here
        updatedAt: new Date(),
      },
    });

    // 🔥 Invalidate cache and warm frequently accessed data
    await invalidateBatchKeys(CACHE_INVALIDATION_MAP.CREATE);
    
    // Warm cache with the newly created PO
    await warmCache([
      {
        key: CACHE_KEYS.PO_SINGLE(po.id),
        ttl: CACHE_TTL.MEDIUM,
        fetch: async () => po,
      },
      {
        key: CACHE_KEYS.PO_BY_GST(gstNo),
        ttl: CACHE_TTL.MEDIUM,
        fetch: async () =>
          prisma.purchaseOrder.findMany({
            where: { gstNo },
            include: { customer: true },
          }),
      },
    ]);

    return po;
  } catch (error) {
    console.error("Error in createPurchaseOrder:", error);
    throw error;
  }
};
export const createPurchaseOrderWithCreditCheck = async (data: any) => {
  try {
    console.log("Creating PO with credit check:", data);
    
    // Find customer by GST number
    const gstNo = data.gstNo;
    const customer = await prisma.customer.findUnique({ 
      where: { gstrNo: gstNo } 
    });

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
    const amountValue = data.amount ? parseFloat(String(data.amount)) : 0;
    const newCreditUsage = totalCreditUsed + amountValue;

    if (newCreditUsage > customer.creditLimit) {
      throw new AppError(ERROR_CODES.CREDIT_LIMIT_EXCEEDED);
    }

    // Prepare timestamp with audit log including auto-approval
    const timestampData: TimestampData = {
      createdAt: new Date(),
      createdBy: data.createdBy || "System",
      createdByDept: data.createdByDept || "System",
      actions: [
        {
          actionType: "CREATE",
          performedBy: {
            name: data.createdBy || "System",
            department: data.createdByDept || "System",
          },
          description: `Purchase Order created with credit check for customer ${customer.customerName} (GST: ${customer.gstrNo})`,
          timestamp: new Date(),
        },
        {
          actionType: "AUTO_APPROVE",
          performedBy: {
            name: "System",
            department: "System",
          },
          description: "Automatically approved - Credit check passed and PO meets auto-approval criteria",
          timestamp: new Date(),
          changes: {
            mdApproval: "Approved",
            accountsApproval: "Approved",
          },
        }
      ]
    };

    // Create PO
    const po = await prisma.purchaseOrder.create({
      data: {
        ...data,
        gstNo: customer.gstrNo,
        customerId: customer.id,
        mdApproval: "Approved",
        accountsApproval: "Approved",
        timestamp: timestampData as any,
      },
      include: { customer: true },
    });

    console.log("PO created with auto-approval:", po.id);

    // 🔥 Invalidate cache and warm frequently accessed data
    await invalidateBatchKeys(CACHE_INVALIDATION_MAP.CREATE);
    
    // Warm cache with the newly created PO
    await warmCache([
      {
        key: CACHE_KEYS.PO_SINGLE(po.id),
        ttl: CACHE_TTL.MEDIUM,
        fetch: async () => po,
      },
      {
        key: CACHE_KEYS.PO_BY_GST(gstNo),
        ttl: CACHE_TTL.MEDIUM,
        fetch: async () =>
          prisma.purchaseOrder.findMany({
            where: { gstNo },
            include: { customer: true },
          }),
      },
      {
        key: CACHE_KEYS.PO_MD_APPROVED(),
        ttl: CACHE_TTL.LONG,
        fetch: async () =>
          prisma.purchaseOrder.findMany({
            where: { mdApproval: "Approved" },
            include: { customer: true },
          }),
      },
    ]);

    return po;
  } catch (error) {
    console.error("Error in createPurchaseOrderWithCreditCheck:", error);
    throw error;
  }
};
/* ---------------- GET BY ID ---------------- */
export const getPurchaseOrderById = async (id: string) => {
  const cacheKey = CACHE_KEYS.PO_SINGLE(id);
  
  return getOrSet(cacheKey, CACHE_TTL.MEDIUM, async () => {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { customer: true },
    });

    if (!po) {
      throw new AppError(ERROR_CODES.PO_NOT_FOUND);
    }

    return po;
  });
};

/* ---------------- UPDATE ---------------- */
/* ---------------- UPDATE ---------------- */
/* ---------------- UPDATE ---------------- */
export const updatePurchaseOrder = async (id: string, data: any) => {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
  });

  if (!po) {
    throw new AppError(ERROR_CODES.PO_NOT_FOUND);
  }

  // Type the timestamp data
  interface TimestampAction {
    actionType: string;
    performedBy: {
      employeeId?: string;
      name: string;
      department: string;
    };
    description: string;
    timestamp: Date | string;
    changes?: any;
    remarks?: string;
  }

  interface TimestampData {
    createdAt?: Date | string;
    createdBy?: string;
    createdByDept?: string;
    importedBy?: string;
    importedByDept?: string;
    actions: TimestampAction[];
  }

  // Helper function to safely parse timestamp data
  const parseTimestampData = (timestamp: any): TimestampData => {
    if (!timestamp) {
      return { actions: [] };
    }

    // If it's already an object with actions
    if (typeof timestamp === 'object' && timestamp !== null) {
      // Handle Prisma's Json type
      const parsed = timestamp as any;
      
      // Ensure actions exists and is an array
      if (Array.isArray(parsed.actions)) {
        return {
          createdAt: parsed.createdAt,
          createdBy: parsed.createdBy,
          createdByDept: parsed.createdByDept,
          importedBy: parsed.importedBy,
          importedByDept: parsed.importedByDept,
          actions: parsed.actions.map((action: any) => ({
            actionType: action.actionType || 'UNKNOWN',
            performedBy: {
              employeeId: action.performedBy?.employeeId,
              name: action.performedBy?.name || 'Unknown',
              department: action.performedBy?.department || 'Unknown',
            },
            description: action.description || '',
            timestamp: action.timestamp || new Date(),
            changes: action.changes,
            remarks: action.remarks,
          }))
        };
      }
    }
    
    // Default fallback
    return { actions: [] };
  };

  // Parse the existing timestamp data
  const timestampData = parseTimestampData(po.timestamp);

  // Create new action for this update
  const updateAction: TimestampAction = {
    actionType: "UPDATE",
    performedBy: {
      employeeId: data.updatedBy || undefined,
      name: data.updatedByName || "System",
      department: data.updatedByDept || "System",
    },
    description: `Purchase Order updated`,
    timestamp: new Date(),
    remarks: data.updateRemarks,
  };

  // Add action to existing actions array
  const updatedActions = [...timestampData.actions, updateAction];
  
  // Remove audit fields from data so they're not saved directly
  const { updatedBy, updatedByName, updatedByDept, updateRemarks, ...cleanData } = data;

  const updated = await prisma.purchaseOrder.update({
    where: { id },
    data: {
      ...cleanData,
      timestamp: { 
        ...timestampData, 
        actions: updatedActions 
      } as any,
    },
  });

  // 🔥 Invalidate related cache and warm frequently accessed data
  const invalidationKeys = CACHE_INVALIDATION_MAP.UPDATE(id, po.gstNo as string);
  await invalidateBatchKeys(invalidationKeys);

  // Warm cache with updated PO
  await warmCache([
    {
      key: CACHE_KEYS.PO_SINGLE(id),
      ttl: CACHE_TTL.MEDIUM,
      fetch: async () => updated,
    },
    {
      key: CACHE_KEYS.PO_BY_GST(po.gstNo as string),
      ttl: CACHE_TTL.MEDIUM,
      fetch: async () =>
        prisma.purchaseOrder.findMany({
          where: { gstNo: po.gstNo },
          include: { customer: true },
        }),
    },
    {
      key: CACHE_KEYS.PO_SLAB_LIMIT(po.gstNo as string),
      ttl: CACHE_TTL.SHORT,
      fetch: async () => {
        const pos = await prisma.purchaseOrder.findMany({
          where: { gstNo: po.gstNo },
          select: { amount: true },
        });
        return pos.reduce((sum, p) => {
          const amount = p.amount ? parseFloat(String(p.amount)) : 0;
          return sum + (isNaN(amount) ? 0 : amount);
        }, 0);
      },
    },
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

  // 🔥 Invalidate related cache
  const invalidationKeys = CACHE_INVALIDATION_MAP.DELETE(id, po.gstNo as string);
  await invalidateBatchKeys(invalidationKeys);
};

/* ---------------- GET ALL ---------------- */
export const getAllPurchaseOrders = async (
  filters: {
    gstNo?: string;
    poNo?: string;
    overallStatus?: string;
    productionStatus?: string;
    dispatchStatus?: string;
    fromDate?: Date;
    toDate?: Date;
    createdByUsername: string; // REQUIRED
  },
  page = 1,
  limit = 50,
  sortBy = "createdAt",
  order: "asc" | "desc" = "desc"
) => {
  try {
    // 🔐 USER-AWARE CACHE KEY using cache manager
    const cacheKey = CACHE_KEYS.PO_LIST("all", {
      username: filters.createdByUsername,
      gstNo: filters.gstNo,
      poNo: filters.poNo,
      overallStatus: filters.overallStatus,
      fromDate: filters.fromDate,
      toDate: filters.toDate,
      page,
      limit,
      sortBy,
      order,
    });

    return getOrSet(cacheKey, CACHE_TTL.SHORT, async () => {
      const where: any = {};

      // 🔐 CRITICAL FILTER — USER CAN SEE ONLY THEIR POs
      where.orderThrough = filters.createdByUsername;

      // 🔎 Optional filters
      if (filters.gstNo) where.gstNo = filters.gstNo;

      if (filters.poNo) {
        where.poNo = {
          contains: filters.poNo,
          mode: "insensitive",
        };
      }

      if (filters.overallStatus) {
        where.overallStatus = filters.overallStatus;
      }

      if (filters.productionStatus) {
        where.productionStatus = filters.productionStatus;
      }

      if (filters.dispatchStatus) {
        where.dispatchStatus = filters.dispatchStatus;
      }

      if (filters.fromDate || filters.toDate) {
        where.poDate = {};
        if (filters.fromDate) where.poDate.gte = filters.fromDate;
        if (filters.toDate) where.poDate.lte = filters.toDate;
      }

      const [data, total] = await Promise.all([
        prisma.purchaseOrder.findMany({
          where,
          include: {
            customer: true,
          },
          skip: (page - 1) * limit,
          take: limit,
          orderBy: {
            [sortBy]: order,
          },
        }),
        prisma.purchaseOrder.count({ where }),
      ]);

      return {
        data,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    });
  } catch (error) {
    console.error("Error getting all purchase orders:", error);
    throw error;
  }
};

export const getLatestPoCount = async (): Promise<number> => {
  try {
    const latest = await prisma.purchaseOrder.findFirst({
      orderBy: { createdAt: "desc" },
      select: { poNo: true },
    });

    if (!latest?.poNo) {
      console.warn("No PO found in database");
      return 0;
    }

    // Extract numeric part from PO number (assuming format like "PO-1769531093987")
    const match = latest.poNo.match(/(\d+)$/);
    if (!match) {
      console.warn("Invalid PO format for latest PO:", latest.poNo);
      return 0;
    }

    return Number(match[1]);
  } catch (error) {
    console.error("Error getting latest PO count:", error);
    return 0;
  }
};

export const getPOByGST = async (gstNo: string) => {
  try {
    const cacheKey = CACHE_KEYS.PO_BY_GST(gstNo);
    
    return getOrSet(cacheKey, CACHE_TTL.MEDIUM, async () => {
      return prisma.purchaseOrder.findMany({ 
        where: { gstNo },
        include: { customer: true }
      });
    });
  } catch (error) {
    console.error("Error getting PO by GST:", error);
    throw error;
  }
};

export const getMDApprovedPOs = async () => {
  try {
    const cacheKey = CACHE_KEYS.PO_MD_APPROVED();
    
    return getOrSet(cacheKey, CACHE_TTL.LONG, async () => {
      return prisma.purchaseOrder.findMany({
        where: { mdApproval: "Approved" },
        include: { customer: true },
      });
    });
  } catch (error) {
    console.error("Error getting MD approved POs:", error);
    throw error;
  }
};

export const getPPICApprovedBatches = async () => {
  try {
    const cacheKey = CACHE_KEYS.PO_PPIC_APPROVED_BATCHES();
    
    return getOrSet(cacheKey, CACHE_TTL.LONG, async () => {
      const data = await prisma.purchaseOrder.findMany({
        where: { 
          ppicApproval: "Approved",
          batchNo: { not: null }
        },
        select: { 
          batchNo: true,
          brandName: true,
          poNo: true,
          poQty: true,
        },
      });

      return data.map(d => ({
        batchNo: d.batchNo,
        brandName: d.brandName,
        poNo: d.poNo,
        poQty: d.poQty,
      })).filter(b => b.batchNo);
    });
  } catch (error) {
    console.error("Error getting PPIC approved batches:", error);
    throw error;
  }
};

export const getSlabLimit = async (gstNo: string) => {
  try {
    const cacheKey = CACHE_KEYS.PO_SLAB_LIMIT(gstNo);
    
    return getOrSet(cacheKey, CACHE_TTL.SHORT, async () => {
      const pos = await prisma.purchaseOrder.findMany({
        where: { gstNo },
        select: { amount: true },
      });

      return pos.reduce((sum, po) => {
        const amount = po.amount ? parseFloat(String(po.amount)) : 0;
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);
    });
  } catch (error) {
    console.error("Error getting slab limit:", error);
    throw error;
  }
};

export const getBatchNumbers = async () => {
  try {
    const cacheKey = CACHE_KEYS.PO_BATCH_NUMBERS();
    
    return getOrSet(cacheKey, CACHE_TTL.LONG, async () => {
      return prisma.purchaseOrder.findMany({
        where: { batchNo: { not: null } },
        select: {
          batchNo: true,
          brandName: true,
          poNo: true,
          poQty: true,
        },
        distinct: ['batchNo'],
      });
    });
  } catch (error) {
    console.error("Error getting batch numbers:", error);
    throw error;
  }
};

export const getPOAnalytics = async (fromDate?: Date, toDate?: Date) => {
  try {
    const cacheKey = CACHE_KEYS.PO_ANALYTICS("analytics", { fromDate, toDate });
    
    return getOrSet(cacheKey, CACHE_TTL.LONG, async () => {
      const where: any = {};
      if (fromDate || toDate) {
        where.poDate = {};
        if (fromDate) where.poDate.gte = fromDate;
        if (toDate) where.poDate.lte = toDate;
      }

      const [
        totalPOs,
        statusCounts,
        allPOs,
        posPerCustomer,
        monthlyPOs,
        approvalStats,
        productionStats,
        dispatchStats,
      ] = await Promise.all([
        // Total POs
        prisma.purchaseOrder.count({ where }),

        // POs grouped by overall status
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
        prisma.purchaseOrder.groupBy({
          by: ["mdApproval", "accountsApproval", "designerApproval", "ppicApproval"],
          _count: { id: true },
          where,
        }),

        // Production status stats
        prisma.purchaseOrder.groupBy({
          by: ["productionStatus"],
          _count: { id: true },
          where,
        }),

        // Dispatch status stats
        prisma.purchaseOrder.groupBy({
          by: ["dispatchStatus"],
          _count: { id: true },
          where,
        }),
      ]);

      // Prepare response
      return {
        totalPOs,
        statusCounts: statusCounts.map((s) => ({
          status: s.overallStatus,
          count: s._count.id,
        })),
        totalAmount: allPOs.reduce((sum, po) => {
          const amount = po.amount ? parseFloat(String(po.amount)) : 0;
          return sum + (isNaN(amount) ? 0 : amount);
        }, 0),
        averageAmount: allPOs.length > 0 ? 
          allPOs.reduce((sum, po) => {
            const amount = po.amount ? parseFloat(String(po.amount)) : 0;
            return sum + (isNaN(amount) ? 0 : amount);
          }, 0) / allPOs.length : 0,
        posPerCustomer: posPerCustomer.map((c) => ({
          gstNo: c.gstNo,
          count: c._count.id,
        })),
        monthlyPOs: monthlyPOs.map((m) => ({
          month: m.month.toISOString(),
          count: Number(m.count),
        })),
        topCustomersByAmount: posPerCustomer.map((c) => {
          const customerPOs = allPOs.filter(po => po.gstNo === c.gstNo);
          const totalAmount = customerPOs.reduce((sum, po) => {
            const amount = po.amount ? parseFloat(String(po.amount)) : 0;
            return sum + (isNaN(amount) ? 0 : amount);
          }, 0);
          return { gstNo: c.gstNo, totalAmount };
        }).sort((a, b) => b.totalAmount - a.totalAmount).slice(0, 10),
        approvalStats: {
          mdApproved: approvalStats.filter(a => a.mdApproval === "Approved").reduce((sum, a) => sum + a._count.id, 0),
          accountsApproved: approvalStats.filter(a => a.accountsApproval === "Approved").reduce((sum, a) => sum + a._count.id, 0),
          designerApproved: approvalStats.filter(a => a.designerApproval === "Approved").reduce((sum, a) => sum + a._count.id, 0),
          ppicApproved: approvalStats.filter(a => a.ppicApproval === "Approved").reduce((sum, a) => sum + a._count.id, 0),
        },
        productionStats: productionStats.map((p) => ({
          status: p.productionStatus,
          count: p._count.id,
        })),
        dispatchStats: dispatchStats.map((d) => ({
          status: d.dispatchStatus,
          count: d._count.id,
        })),
      };
    });
  } catch (error) {
    console.error("Error getting PO analytics:", error);
    throw error;
  }
};

export const bulkCreatePurchaseOrders = async (purchaseOrders: any[]) => {
  // Prepare timestamp for bulk import
  const enrichedOrders = purchaseOrders.map((po) => {
    const timestampData = {
      createdAt: new Date(),
      importedBy: po.importedBy || "System",
      importedByDept: po.importedByDept || "System",
      actions: [{
        actionType: "BULK_IMPORT",
        performedBy: {
          name: po.importedBy || "System",
          department: po.importedByDept || "System",
        },
        description: `Purchase Order imported via bulk upload - PO#: ${po.poNo}`,
        timestamp: new Date(),
        remarks: po.importRemarks,
      }]
    };

    return {
      ...po,
      timestamp: timestampData,
    };
  });

  const result = await prisma.purchaseOrder.createMany({
    data: enrichedOrders,
    skipDuplicates: true,
  });

  // 🔥 Invalidate cache and warm frequently accessed data after bulk import
  await invalidateBatchKeys(CACHE_INVALIDATION_MAP.BULK_CREATE);

  // Warm analytics cache after bulk operations
  await warmCache([
    {
      key: CACHE_KEYS.PO_ANALYTICS("analytics", {}),
      ttl: CACHE_TTL.LONG,
      fetch: async () => getPOAnalytics(),
    },
    {
      key: CACHE_KEYS.PO_BATCH_NUMBERS(),
      ttl: CACHE_TTL.LONG,
      fetch: async () =>
        prisma.purchaseOrder.findMany({
          where: { batchNo: { not: null } },
          select: {
            batchNo: true,
            brandName: true,
            poNo: true,
            poQty: true,
          },
          distinct: ['batchNo'],
        }),
    },
  ]);

  return result;
};

/* ---------------- APPROVALS (MD ONLY) ---------------- */
export const getPendingPOApprovalsApi = async (filters?: {
  gstNo?: string;
}) => {
  try {
    const cacheKey = CACHE_KEYS.PO_PENDING_APPROVALS("pending", filters || {});
    
    return getOrSet(cacheKey, CACHE_TTL.SHORT, async () => {
      const where: any = { mdApproval: "Pending" };

      if (filters?.gstNo) {
        where.gstNo = filters.gstNo;
      }

      return prisma.purchaseOrder.findMany({
        where,
        include: { customer: true },
        orderBy: { createdAt: "desc" },
      });
    });
  } catch (error) {
    console.error("Error getting pending MD PO approvals:", error);
    throw error;
  }
};

export const approvePOApi = async (
  id: string,
  approvalData: {
    approvedBy: string;
    approvedByDept: string;
    remarks?: string;
  }
) => {
  try {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
    });

    if (!po) {
      throw new AppError(ERROR_CODES.PO_NOT_FOUND);
    }

    // Parse existing timestamp data
    const timestampData = parseTimestampData(po.timestamp);

    // Create MD approval action
    const approvalAction: TimestampAction = {
      actionType: "MD_APPROVED",
      performedBy: {
        name: approvalData.approvedBy,
        department: approvalData.approvedByDept,
      },
      description: `Purchase Order approved by MD`,
      timestamp: new Date(),
      remarks: approvalData.remarks,
    };

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        mdApproval: "Approved",
        timestamp: {
          ...timestampData,
          actions: [...timestampData.actions, approvalAction],
        } as any,
      },
      include: { customer: true },
    });

    // 🔥 Invalidate related cache and warm frequently accessed data
    await invalidateBatchKeys([
      CACHE_KEYS.PO_SINGLE(id),
      "po:list:*",
      "po:pending_approvals:*",
      CACHE_KEYS.PO_MD_APPROVED(),
    ]);

    // Warm cache with updated PO and approval list
    await warmCache([
      {
        key: CACHE_KEYS.PO_SINGLE(id),
        ttl: CACHE_TTL.MEDIUM,
        fetch: async () => updated,
      },
      {
        key: CACHE_KEYS.PO_MD_APPROVED(),
        ttl: CACHE_TTL.LONG,
        fetch: async () =>
          prisma.purchaseOrder.findMany({
            where: { mdApproval: "Approved" },
            include: { customer: true },
          }),
      },
      {
        key: CACHE_KEYS.PO_PENDING_APPROVALS("pending", {}),
        ttl: CACHE_TTL.SHORT,
        fetch: async () =>
          prisma.purchaseOrder.findMany({
            where: { mdApproval: "Pending" },
            include: { customer: true },
            orderBy: { createdAt: "desc" },
          }),
      },
    ]);

    return updated;
  } catch (error) {
    console.error("Error approving PO:", error);
    throw error;
  }
};

export const rejectPOApi = async (
  id: string,
  rejectData: {
    reason: string;
    rejectedBy: string;
    rejectedByDept: string;
  }
) => {
  try {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
    });

    if (!po) {
      throw new AppError(ERROR_CODES.PO_NOT_FOUND);
    }

    // Parse existing timestamp data
    const timestampData = parseTimestampData(po.timestamp);

    // Create MD rejection action
    const rejectionAction: TimestampAction = {
      actionType: "MD_REJECTED",
      performedBy: {
        name: rejectData.rejectedBy,
        department: rejectData.rejectedByDept,
      },
      description: `Purchase Order rejected by MD: ${rejectData.reason}`,
      timestamp: new Date(),
      remarks: rejectData.reason,
    };

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        mdApproval: "Rejected",
        timestamp: {
          ...timestampData,
          actions: [...timestampData.actions, rejectionAction],
        } as any,
      },
      include: { customer: true },
    });

    // 🔥 Invalidate related cache and warm frequently accessed data
    await invalidateBatchKeys([
      CACHE_KEYS.PO_SINGLE(id),
      "po:list:*",
      "po:pending_approvals:*",
    ]);

    // Warm cache with updated PO and pending approvals list
    await warmCache([
      {
        key: CACHE_KEYS.PO_SINGLE(id),
        ttl: CACHE_TTL.MEDIUM,
        fetch: async () => updated,
      },
      {
        key: CACHE_KEYS.PO_PENDING_APPROVALS("pending", {}),
        ttl: CACHE_TTL.SHORT,
        fetch: async () =>
          prisma.purchaseOrder.findMany({
            where: { mdApproval: "Pending" },
            include: { customer: true },
            orderBy: { createdAt: "desc" },
          }),
      },
    ]);

    return updated;
  } catch (error) {
    console.error("Error rejecting PO:", error);
    throw error;
  }
};

// Helper function to safely parse timestamp data
const parseTimestampData = (timestamp: any): TimestampData => {
  if (!timestamp) {
    return { actions: [] };
  }

  if (typeof timestamp === 'object' && timestamp !== null) {
    const parsed = timestamp as any;
    
    if (Array.isArray(parsed.actions)) {
      return {
        createdAt: parsed.createdAt,
        createdBy: parsed.createdBy,
        createdByDept: parsed.createdByDept,
        importedBy: parsed.importedBy,
        importedByDept: parsed.importedByDept,
        actions: parsed.actions.map((action: any) => ({
          actionType: action.actionType || 'UNKNOWN',
          performedBy: {
            employeeId: action.performedBy?.employeeId,
            name: action.performedBy?.name || 'Unknown',
            department: action.performedBy?.department || 'Unknown',
          },
          description: action.description || '',
          timestamp: action.timestamp || new Date(),
          changes: action.changes,
          remarks: action.remarks,
        }))
      };
    }
  }
  
  return { actions: [] };
};