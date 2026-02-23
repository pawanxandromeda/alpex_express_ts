# Maintenance Module Integration Guide

This guide shows how to integrate the Maintenance & Assets Management module with your main Express application.

## 1. Update App Entry Point (app.ts)

Add the maintenance routes to your main Express app:

```typescript
import express, { Express } from "express";
import maintenanceRoutes from "./modules/maintenance/maintenance.routes";

const app: Express = express();

// Existing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ... other routes ...

// Maintenance Module Routes (prefix with /api/maintenance or /maintenance)
app.use("/api/maintenance", maintenanceRoutes);
// OR
app.use("/maintenance", maintenanceRoutes);

export default app;
```

## 2. Update Server Entry Point (server.ts)

If using a separate server file:

```typescript
import app from "./app";
import maintenanceRoutes from "./modules/maintenance/maintenance.routes";

const PORT = process.env.PORT || 5000;

// Register maintenance module
app.use("/api/maintenance", maintenanceRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Maintenance module available at http://localhost:${PORT}/api/maintenance`);
});
```

## 3. Create Prisma Migration

After updating schema.prisma:

```bash
# Generate migration
npx prisma migrate dev --name "add_maintenance_module"

# This will:
# - Create migration file
# - Update Prisma client
# - Apply changes to database
```

## 4. Seed Initial Data (Optional)

Create `prisma/seedMaintenance.ts`:

```typescript
import prisma from "../src/config/postgres";

async function seedMaintenance() {
  try {
    // Create Machine Types
    const tabletPressType = await prisma.machineType.create({
      data: {
        name: "Tablet Press",
        code: "TP-TYPE",
        category: "Production",
        manufacturer: "Korsch",
        modelNumber: "PH3000",
        maintenanceFrequency: "Monthly",
        customFields: {
          pressureCapacity: { type: "number", required: true },
          tabletsPerHour: { type: "number", required: true },
        },
      },
    });

    const capsuleFillerType = await prisma.machineType.create({
      data: {
        name: "Capsule Filling Machine",
        code: "CF-TYPE",
        category: "Production",
        manufacturer: "Marves",
        maintenanceFrequency: "Monthly",
        customFields: {
          capacityPerHour: { type: "number", required: true },
          numberOfHeads: { type: "number", required: true },
        },
      },
    });

    // Create sample Parts
    const bearingPart = await prisma.part.create({
      data: {
        name: "Bearing SKF 6309",
        code: "PART-BEARING-001",
        category: "Bearing",
        manufacturer: "SKF",
        partNumber: "6309",
        quantityInStock: 10,
        minimumStock: 3,
        reorderPoint: 5,
        reorderQuantity: 20,
        unitCost: 5000,
      },
    });

    const sealPart = await prisma.part.create({
      data: {
        name: "Main Seal Assembly",
        code: "PART-SEAL-001",
        category: "Seal",
        manufacturer: "Freudenberg",
        quantityInStock: 5,
        minimumStock: 2,
        reorderPoint: 3,
        reorderQuantity: 10,
        unitCost: 8000,
      },
    });

    console.log("✅ Maintenance module seeded successfully");
    console.log("   - Created 2 Machine Types");
    console.log("   - Created 2 Sample Parts");

  } catch (error) {
    console.error("❌ Error seeding maintenance data:", error);
    throw error;
  }
}

seedMaintenance()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Run seed:
```bash
npx ts-node prisma/seedMaintenance.ts
```

## 5. Add Authentication Middleware

If your app uses authentication, add middleware to maintenance routes:

```typescript
import { Router } from "express";
import { authMiddleware } from "../../common/middleware/auth";
import { authorizeRole } from "../../common/middleware/authorization";
import maintenanceRoutes from "./maintenance.routes";

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Apply role-based access control
router.use("/machines", authorizeRole(["Admin", "MaintenanceLead", "Technician"]));
router.use("/maintenance-records", authorizeRole(["Admin", "MaintenanceLead", "Technician"]));
router.use("/parts", authorizeRole(["Admin", "MaintenanceLead", "Procurement"]));
router.use("/fixed-assets", authorizeRole(["Admin", "MaintenanceLead"]));

// Mount routes
router.use(maintenanceRoutes);

export default router;
```

## 6. Create Service Layer Integration

If you have a service aggregation layer:

```typescript
// src/services/maintenanceAggregator.ts
import MachineService from "../modules/maintenance/machine.service";
import MaintenanceService from "../modules/maintenance/maintenance.service";
import PartsAndAssetsService from "../modules/maintenance/partsAndAssets.service";

export class MaintenanceAggregatorService {
  static machine = MachineService;
  static maintenance = MaintenanceService;
  static partsAndAssets = PartsAndAssetsService;

  /**
   * Get comprehensive machine health dashboard
   */
  static async getMachineHealthDashboard() {
    const stats = await MachineService.getMachineStatistics();
    const dueForMaintenance = await MachineService.getMachinesDueForMaintenance();
    const upcomingSchedule = await MaintenanceService.getUpcomingMaintenanceSchedule();
    const partsForReorder = await PartsAndAssetsService.getPartsForReorder();
    const assetsStats = await PartsAndAssetsService.getAssetsStatistics();

    return {
      machineStatistics: stats,
      machinesDueForMaintenance: dueForMaintenance,
      upcomingMaintenanceSchedule: upcomingSchedule,
      partsForReorder,
      assetsStatistics: assetsStats,
    };
  }

  /**
   * Get machine-specific comprehensive report
   */
  static async getMachineReport(machineId: string) {
    const machine = await MachineService.getMachineById(machineId);
    const maintenanceHistory = await MaintenanceService.listMaintenanceRecords(
      { machineId },
      1,
      100
    );
    const maintenanceStats = await MaintenanceService.getMaintenanceStatistics({ machineId });

    return {
      machine,
      maintenanceHistory,
      maintenanceStats,
    };
  }
}

export default MaintenanceAggregatorService;
```

## 7. Add Dashboard Endpoints

Create comprehensive dashboard endpoints:

```typescript
// src/modules/maintenance/maintenance.dashboard.ts
import { Request, Response } from "express";
import MaintenanceAggregatorService from "../../services/maintenanceAggregator";

export class MaintenanceDashboardController {
  static async getHealthDashboard(req: Request, res: Response) {
    try {
      const dashboard = await MaintenanceAggregatorService.getMachineHealthDashboard();
      res.json({
        success: true,
        data: dashboard,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  static async getMachineReport(req: Request, res: Response) {
    try {
      const { machineId } = req.params;
      const report = await MaintenanceAggregatorService.getMachineReport(machineId);
      res.json({
        success: true,
        data: report,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}

export default MaintenanceDashboardController;
```

## 8. Create Type Definitions (TypeScript)

Add to `src/types/maintenance.types.ts`:

```typescript
export type MachineStatus = "Operational" | "UnderMaintenance" | "Breakdown" | "Inactive" | "Reserved";
export type MaintenanceType = "Preventive" | "Corrective" | "Predictive" | "Emergency";
export type MaintenanceStatus = "Scheduled" | "InProgress" | "OnHold" | "Completed" | "Cancelled";
export type PartStatus = "Available" | "OutOfStock" | "OnOrder" | "Damaged" | "Obsolete";
export type BrokenPartDisposition = "Scrapped" | "InStorage" | "ReturnedToVendor" | "RepairInProgress" | "Sold" | "Recycled";

export interface IMachine {
  id: string;
  name: string;
  code: string;
  machineTypeId: string;
  status: MachineStatus;
  location: string;
  department: string;
}

export interface IMaintenanceRecord {
  id: string;
  machineId: string;
  maintenanceType: MaintenanceType;
  status: MaintenanceStatus;
  scheduledDate: Date;
}

export interface IPart {
  id: string;
  name: string;
  code: string;
  quantityInStock: number;
  status: PartStatus;
}
```

## 9. Add Error Handler Middleware

Add maintenance-specific error handling:

```typescript
// src/common/middleware/maintenanceErrorHandler.ts
import { Request, Response, NextFunction } from "express";

export const maintenanceErrorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (error.code === "VALIDATION_ERROR") {
    return res.status(400).json({
      success: false,
      message: error.message,
      code: error.code,
      details: error.details,
    });
  }

  if (error.code === "NOT_FOUND") {
    return res.status(404).json({
      success: false,
      message: error.message,
      code: error.code,
    });
  }

  // Default error
  res.status(500).json({
    success: false,
    message: "Maintenance module error",
    error: error.message,
  });
};
```

## 10. Testing

Create tests for the maintenance module:

```typescript
// src/modules/maintenance/__tests__/machine.service.test.ts
import MachineService from "../machine.service";

describe("MachineService", () => {
  describe("createMachine", () => {
    it("should create a machine successfully", async () => {
      const payload = {
        name: "Test Machine",
        code: "TEST-001",
        machineTypeId: "type-uuid",
        location: "Test Location",
        department: "Test Dept",
        createdBy: "user-uuid",
      };

      // Test implementation
    });
  });

  describe("updateMachineStatus", () => {
    it("should update machine status", async () => {
      // Test implementation
    });
  });
});
```

## Environment Variables

Add to `.env`:

```env
# Maintenance Module
MAINTENANCE_ENABLED=true
MAINTENANCE_CACHE_TTL=3600

# Notification settings
NOTIFY_MAINTENANCE_DUE=true
NOTIFY_PARTS_LOW_STOCK=true
NOTIFY_ASSET_CHECKOUT=true

# Integration settings
INTEGRATE_WITH_PRODUCTION=true
INTEGRATE_WITH_PURCHASE=true
```

## Monitoring & Logging

Add logging:

```typescript
// src/modules/maintenance/maintenance.logger.ts
import logger from "../../config/logger";

export const maintenanceLogger = {
  logMachineCreated: (machineId: string, name: string) => {
    logger.info(`Machine created: ${machineId} - ${name}`);
  },

  logMaintenanceStarted: (recordId: string, machineId: string) => {
    logger.info(`Maintenance started: ${recordId} for machine ${machineId}`);
  },

  logMaintenanceCompleted: (recordId: string, cost: number) => {
    logger.info(`Maintenance completed: ${recordId}, Cost: ${cost}`);
  },

  logPartOrderCreated: (orderId: string, partId: string, quantity: number) => {
    logger.info(`Part order created: ${orderId}, Part: ${partId}, Qty: ${quantity}`);
  },

  logAssetCheckOut: (assetId: string, employeeId: string) => {
    logger.info(`Asset checked out: ${assetId} by employee ${employeeId}`);
  },
};

export default maintenanceLogger;
```

## Deployment Checklist

- [ ] Database migrations applied
- [ ] Environment variables configured
- [ ] Authentication middleware integrated
- [ ] Error handling middleware added
- [ ] Routes registered in main app
- [ ] Seed data created
- [ ] Tests written and passing
- [ ] Logging configured
- [ ] API documentation updated
- [ ] Performance testing done

## Support

For detailed API documentation, see [README.md](./README.md)

For module-specific examples, check the test files and integration examples.
