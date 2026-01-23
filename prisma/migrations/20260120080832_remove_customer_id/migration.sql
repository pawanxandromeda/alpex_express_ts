/*
  Warnings:

  - You are about to drop the column `customerID` on the `Customer` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Customer_customerID_idx";

-- AlterTable
ALTER TABLE "Customer" DROP COLUMN "customerID";
