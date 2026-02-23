import { Request, Response } from "express";
import MachineService from "./machine.service";
import MaintenanceService from "./maintenance.service";
import PartsAndAssetsService from "./partsAndAssets.service";

export class MaintenanceController {
  // ============ MACHINE MANAGEMENT ============

  /**
   * Create Machine Type
   */
  static async createMachineType(req: Request, res: Response) {
    try {
      const {
        name,
        code,
        category,
        description,
        manufacturer,
        modelNumber,
        capacity,
        powerRequirement,
        maintenanceFrequency,
        customFieldStructure,
      } = req.body;

      const machineType = await MachineService.createMachineType(
        name,
        code,
        category,
        description,
        manufacturer,
        modelNumber,
        capacity,
        powerRequirement,
        maintenanceFrequency,
        customFieldStructure
      );

      res.status(201).json({
        success: true,
        data: machineType,
        message: "Machine Type created successfully",
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
        code: error.code,
      });
    }
  }

  /**
   * Get Machine Types
   */
  static async getMachineTypes(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const category = req.query.category as string;
      const searchTerm = req.query.searchTerm as string;

      const result = await MachineService.getMachineTypes(
        { category, searchTerm },
        page,
        limit
      );

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
        code: error.code,
      });
    }
  }

  /**
   * Create Machine
   */
  static async createMachine(req: Request, res: Response) {
    try {
      const payload = req.body;
      const userId = req.user?.id;

      const machine = await MachineService.createMachine({
        ...payload,
        createdBy: userId,
      });

      res.status(201).json({
        success: true,
        data: machine,
        message: "Machine created successfully",
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
        code: error.code,
      });
    }
  }

  /**
   * Update Machine
   */
  static async updateMachine(req: Request, res: Response) {
    try {
      const { machineId } = req.params;
      const payload = req.body;

      const machine = await MachineService.updateMachine(machineId, payload);

      res.json({
        success: true,
        data: machine,
        message: "Machine updated successfully",
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
        code: error.code,
      });
    }
  }

  /**
   * Update Machine Status
   */
  static async updateMachineStatus(req: Request, res: Response) {
    try {
      const { machineId } = req.params;
      const { status, currentActivity } = req.body;

      const result = await MachineService.updateMachineStatus(
        machineId,
        status,
        currentActivity
      );

      res.json({
        success: true,
        data: result,
        message: "Machine status updated successfully",
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
        code: error.code,
      });
    }
  }

  /**
   * Get Machine Details
   */
  static async getMachineById(req: Request, res: Response) {
    try {
      const { machineId } = req.params;

      const machine = await MachineService.getMachineById(machineId);

      res.json({
        success: true,
        data: machine,
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
        code: error.code,
      });
    }
  }

  /**
   * List Machines
   */
  static async listMachines(req: Request, res: Response) {
    try {
      const {
        machineTypeId,
        location,
        department,
        status,
        searchTerm,
        page = 1,
        limit = 10,
      } = req.query;

      const result = await MachineService.listMachines(
        {
          machineTypeId: machineTypeId as string,
          location: location as string,
          department: department as string,
          status: status as string,
          searchTerm: searchTerm as string,
        },
        parseInt(page as string),
        parseInt(limit as string)
      );

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
        code: error.code,
      });
    }
  }

  /**
   * Get Machine Statistics
   */
  static async getMachineStatistics(req: Request, res: Response) {
    try {
      const { machineTypeId, department } = req.query;

      const stats = await MachineService.getMachineStatistics({
        machineTypeId: machineTypeId as string,
        department: department as string,
      });

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
        code: error.code,
      });
    }
  }

  /**
   * Get Machines Due for Maintenance
   */
  static async getMachinesDueForMaintenance(req: Request, res: Response) {
    try {
      const machines =
        await MachineService.getMachinesDueForMaintenance();

      res.json({
        success: true,
        data: machines,
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
        code: error.code,
      });
    }
  }

  // ============ MAINTENANCE MANAGEMENT ============

  /**
   * Create Maintenance Record
   */
  static async createMaintenanceRecord(req: Request, res: Response) {
    try {
      const payload = req.body;
      const userId = req.user?.id;

      const record = await MaintenanceService.createMaintenanceRecord({
        ...payload,
        createdBy: userId,
      });

      res.status(201).json({
        success: true,
        data: record,
        message: "Maintenance Record created successfully",
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
        code: error.code,
      });
    }
  }

  /**
   * Start Maintenance
   */
  static async startMaintenance(req: Request, res: Response) {
    try {
      const { maintenanceRecordId } = req.params;

      const record = await MaintenanceService.startMaintenance(
        maintenanceRecordId
      );

      res.json({
        success: true,
        data: record,
        message: "Maintenance started successfully",
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
        code: error.code,
      });
    }
  }

  /**
   * Complete Maintenance
   */
  static async completeMaintenance(req: Request, res: Response) {
    try {
      const { maintenanceRecordId } = req.params;
      const payload = req.body;
      const userId = req.user?.id;

      const record = await MaintenanceService.completeMaintenance(
        maintenanceRecordId,
        { ...payload, completedBy: userId }
      );

      res.json({
        success: true,
        data: record,
        message: "Maintenance completed successfully",
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
        code: error.code,
      });
    }
  }

  /**
   * Get Maintenance Record
   */
  static async getMaintenanceRecordById(req: Request, res: Response) {
    try {
      const { maintenanceRecordId } = req.params;

      const record =
        await MaintenanceService.getMaintenanceRecordById(maintenanceRecordId);

      res.json({
        success: true,
        data: record,
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
        code: error.code,
      });
    }
  }

  /**
   * List Maintenance Records
   */
  static async listMaintenanceRecords(req: Request, res: Response) {
    try {
      const {
        machineId,
        status,
        maintenanceType,
        assignedToEmployeeId,
        dateFrom,
        dateTo,
        page = 1,
        limit = 10,
      } = req.query;

      const result = await MaintenanceService.listMaintenanceRecords(
        {
          machineId: machineId as string,
          status: status as string,
          maintenanceType: maintenanceType as string,
          assignedToEmployeeId: assignedToEmployeeId as string,
          dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
          dateTo: dateTo ? new Date(dateTo as string) : undefined,
        },
        parseInt(page as string),
        parseInt(limit as string)
      );

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
        code: error.code,
      });
    }
  }

  /**
   * Get Maintenance Statistics
   */
  static async getMaintenanceStatistics(req: Request, res: Response) {
    try {
      const { machineId, dateFrom, dateTo } = req.query;

      const stats = await MaintenanceService.getMaintenanceStatistics({
        machineId: machineId as string,
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
      });

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
        code: error.code,
      });
    }
  }

  /**
   * Get Upcoming Maintenance Schedule
   */
  static async getUpcomingMaintenanceSchedule(req: Request, res: Response) {
    try {
      const { daysAhead = 30 } = req.query;

      const schedule =
        await MaintenanceService.getUpcomingMaintenanceSchedule(
          parseInt(daysAhead as string)
        );

      res.json({
        success: true,
        data: schedule,
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
        code: error.code,
      });
    }
  }

  // ============ PARTS MANAGEMENT ============

  /**
   * Create Part
   */
  static async createPart(req: Request, res: Response) {
    try {
      const payload = req.body;

      const part = await PartsAndAssetsService.createPart(payload);

      res.status(201).json({
        success: true,
        data: part,
        message: "Part created successfully",
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
        code: error.code,
      });
    }
  }

  /**
   * Get Part Details
   */
  static async getPartById(req: Request, res: Response) {
    try {
      const { partId } = req.params;

      const part = await PartsAndAssetsService.getPartById(partId);

      res.json({
        success: true,
        data: part,
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
        code: error.code,
      });
    }
  }

  /**
   * List Parts
   */
  static async listParts(req: Request, res: Response) {
    try {
      const {
        category,
        status,
        searchTerm,
        lowStockOnly,
        page = 1,
        limit = 10,
      } = req.query;

      const result = await PartsAndAssetsService.listParts(
        {
          category: category as string,
          status: status as string,
          searchTerm: searchTerm as string,
          lowStockOnly: lowStockOnly === "true",
        },
        parseInt(page as string),
        parseInt(limit as string)
      );

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
        code: error.code,
      });
    }
  }

  /**
   * Get Parts for Reorder
   */
  static async getPartsForReorder(req: Request, res: Response) {
    try {
      const parts = await PartsAndAssetsService.getPartsForReorder();

      res.json({
        success: true,
        data: parts,
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
        code: error.code,
      });
    }
  }

  // ============ PART ORDERS ============

  /**
   * Create Part Order
   */
  static async createPartOrder(req: Request, res: Response) {
    try {
      const payload = req.body;
      const userId = req.user?.id;

      const order = await PartsAndAssetsService.createPartOrder({
        ...payload,
        orderedBy: userId,
      });

      res.status(201).json({
        success: true,
        data: order,
        message: "Part Order created successfully",
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
        code: error.code,
      });
    }
  }

  /**
   * Receive Part Order
   */
  static async receivePartOrder(req: Request, res: Response) {
    try {
      const { orderId } = req.params;
      const { quantityReceived } = req.body;

      const order = await PartsAndAssetsService.receivePartOrder(
        orderId,
        quantityReceived
      );

      res.json({
        success: true,
        data: order,
        message: "Part received successfully",
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
        code: error.code,
      });
    }
  }

  /**
   * Get Part Order
   */
  static async getPartOrderById(req: Request, res: Response) {
    try {
      const { orderId } = req.params;

      const order = await PartsAndAssetsService.getPartOrderById(orderId);

      res.json({
        success: true,
        data: order,
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
        code: error.code,
      });
    }
  }

  /**
   * List Part Orders
   */
  static async listPartOrders(req: Request, res: Response) {
    try {
      const {
        partId,
        deliveryStatus,
        paymentStatus,
        dateFrom,
        dateTo,
        page = 1,
        limit = 10,
      } = req.query;

      const result = await PartsAndAssetsService.listPartOrders(
        {
          partId: partId as string,
          deliveryStatus: deliveryStatus as string,
          paymentStatus: paymentStatus as string,
          dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
          dateTo: dateTo ? new Date(dateTo as string) : undefined,
        },
        parseInt(page as string),
        parseInt(limit as string)
      );

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
        code: error.code,
      });
    }
  }

  // ============ FIXED ASSETS ============

  /**
   * Create Fixed Asset
   */
  static async createFixedAsset(req: Request, res: Response) {
    try {
      const payload = req.body;
      const userId = req.user?.id;

      const asset = await PartsAndAssetsService.createFixedAsset({
        ...payload,
        createdBy: userId,
      });

      res.status(201).json({
        success: true,
        data: asset,
        message: "Fixed Asset created successfully",
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
        code: error.code,
      });
    }
  }

  /**
   * Check Out Asset
   */
  static async checkOutAsset(req: Request, res: Response) {
    try {
      const { assetId } = req.params;
      const payload = req.body;
      const userId = req.user?.id;

      const result = await PartsAndAssetsService.checkOutAsset({
        assetId,
        ...payload,
        checkedOutBy: userId,
      });

      res.json({
        success: true,
        data: result,
        message: "Asset checked out successfully",
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
        code: error.code,
      });
    }
  }

  /**
   * Check In Asset
   */
  static async checkInAsset(req: Request, res: Response) {
    try {
      const { assetId } = req.params;
      const payload = req.body;
      const userId = req.user?.id;

      const result = await PartsAndAssetsService.checkInAsset({
        assetId,
        ...payload,
        checkedInBy: userId,
      });

      res.json({
        success: true,
        data: result,
        message: "Asset checked in successfully",
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
        code: error.code,
      });
    }
  }

  /**
   * Get Fixed Asset
   */
  static async getFixedAssetById(req: Request, res: Response) {
    try {
      const { assetId } = req.params;

      const asset = await PartsAndAssetsService.getFixedAssetById(assetId);

      res.json({
        success: true,
        data: asset,
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
        code: error.code,
      });
    }
  }

  /**
   * List Fixed Assets
   */
  static async listFixedAssets(req: Request, res: Response) {
    try {
      const {
        assetCategory,
        status,
        location,
        searchTerm,
        page = 1,
        limit = 10,
      } = req.query;

      const result = await PartsAndAssetsService.listFixedAssets(
        {
          assetCategory: assetCategory as string,
          status: status as string,
          location: location as string,
          searchTerm: searchTerm as string,
        },
        parseInt(page as string),
        parseInt(limit as string)
      );

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
        code: error.code,
      });
    }
  }

  /**
   * Get Assets Statistics
   */
  static async getAssetsStatistics(req: Request, res: Response) {
    try {
      const stats = await PartsAndAssetsService.getAssetsStatistics();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
        code: error.code,
      });
    }
  }
}

export default MaintenanceController;
