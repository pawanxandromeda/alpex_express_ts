-- Add compositionId foreign key to PurchaseOrder table
ALTER TABLE "PurchaseOrder" ADD COLUMN "compositionId" TEXT;

-- Add foreign key constraint
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_compositionId_fkey" FOREIGN KEY ("compositionId") REFERENCES "CompositionMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create index for better query performance
CREATE INDEX "PurchaseOrder_compositionId_idx" ON "PurchaseOrder"("compositionId");
