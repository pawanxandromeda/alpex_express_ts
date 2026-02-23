/*
  Warnings:

  - You are about to drop the column `composition` on the `PurchaseOrder` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Employee_canLogin_idx";

-- AlterTable
ALTER TABLE "PurchaseOrder" DROP COLUMN "composition",
ADD COLUMN     "compositionRaw" TEXT;
