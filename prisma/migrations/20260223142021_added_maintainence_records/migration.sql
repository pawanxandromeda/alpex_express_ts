-- CreateEnum
CREATE TYPE "MachineStatus" AS ENUM ('Operational', 'UnderMaintenance', 'Breakdown', 'Inactive', 'Reserved');

-- CreateEnum
CREATE TYPE "MaintenanceType" AS ENUM ('Preventive', 'Corrective', 'Predictive', 'Emergency');

-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('Scheduled', 'InProgress', 'OnHold', 'Completed', 'Cancelled');

-- CreateEnum
CREATE TYPE "PartStatus" AS ENUM ('Available', 'OutOfStock', 'OnOrder', 'Damaged', 'Obsolete');

-- CreateEnum
CREATE TYPE "BrokenPartDisposition" AS ENUM ('Scrapped', 'InStorage', 'ReturnedToVendor', 'RepairInProgress', 'Sold', 'Recycled');

-- CreateTable
CREATE TABLE "MachineType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "manufacturer" TEXT,
    "modelNumber" TEXT,
    "capacity" TEXT,
    "powerRequirement" TEXT,
    "maintenanceFrequency" TEXT,
    "averageLifespan" TEXT,
    "customFields" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MachineType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Machine" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "machineTypeId" TEXT NOT NULL,
    "serialNumber" TEXT,
    "location" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "status" "MachineStatus" NOT NULL DEFAULT 'Operational',
    "purchaseDate" TIMESTAMP(3),
    "purchasePrice" DOUBLE PRECISION,
    "supplier" TEXT,
    "warrantyExpiry" TIMESTAMP(3),
    "depreciation" DOUBLE PRECISION,
    "installationDate" TIMESTAMP(3),
    "lastMaintenanceDate" TIMESTAMP(3),
    "nextScheduledMaintenance" TIMESTAMP(3),
    "operatingHours" DOUBLE PRECISION DEFAULT 0,
    "hoursPerDay" DOUBLE PRECISION,
    "utilizationRate" DOUBLE PRECISION,
    "documentation" TEXT,
    "contacts" JSONB,
    "powerRequirement" TEXT,
    "spaceRequired" TEXT,
    "customFields" JSONB,
    "assignedToEmployeeId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Machine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MachineCurrentStatus" (
    "id" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "currentStatus" "MachineStatus" NOT NULL DEFAULT 'Operational',
    "statusChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedInProduction" BOOLEAN NOT NULL DEFAULT false,
    "productionLineId" TEXT,
    "currentActivity" TEXT,
    "operatorEmployeeId" TEXT,
    "maintainerEmployeeId" TEXT,
    "estimatedDowntimeEnd" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MachineCurrentStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceRecord" (
    "id" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "maintenanceType" "MaintenanceType" NOT NULL DEFAULT 'Preventive',
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'Scheduled',
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "startDate" TIMESTAMP(3),
    "completionDate" TIMESTAMP(3),
    "description" TEXT NOT NULL,
    "findings" TEXT,
    "workDone" TEXT,
    "assignedToEmployeeId" TEXT,
    "estimatedDurationHours" INTEGER,
    "actualDurationHours" INTEGER,
    "downtime" INTEGER,
    "laborCost" DOUBLE PRECISION,
    "materialCost" DOUBLE PRECISION,
    "totalCost" DOUBLE PRECISION,
    "nextMaintenanceDate" TIMESTAMP(3),
    "notes" TEXT,
    "attachments" JSONB,
    "createdBy" TEXT NOT NULL,
    "verifiedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Part" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "partNumber" TEXT,
    "manufacturer" TEXT,
    "supplierIds" TEXT[],
    "quantityInStock" INTEGER NOT NULL DEFAULT 0,
    "minimumStock" INTEGER NOT NULL DEFAULT 5,
    "reorderPoint" INTEGER NOT NULL DEFAULT 10,
    "reorderQuantity" INTEGER NOT NULL DEFAULT 20,
    "unitCost" DOUBLE PRECISION,
    "sellingPrice" DOUBLE PRECISION,
    "lastPriceUpdate" TIMESTAMP(3),
    "status" "PartStatus" NOT NULL DEFAULT 'Available',
    "acceptableAlternatives" TEXT[],
    "compatibility" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Part_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MachineSparePart" (
    "id" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "quantityRequired" INTEGER NOT NULL,
    "criticality" TEXT NOT NULL DEFAULT 'Medium',
    "lastReplacedDate" TIMESTAMP(3),
    "replacementCycle" INTEGER,
    "notes" TEXT,

    CONSTRAINT "MachineSparePart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenancePartUsage" (
    "id" TEXT NOT NULL,
    "maintenanceRecordId" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "quantityUsed" INTEGER NOT NULL,
    "unitCost" DOUBLE PRECISION,
    "totalCost" DOUBLE PRECISION,
    "costCenter" TEXT,

    CONSTRAINT "MaintenancePartUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartOrder" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "supplierContact" TEXT,
    "supplierPhone" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION,
    "totalPrice" DOUBLE PRECISION,
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedDelivery" TIMESTAMP(3),
    "actualDelivery" TIMESTAMP(3),
    "deliveryStatus" TEXT NOT NULL DEFAULT 'Pending',
    "purchaseOrderNumber" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'Unpaid',
    "amountPaid" DOUBLE PRECISION DEFAULT 0,
    "notes" TEXT,
    "attachments" JSONB,
    "orderedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrokenPart" (
    "id" TEXT NOT NULL,
    "maintenanceRecordId" TEXT NOT NULL,
    "partId" TEXT,
    "partName" TEXT NOT NULL,
    "originalQuantity" INTEGER NOT NULL,
    "disposition" "BrokenPartDisposition" NOT NULL DEFAULT 'InStorage',
    "dispositionDate" TIMESTAMP(3),
    "dispositionNotes" TEXT,
    "scrapReason" TEXT,
    "scrapApprovedBy" TEXT,
    "storageLocation" TEXT,
    "vendorReturnId" TEXT,
    "returnAuthorization" TEXT,
    "returnDate" TIMESTAMP(3),
    "salePrice" DOUBLE PRECISION,
    "buyerId" TEXT,
    "saleDateFor" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "approvedBy" TEXT,
    "approvalDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrokenPart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FixedAsset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "assetCategory" TEXT NOT NULL,
    "description" TEXT,
    "manufacturer" TEXT,
    "modelNumber" TEXT,
    "serialNumber" TEXT,
    "currentLocation" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "minThreshold" INTEGER NOT NULL DEFAULT 1,
    "purchaseDate" TIMESTAMP(3),
    "purchasePrice" DOUBLE PRECISION,
    "currentValue" DOUBLE PRECISION,
    "depreciation" DOUBLE PRECISION,
    "warrantyExpiry" TIMESTAMP(3),
    "supplier" TEXT,
    "supplierContact" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Available',
    "assignedToEmployeeId" TEXT,
    "assignedDate" TIMESTAMP(3),
    "lastUsedDate" TIMESTAMP(3),
    "maintenanceRequired" BOOLEAN NOT NULL DEFAULT false,
    "lastMaintenanceDate" TIMESTAMP(3),
    "nextMaintenanceDate" TIMESTAMP(3),
    "documentation" TEXT,
    "condition" TEXT NOT NULL DEFAULT 'Good',
    "notes" TEXT,
    "attachments" JSONB,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FixedAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FixedAssetUsageLog" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "usedByEmployeeId" TEXT,
    "usedBy" TEXT,
    "usedForMachineId" TEXT,
    "usedForDescription" TEXT,
    "checkOutDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkInDate" TIMESTAMP(3),
    "duration" INTEGER,
    "condition" TEXT,
    "notes" TEXT,

    CONSTRAINT "FixedAssetUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MachineType_name_key" ON "MachineType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "MachineType_code_key" ON "MachineType"("code");

-- CreateIndex
CREATE INDEX "MachineType_category_idx" ON "MachineType"("category");

-- CreateIndex
CREATE INDEX "MachineType_isActive_idx" ON "MachineType"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Machine_code_key" ON "Machine"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Machine_serialNumber_key" ON "Machine"("serialNumber");

-- CreateIndex
CREATE INDEX "Machine_machineTypeId_idx" ON "Machine"("machineTypeId");

-- CreateIndex
CREATE INDEX "Machine_location_idx" ON "Machine"("location");

-- CreateIndex
CREATE INDEX "Machine_department_idx" ON "Machine"("department");

-- CreateIndex
CREATE INDEX "Machine_status_idx" ON "Machine"("status");

-- CreateIndex
CREATE INDEX "Machine_lastMaintenanceDate_idx" ON "Machine"("lastMaintenanceDate");

-- CreateIndex
CREATE INDEX "Machine_nextScheduledMaintenance_idx" ON "Machine"("nextScheduledMaintenance");

-- CreateIndex
CREATE UNIQUE INDEX "MachineCurrentStatus_machineId_key" ON "MachineCurrentStatus"("machineId");

-- CreateIndex
CREATE INDEX "MachineCurrentStatus_machineId_idx" ON "MachineCurrentStatus"("machineId");

-- CreateIndex
CREATE INDEX "MachineCurrentStatus_currentStatus_idx" ON "MachineCurrentStatus"("currentStatus");

-- CreateIndex
CREATE INDEX "MachineCurrentStatus_usedInProduction_idx" ON "MachineCurrentStatus"("usedInProduction");

-- CreateIndex
CREATE INDEX "MaintenanceRecord_machineId_idx" ON "MaintenanceRecord"("machineId");

-- CreateIndex
CREATE INDEX "MaintenanceRecord_status_idx" ON "MaintenanceRecord"("status");

-- CreateIndex
CREATE INDEX "MaintenanceRecord_scheduledDate_idx" ON "MaintenanceRecord"("scheduledDate");

-- CreateIndex
CREATE INDEX "MaintenanceRecord_completionDate_idx" ON "MaintenanceRecord"("completionDate");

-- CreateIndex
CREATE INDEX "MaintenanceRecord_assignedToEmployeeId_idx" ON "MaintenanceRecord"("assignedToEmployeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Part_code_key" ON "Part"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Part_partNumber_key" ON "Part"("partNumber");

-- CreateIndex
CREATE INDEX "Part_category_idx" ON "Part"("category");

-- CreateIndex
CREATE INDEX "Part_status_idx" ON "Part"("status");

-- CreateIndex
CREATE INDEX "Part_code_idx" ON "Part"("code");

-- CreateIndex
CREATE INDEX "MachineSparePart_machineId_idx" ON "MachineSparePart"("machineId");

-- CreateIndex
CREATE INDEX "MachineSparePart_partId_idx" ON "MachineSparePart"("partId");

-- CreateIndex
CREATE UNIQUE INDEX "MachineSparePart_machineId_partId_key" ON "MachineSparePart"("machineId", "partId");

-- CreateIndex
CREATE INDEX "MaintenancePartUsage_maintenanceRecordId_idx" ON "MaintenancePartUsage"("maintenanceRecordId");

-- CreateIndex
CREATE INDEX "MaintenancePartUsage_partId_idx" ON "MaintenancePartUsage"("partId");

-- CreateIndex
CREATE UNIQUE INDEX "PartOrder_orderNumber_key" ON "PartOrder"("orderNumber");

-- CreateIndex
CREATE INDEX "PartOrder_partId_idx" ON "PartOrder"("partId");

-- CreateIndex
CREATE INDEX "PartOrder_orderDate_idx" ON "PartOrder"("orderDate");

-- CreateIndex
CREATE INDEX "PartOrder_expectedDelivery_idx" ON "PartOrder"("expectedDelivery");

-- CreateIndex
CREATE INDEX "PartOrder_deliveryStatus_idx" ON "PartOrder"("deliveryStatus");

-- CreateIndex
CREATE INDEX "BrokenPart_maintenanceRecordId_idx" ON "BrokenPart"("maintenanceRecordId");

-- CreateIndex
CREATE INDEX "BrokenPart_disposition_idx" ON "BrokenPart"("disposition");

-- CreateIndex
CREATE INDEX "BrokenPart_status_idx" ON "BrokenPart"("status");

-- CreateIndex
CREATE UNIQUE INDEX "FixedAsset_code_key" ON "FixedAsset"("code");

-- CreateIndex
CREATE UNIQUE INDEX "FixedAsset_serialNumber_key" ON "FixedAsset"("serialNumber");

-- CreateIndex
CREATE INDEX "FixedAsset_assetCategory_idx" ON "FixedAsset"("assetCategory");

-- CreateIndex
CREATE INDEX "FixedAsset_status_idx" ON "FixedAsset"("status");

-- CreateIndex
CREATE INDEX "FixedAsset_currentLocation_idx" ON "FixedAsset"("currentLocation");

-- CreateIndex
CREATE INDEX "FixedAsset_assignedToEmployeeId_idx" ON "FixedAsset"("assignedToEmployeeId");

-- CreateIndex
CREATE INDEX "FixedAssetUsageLog_assetId_idx" ON "FixedAssetUsageLog"("assetId");

-- CreateIndex
CREATE INDEX "FixedAssetUsageLog_checkOutDate_idx" ON "FixedAssetUsageLog"("checkOutDate");

-- AddForeignKey
ALTER TABLE "Machine" ADD CONSTRAINT "Machine_machineTypeId_fkey" FOREIGN KEY ("machineTypeId") REFERENCES "MachineType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Machine" ADD CONSTRAINT "Machine_assignedToEmployeeId_fkey" FOREIGN KEY ("assignedToEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineCurrentStatus" ADD CONSTRAINT "MachineCurrentStatus_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRecord" ADD CONSTRAINT "MaintenanceRecord_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRecord" ADD CONSTRAINT "MaintenanceRecord_assignedToEmployeeId_fkey" FOREIGN KEY ("assignedToEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineSparePart" ADD CONSTRAINT "MachineSparePart_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineSparePart" ADD CONSTRAINT "MachineSparePart_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenancePartUsage" ADD CONSTRAINT "MaintenancePartUsage_maintenanceRecordId_fkey" FOREIGN KEY ("maintenanceRecordId") REFERENCES "MaintenanceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenancePartUsage" ADD CONSTRAINT "MaintenancePartUsage_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartOrder" ADD CONSTRAINT "PartOrder_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrokenPart" ADD CONSTRAINT "BrokenPart_maintenanceRecordId_fkey" FOREIGN KEY ("maintenanceRecordId") REFERENCES "MaintenanceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrokenPart" ADD CONSTRAINT "BrokenPart_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FixedAsset" ADD CONSTRAINT "FixedAsset_assignedToEmployeeId_fkey" FOREIGN KEY ("assignedToEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FixedAssetUsageLog" ADD CONSTRAINT "FixedAssetUsageLog_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "FixedAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
