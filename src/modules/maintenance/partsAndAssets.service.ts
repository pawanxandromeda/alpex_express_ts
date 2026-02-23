import prisma from "../../config/postgres";
import redis from "../../config/redis";
import { AppError, ERROR_CODES } from "../../common/utils/errorMessages";

interface CreatePartPayload {
  name: string;
  code: string;
  description?: string;
  category: string;
  partNumber?: string;
  manufacturer?: string;
  supplierIds?: string[];
  quantityInStock?: number;
  minimumStock?: number;
  reorderPoint?: number;
  reorderQuantity?: number;
  unitCost?: number;
  sellingPrice?: number;
}

interface CreatePartOrderPayload {
  partId: string;
  supplierId: string;
  supplierName: string;
  quantity: number;
  unitPrice?: number;
  expectedDelivery?: Date;
  purchaseOrderNumber?: string;
  notes?: string;
  orderedBy: string;
}

interface CreateFixedAssetPayload {
  name: string;
  code: string;
  assetCategory: string;
  description?: string;
  manufacturer?: string;
  modelNumber?: string;
  serialNumber?: string;
  currentLocation: string;
  quantity?: number;
  minThreshold?: number;
  purchaseDate?: Date;
  purchasePrice?: number;
  supplier?: string;
  condition?: string;
  notes?: string;
  createdBy: string;
}

interface CheckOutAssetPayload {
  assetId: string;
  usedByEmployeeId?: string;
  usedBy?: string;
  usedForMachineId?: string;
  usedForDescription?: string;
}

interface CheckInAssetPayload {
  assetId: string;
  condition?: string;
  notes?: string;
}

export class PartsAndAssetsService {
  // ============ PARTS MANAGEMENT ============

  /**
   * Create Part Master
   */
  static async createPart(payload: CreatePartPayload) {
    try {
      const part = await prisma.part.create({
        data: {
          name: payload.name,
          code: payload.code,
          description: payload.description,
          category: payload.category,
          partNumber: payload.partNumber,
          manufacturer: payload.manufacturer,
          supplierIds: payload.supplierIds || [],
          quantityInStock: payload.quantityInStock || 0,
          minimumStock: payload.minimumStock || 5,
          reorderPoint: payload.reorderPoint || 10,
          reorderQuantity: payload.reorderQuantity || 20,
          unitCost: payload.unitCost,
          sellingPrice: payload.sellingPrice,
          status: "Available",
        },
      });

      await this.invalidatePartsCache();
      return part;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to create Part", ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Update Part Inventory
   */
  static async updatePartInventory(partId: string, quantityChange: number) {
    try {
      const part = await prisma.part.findUnique({
        where: { id: partId },
      });

      if (!part) {
        throw new AppError("Part not found", ERROR_CODES.NOT_FOUND);
      }

      const newQuantity = part.quantityInStock + quantityChange;

      if (newQuantity < 0) {
        throw new AppError(
          "Insufficient inventory",
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      let status = part.status;
      if (newQuantity <= 0) {
        status = "OutOfStock";
      } else if (newQuantity <= part.minimumStock) {
        status = "Available"; // Could trigger reorder alert
      }

      const updated = await prisma.part.update({
        where: { id: partId },
        data: {
          quantityInStock: newQuantity,
          status: status as any,
        },
      });

      await this.invalidatePartsCache();
      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        "Failed to update Part inventory",
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get Part Details
   */
  static async getPartById(partId: string) {
    try {
      const part = await prisma.part.findUnique({
        where: { id: partId },
        include: {
          usageHistory: {
            take: 10,
            orderBy: { id: "desc" },
          },
          orders: {
            take: 5,
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!part) {
        throw new AppError("Part not found", ERROR_CODES.NOT_FOUND);
      }

      return part;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to fetch Part", ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * List Parts with filters
   */
  static async listParts(
    filters: {
      category?: string;
      status?: string;
      searchTerm?: string;
      lowStockOnly?: boolean;
    },
    page: number = 1,
    limit: number = 10
  ) {
    try {
      const skip = (page - 1) * limit;
      const where: any = {};

      if (filters.category) where.category = filters.category;
      if (filters.status) where.status = filters.status;
      if (filters.lowStockOnly) {
        where.quantityInStock = { lte: prisma.part.fields.minimumStock };
      }

      if (filters.searchTerm) {
        where.OR = [
          { name: { contains: filters.searchTerm, mode: "insensitive" } },
          { code: { contains: filters.searchTerm, mode: "insensitive" } },
          { manufacturer: { contains: filters.searchTerm, mode: "insensitive" } },
        ];
      }

      const [parts, total] = await Promise.all([
        prisma.part.findMany({
          where,
          include: {
            usageHistory: { take: 1, orderBy: { id: "desc" } },
          },
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
        }),
        prisma.part.count({ where }),
      ]);

      return {
        data: parts,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new AppError("Failed to fetch Parts", ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get parts due for reorder
   */
  static async getPartsForReorder() {
    try {
      const parts = await prisma.part.findMany({
        where: {
          quantityInStock: {
            lte: prisma.part.fields.reorderPoint,
          },
          status: { notIn: ["Obsolete"] },
        },
        include: {
          orders: {
            where: { deliveryStatus: "Pending" },
            orderBy: { orderDate: "desc" },
            take: 1,
          },
        },
        orderBy: { quantityInStock: "asc" },
      });

      return parts;
    } catch (error) {
      throw new AppError(
        "Failed to fetch parts for reorder",
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ============ PART ORDERS ============

  /**
   * Create Part Order
   */
  static async createPartOrder(payload: CreatePartOrderPayload) {
    try {
      const part = await prisma.part.findUnique({
        where: { id: payload.partId },
      });

      if (!part) {
        throw new AppError("Part not found", ERROR_CODES.NOT_FOUND);
      }

      // Generate order number
      const orderNumber = `PO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const totalPrice = (payload.unitPrice || 0) * payload.quantity;

      const order = await prisma.partOrder.create({
        data: {
          orderNumber,
          partId: payload.partId,
          supplierId: payload.supplierId,
          supplierName: payload.supplierName,
          quantity: payload.quantity,
          unitPrice: payload.unitPrice,
          totalPrice,
          expectedDelivery: payload.expectedDelivery,
          purchaseOrderNumber: payload.purchaseOrderNumber,
          notes: payload.notes,
          orderedBy: payload.orderedBy,
          deliveryStatus: "Pending",
          paymentStatus: "Unpaid",
        },
        include: {
          part: true,
        },
      });

      // Update part status if on order
      if (order.deliveryStatus === "Pending") {
        await prisma.part.update({
          where: { id: payload.partId },
          data: {
            status: "OnOrder",
          },
        });
      }

      await this.invalidatePartsCache();
      return order;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        "Failed to create Part Order",
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Receive Part Order
   */
  static async receivePartOrder(partOrderId: string, quantityReceived: number) {
    try {
      return await prisma.$transaction(async (tx) => {
        const order = await tx.partOrder.findUnique({
          where: { id: partOrderId },
        });

        if (!order) {
          throw new AppError("Part Order not found", ERROR_CODES.NOT_FOUND);
        }

        if (quantityReceived > order.quantity) {
          throw new AppError(
            "Received quantity exceeds ordered quantity",
            ERROR_CODES.VALIDATION_ERROR
          );
        }

        const receivedAll = quantityReceived === order.quantity;

        const updated = await tx.partOrder.update({
          where: { id: partOrderId },
          data: {
            actualDelivery: new Date(),
            deliveryStatus: receivedAll ? "Delivered" : "Partial",
            updatedAt: new Date(),
          },
          include: { part: true },
        });

        // Update part inventory
        await tx.part.update({
          where: { id: order.partId },
          data: {
            quantityInStock: {
              increment: quantityReceived,
            },
            status: "Available",
          },
        });

        await this.invalidatePartsCache();
        return updated;
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        "Failed to receive Part Order",
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Update Order Payment Status
   */
  static async updateOrderPaymentStatus(
    partOrderId: string,
    paymentStatus: string,
    amountPaid?: number
  ) {
    try {
      const updated = await prisma.partOrder.update({
        where: { id: partOrderId },
        data: {
          paymentStatus: paymentStatus as any,
          amountPaid,
          updatedAt: new Date(),
        },
        include: { part: true },
      });

      await this.invalidatePartsCache();
      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        "Failed to update Order payment status",
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   *Get Part Order Details
   */
  static async getPartOrderById(partOrderId: string) {
    try {
      const order = await prisma.partOrder.findUnique({
        where: { id: partOrderId },
        include: {
          part: true,
        },
      });

      if (!order) {
        throw new AppError("Part Order not found", ERROR_CODES.NOT_FOUND);
      }

      return order;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        "Failed to fetch Part Order",
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * List Part Orders
   */
  static async listPartOrders(
    filters: {
      partId?: string;
      deliveryStatus?: string;
      paymentStatus?: string;
      dateFrom?: Date;
      dateTo?: Date;
    },
    page: number = 1,
    limit: number = 10
  ) {
    try {
      const skip = (page - 1) * limit;
      const where: any = {};

      if (filters.partId) where.partId = filters.partId;
      if (filters.deliveryStatus) where.deliveryStatus = filters.deliveryStatus;
      if (filters.paymentStatus) where.paymentStatus = filters.paymentStatus;

      if (filters.dateFrom || filters.dateTo) {
        where.orderDate = {};
        if (filters.dateFrom) where.orderDate.gte = filters.dateFrom;
        if (filters.dateTo) where.orderDate.lte = filters.dateTo;
      }

      const [orders, total] = await Promise.all([
        prisma.partOrder.findMany({
          where,
          include: { part: true },
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
        }),
        prisma.partOrder.count({ where }),
      ]);

      return {
        data: orders,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new AppError(
        "Failed to fetch Part Orders",
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ============ FIXED ASSETS ============

  /**
   * Create Fixed Asset
   */
  static async createFixedAsset(payload: CreateFixedAssetPayload) {
    try {
      const asset = await prisma.fixedAsset.create({
        data: {
          name: payload.name,
          code: payload.code,
          assetCategory: payload.assetCategory,
          description: payload.description,
          manufacturer: payload.manufacturer,
          modelNumber: payload.modelNumber,
          serialNumber: payload.serialNumber,
          currentLocation: payload.currentLocation,
          quantity: payload.quantity || 1,
          minThreshold: payload.minThreshold || 1,
          purchaseDate: payload.purchaseDate,
          purchasePrice: payload.purchasePrice,
          supplier: payload.supplier,
          condition: payload.condition || "Good",
          notes: payload.notes,
          createdBy: payload.createdBy,
          status: "Available",
        },
      });

      await this.invalidateAssetsCache();
      return asset;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        "Failed to create Fixed Asset",
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Check Out Asset
   */
  static async checkOutAsset(payload: CheckOutAssetPayload) {
    try {
      const asset = await prisma.fixedAsset.findUnique({
        where: { id: payload.assetId },
      });

      if (!asset) {
        throw new AppError("Asset not found", ERROR_CODES.NOT_FOUND);
      }

      if (asset.status !== "Available") {
        throw new AppError(
          "Asset is not available for checkout",
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      const [updated, logEntry] = await Promise.all([
        prisma.fixedAsset.update({
          where: { id: payload.assetId },
          data: {
            status: "InUse",
            assignedToEmployeeId: payload.usedByEmployeeId,
            assignedDate: new Date(),
            lastUsedDate: new Date(),
          },
          include: {
            assignedToEmployee: {
              select: { id: true, name: true, email: true },
            },
          },
        }),
        prisma.fixedAssetUsageLog.create({
          data: {
            assetId: payload.assetId,
            usedByEmployeeId: payload.usedByEmployeeId,
            usedBy: payload.usedBy,
            usedForMachineId: payload.usedForMachineId,
            usedForDescription: payload.usedForDescription,
            checkOutDate: new Date(),
          },
        }),
      ]);

      await this.invalidateAssetsCache();
      return { asset: updated, logEntry };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        "Failed to check out Asset",
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Check In Asset
   */
  static async checkInAsset(payload: CheckInAssetPayload) {
    try {
      const asset = await prisma.fixedAsset.findUnique({
        where: { id: payload.assetId },
        include: {
          usageHistory: {
            where: { checkInDate: null },
            orderBy: { checkOutDate: "desc" },
            take: 1,
          },
        },
      });

      if (!asset) {
        throw new AppError("Asset not found", ERROR_CODES.NOT_FOUND);
      }

      const duration = asset.usageHistory[0]
        ? Math.round(
            (new Date().getTime() -
              asset.usageHistory[0].checkOutDate.getTime()) /
              (1000 * 60 * 60)
          )
        : null;

      const [updated, logUpdate] = await Promise.all([
        prisma.fixedAsset.update({
          where: { id: payload.assetId },
          data: {
            status: "Available",
            assignedToEmployeeId: null,
            condition: payload.condition,
          },
          include: {
            assignedToEmployee: {
              select: { id: true, name: true, email: true },
            },
          },
        }),
        asset.usageHistory[0]
          ? prisma.fixedAssetUsageLog.update({
              where: { id: asset.usageHistory[0].id },
              data: {
                checkInDate: new Date(),
                duration,
                condition: payload.condition,
                notes: payload.notes,
              },
            })
          : null,
      ]);

      await this.invalidateAssetsCache();
      return { asset: updated, logUpdate };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        "Failed to check in Asset",
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get Fixed Asset Details
   */
  static async getFixedAssetById(assetId: string) {
    try {
      const asset = await prisma.fixedAsset.findUnique({
        where: { id: assetId },
        include: {
          usageHistory: {
            orderBy: { checkOutDate: "desc" },
            take: 10,
          },
          assignedToEmployee: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      if (!asset) {
        throw new AppError("Asset not found", ERROR_CODES.NOT_FOUND);
      }

      return asset;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        "Failed to fetch Fixed Asset",
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * List Fixed Assets
   */
  static async listFixedAssets(
    filters: {
      assetCategory?: string;
      status?: string;
      location?: string;
      searchTerm?: string;
    },
    page: number = 1,
    limit: number = 10
  ) {
    try {
      const skip = (page - 1) * limit;
      const where: any = {};

      if (filters.assetCategory) where.assetCategory = filters.assetCategory;
      if (filters.status) where.status = filters.status;
      if (filters.location)
        where.currentLocation = {
          contains: filters.location,
          mode: "insensitive",
        };

      if (filters.searchTerm) {
        where.OR = [
          { name: { contains: filters.searchTerm, mode: "insensitive" } },
          { code: { contains: filters.searchTerm, mode: "insensitive" } },
          { manufacturer: { contains: filters.searchTerm, mode: "insensitive" } },
        ];
      }

      const [assets, total] = await Promise.all([
        prisma.fixedAsset.findMany({
          where,
          include: {
            assignedToEmployee: {
              select: { id: true, name: true, email: true },
            },
          },
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
        }),
        prisma.fixedAsset.count({ where }),
      ]);

      return {
        data: assets,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new AppError(
        "Failed to fetch Fixed Assets",
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get Assets Statistics
   */
  static async getAssetsStatistics() {
    try {
      const [available, inUse, reserved, damaged, obsolete, total] =
        await Promise.all([
          prisma.fixedAsset.count({ where: { status: "Available" } }),
          prisma.fixedAsset.count({ where: { status: "InUse" } }),
          prisma.fixedAsset.count({ where: { status: "Reserved" } }),
          prisma.fixedAsset.count({ where: { status: "Damaged" } }),
          prisma.fixedAsset.count({ where: { status: "Obsolete" } }),
          prisma.fixedAsset.count(),
        ]);

      const totalValue = await prisma.fixedAsset.aggregate({
        _sum: { purchasePrice: true },
      });

      return {
        available,
        inUse,
        reserved,
        damaged,
        obsolete,
        total,
        totalValue: totalValue._sum.purchasePrice || 0,
      };
    } catch (error) {
      throw new AppError(
        "Failed to fetch Assets statistics",
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Invalidate parts-related cache
   */
  private static async invalidatePartsCache() {
    try {
      if (!redis) return;
      const patterns = ["parts:*", "orders:*"];
      for (const pattern of patterns) {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      }
    } catch (error) {
      console.error("Cache invalidation error:", error);
    }
  }

  /**
   * Invalidate assets-related cache
   */
  private static async invalidateAssetsCache() {
    try {
      if (!redis) return;
      const keys = await redis.keys("assets:*");
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.error("Cache invalidation error:", error);
    }
  }
}

export default PartsAndAssetsService;
