-- CreateTable
CREATE TABLE "ChangePartMaster" (
    "id" TEXT NOT NULL,
    "partPictureUrl" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "boxSizeAutoCalculated" BOOLEAN NOT NULL,
    "cartonRates" DECIMAL(65,30) NOT NULL,
    "baseFoilConsumption" DECIMAL(65,30) NOT NULL,
    "printedFoilConsumption" DECIMAL(65,30) NOT NULL,
    "tabSizeRange" TEXT NOT NULL,
    "foilSize" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChangePartMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompositionMaster" (
    "id" TEXT NOT NULL,
    "composition" TEXT NOT NULL,
    "formType" TEXT NOT NULL,
    "packingType" TEXT NOT NULL,
    "layerType" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "flavor" TEXT NOT NULL,
    "coating" TEXT NOT NULL,
    "changePartOptions" TEXT[],
    "shelfLifeMonths" INTEGER NOT NULL,
    "reviewApiMaster" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompositionMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiMaster" (
    "id" TEXT NOT NULL,
    "rmActive" TEXT NOT NULL,
    "factorCalculation" TEXT NOT NULL,
    "finalKg" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiMaster_pkey" PRIMARY KEY ("id")
);
