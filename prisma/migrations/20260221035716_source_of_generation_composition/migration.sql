-- CreateEnum
CREATE TYPE "CompositionSource" AS ENUM ('PPIC_BULK_IMPORT', 'COMPOSITION_BULK_IMPORT', 'MANUAL');

-- AlterTable
ALTER TABLE "CompositionMaster" ADD COLUMN     "source" "CompositionSource" NOT NULL DEFAULT 'MANUAL';

-- CreateIndex
CREATE INDEX "CompositionMaster_composition_idx" ON "CompositionMaster"("composition");

-- CreateIndex
CREATE INDEX "CompositionMaster_source_idx" ON "CompositionMaster"("source");
