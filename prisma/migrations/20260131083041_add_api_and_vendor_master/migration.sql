/*
  Warnings:

  - You are about to drop the column `factorCalculation` on the `ApiMaster` table. All the data in the column will be lost.
  - You are about to drop the column `finalKg` on the `ApiMaster` table. All the data in the column will be lost.
  - You are about to drop the column `rmActive` on the `ApiMaster` table. All the data in the column will be lost.
  - Added the required column `drugName` to the `ApiMaster` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ApiMaster" DROP COLUMN "factorCalculation",
DROP COLUMN "finalKg",
DROP COLUMN "rmActive",
ADD COLUMN     "drugName" TEXT NOT NULL,
ADD COLUMN     "drugQuantity" TEXT;

-- CreateTable
CREATE TABLE "VendorMaster" (
    "id" TEXT NOT NULL,
    "vendorName" TEXT NOT NULL,
    "vendorCode" TEXT,
    "contactPerson" TEXT,
    "vendorEmail" TEXT,
    "vendorPhone" TEXT,
    "vendorAdress" TEXT,
    "vendorState" TEXT,
    "vendorGSTNo" TEXT,
    "paymentTerms" TEXT,
    "vendorBankName" TEXT,
    "vendorAccountNumber" TEXT,
    "vendorIFSC" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorMaster_pkey" PRIMARY KEY ("id")
);
