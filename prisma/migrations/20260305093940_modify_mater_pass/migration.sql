/*
  Warnings:

  - You are about to drop the `MasterPassword` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MasterPasswordUsageLog` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "MasterPassword" DROP CONSTRAINT "MasterPassword_createdByEmployeeId_fkey";

-- DropForeignKey
ALTER TABLE "MasterPassword" DROP CONSTRAINT "MasterPassword_updatedByEmployeeId_fkey";

-- DropForeignKey
ALTER TABLE "MasterPasswordUsageLog" DROP CONSTRAINT "MasterPasswordUsageLog_masterPasswordId_fkey";

-- DropForeignKey
ALTER TABLE "MasterPasswordUsageLog" DROP CONSTRAINT "MasterPasswordUsageLog_usedByEmployeeId_fkey";

-- DropTable
DROP TABLE "MasterPassword";

-- DropTable
DROP TABLE "MasterPasswordUsageLog";
