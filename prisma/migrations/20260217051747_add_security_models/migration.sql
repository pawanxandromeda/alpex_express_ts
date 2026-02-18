-- CreateEnum
CREATE TYPE "LoginAttemptStatus" AS ENUM ('Success', 'Failed', 'Blocked');

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "employeeId" TEXT,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT,
    "status" "LoginAttemptStatus" NOT NULL DEFAULT 'Failed',
    "failureReason" TEXT,
    "deviceInfo" JSONB,
    "location" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionId" TEXT,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockedIP" (
    "id" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "reason" TEXT,
    "blockedBy" TEXT NOT NULL,
    "autoBlocked" BOOLEAN NOT NULL DEFAULT false,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "blockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unblockedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,

    CONSTRAINT "BlockedIP_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityPolicy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "maxLoginAttemptsPerIp" INTEGER NOT NULL DEFAULT 5,
    "maxLoginAttemptsPerUsername" INTEGER NOT NULL DEFAULT 10,
    "loginAttemptWindowMinutes" INTEGER NOT NULL DEFAULT 15,
    "accountLockoutDurationMinutes" INTEGER NOT NULL DEFAULT 30,
    "ipBlockDurationMinutes" INTEGER NOT NULL DEFAULT 60,
    "requireMfa" BOOLEAN NOT NULL DEFAULT false,
    "requireStrongPassword" BOOLEAN NOT NULL DEFAULT true,
    "passwordMinLength" INTEGER NOT NULL DEFAULT 8,
    "passwordRequireNumbers" BOOLEAN NOT NULL DEFAULT true,
    "passwordRequireSpecialChars" BOOLEAN NOT NULL DEFAULT true,
    "passwordRequireUpperCase" BOOLEAN NOT NULL DEFAULT true,
    "passwordExpiryDays" INTEGER NOT NULL DEFAULT 90,
    "sessionTimeoutMinutes" INTEGER NOT NULL DEFAULT 30,
    "enableIpWhitelisting" BOOLEAN NOT NULL DEFAULT false,
    "enableGeoRestriction" BOOLEAN NOT NULL DEFAULT false,
    "allowedCountries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "suspiciousActivityAlert" BOOLEAN NOT NULL DEFAULT true,
    "logAllAttempts" BOOLEAN NOT NULL DEFAULT true,
    "enableAnomalyDetection" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecurityPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountLockout" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedUntil" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "failedAttempts" INTEGER NOT NULL,
    "unlockToken" TEXT,
    "unlockedAt" TIMESTAMP(3),
    "unlockedBy" TEXT,

    CONSTRAINT "AccountLockout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityAuditLog" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT,
    "action" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'Info',
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoginAttempt_username_idx" ON "LoginAttempt"("username");

-- CreateIndex
CREATE INDEX "LoginAttempt_employeeId_idx" ON "LoginAttempt"("employeeId");

-- CreateIndex
CREATE INDEX "LoginAttempt_ipAddress_idx" ON "LoginAttempt"("ipAddress");

-- CreateIndex
CREATE INDEX "LoginAttempt_status_idx" ON "LoginAttempt"("status");

-- CreateIndex
CREATE INDEX "LoginAttempt_timestamp_idx" ON "LoginAttempt"("timestamp");

-- CreateIndex
CREATE INDEX "LoginAttempt_email_idx" ON "LoginAttempt"("email");

-- CreateIndex
CREATE UNIQUE INDEX "BlockedIP_ipAddress_key" ON "BlockedIP"("ipAddress");

-- CreateIndex
CREATE INDEX "BlockedIP_ipAddress_idx" ON "BlockedIP"("ipAddress");

-- CreateIndex
CREATE INDEX "BlockedIP_isActive_idx" ON "BlockedIP"("isActive");

-- CreateIndex
CREATE INDEX "BlockedIP_blockedAt_idx" ON "BlockedIP"("blockedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SecurityPolicy_name_key" ON "SecurityPolicy"("name");

-- CreateIndex
CREATE INDEX "SecurityPolicy_name_idx" ON "SecurityPolicy"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AccountLockout_employeeId_key" ON "AccountLockout"("employeeId");

-- CreateIndex
CREATE INDEX "AccountLockout_employeeId_idx" ON "AccountLockout"("employeeId");

-- CreateIndex
CREATE INDEX "AccountLockout_lockedUntil_idx" ON "AccountLockout"("lockedUntil");

-- CreateIndex
CREATE INDEX "AccountLockout_unlockedAt_idx" ON "AccountLockout"("unlockedAt");

-- CreateIndex
CREATE INDEX "SecurityAuditLog_employeeId_idx" ON "SecurityAuditLog"("employeeId");

-- CreateIndex
CREATE INDEX "SecurityAuditLog_action_idx" ON "SecurityAuditLog"("action");

-- CreateIndex
CREATE INDEX "SecurityAuditLog_severity_idx" ON "SecurityAuditLog"("severity");

-- CreateIndex
CREATE INDEX "SecurityAuditLog_timestamp_idx" ON "SecurityAuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "SecurityAuditLog_ipAddress_idx" ON "SecurityAuditLog"("ipAddress");

-- AddForeignKey
ALTER TABLE "LoginAttempt" ADD CONSTRAINT "LoginAttempt_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountLockout" ADD CONSTRAINT "AccountLockout_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityAuditLog" ADD CONSTRAINT "SecurityAuditLog_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
