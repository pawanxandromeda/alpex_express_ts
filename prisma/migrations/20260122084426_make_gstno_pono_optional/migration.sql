-- DropForeignKey
ALTER TABLE "PurchaseOrder" DROP CONSTRAINT "PurchaseOrder_gstNo_fkey";

-- AlterTable
ALTER TABLE "PurchaseOrder" ADD COLUMN     "customerId" TEXT,
ALTER COLUMN "gstNo" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "PurchaseOrder_customerId_idx" ON "PurchaseOrder"("customerId");

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
