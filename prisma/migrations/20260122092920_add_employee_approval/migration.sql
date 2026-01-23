-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "approvalStatus" TEXT NOT NULL DEFAULT 'Pending',
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "rejectionReason" TEXT;
