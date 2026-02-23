/*
  Warnings:

  - You are about to drop the column `compositionRaw` on the `PurchaseOrder` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "PurchaseOrder" DROP COLUMN "compositionRaw",
ADD COLUMN     "composition" TEXT;
