import prisma from "../../config/postgres";
import redis from "../../config/redis";
import { AppError, ERROR_CODES } from "../../common/utils/errorMessages";

interface CreateMaintenanceRecordPayload {
  machineId: string;
  maintenanceType: string;
  scheduledDate: Date;
  description: string;
  assignedToEmployeeId?: string;
  estimatedDurationHours?: number;
  createdBy: string;
  partsUsed?: {
    partId: string;
    quantityUsed: number;
    unitCost?: number;
  }[];
}

interface UpdateMaintenanceRecordPayload {
  status?: string;
  findings?: string;
  workDone?: string;
  actualDurationHours?: number;
  downtime?: number;
  laborCost?: number;
  materialCost?: number;
  nextMaintenanceDate?: Date;
  notes?: string;
}

interface CompleteMaintenancePayload {
  completionDate: Date;
  findings: string;
  workDone: string;
  actualDurationHours: number;
  downtime?: number;
  laborCost?: number;
  materialCost?: number;
  nextMaintenanceDate?: Date;
  partsUsed?: {
    id: string;
    quantityUsed: number;
    unitCost?: number;
  }[];
  brokenParts?: {
    partId?: string;
    partName: string;
    originalQuantity: number;
    disposition: string;
    dispositionNotes?: string;
  }[];
}

export class MaintenanceService {
  /**
   * Create Maintenance Record
   */
  static async createMaintenanceRecord(
    payload: CreateMaintenanceRecordPayload
  ) {
    try {
      return await prisma.$transaction(async (tx) => {
        const machine = await tx.machine.findUnique({
          where: { id: payload.machineId },
        });

        if (!machine) {
          throw new AppError("Machine not found", ERROR_CODES.NOT_FOUND);
        }

        // Check if machine already has an active/in-progress maintenance record
        const existingMaintenance = await tx.maintenanceRecord.findFirst({
          where: {
            machineId: payload.machineId,
            status: {
              in: ["Scheduled", "InProgress"],
            },
          },
        });

        if (existingMaintenance) {
          throw new AppError(
            `Machine is already under maintenance. Status: ${existingMaintenance.status}`,
            ERROR_CODES.VALIDATION_ERROR
          );
        }

        // Ensure estimatedDurationHours is a number
        const estimatedDurationHours = payload.estimatedDurationHours
          ? typeof payload.estimatedDurationHours === "string"
            ? parseInt(payload.estimatedDurationHours, 10)
            : payload.estimatedDurationHours
          : undefined;

        const maintenanceRecord = await tx.maintenanceRecord.create({
          data: {
            machineId: payload.machineId,
            maintenanceType: payload.maintenanceType as any,
            status: "Scheduled",
            scheduledDate: new Date(payload.scheduledDate),
            description: payload.description,
            assignedToEmployeeId: payload.assignedToEmployeeId,
            estimatedDurationHours,
            createdBy: payload.createdBy,
          },
          include: {
            machine: {
              include: { machineType: true },
            },
            assignedToEmployee: {
              select: { id: true, name: true, email: true, department: true },
            },
            partsUsed: {
              include: { part: true },
            },
            brokenParts: true,
          },
        });

        // Add parts used and update inventory if provided
        if (payload.partsUsed && payload.partsUsed.length > 0) {
          await tx.maintenancePartUsage.createMany({
            data: payload.partsUsed.map((part) => ({
              maintenanceRecordId: maintenanceRecord.id,
              partId: part.id,
              quantityUsed: part.quantityUsed,
              unitCost: part.unitCost,
              totalCost: (part.unitCost || 0) * part.quantityUsed,
            })),
          });

          // Deduct from part inventory and update stock
          for (const part of payload.partsUsed) {
            await tx.part.update({
              where: { id: part.id },
              data: {
                quantityInStock: {
                  decrement: part.quantityUsed,
                },
              },
            });
          }
        }

        await this.invalidateMaintenanceCache();

        // Return updated record with parts used
        return await tx.maintenanceRecord.findUnique({
          where: { id: maintenanceRecord.id },
          include: {
            machine: {
              include: { machineType: true },
            },
            assignedToEmployee: {
              select: { id: true, name: true, email: true, department: true },
            },
            partsUsed: {
              include: { part: true },
            },
            brokenParts: true,
          },
        });
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error("Error creating maintenance record:", error);
      throw new AppError(
        `Failed to create Maintenance Record: ${error instanceof Error ? error.message : "Unknown error"}`,
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Start Maintenance
   */
  static async startMaintenance(maintenanceRecordId: string) {
    try {
      const record = await prisma.maintenanceRecord.findUnique({
        where: { id: maintenanceRecordId },
      });

      if (!record) {
        throw new AppError(
          "Maintenance Record not found",
          ERROR_CODES.NOT_FOUND
        );
      }

      if (record.status !== "Scheduled") {
        throw new AppError(
          "Can only start scheduled maintenance",
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      // Update machine status to UnderMaintenance
      const [updated, machineUpdated] = await Promise.all([
        prisma.maintenanceRecord.update({
          where: { id: maintenanceRecordId },
          data: {
            status: "InProgress",
            startDate: new Date(),
          },
          include: {
            machine: { include: { machineType: true } },
            assignedToEmployee: {
              select: { id: true, name: true, email: true },
            },
            partsUsed: { include: { part: true } },
            brokenParts: true,
          },
        }),
        prisma.machine.update({
          where: { id: record.machineId },
          data: {
            status: "UnderMaintenance",
            updatedAt: new Date(),
          },
        }),
      ]);

      // Update machine current status
      await prisma.machineCurrentStatus.update({
        where: { machineId: record.machineId },
        data: {
          currentStatus: "UnderMaintenance",
          currentActivity: `Under Maintenance - ${updated.description}`,
          maintainerEmployeeId: record.assignedToEmployeeId,
          statusChangedAt: new Date(),
        },
      });

      await this.invalidateMaintenanceCache();
      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        "Failed to start maintenance",
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Complete Maintenance with all details
   */
  static async completeMaintenance(
    maintenanceRecordId: string,
    payload: CompleteMaintenancePayload
  ) {
    try {
      return await prisma.$transaction(async (tx) => {
        const record = await tx.maintenanceRecord.findUnique({
          where: { id: maintenanceRecordId },
        });

        if (!record) {
          throw new AppError(
            "Maintenance Record not found",
            ERROR_CODES.NOT_FOUND
          );
        }

        if (record.status !== "InProgress") {
          throw new AppError(
            "Can only complete in-progress maintenance",
            ERROR_CODES.VALIDATION_ERROR
          );
        }

        // Calculate total cost
        const laborCost = payload.laborCost || 0;
        const materialCost = payload.materialCost || 0;
        const totalCost = laborCost + materialCost;

        // Complete maintenance record
        const updated = await tx.maintenanceRecord.update({
          where: { id: maintenanceRecordId },
          data: {
            status: "Completed",
            completionDate: payload.completionDate,
            findings: payload.findings,
            workDone: payload.workDone,
            actualDurationHours: payload.actualDurationHours,
            downtime: payload.downtime,
            laborCost,
            materialCost,
            totalCost,
            nextMaintenanceDate: payload.nextMaintenanceDate,
          },
        });

        // Add parts used
        if (payload.partsUsed && payload.partsUsed.length > 0) {
          await tx.maintenancePartUsage.createMany({
            data: payload.partsUsed.map((part) => ({
              maintenanceRecordId,
              partId: part.id,
              quantityUsed: part.quantityUsed,
              unitCost: part.unitCost,
              totalCost: (part.unitCost || 0) * part.quantityUsed,
            })),
          });

          // Deduct from part inventory
          for (const part of payload.partsUsed) {
            await tx.part.update({
              where: { id: part.id },
              data: {
                quantityInStock: {
                  decrement: part.quantityUsed,
                },
              },
            });
          }
        }

        // Record broken parts
        if (payload.brokenParts && payload.brokenParts.length > 0) {
          await tx.brokenPart.createMany({
            data: payload.brokenParts.map((brokenPart) => ({
              maintenanceRecordId,
              partId: brokenPart.partId,
              partName: brokenPart.partName,
              originalQuantity: brokenPart.originalQuantity,
              disposition: brokenPart.disposition as any,
              dispositionNotes: brokenPart.dispositionNotes,
            })),
          });
        }

        // Update machine status back to Operational
        await tx.machine.update({
          where: { id: record.machineId },
          data: {
            status: "Operational",
            lastMaintenanceDate: payload.completionDate,
            nextScheduledMaintenance: payload.nextMaintenanceDate,
            updatedAt: new Date(),
          },
        });

        // Update machine current status
        await tx.machineCurrentStatus.update({
          where: { machineId: record.machineId },
          data: {
            currentStatus: "Operational",
            currentActivity: null,
            statusChangedAt: new Date(),
          },
        });

        await this.invalidateMaintenanceCache();

        return await tx.maintenanceRecord.findUnique({
          where: { id: maintenanceRecordId },
          include: {
            machine: { include: { machineType: true } },
            assignedToEmployee: {
              select: { id: true, name: true, email: true },
            },
            partsUsed: { include: { part: true } },
            brokenParts: true,
          },
        });
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        "Failed to complete maintenance",
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Update Maintenance Record
   */
  static async updateMaintenanceRecord(
    maintenanceRecordId: string,
    payload: UpdateMaintenanceRecordPayload
  ) {
    try {
      const updated = await prisma.maintenanceRecord.update({
        where: { id: maintenanceRecordId },
        data: {
          ...payload,
          updatedAt: new Date(),
        },
        include: {
          machine: { include: { machineType: true } },
          assignedToEmployee: {
            select: { id: true, name: true, email: true },
          },
          partsUsed: { include: { part: true } },
          brokenParts: true,
        },
      });

      await this.invalidateMaintenanceCache();
      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        "Failed to update Maintenance Record",
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Assign Maintenance to Employee
   */
  static async assignMaintenance(
    maintenanceRecordId: string,
    employeeId: string
  ) {
    try {
      const updated = await prisma.maintenanceRecord.update({
        where: { id: maintenanceRecordId },
        data: {
          assignedToEmployeeId: employeeId,
        },
        include: {
          machine: { include: { machineType: true } },
          assignedToEmployee: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      await this.invalidateMaintenanceCache();
      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        "Failed to assign maintenance",
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get Maintenance Record details
   */
  static async getMaintenanceRecordById(maintenanceRecordId: string) {
    try {
      const record = await prisma.maintenanceRecord.findUnique({
        where: { id: maintenanceRecordId },
        include: {
          machine: {
            include: { machineType: true, currentStatus: true },
          },
          assignedToEmployee: {
            select: { id: true, name: true, email: true, department: true },
          },
          partsUsed: {
            include: { part: true },
          },
          brokenParts: true,
        },
      });

      if (!record) {
        throw new AppError(
          "Maintenance Record not found",
          ERROR_CODES.NOT_FOUND
        );
      }

      return record;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        "Failed to fetch Maintenance Record",
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * List Maintenance Records with filters
   */
  static async listMaintenanceRecords(
    filters: {
      machineId?: string;
      status?: string;
      maintenanceType?: string;
      assignedToEmployeeId?: string;
      dateFrom?: Date;
      dateTo?: Date;
    },
    page: number = 1,
    limit: number = 10
  ) {
    try {
      const skip = (page - 1) * limit;
      const where: any = {};

      if (filters.machineId) where.machineId = filters.machineId;
      if (filters.status) where.status = filters.status;
      if (filters.maintenanceType)
        where.maintenanceType = filters.maintenanceType;
      if (filters.assignedToEmployeeId)
        where.assignedToEmployeeId = filters.assignedToEmployeeId;

      if (filters.dateFrom || filters.dateTo) {
        where.scheduledDate = {};
        if (filters.dateFrom) where.scheduledDate.gte = filters.dateFrom;
        if (filters.dateTo) where.scheduledDate.lte = filters.dateTo;
      }

      const [records, total] = await Promise.all([
        prisma.maintenanceRecord.findMany({
          where,
          include: {
            machine: {
              include: { machineType: true },
            },
            assignedToEmployee: {
              select: { id: true, name: true, email: true },
            },
            partsUsed: { include: { part: true } },
            brokenParts: true,
          },
          skip,
          take: limit,
          orderBy: { scheduledDate: "desc" },
        }),
        prisma.maintenanceRecord.count({ where }),
      ]);

      return {
        data: records,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new AppError(
        "Failed to fetch Maintenance Records",
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get Maintenance Statistics
   */
  static async getMaintenanceStatistics(filters?: {
    machineId?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }) {
    try {
      const where: any = {};
      if (filters?.machineId) where.machineId = filters.machineId;

      if (filters?.dateFrom || filters?.dateTo) {
        where.scheduledDate = {};
        if (filters.dateFrom) where.scheduledDate.gte = filters.dateFrom;
        if (filters.dateTo) where.scheduledDate.lte = filters.dateTo;
      }

      const [scheduled, inProgress, completed, onHold, cancelled] =
        await Promise.all([
          prisma.maintenanceRecord.count({
            where: { ...where, status: "Scheduled" },
          }),
          prisma.maintenanceRecord.count({
            where: { ...where, status: "InProgress" },
          }),
          prisma.maintenanceRecord.count({
            where: { ...where, status: "Completed" },
          }),
          prisma.maintenanceRecord.count({
            where: { ...where, status: "OnHold" },
          }),
          prisma.maintenanceRecord.count({
            where: { ...where, status: "Cancelled" },
          }),
        ]);

      // Calculate cost metrics
      const costData = await prisma.maintenanceRecord.aggregate({
        where: { ...where, status: "Completed" },
        _sum: {
          totalCost: true,
          laborCost: true,
          materialCost: true,
        },
        _avg: {
          totalCost: true,
        },
      });

      return {
        statuses: {
          scheduled,
          inProgress,
          completed,
          onHold,
          cancelled,
          total:
            scheduled + inProgress + completed + onHold + cancelled,
        },
        costs: {
          totalCost: costData._sum.totalCost || 0,
          totalLaborCost: costData._sum.laborCost || 0,
          totalMaterialCost: costData._sum.materialCost || 0,
          averageCost: costData._avg.totalCost || 0,
        },
      };
    } catch (error) {
      throw new AppError(
        "Failed to fetch Maintenance statistics",
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get upcoming maintenance schedule
   */
  static async getUpcomingMaintenanceSchedule(daysAhead: number = 30) {
    try {
      const today = new Date();
      const futureDate = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000);

      const records = await prisma.maintenanceRecord.findMany({
        where: {
          status: { in: ["Scheduled"] },
          scheduledDate: {
            gte: today,
            lte: futureDate,
          },
        },
        include: {
          machine: { include: { machineType: true } },
          assignedToEmployee: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { scheduledDate: "asc" },
      });

      return records;
    } catch (error) {
      throw new AppError(
        "Failed to fetch maintenance schedule",
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Invalidate maintenance-related cache
   */
  private static async invalidateMaintenanceCache() {
    try {
      if (!redis) return;
      // Skip pattern deletion to avoid EPIPE errors from redis.keys() on Lambda
      // Cache expiration will handle cleanup automatically
      console.log("🗑️ Maintenance cache invalidation skipped (relying on key expiration)");
    } catch (error) {
      console.error("Cache invalidation error:", error);
    }
  }
}

export default MaintenanceService;
