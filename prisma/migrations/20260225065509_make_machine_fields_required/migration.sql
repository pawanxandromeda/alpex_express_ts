/*
  Warnings:

  - Made the column `serialNumber` on table `Machine` required. This step will fail if there are existing NULL values in that column.
  - Made the column `supplier` on table `Machine` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Machine" ADD COLUMN     "capacity" TEXT,
ALTER COLUMN "serialNumber" SET NOT NULL,
ALTER COLUMN "department" DROP NOT NULL,
ALTER COLUMN "supplier" SET NOT NULL;
