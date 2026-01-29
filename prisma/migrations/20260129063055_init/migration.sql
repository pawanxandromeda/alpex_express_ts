-- CreateEnum
CREATE TYPE "Status" AS ENUM ('Active', 'Inactive');

-- CreateEnum
CREATE TYPE "ShiftType" AS ENUM ('Day', 'Night', 'Rotational');

-- CreateEnum
CREATE TYPE "TodoPriority" AS ENUM ('Low', 'Medium', 'High', 'Urgent');

-- CreateEnum
CREATE TYPE "TodoStatus" AS ENUM ('Open', 'InProgress', 'OnHold', 'Completed', 'Cancelled');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('Pending', 'Active', 'Inactive');

-- CreateEnum
CREATE TYPE "CredentialApprovalStatus" AS ENUM ('Pending', 'Approved');

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'Pending',
    "approvedForCredentials" "CredentialApprovalStatus" NOT NULL DEFAULT 'Pending',
    "dateOfJoining" TIMESTAMP(3),
    "ctc" DOUBLE PRECISION,
    "createdByRole" TEXT NOT NULL,
    "username" TEXT,
    "password" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "refreshToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "address" TEXT,
    "creditLimit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "creditApprovalStatus" TEXT NOT NULL DEFAULT 'Pending',
    "paymentTerms" TEXT NOT NULL,
    "throughVia" TEXT,
    "gstrNo" TEXT NOT NULL,
    "kycProfile" TEXT,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "contacts" JSONB,
    "remarks" TEXT,
    "relationshipStatus" TEXT,
    "gstCopy" TEXT,
    "drugLicense" TEXT,
    "dlExpiry" TIMESTAMP(3),
    "isBlacklisted" BOOLEAN NOT NULL DEFAULT false,
    "blacklistReason" TEXT,
    "blacklistedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Todo" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" "TodoPriority" NOT NULL DEFAULT 'Medium',
    "status" "TodoStatus" NOT NULL DEFAULT 'Open',
    "createdById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Todo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TodoMention" (
    "id" TEXT NOT NULL,
    "todoId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "mentionedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TodoMention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TodoUpdate" (
    "id" TEXT NOT NULL,
    "todoId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "updateType" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TodoUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "gstNo" TEXT,
    "customerId" TEXT,
    "poNo" TEXT,
    "poDate" TIMESTAMP(3),
    "dispatchDate" TIMESTAMP(3),
    "brandName" TEXT,
    "partyName" TEXT,
    "batchNo" TEXT,
    "paymentTerms" TEXT,
    "invCha" TEXT,
    "cylChar" TEXT,
    "orderThrough" TEXT,
    "address" TEXT,
    "composition" TEXT,
    "notes" TEXT,
    "rmStatus" TEXT,
    "poQty" TEXT,
    "poRate" TEXT,
    "amount" TEXT,
    "mrp" TEXT,
    "section" TEXT,
    "specialRequirements" TEXT,
    "tabletCapsuleDrySyrupBottle" TEXT,
    "roundOvalTablet" TEXT,
    "tabletColour" TEXT,
    "aluAluBlisterStripBottle" TEXT,
    "packStyle" TEXT,
    "productNewOld" TEXT,
    "qaObservations" TEXT,
    "batchQty" TEXT,
    "expiry" TIMESTAMP(3),
    "pvcColourBase" TEXT,
    "foil" TEXT,
    "lotNo" TEXT,
    "foilPoDate" TIMESTAMP(3),
    "foilSize" TEXT,
    "foilPoVendor" TEXT,
    "foilBillDate" TIMESTAMP(3),
    "foilQuantity" TEXT,
    "cartonPoDate" TIMESTAMP(3),
    "cartonPoVendor" TEXT,
    "cartonBillDate" TIMESTAMP(3),
    "cartonQuantity" TEXT,
    "packingDate" TIMESTAMP(3),
    "qtyPacked" TEXT,
    "noOfShippers" TEXT,
    "design" TEXT,
    "productionStatus" TEXT,
    "overallStatus" TEXT NOT NULL DEFAULT 'Pending',
    "invoiceNo" TEXT,
    "invoiceDate" TIMESTAMP(3),
    "changePart" TEXT,
    "cyc" TEXT,
    "advance" TEXT,
    "showStatus" TEXT NOT NULL DEFAULT 'Order Pending',
    "mdApproval" TEXT NOT NULL DEFAULT 'Pending',
    "accountsApproval" TEXT NOT NULL DEFAULT 'Pending',
    "designerApproval" TEXT NOT NULL DEFAULT 'Pending',
    "ppicApproval" TEXT NOT NULL DEFAULT 'Pending',
    "designerActions" JSONB,
    "accountBills" JSONB,
    "salesComments" TEXT,
    "poDisputes" JSONB,
    "rawImportedData" JSONB,
    "foilQuantityOrdered" TEXT,
    "cartonQuantityOrdered" TEXT,
    "dispatchStatus" TEXT DEFAULT 'Pending',
    "timestamp" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "performedBy" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "details" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_phone_key" ON "Employee"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_username_key" ON "Employee"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_gstrNo_key" ON "Customer"("gstrNo");

-- CreateIndex
CREATE INDEX "Todo_createdById_idx" ON "Todo"("createdById");

-- CreateIndex
CREATE INDEX "Todo_assignedToId_idx" ON "Todo"("assignedToId");

-- CreateIndex
CREATE INDEX "Todo_priority_idx" ON "Todo"("priority");

-- CreateIndex
CREATE INDEX "Todo_dueDate_idx" ON "Todo"("dueDate");

-- CreateIndex
CREATE INDEX "Todo_completed_idx" ON "Todo"("completed");

-- CreateIndex
CREATE INDEX "Todo_status_idx" ON "Todo"("status");

-- CreateIndex
CREATE INDEX "TodoMention_employeeId_idx" ON "TodoMention"("employeeId");

-- CreateIndex
CREATE INDEX "TodoMention_todoId_idx" ON "TodoMention"("todoId");

-- CreateIndex
CREATE UNIQUE INDEX "TodoMention_todoId_employeeId_key" ON "TodoMention"("todoId", "employeeId");

-- CreateIndex
CREATE INDEX "TodoUpdate_todoId_idx" ON "TodoUpdate"("todoId");

-- CreateIndex
CREATE INDEX "TodoUpdate_createdAt_idx" ON "TodoUpdate"("createdAt");

-- CreateIndex
CREATE INDEX "PurchaseOrder_gstNo_idx" ON "PurchaseOrder"("gstNo");

-- CreateIndex
CREATE INDEX "PurchaseOrder_customerId_idx" ON "PurchaseOrder"("customerId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_poDate_idx" ON "PurchaseOrder"("poDate");

-- CreateIndex
CREATE INDEX "PurchaseOrder_overallStatus_idx" ON "PurchaseOrder"("overallStatus");

-- CreateIndex
CREATE INDEX "PurchaseOrder_createdAt_idx" ON "PurchaseOrder"("createdAt");

-- AddForeignKey
ALTER TABLE "Todo" ADD CONSTRAINT "Todo_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Todo" ADD CONSTRAINT "Todo_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TodoMention" ADD CONSTRAINT "TodoMention_todoId_fkey" FOREIGN KEY ("todoId") REFERENCES "Todo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TodoMention" ADD CONSTRAINT "TodoMention_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TodoUpdate" ADD CONSTRAINT "TodoUpdate_todoId_fkey" FOREIGN KEY ("todoId") REFERENCES "Todo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
