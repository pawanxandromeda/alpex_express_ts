/*
  Warnings:

  - You are about to drop the column `reviewApiMaster` on the `CompositionMaster` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CompositionMaster" DROP COLUMN "reviewApiMaster",
ADD COLUMN     "review" TEXT,
ALTER COLUMN "composition" DROP NOT NULL,
ALTER COLUMN "formType" DROP NOT NULL,
ALTER COLUMN "packingType" DROP NOT NULL,
ALTER COLUMN "layerType" DROP NOT NULL,
ALTER COLUMN "color" DROP NOT NULL,
ALTER COLUMN "flavor" DROP NOT NULL,
ALTER COLUMN "coating" DROP NOT NULL,
ALTER COLUMN "changePartOptions" SET DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "shelfLifeMonths" DROP NOT NULL;
