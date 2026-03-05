-- AlterTable
ALTER TABLE "ProformaInvoice" ADD COLUMN     "clientPayableCharges" TEXT,
ADD COLUMN     "companyChargesQuantity" TEXT,
ADD COLUMN     "cycChargesQuantity" TEXT;

-- AlterTable
ALTER TABLE "PurchaseOrder" ADD COLUMN     "clientPayableCharges" TEXT,
ADD COLUMN     "companyChargesQuantity" TEXT,
ADD COLUMN     "cycChargesQuantity" TEXT;
