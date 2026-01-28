-- AlterTable
ALTER TABLE "PurchaseOrder" ADD COLUMN     "cartonQuantityOrdered" INTEGER,
ADD COLUMN     "dispatchStatus" TEXT DEFAULT 'Pending',
ADD COLUMN     "foilQuantityOrdered" INTEGER,
ADD COLUMN     "timestamp" JSONB;
