-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "gstNo" TEXT NOT NULL,
    "poNo" TEXT NOT NULL,
    "poDate" TIMESTAMP(3),
    "dispatchDate" TIMESTAMP(3),
    "brandName" TEXT,
    "partyName" TEXT,
    "batchNo" TEXT,
    "paymentTerms" TEXT,
    "invCha" TEXT,
    "cylChar" TEXT,
    "orderThrough" TEXT,
    "address" TEXT,
    "composition" TEXT,
    "notes" TEXT,
    "rmStatus" TEXT,
    "poQty" INTEGER,
    "poRate" DOUBLE PRECISION,
    "amount" DOUBLE PRECISION,
    "mrp" DOUBLE PRECISION,
    "section" TEXT,
    "tabletCapsuleDrySyrupBottle" TEXT,
    "roundOvalTablet" TEXT,
    "tabletColour" TEXT,
    "aluAluBlisterStripBottle" TEXT,
    "packStyle" TEXT,
    "productNewOld" TEXT,
    "qaObservations" TEXT,
    "batchQty" INTEGER,
    "expiry" TIMESTAMP(3),
    "pvcColourBase" TEXT,
    "foil" TEXT,
    "lotNo" TEXT,
    "foilPoDate" TIMESTAMP(3),
    "foilSize" TEXT,
    "foilPoVendor" TEXT,
    "foilBillDate" TIMESTAMP(3),
    "foilQuantity" INTEGER,
    "cartonPoDate" TIMESTAMP(3),
    "cartonPoVendor" TEXT,
    "cartonBillDate" TIMESTAMP(3),
    "cartonQuantity" INTEGER,
    "packingDate" TIMESTAMP(3),
    "qtyPacked" INTEGER,
    "noOfShippers" INTEGER,
    "design" TEXT,
    "overallStatus" TEXT NOT NULL DEFAULT 'Pending',
    "invoiceNo" TEXT,
    "invoiceDate" TIMESTAMP(3),
    "changePart" INTEGER,
    "cyc" INTEGER,
    "advance" DOUBLE PRECISION,
    "showStatus" TEXT NOT NULL DEFAULT 'Order Pending',
    "mdApproval" TEXT NOT NULL DEFAULT 'Pending',
    "accountsApproval" TEXT NOT NULL DEFAULT 'Pending',
    "designerApproval" TEXT NOT NULL DEFAULT 'Pending',
    "ppicApproval" TEXT NOT NULL DEFAULT 'Pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_poNo_key" ON "PurchaseOrder"("poNo");

-- CreateIndex
CREATE INDEX "PurchaseOrder_gstNo_idx" ON "PurchaseOrder"("gstNo");

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_gstNo_fkey" FOREIGN KEY ("gstNo") REFERENCES "Customer"("gstrNo") ON DELETE RESTRICT ON UPDATE CASCADE;
