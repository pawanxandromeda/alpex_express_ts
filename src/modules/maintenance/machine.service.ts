import prisma from "../../config/postgres";
import redis from "../../config/redis";
import { AppError, ERROR_CODES } from "../../common/utils/errorMessages";

interface CreateMachinePayload {
  name: string;
  code: string;
  machineTypeId: string;
  serialNumber: string;
  location: string;
  supplier: string;
  capacity?: string;
  department?: string;
  purchaseDate?: Date;
  purchasePrice?: number;
  warrantyExpiry?: Date;
  installationDate?: Date;
  documentation?: string;
  powerRequirement?: string;
  spaceRequired?: string;
  customFields?: Record<string, any>;
  createdBy: string;
}

interface UpdateMachinePayload {
  name?: string;
  location?: string;
  department?: string;
  status?: string;
  lastMaintenanceDate?: Date;
  nextScheduledMaintenance?: Date;
  operatingHours?: number;
  utilizationRate?: number;
  assignedToEmployeeId?: string;
  customFields?: Record<string, any>;
}

interface MachineDynamicFieldPayload {
  machineTypeId: string;
  fieldName: string;
  fieldType: "text" | "number" | "date" | "boolean" | "select";
  required: boolean;
  default?: any;
  options?: string[]; // For select type
}

export class MachineService {
  /**
   * Create Machine Type with dynamic field support
   */
  static async createMachineType(
    name: string,
    code: string,
    category: string,
    description?: string,
    manufacturer?: string,
    modelNumber?: string,
    capacity?: string,
    powerRequirement?: string,
    maintenanceFrequency?: string,
    customFieldStructure?: Record<string, any>
  ) {
    try {
      const machineType = await prisma.machineType.create({
        data: {
          name,
          code,
          category,
          description,
          manufacturer,
          modelNumber,
          capacity,
          powerRequirement,
          maintenanceFrequency,
          customFields: customFieldStructure || {},
        },
      });

      await this.invalidateMachineCache();
      return machineType;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        "Failed to create Machine Type",
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Add dynamic field to Machine Type
   */
  static async addDynamicField(payload: MachineDynamicFieldPayload) {
    try {
      const machineType = await prisma.machineType.findUnique({
        where: { id: payload.machineTypeId },
      });

      if (!machineType) {
        throw new AppError("Machine Type not found", ERROR_CODES.NOT_FOUND);
      }

      const currentFields = machineType.customFields || {};
      currentFields[payload.fieldName] = {
        type: payload.fieldType,
        required: payload.required,
        default: payload.default,
        options: payload.options,
      };

      const updated = await prisma.machineType.update({
        where: { id: payload.machineTypeId },
        data: {
          customFields: currentFields,
        },
      });

      await this.invalidateMachineCache();
      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        "Failed to add dynamic field",
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get all Machine Types with pagination
   */
  static async getMachineTypes(
    filters: {
      category?: string;
      searchTerm?: string;
    } = {},
    page: number = 1,
    limit: number = 10
  ) {
    try {
      const skip = (page - 1) * limit;
      const where: any = {};

      if (filters.category) {
        where.category = { contains: filters.category, mode: "insensitive" };
      }

      if (filters.searchTerm) {
        where.OR = [
          { name: { contains: filters.searchTerm, mode: "insensitive" } },
          { code: { contains: filters.searchTerm, mode: "insensitive" } },
          { category: { contains: filters.searchTerm, mode: "insensitive" } },
        ];
      }

      const [machineTypes, total] = await Promise.all([
        prisma.machineType.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
        }),
        prisma.machineType.count({ where }),
      ]);

      return {
        data: machineTypes,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        "Failed to fetch Machine Types",
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Create a new Machine
   */
  static async createMachine(payload: CreateMachinePayload) {
    try {
      // Validate required fields
      if (!payload.name || !payload.code || !payload.machineTypeId || !payload.serialNumber || !payload.location || !payload.supplier) {
        throw new AppError(
          "Missing required fields: name, code, machineTypeId, serialNumber, location, supplier",
          ERROR_CODES.BAD_REQUEST
        );
      }

      // Validate createdBy is provided
      if (!payload.createdBy) {
        throw new AppError(
          "User authentication required to create machine",
          ERROR_CODES.UNAUTHORIZED
        );
      }

      // Verify machine type exists
      const machineType = await prisma.machineType.findUnique({
        where: { id: payload.machineTypeId },
      });

      if (!machineType) {
        throw new AppError("Machine Type not found", ERROR_CODES.NOT_FOUND);
      }

      // Validate custom fields against machine type structure
      if (payload.customFields && machineType.customFields) {
        this.validateCustomFields(
          payload.customFields,
          machineType.customFields as Record<string, any>
        );
      }

      // Build data object with all required fields
      const machineData = {
        name: payload.name,
        code: payload.code,
        machineTypeId: payload.machineTypeId,
        serialNumber: payload.serialNumber,
        location: payload.location,
        supplier: payload.supplier,
        status: "Operational" as const,
        createdBy: payload.createdBy,
        capacity: payload.capacity ?? null,
        department: payload.department ?? null,
        purchaseDate: payload.purchaseDate ?? null,
        purchasePrice: payload.purchasePrice ?? null,
        warrantyExpiry: payload.warrantyExpiry ?? null,
        installationDate: payload.installationDate ?? null,
        documentation: payload.documentation ?? null,
        powerRequirement: payload.powerRequirement ?? null,
        spaceRequired: payload.spaceRequired ?? null,
        customFields: payload.customFields ?? null,
      };

      const machine = await prisma.machine.create({
        data: machineData,
        include: {
          machineType: true,
          currentStatus: true,
          assignedToEmployee: {
            select: { id: true, name: true, email: true, department: true },
          },
        },
      });

      // Initialize current status
      await prisma.machineCurrentStatus.create({
        data: {
          machineId: machine.id,
          currentStatus: "Operational",
        },
      });

      await this.invalidateMachineCache();
      return machine;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        "Failed to create Machine",
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Update Machine
   */
  static async updateMachine(
    machineId: string,
    payload: UpdateMachinePayload
  ) {
    try {
      const machine = await prisma.machine.findUnique({
        where: { id: machineId },
        include: { machineType: true },
      });

      if (!machine) {
        throw new AppError("Machine not found", ERROR_CODES.NOT_FOUND);
      }

      // Validate custom fields if provided
      if (payload.customFields && machine.machineType.customFields) {
        this.validateCustomFields(
          payload.customFields,
          machine.machineType.customFields as Record<string, any>
        );
      }

      const updated = await prisma.machine.update({
        where: { id: machineId },
        data: {
          ...payload,
          updatedAt: new Date(),
        },
        include: {
          machineType: true,
          currentStatus: true,
          assignedToEmployee: {
            select: { id: true, name: true, email: true, department: true },
          },
        },
      });

      await this.invalidateMachineCache();
      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        "Failed to update Machine",
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Update Machine Status
   */
  static async updateMachineStatus(
    machineId: string,
    status: string,
    currentActivity?: string
  ) {
    try {
      const machine = await prisma.machine.findUnique({
        where: { id: machineId },
      });

      if (!machine) {
        throw new AppError("Machine not found", ERROR_CODES.NOT_FOUND);
      }

      const [updatedMachine, updatedStatus] = await Promise.all([
        prisma.machine.update({
          where: { id: machineId },
          data: {
            status: status as any,
            updatedAt: new Date(),
          },
          include: {
            machineType: true,
            currentStatus: true,
            assignedToEmployee: {
              select: { id: true, name: true, email: true },
            },
          },
        }),
        prisma.machineCurrentStatus.update({
          where: { machineId },
          data: {
            currentStatus: status as any,
            currentActivity,
            statusChangedAt: new Date(),
          },
        }),
      ]);

      await this.invalidateMachineCache();
      return { machine: updatedMachine, status: updatedStatus };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        "Failed to update Machine status",
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Assign Machine to Employee
   */
  static async assignMachine(machineId: string, employeeId: string) {
    try {
      const machine = await prisma.machine.findUnique({
        where: { id: machineId },
      });

      if (!machine) {
        throw new AppError("Machine not found", ERROR_CODES.NOT_FOUND);
      }

      const updated = await prisma.machine.update({
        where: { id: machineId },
        data: {
          assignedToEmployeeId: employeeId,
          updatedAt: new Date(),
        },
        include: {
          machineType: true,
          currentStatus: true,
          assignedToEmployee: {
            select: { id: true, name: true, email: true, department: true },
          },
        },
      });

      await this.invalidateMachineCache();
      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        "Failed to assign Machine",
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get Machine details
   */
  static async getMachineById(machineId: string) {
    try {
      const machine = await prisma.machine.findUnique({
        where: { id: machineId },
        include: {
          machineType: true,
          currentStatus: true,
          maintenanceRecords: {
            take: 5,
            orderBy: { scheduledDate: "desc" },
          },
          sparePartsAssigned: {
            include: {
              part: true,
            },
          },
          assignedToEmployee: {
            select: {
              id: true,
              name: true,
              email: true,
              department: true,
            },
          },
        },
      });

      if (!machine) {
        throw new AppError("Machine not found", ERROR_CODES.NOT_FOUND);
      }

      return machine;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        "Failed to fetch Machine",
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * List Machines with filters
   */
  static async listMachines(
    filters: {
      machineTypeId?: string;
      location?: string;
      department?: string;
      status?: string;
      searchTerm?: string;
    },
    page: number = 1,
    limit: number = 10
  ) {
    try {
      const skip = (page - 1) * limit;
      const where: any = {};

      if (filters.machineTypeId) where.machineTypeId = filters.machineTypeId;
      if (filters.location)
        where.location = { contains: filters.location, mode: "insensitive" };
      if (filters.department)
        where.department = { contains: filters.department, mode: "insensitive" };
      if (filters.status) where.status = filters.status;

      if (filters.searchTerm) {
        where.OR = [
          { name: { contains: filters.searchTerm, mode: "insensitive" } },
          { code: { contains: filters.searchTerm, mode: "insensitive" } },
          { serialNumber: { contains: filters.searchTerm, mode: "insensitive" } },
        ];
      }

      const [machines, total] = await Promise.all([
        prisma.machine.findMany({
          where,
          include: {
            machineType: true,
            currentStatus: true,
            assignedToEmployee: {
              select: { id: true, name: true, email: true, department: true },
            },
          },
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
        }),
        prisma.machine.count({ where }),
      ]);

      return {
        data: machines,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new AppError(
        "Failed to fetch Machines",
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get Machine Statistics
   */
  static async getMachineStatistics(filters?: {
    machineTypeId?: string;
    department?: string;
  }) {
    try {
      const where: any = {};
      if (filters?.machineTypeId) where.machineTypeId = filters.machineTypeId;
      if (filters?.department) where.department = filters.department;

      const [operational, breakdown, maintenance, inactive, reserved] =
        await Promise.all([
          prisma.machine.count({ where: { ...where, status: "Operational" } }),
          prisma.machine.count({ where: { ...where, status: "Breakdown" } }),
          prisma.machine.count({
            where: { ...where, status: "UnderMaintenance" },
          }),
          prisma.machine.count({ where: { ...where, status: "Inactive" } }),
          prisma.machine.count({ where: { ...where, status: "Reserved" } }),
        ]);

      return {
        operational,
        breakdown,
        maintenance,
        inactive,
        reserved,
        total: operational + breakdown + maintenance + inactive + reserved,
      };
    } catch (error) {
      throw new AppError(
        "Failed to fetch Machine statistics",
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get machines due for maintenance
   */
  static async getMachinesDueForMaintenance() {
    try {
      const today = new Date();

      const machines = await prisma.machine.findMany({
        where: {
          nextScheduledMaintenance: {
            lte: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000), // Within 7 days
          },
          status: {
            in: ["Operational", "Reserved"],
          },
        },
        include: {
          machineType: true,
          currentStatus: true,
        },
        orderBy: { nextScheduledMaintenance: "asc" },
      });

      return machines;
    } catch (error) {
      throw new AppError(
        "Failed to fetch machines due for maintenance",
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Validate custom fields against machine type structure
   */
  private static validateCustomFields(
    customFields: Record<string, any>,
    fieldStructure: Record<string, any>
  ) {
    for (const [fieldName, fieldValue] of Object.entries(customFields)) {
      const fieldDef = fieldStructure[fieldName];

      if (!fieldDef) {
        throw new AppError(
          `Unknown field: ${fieldName}`,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      if (fieldDef.required && !fieldValue) {
        throw new AppError(
          `Field ${fieldName} is required`,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      if (fieldDef.type === "number" && fieldValue && isNaN(fieldValue)) {
        throw new AppError(
          `Field ${fieldName} must be a number`,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      if (fieldDef.options && !fieldDef.options.includes(fieldValue)) {
        throw new AppError(
          `Invalid option for field ${fieldName}`,
          ERROR_CODES.VALIDATION_ERROR
        );
      }
    }
  }

  /**
   * Invalidate machine-related cache
   */
  private static async invalidateMachineCache() {
    try {
      if (!redis) return;
      // Skip pattern deletion to avoid EPIPE errors from redis.keys() on Lambda
      // Cache expiration will handle cleanup automatically
      console.log("🗑️ Machine cache invalidation skipped (relying on key expiration)");
    } catch (error) {
      console.error("Cache invalidation error:", error);
    }
  }
}

export default MachineService;
