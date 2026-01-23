-- CreateTable
CREATE TABLE "DesignerReview" (
    "id" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DesignerReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountBill" (
    "id" TEXT NOT NULL,
    "billDate" TIMESTAMP(3),
    "billNo" TEXT,
    "partyName" TEXT,
    "billAmt" DOUBLE PRECISION,
    "receivedAmount" DOUBLE PRECISION,
    "balanceAmount" DOUBLE PRECISION,
    "dueDate" TIMESTAMP(3),
    "pdcAmount" DOUBLE PRECISION,
    "pdcDate" TIMESTAMP(3),
    "chqNo" TEXT,
    "pdcReceiveDate" TIMESTAMP(3),
    "dueDays" INTEGER,
    "marketingPersonnelName" TEXT,
    "accountsComments" TEXT,
    "chequesExpected" BOOLEAN,
    "remarks" TEXT,
    "salesComments" TEXT,
    "purchaseOrderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountBill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountDispute" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "comments" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountDispute_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PurchaseOrder_poDate_idx" ON "PurchaseOrder"("poDate");

-- CreateIndex
CREATE INDEX "PurchaseOrder_overallStatus_idx" ON "PurchaseOrder"("overallStatus");

-- CreateIndex
CREATE INDEX "PurchaseOrder_createdAt_idx" ON "PurchaseOrder"("createdAt");

-- AddForeignKey
ALTER TABLE "DesignerReview" ADD CONSTRAINT "DesignerReview_poId_fkey" FOREIGN KEY ("poId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignerReview" ADD CONSTRAINT "DesignerReview_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountBill" ADD CONSTRAINT "AccountBill_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountDispute" ADD CONSTRAINT "AccountDispute_billId_fkey" FOREIGN KEY ("billId") REFERENCES "AccountBill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountDispute" ADD CONSTRAINT "AccountDispute_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
