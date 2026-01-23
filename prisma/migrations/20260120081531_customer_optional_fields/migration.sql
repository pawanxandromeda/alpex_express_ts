/*
  Warnings:

  - A unique constraint covering the columns `[customerID]` on the table `Customer` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "customerID" TEXT,
ALTER COLUMN "address" SET DEFAULT '',
ALTER COLUMN "paymentTerms" DROP NOT NULL,
ALTER COLUMN "paymentTerms" SET DEFAULT '',
ALTER COLUMN "throughVia" DROP NOT NULL,
ALTER COLUMN "throughVia" SET DEFAULT '',
ALTER COLUMN "kycProfile" SET DEFAULT '',
ALTER COLUMN "contactName" SET DEFAULT '',
ALTER COLUMN "contactPhone" SET DEFAULT '',
ALTER COLUMN "creditApprovalStatus" SET DEFAULT 'Approved';

-- CreateIndex
CREATE UNIQUE INDEX "Customer_customerID_key" ON "Customer"("customerID");
