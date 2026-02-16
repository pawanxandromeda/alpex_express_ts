-- DropForeignKey
ALTER TABLE "Lead" DROP CONSTRAINT "Lead_assignedToEmployeeId_fkey";

-- AlterTable
ALTER TABLE "Lead" ALTER COLUMN "assignedToEmployeeId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_assignedToEmployeeId_fkey" FOREIGN KEY ("assignedToEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
