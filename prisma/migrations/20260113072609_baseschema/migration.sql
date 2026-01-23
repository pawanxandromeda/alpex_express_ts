-- CreateEnum
CREATE TYPE "Status" AS ENUM ('Active', 'Inactive');

-- CreateEnum
CREATE TYPE "ShiftType" AS ENUM ('Day', 'Night', 'Rotational');

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "authorization" TEXT NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'Inactive',
    "refreshToken" TEXT,
    "name" TEXT NOT NULL DEFAULT 'Nil',
    "designation" TEXT NOT NULL DEFAULT 'Nil',
    "department" TEXT NOT NULL DEFAULT 'Nil',
    "ctc" DOUBLE PRECISION,
    "esic" DOUBLE PRECISION,
    "pf" DOUBLE PRECISION,
    "shiftType" "ShiftType" NOT NULL DEFAULT 'Day',
    "joiningDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "employmentHistory" TEXT[],
    "resume" TEXT DEFAULT 'Nil',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "customerID" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "creditLimit" DOUBLE PRECISION NOT NULL,
    "paymentTerms" TEXT NOT NULL,
    "throughVia" TEXT NOT NULL,
    "gstrNo" TEXT NOT NULL,
    "kycProfile" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "contactEmail" TEXT,
    "remarks" TEXT,
    "relationshipStatus" TEXT,
    "gstCopy" TEXT,
    "dlExpiry" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_username_key" ON "Employee"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_gstrNo_key" ON "Customer"("gstrNo");

-- CreateIndex
CREATE INDEX "Customer_customerID_idx" ON "Customer"("customerID");
