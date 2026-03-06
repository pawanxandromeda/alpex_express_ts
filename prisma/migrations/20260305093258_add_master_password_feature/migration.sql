-- CreateTable
CREATE TABLE "MasterPassword" (
    "id" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdByEmployeeId" TEXT NOT NULL,
    "updatedByEmployeeId" TEXT,
    "lastUsedAt" TIMESTAMP(3),
    "numberOfUses" INTEGER NOT NULL DEFAULT 0,
    "lastUsedByEmployeeId" TEXT,
    "lastAccessedEmployeeId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterPassword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterPasswordUsageLog" (
    "id" TEXT NOT NULL,
    "masterPasswordId" TEXT NOT NULL,
    "usedByEmployeeId" TEXT NOT NULL,
    "accessedEmployeeId" TEXT,
    "accessedEmployeeName" TEXT,
    "action" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "reason" TEXT,
    "accessGranted" BOOLEAN NOT NULL DEFAULT true,
    "failureReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MasterPasswordUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MasterPasswordUsageLog_masterPasswordId_idx" ON "MasterPasswordUsageLog"("masterPasswordId");

-- CreateIndex
CREATE INDEX "MasterPasswordUsageLog_usedByEmployeeId_idx" ON "MasterPasswordUsageLog"("usedByEmployeeId");

-- CreateIndex
CREATE INDEX "MasterPasswordUsageLog_accessedEmployeeId_idx" ON "MasterPasswordUsageLog"("accessedEmployeeId");

-- CreateIndex
CREATE INDEX "MasterPasswordUsageLog_createdAt_idx" ON "MasterPasswordUsageLog"("createdAt");

-- CreateIndex
CREATE INDEX "MasterPasswordUsageLog_action_idx" ON "MasterPasswordUsageLog"("action");

-- AddForeignKey
ALTER TABLE "MasterPassword" ADD CONSTRAINT "MasterPassword_createdByEmployeeId_fkey" FOREIGN KEY ("createdByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasterPassword" ADD CONSTRAINT "MasterPassword_updatedByEmployeeId_fkey" FOREIGN KEY ("updatedByEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasterPasswordUsageLog" ADD CONSTRAINT "MasterPasswordUsageLog_masterPasswordId_fkey" FOREIGN KEY ("masterPasswordId") REFERENCES "MasterPassword"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasterPasswordUsageLog" ADD CONSTRAINT "MasterPasswordUsageLog_usedByEmployeeId_fkey" FOREIGN KEY ("usedByEmployeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
