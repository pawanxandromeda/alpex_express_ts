-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "assignedAt" TIMESTAMP(3),
ADD COLUMN     "assignedToEmployeeId" TEXT;

-- AlterTable
ALTER TABLE "PurchaseOrder" ADD COLUMN     "assignedAt" TIMESTAMP(3),
ADD COLUMN     "assignedToEmployeeId" TEXT;

-- CreateTable
CREATE TABLE "CustomerAssignmentHistory" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "assignedToEmployeeId" TEXT,
    "assignedByEmployeeId" TEXT NOT NULL,
    "previousEmployeeId" TEXT,
    "reason" TEXT,
    "remarks" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerAssignmentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadAssignmentHistory" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "assignedToEmployeeId" TEXT,
    "assignedByEmployeeId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "LeadAssignmentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderAssignmentHistory" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "assignedToEmployeeId" TEXT,
    "assignedByEmployeeId" TEXT NOT NULL,
    "previousEmployeeId" TEXT,
    "reason" TEXT,
    "remarks" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseOrderAssignmentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomerAssignmentHistory_customerId_idx" ON "CustomerAssignmentHistory"("customerId");

-- CreateIndex
CREATE INDEX "CustomerAssignmentHistory_assignedToEmployeeId_idx" ON "CustomerAssignmentHistory"("assignedToEmployeeId");

-- CreateIndex
CREATE INDEX "CustomerAssignmentHistory_assignedAt_idx" ON "CustomerAssignmentHistory"("assignedAt");

-- CreateIndex
CREATE INDEX "PurchaseOrderAssignmentHistory_purchaseOrderId_idx" ON "PurchaseOrderAssignmentHistory"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "PurchaseOrderAssignmentHistory_assignedToEmployeeId_idx" ON "PurchaseOrderAssignmentHistory"("assignedToEmployeeId");

-- CreateIndex
CREATE INDEX "PurchaseOrderAssignmentHistory_assignedAt_idx" ON "PurchaseOrderAssignmentHistory"("assignedAt");

-- CreateIndex
CREATE INDEX "PurchaseOrder_assignedToEmployeeId_idx" ON "PurchaseOrder"("assignedToEmployeeId");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_assignedToEmployeeId_fkey" FOREIGN KEY ("assignedToEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerAssignmentHistory" ADD CONSTRAINT "CustomerAssignmentHistory_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerAssignmentHistory" ADD CONSTRAINT "CustomerAssignmentHistory_assignedByEmployeeId_fkey" FOREIGN KEY ("assignedByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadAssignmentHistory" ADD CONSTRAINT "LeadAssignmentHistory_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_assignedToEmployeeId_fkey" FOREIGN KEY ("assignedToEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderAssignmentHistory" ADD CONSTRAINT "PurchaseOrderAssignmentHistory_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderAssignmentHistory" ADD CONSTRAINT "PurchaseOrderAssignmentHistory_assignedByEmployeeId_fkey" FOREIGN KEY ("assignedByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
