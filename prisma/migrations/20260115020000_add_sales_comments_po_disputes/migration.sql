-- Add salesComments and poDisputes columns to PurchaseOrder
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "salesComments" TEXT;
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "poDisputes" JSONB;