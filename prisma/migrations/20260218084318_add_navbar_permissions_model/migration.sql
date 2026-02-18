-- CreateTable
CREATE TABLE "NavbarPermission" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "allowedMenuItems" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NavbarPermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NavbarPermission_employeeId_key" ON "NavbarPermission"("employeeId");

-- CreateIndex
CREATE INDEX "NavbarPermission_employeeId_idx" ON "NavbarPermission"("employeeId");

-- CreateIndex
CREATE INDEX "NavbarPermission_createdAt_idx" ON "NavbarPermission"("createdAt");

-- AddForeignKey
ALTER TABLE "NavbarPermission" ADD CONSTRAINT "NavbarPermission_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
