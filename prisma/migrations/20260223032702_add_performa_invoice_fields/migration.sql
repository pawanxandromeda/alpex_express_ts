-- CreateEnum
CREATE TYPE "ProformaInvoiceStatus" AS ENUM ('Draft', 'Sent', 'Verified', 'Rejected', 'Converted');

-- CreateTable
CREATE TABLE "ProformaInvoice" (
    "id" TEXT NOT NULL,
    "piNo" TEXT,
    "piDate" TIMESTAMP(3),
    "customerId" TEXT NOT NULL,
    "brandName" TEXT,
    "partyName" TEXT,
    "gstNo" TEXT,
    "address" TEXT,
    "section" TEXT,
    "transporter" TEXT,
    "destination" TEXT,
    "modeOfTransport" TEXT,
    "courier" TEXT,
    "composition" TEXT,
    "compositionId" TEXT,
    "piQty" TEXT,
    "piRate" TEXT,
    "amount" TEXT,
    "mrp" TEXT,
    "paymentTerms" TEXT,
    "deliveryTerms" TEXT,
    "subtotal" TEXT,
    "gstAmount" TEXT,
    "grandTotal" TEXT,
    "advance" TEXT,
    "notes" TEXT,
    "orderType" TEXT DEFAULT 'NEW',
    "preparedByEmployeeId" TEXT,
    "checkedByEmployeeId" TEXT,
    "accountantEmployeeId" TEXT,
    "designerEmployeeId" TEXT,
    "authorisedByEmployeeId" TEXT,
    "bankDetails" JSONB,
    "termsAndConditions" JSONB,
    "status" "ProformaInvoiceStatus" NOT NULL DEFAULT 'Draft',
    "verificationStatus" TEXT NOT NULL DEFAULT 'Pending',
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "pdfUrl" TEXT,
    "pdfFileName" TEXT,
    "convertedToPOId" TEXT,
    "convertedAt" TIMESTAMP(3),
    "convertedBy" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProformaInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProformaInvoiceLineItem" (
    "id" TEXT NOT NULL,
    "piId" TEXT NOT NULL,
    "itemNo" INTEGER NOT NULL,
    "brandName" TEXT,
    "composition" TEXT,
    "compositionId" TEXT,
    "orderType" TEXT,
    "packing" TEXT,
    "section" TEXT,
    "qty" TEXT,
    "mrp" TEXT,
    "rate" TEXT,
    "amount" TEXT,
    "gst" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProformaInvoiceLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProformaInvoice_piNo_key" ON "ProformaInvoice"("piNo");

-- CreateIndex
CREATE INDEX "ProformaInvoice_customerId_idx" ON "ProformaInvoice"("customerId");

-- CreateIndex
CREATE INDEX "ProformaInvoice_compositionId_idx" ON "ProformaInvoice"("compositionId");

-- CreateIndex
CREATE INDEX "ProformaInvoice_status_idx" ON "ProformaInvoice"("status");

-- CreateIndex
CREATE INDEX "ProformaInvoice_verificationStatus_idx" ON "ProformaInvoice"("verificationStatus");

-- CreateIndex
CREATE INDEX "ProformaInvoice_piDate_idx" ON "ProformaInvoice"("piDate");

-- CreateIndex
CREATE INDEX "ProformaInvoice_createdAt_idx" ON "ProformaInvoice"("createdAt");

-- CreateIndex
CREATE INDEX "ProformaInvoice_piNo_idx" ON "ProformaInvoice"("piNo");

-- CreateIndex
CREATE INDEX "ProformaInvoiceLineItem_piId_idx" ON "ProformaInvoiceLineItem"("piId");

-- CreateIndex
CREATE UNIQUE INDEX "ProformaInvoiceLineItem_piId_itemNo_key" ON "ProformaInvoiceLineItem"("piId", "itemNo");

-- AddForeignKey
ALTER TABLE "ProformaInvoice" ADD CONSTRAINT "ProformaInvoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProformaInvoice" ADD CONSTRAINT "ProformaInvoice_compositionId_fkey" FOREIGN KEY ("compositionId") REFERENCES "CompositionMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProformaInvoice" ADD CONSTRAINT "ProformaInvoice_preparedByEmployeeId_fkey" FOREIGN KEY ("preparedByEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProformaInvoice" ADD CONSTRAINT "ProformaInvoice_checkedByEmployeeId_fkey" FOREIGN KEY ("checkedByEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProformaInvoice" ADD CONSTRAINT "ProformaInvoice_accountantEmployeeId_fkey" FOREIGN KEY ("accountantEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProformaInvoice" ADD CONSTRAINT "ProformaInvoice_designerEmployeeId_fkey" FOREIGN KEY ("designerEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProformaInvoice" ADD CONSTRAINT "ProformaInvoice_authorisedByEmployeeId_fkey" FOREIGN KEY ("authorisedByEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProformaInvoiceLineItem" ADD CONSTRAINT "ProformaInvoiceLineItem_piId_fkey" FOREIGN KEY ("piId") REFERENCES "ProformaInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProformaInvoiceLineItem" ADD CONSTRAINT "ProformaInvoiceLineItem_compositionId_fkey" FOREIGN KEY ("compositionId") REFERENCES "CompositionMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;
