-- AlterTable
ALTER TABLE "PurchaseOrder" ADD COLUMN     "isCancelled" BOOLEAN DEFAULT false,
ADD COLUMN     "isRFD" BOOLEAN DEFAULT false;
