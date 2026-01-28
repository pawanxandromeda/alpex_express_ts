-- AlterTable
ALTER TABLE "Customer" ALTER COLUMN "creditLimit" SET DEFAULT 0,
ALTER COLUMN "kycProfile" DROP NOT NULL,
ALTER COLUMN "contactName" DROP NOT NULL,
ALTER COLUMN "contactPhone" DROP NOT NULL,
ALTER COLUMN "creditApprovalStatus" SET DEFAULT 'Pending';
