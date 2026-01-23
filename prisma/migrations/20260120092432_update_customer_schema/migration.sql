-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "drugLicense" TEXT,
ALTER COLUMN "throughVia" DROP NOT NULL;
