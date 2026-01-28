-- CreateEnum
CREATE TYPE "CredentialApprovalStatus" AS ENUM ('Pending', 'Approved');

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "approvedForCredentials" "CredentialApprovalStatus" NOT NULL DEFAULT 'Pending';
