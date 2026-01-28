/*
  Warnings:

  - You are about to drop the column `customerID` on the `Customer` table. All the data in the column will be lost.
  - Made the column `paymentTerms` on table `Customer` required. This step will fail if there are existing NULL values in that column.
  - Made the column `throughVia` on table `Customer` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "Customer_customerID_key";

-- AlterTable
ALTER TABLE "Customer" DROP COLUMN "customerID",
ALTER COLUMN "address" DROP DEFAULT,
ALTER COLUMN "paymentTerms" SET NOT NULL,
ALTER COLUMN "paymentTerms" DROP DEFAULT,
ALTER COLUMN "throughVia" SET NOT NULL,
ALTER COLUMN "throughVia" DROP DEFAULT,
ALTER COLUMN "kycProfile" DROP DEFAULT,
ALTER COLUMN "contactName" DROP DEFAULT,
ALTER COLUMN "contactPhone" DROP DEFAULT,
ALTER COLUMN "creditApprovalStatus" SET DEFAULT 'Pending';
