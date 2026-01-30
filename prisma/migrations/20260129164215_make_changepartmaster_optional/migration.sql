/*
  Warnings:

  - You are about to drop the column `tabSizeRange` on the `ChangePartMaster` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ChangePartMaster" DROP COLUMN "tabSizeRange",
ADD COLUMN     "range" TEXT,
ADD COLUMN     "tabSize" TEXT,
ALTER COLUMN "partPictureUrl" DROP NOT NULL,
ALTER COLUMN "code" DROP NOT NULL,
ALTER COLUMN "boxSizeAutoCalculated" DROP NOT NULL,
ALTER COLUMN "cartonRates" DROP NOT NULL,
ALTER COLUMN "baseFoilConsumption" DROP NOT NULL,
ALTER COLUMN "printedFoilConsumption" DROP NOT NULL,
ALTER COLUMN "foilSize" DROP NOT NULL;
