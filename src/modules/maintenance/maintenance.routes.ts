import { Router } from "express";
import MaintenanceController from "./maintenance.controller";
import { protect } from "../../common/middleware/auth.middleware";
import {
  createMachineTypeSchema,
  createMachineSchema,
  updateMachineSchema,
  updateMachineStatusSchema,
  createMaintenanceRecordSchema,
  completeMaintenanceSchema,
  createPartSchema,
  createPartOrderSchema,
  receivePartOrderSchema,
  createFixedAssetSchema,
  checkOutAssetSchema,
  checkInAssetSchema,
  validateSchema,
} from "./maintenance.validation";

const router = Router();

// ============ MACHINE ROUTES ============

// Machine Type Management
router.post(
  "/machine-types",
  protect,
  validateSchema(createMachineTypeSchema),
  MaintenanceController.createMachineType
);

router.get("/machine-types", protect, MaintenanceController.getMachineTypes);

// Machine Management
router.post(
  "/machines",
  protect,
  validateSchema(createMachineSchema),
  MaintenanceController.createMachine
);

router.put(
  "/machines/:machineId",
  validateSchema(updateMachineSchema),
  MaintenanceController.updateMachine
);

router.patch(
  "/machines/:machineId/status",
  validateSchema(updateMachineStatusSchema),
  MaintenanceController.updateMachineStatus
);

router.get("/machines/due-for-maintenance", MaintenanceController.getMachinesDueForMaintenance);

router.get("/machines/:machineId", MaintenanceController.getMachineById);

router.get("/machines", MaintenanceController.listMachines);

router.get("/machines-statistics", MaintenanceController.getMachineStatistics);

// ============ MAINTENANCE RECORD ROUTES ============

router.post(
  "/maintenance-records",
  protect,
  validateSchema(createMaintenanceRecordSchema),
  MaintenanceController.createMaintenanceRecord
);

router.patch(
  "/maintenance-records/:maintenanceRecordId/start",
  protect,
  MaintenanceController.startMaintenance
);

router.patch(
  "/maintenance-records/:maintenanceRecordId/complete",
  protect,
  validateSchema(completeMaintenanceSchema),
  MaintenanceController.completeMaintenance
);

router.get(
  "/maintenance-records/:maintenanceRecordId",
  protect,
  MaintenanceController.getMaintenanceRecordById
);

router.get(
  "/maintenance-records",
  protect,
  MaintenanceController.listMaintenanceRecords
);

router.get(
  "/maintenance-statistics",
  protect,
  MaintenanceController.getMaintenanceStatistics
);

router.get(
  "/upcoming-maintenance",
  protect,
  MaintenanceController.getUpcomingMaintenanceSchedule
);

// ============ PARTS ROUTES ============

router.post(
  "/parts",
  validateSchema(createPartSchema),
  MaintenanceController.createPart
);

router.get("/parts/reorder-list", MaintenanceController.getPartsForReorder);

router.get("/parts/:partId", MaintenanceController.getPartById);

router.get("/parts", MaintenanceController.listParts);

// ============ PART ORDERS ROUTES ============

router.post(
  "/part-orders",
  validateSchema(createPartOrderSchema),
  MaintenanceController.createPartOrder
);

router.patch(
  "/part-orders/:orderId/receive",
  validateSchema(receivePartOrderSchema),
  MaintenanceController.receivePartOrder
);

router.get("/part-orders/:orderId", MaintenanceController.getPartOrderById);

router.get("/part-orders", MaintenanceController.listPartOrders);

// ============ FIXED ASSETS ROUTES ============

router.post(
  "/fixed-assets",
  validateSchema(createFixedAssetSchema),
  MaintenanceController.createFixedAsset
);

router.post(
  "/fixed-assets/:assetId/checkout",
  validateSchema(checkOutAssetSchema),
  MaintenanceController.checkOutAsset
);

router.post(
  "/fixed-assets/:assetId/checkin",
  validateSchema(checkInAssetSchema),
  MaintenanceController.checkInAsset
);

router.get(
  "/fixed-assets/:assetId",
  MaintenanceController.getFixedAssetById
);

router.get("/fixed-assets", MaintenanceController.listFixedAssets);

router.get(
  "/assets-statistics",
  MaintenanceController.getAssetsStatistics
);

export default router;
