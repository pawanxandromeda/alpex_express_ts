import prisma from "../../config/postgres";
import { logAction } from "../../common/utils/logger";


// ============ LOGIN ATTEMPT TRACKING ============

/**
 * Record a login attempt in the database
 */
export const recordLoginAttempt = async (
  username: string,
  ipAddress: string,
  userAgent?: string,
  status: "Success" | "Failed" | "Blocked" = "Failed",
  failureReason?: string,
  employeeId?: string,
  deviceInfo?: any
) => {
  const employee = await prisma.employee.findUnique({
    where: { username },
    select: { id: true, email: true },
  });

  return await prisma.loginAttempt.create({
    data: {
      username,
      email: employee?.email,
      employeeId: employee?.id || employeeId,
      ipAddress,
      userAgent,
      status,
      failureReason,
      deviceInfo,
      timestamp: new Date(),
    },
  });
};

/**
 * Get failed login attempts for a username within a time window
 */
export const getFailedAttempts = async (
  identifier: string, // username or email
  identifier_type: "username" | "email" = "username",
  windowMinutes: number = 15
) => {
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

  return await prisma.loginAttempt.findMany({
    where: {
      [identifier_type]: identifier,
      status: "Failed",
      timestamp: { gte: windowStart },
    },
    orderBy: { timestamp: "desc" },
  });
};

/**
 * Get failed attempts from an IP address
 */
export const getFailedAttemptsFromIP = async (
  ipAddress: string,
  windowMinutes: number = 15
) => {
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

  return await prisma.loginAttempt.findMany({
    where: {
      ipAddress,
      status: "Failed",
      timestamp: { gte: windowStart },
    },
    orderBy: { timestamp: "desc" },
  });
};

/**
 * Check if IP is blocked
 */
export const isIPBlocked = async (ipAddress: string): Promise<boolean> => {
  const blockedIP = await prisma.blockedIP.findUnique({
    where: { ipAddress },
  });

  if (!blockedIP) return false;
  if (!blockedIP.isActive) return false;

  // Check if unblock time has passed
  if (blockedIP.unblockedAt && new Date() > blockedIP.unblockedAt) {
    await prisma.blockedIP.update({
      where: { ipAddress },
      data: { isActive: false },
    });
    return false;
  }

  return true;
};

/**
 * Check if account is locked
 */
export const isAccountLocked = async (employeeId: string): Promise<boolean> => {
  const lockout = await prisma.accountLockout.findUnique({
    where: { employeeId },
  });

  if (!lockout) return false;

  // Check if lockout period has expired
  if (new Date() > lockout.lockedUntil && !lockout.unlockedAt) {
    // Auto-unlock after lockout duration expires
    await prisma.accountLockout.update({
      where: { employeeId },
      data: { unlockedAt: new Date(), unlockedBy: "auto" },
    });
    return false;
  }

  // Check if already unlocked
  if (lockout.unlockedAt) return false;

  return true;
};

/**
 * Block an IP address
 */
export const blockIP = async (
  ipAddress: string,
  blockedBy: string,
  reason?: string,
  autoBlocked: boolean = true,
  attemptCount: number = 0
) => {
  const security = await getSecurityPolicy();
  const unlockTime = new Date(Date.now() + security.ipBlockDurationMinutes * 60 * 1000);

  const blocked = await prisma.blockedIP.upsert({
    where: { ipAddress },
    create: {
      ipAddress,
      reason,
      blockedBy,
      autoBlocked,
      attemptCount,
      isActive: true,
      unblockedAt: unlockTime,
    },
    update: {
      reason,
      blockedBy,
      autoBlocked,
      attemptCount,
      isActive: true,
      blockedAt: new Date(),
      unblockedAt: unlockTime,
    },
  });

  // Log security audit
  await createSecurityAuditLog(
    undefined,
    "IP_BLOCKED",
    ipAddress,
    "Critical",
    `IP address blocked after ${attemptCount} failed login attempts. Reason: ${reason || "Multiple failed login attempts"}`,
    { autoBlocked, attemptCount }
  );

  return blocked;
};

/**
 * Unblock an IP address
 */
export const unblockIP = async (ipAddress: string, unblockedBy: string) => {
  const blocked = await prisma.blockedIP.update({
    where: { ipAddress },
    data: {
      isActive: false,
      unblockedAt: new Date(),
    },
  });

  await createSecurityAuditLog(
    undefined,
    "IP_UNBLOCKED",
    ipAddress,
    "Warning",
    `IP address unblocked by admin: ${unblockedBy}`
  );

  return blocked;
};

/**
 * Lock an employee account after multiple failed attempts
 */
export const lockEmployeeAccount = async (
  employeeId: string,
  failedAttempts: number,
  reason: string
) => {
  const security = await getSecurityPolicy();
  const lockoutUntil = new Date(
    Date.now() + security.accountLockoutDurationMinutes * 60 * 1000
  );

  const lockout = await prisma.accountLockout.upsert({
    where: { employeeId },
    create: {
      employeeId,
      lockedUntil: lockoutUntil,
      reason,
      failedAttempts,
    },
    update: {
      lockedUntil: lockoutUntil,
      failedAttempts,
      reason,
      unlockedAt: null,
      unlockedBy: null,
    },
  });

  // Get employee for logging
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { username: true, email: true },
  });

  await createSecurityAuditLog(
    employeeId,
    "ACCOUNT_LOCKED",
    undefined,
    "Critical",
    `Account locked after ${failedAttempts} failed login attempts. Reason: ${reason}`,
    { failedAttempts, reason, username: employee?.username }
  );

  return lockout;
};

/**
 * Unlock an employee account
 */
export const unlockEmployeeAccount = async (employeeId: string, unlockedBy: string) => {
  const lockout = await prisma.accountLockout.update({
    where: { employeeId },
    data: {
      unlockedAt: new Date(),
      unlockedBy,
    },
  });

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { username: true, email: true },
  });

  await createSecurityAuditLog(
    employeeId,
    "ACCOUNT_UNLOCKED",
    undefined,
    "Warning",
    `Account unlocked by admin: ${unlockedBy}`,
    { unlockedBy, username: employee?.username }
  );

  return lockout;
};

/**
 * Create security audit log
 */
export const createSecurityAuditLog = async (
  employeeId: string | undefined,
  action: string,
  ipAddress?: string,
  severity: string = "Info",
  description: string = "",
  metadata?: any
) => {
  return await prisma.securityAuditLog.create({
    data: {
      employeeId: employeeId || undefined,
      action,
      ipAddress,
      severity,
      description,
      metadata,
      timestamp: new Date(),
    },
  });
};

// ============ SECURITY POLICY MANAGEMENT ============

/**
 * Get the default/active security policy
 */
export const getSecurityPolicy = async () => {
  let policy = await prisma.securityPolicy.findUnique({
    where: { name: "default" },
  });

  if (!policy) {
    // Create default policy if it doesn't exist
    policy = await prisma.securityPolicy.create({
      data: {
        name: "default",
        maxLoginAttemptsPerIp: 5,
        maxLoginAttemptsPerUsername: 10,
        loginAttemptWindowMinutes: 15,
        accountLockoutDurationMinutes: 30,
        ipBlockDurationMinutes: 60,
        requireMfa: false,
        requireStrongPassword: true,
        passwordMinLength: 8,
        passwordRequireNumbers: true,
        passwordRequireSpecialChars: true,
        passwordRequireUpperCase: true,
        passwordExpiryDays: 90,
        sessionTimeoutMinutes: 30,
        enableIpWhitelisting: false,
        enableGeoRestriction: false,
        suspiciousActivityAlert: true,
        logAllAttempts: true,
        enableAnomalyDetection: true,
      },
    });
  }

  return policy;
};

/**
 * Update security policy
 */
export const updateSecurityPolicy = async (
  policyId: string,
  updates: any
) => {
  const policy = await prisma.securityPolicy.update({
    where: { id: policyId },
    data: updates,
  });

  await createSecurityAuditLog(
    undefined,
    "SECURITY_POLICY_UPDATED",
    undefined,
    "Warning",
    "Security policy has been updated",
    { policyId, updates }
  );

  return policy;
};

// ============ BRUTE FORCE DETECTION & PREVENTION ============

/**
 * Check for brute force attack and apply protection
 */
export const checkAndApplyBruteForceProtection = async (
  username: string,
  ipAddress: string
): Promise<{
  allowed: boolean;
  reason?: string;
  action?: string;
}> => {
  const security = await getSecurityPolicy();

  // Check if IP is blocked
  const ipBlocked = await isIPBlocked(ipAddress);
  if (ipBlocked) {
    return {
      allowed: false,
      reason: "IP_BLOCKED",
      action: "This IP address has been blocked due to multiple failed login attempts",
    };
  }

  // Get employee to check account lockout
  const employee = await prisma.employee.findUnique({
    where: { username },
    select: { id: true },
  });

  if (employee) {
    const accountLocked = await isAccountLocked(employee.id);
    if (accountLocked) {
      return {
        allowed: false,
        reason: "ACCOUNT_LOCKED",
        action: "Your account has been locked due to multiple failed login attempts",
      };
    }
  }

  // Check failed attempts from IP
  const failedFromIP = await getFailedAttemptsFromIP(ipAddress, security.loginAttemptWindowMinutes);
  if (failedFromIP.length >= security.maxLoginAttemptsPerIp) {
    // Block this IP
    await blockIP(
      ipAddress,
      "system",
      `Auto-blocked after ${failedFromIP.length} failed attempts`,
      true,
      failedFromIP.length
    );

    return {
      allowed: false,
      reason: "IP_BLOCKED",
      action: "Too many failed login attempts from your IP address. Please try again later.",
    };
  }

  // Check failed attempts for username
  if (employee) {
    const failedFromUsername = await getFailedAttempts(username, "username", security.loginAttemptWindowMinutes);
    if (failedFromUsername.length >= security.maxLoginAttemptsPerUsername) {
      // Lock account
      await lockEmployeeAccount(
        employee.id,
        failedFromUsername.length,
        `Auto-locked after ${failedFromUsername.length} failed attempts`
      );

      return {
        allowed: false,
        reason: "ACCOUNT_LOCKED",
        action: "Too many failed login attempts. Your account has been locked.",
      };
    }
  }

  return { allowed: true };
};

// ============ LOGIN ATTEMPT STATISTICS & REPORTING ============

/**
 * Get login attempt statistics
 */
export const getLoginAttemptStatistics = async (
  startDate?: Date,
  endDate?: Date,
  limit: number = 100
) => {
  const where: any = {};
  if (startDate || endDate) {
    where.timestamp = {};
    if (startDate) where.timestamp.gte = startDate;
    if (endDate) where.timestamp.lte = endDate;
  }

  const attempts = await prisma.loginAttempt.findMany({
    where,
    orderBy: { timestamp: "desc" },
    take: limit,
    include: {
      employee: {
        select: { id: true, username: true, name: true, email: true },
      },
    },
  });

  const successCount = attempts.filter((a) => a.status === "Success").length;
  const failedCount = attempts.filter((a) => a.status === "Failed").length;
  const blockedCount = attempts.filter((a) => a.status === "Blocked").length;

  return {
    totalAttempts: attempts.length,
    successCount,
    failedCount,
    blockedCount,
    successRate: attempts.length > 0 ? (successCount / attempts.length) * 100 : 0,
    attempts,
  };
};

/**
 * Get detailed login attempt report for an employee
 */
export const getEmployeeLoginReport = async (
  employeeId: string,
  days: number = 30
) => {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const attempts = await prisma.loginAttempt.findMany({
    where: {
      employeeId,
      timestamp: { gte: startDate },
    },
    orderBy: { timestamp: "desc" },
  });

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
    },
  });

  const lockouts = await prisma.accountLockout.findUnique({
    where: { employeeId },
  });

  return {
    employee,
    totalAttempts: attempts.length,
    successCount: attempts.filter((a) => a.status === "Success").length,
    failedCount: attempts.filter((a) => a.status === "Failed").length,
    lastAttempt: attempts[0] || null,
    lastSuccessfulLogin: attempts.find((a) => a.status === "Success") || null,
    attempts,
    accountLockout: lockouts,
  };
};

/**
 * Get IP reputation and activity
 */
export const getIPReputation = async (ipAddress: string) => {
  const attempts = await prisma.loginAttempt.findMany({
    where: { ipAddress },
    orderBy: { timestamp: "desc" },
    take: 100,
  });

  const blockedRecord = await prisma.blockedIP.findUnique({
    where: { ipAddress },
  });

  const uniqueUsernames = new Set(attempts.map((a) => a.username)).size;
  const successCount = attempts.filter((a) => a.status === "Success").length;
  const failedCount = attempts.filter((a) => a.status === "Failed").length;
  const blockedCount = attempts.filter((a) => a.status === "Blocked").length;

  return {
    ipAddress,
    totalAttempts: attempts.length,
    uniqueUsernames,
    successCount,
    failedCount,
    blockedCount,
    isCurrentlyBlocked: blockedRecord?.isActive || false,
    blockedRecord,
    attempts,
  };
};

/**
 * Get security audit logs with filtering
 */
export const getSecurityAuditLogs = async (
  filters?: {
    employeeId?: string;
    action?: string;
    severity?: string;
    startDate?: Date;
    endDate?: Date;
  },
  limit: number = 100
) => {
  const where: any = {};

  if (filters?.employeeId) where.employeeId = filters.employeeId;
  if (filters?.action) where.action = filters.action;
  if (filters?.severity) where.severity = filters.severity;

  if (filters?.startDate || filters?.endDate) {
    where.timestamp = {};
    if (filters?.startDate) where.timestamp.gte = filters.startDate;
    if (filters?.endDate) where.timestamp.lte = filters.endDate;
  }

  return await prisma.securityAuditLog.findMany({
    where,
    orderBy: { timestamp: "desc" },
    take: limit,
    include: {
      employee: {
        select: { id: true, username: true, name: true, email: true },
      },
    },
  });
};

/**
 * Get suspicious activity alerts
 */
export const getSuspiciousActivity = async (
  hoursBack: number = 24,
  limit: number = 50
) => {
  const startTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

  // Multiple failed attempts from same IP
  const failedAttemptsByIP = await prisma.loginAttempt.groupBy({
    by: ["ipAddress"],
    where: {
      status: "Failed",
      timestamp: { gte: startTime },
    },
    _count: {
      id: true,
    },
    having: {
      id: {
        _count: {
          gt: 3,
        },
      },
    },
  });

  // Multiple failed attempts for same username
  const failedAttemptsByUsername = await prisma.loginAttempt.groupBy({
    by: ["username"],
    where: {
      status: "Failed",
      timestamp: { gte: startTime },
    },
    _count: {
      id: true,
    },
    having: {
      id: {
        _count: {
          gt: 3,
        },
      },
    },
  });

  // Recently blocked IPs
  const blockedIPs = await prisma.blockedIP.findMany({
    where: {
      blockedAt: { gte: startTime },
      isActive: true,
    },
    orderBy: { blockedAt: "desc" },
  });

  // Recently locked accounts
  const lockedAccounts = await prisma.accountLockout.findMany({
    where: {
      lockedAt: { gte: startTime },
      unlockedAt: null,
    },
    include: {
      employee: {
        select: { id: true, username: true, name: true, email: true },
      },
    },
    orderBy: { lockedAt: "desc" },
  });

  return {
    suspiciousIPAddresses: failedAttemptsByIP,
    suspiciousUsernames: failedAttemptsByUsername,
    recentlyBlockedIPs: blockedIPs,
    recentlyLockedAccounts: lockedAccounts,
  };
};

/**
 * Generate security report
 */
export const generateSecurityReport = async (startDate: Date, endDate: Date) => {
  const loginStats = await getLoginAttemptStatistics(startDate, endDate, 10000);
  const suspiciousActivity = await getSuspiciousActivity(
    Math.ceil((Date.now() - startDate.getTime()) / (1000 * 60 * 60))
  );
  const auditLogs = await getSecurityAuditLogs(
    {
      startDate,
      endDate,
      severity: "Critical",
    },
    1000
  );

  const blockedIPs = await prisma.blockedIP.findMany({
    where: {
      blockedAt: { gte: startDate, lte: endDate },
    },
  });

  const lockedAccounts = await prisma.accountLockout.findMany({
    where: {
      lockedAt: { gte: startDate, lte: endDate },
    },
    include: {
      employee: {
        select: { id: true, username: true, name: true, email: true },
      },
    },
  });

  return {
    reportPeriod: { startDate, endDate },
    loginStatistics: loginStats,
    suspiciousActivity,
    criticalAuditLogs: auditLogs,
    ipsBlocked: blockedIPs.length,
    accountsLocked: lockedAccounts.length,
    blockedIPDetails: blockedIPs,
    lockedAccountDetails: lockedAccounts,
  };
};
