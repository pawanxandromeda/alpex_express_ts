import { Response } from "express";
import { AuthRequest } from "../../common/middleware/auth.middleware";
import * as securityService from "./security.service";
import * as securityValidation from "./security.validation";
import { sendSuccess, sendError, handleError } from "../../common/utils/responseFormatter";

// ============ BRUTE FORCE & IP MANAGEMENT ============

/**
 * Check if a login attempt is allowed (brute force check)
 */
const getClientIp = (req: any): string => {
   const forwarded = req.headers["x-forwarded-for"] as string;

  let ip =
    forwarded?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "unknown";

  if (ip === "::1") return "127.0.0.1";

  if (ip.startsWith("::ffff:")) {
    ip = ip.replace("::ffff:", "");
  }

  return ip;
};

export const checkBruteForceController = async (req: AuthRequest, res: Response) => {
  try {
    const payload = securityValidation.checkBruteForceSchema.parse(req.body);

    const ipAddress = getClientIp(req); // ✅ SERVER-SIDE IP
    console.log(`Login attempt for ${payload.username} from IP: ${ipAddress}`);

    const result = await securityService.checkAndApplyBruteForceProtection(
      payload.username,
      ipAddress
    );

    return sendSuccess(
      res,
      result,
      result.allowed ? "Login attempt allowed" : result.action,
      result.allowed ? 200 : 403
    );
  } catch (err) {
    return handleError(res, err);
  }
};


/**
 * Block an IP address
 */
export const blockIPController = async (req: AuthRequest, res: Response) => {
  try {
    const payload = securityValidation.blockIPSchema.parse(req.body);
    const result = await securityService.blockIP(
      payload.ipAddress,
      req.user?.id!,
      payload.reason,
      false // Manual block, not auto
    );

    return sendSuccess(res, result, "IP address blocked successfully", 200);
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * Unblock an IP address
 */
export const unblockIPController = async (req: AuthRequest, res: Response) => {
  try {
    const payload = securityValidation.unblockIPSchema.parse(req.body);
    const result = await securityService.unblockIP(payload.ipAddress, req.user?.id!);

    return sendSuccess(res, result, "IP address unblocked successfully", 200);
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * Get all blocked IPs
 */
export const getBlockedIPsController = async (req: AuthRequest, res: Response) => {
  try {
    const query = securityValidation.getBlockedIPsSchema.parse(req.query);
    const where: any = {};

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    const blockedIPs = await (require("../../config/postgres")).default.blockedIP.findMany({
      where,
      orderBy: { blockedAt: "desc" },
      skip: query.offset,
      take: query.limit,
    });

    const total = await (require("../../config/postgres")).default.blockedIP.count({ where });

    return sendSuccess(
      res,
      {
        total,
        count: blockedIPs.length,
        data: blockedIPs,
      },
      "Retrieved blocked IPs",
      200
    );
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * Get IP reputation and activity
 */
export const getIPReputationController = async (req: AuthRequest, res: Response) => {
  try {
    const payload = securityValidation.getIPReputationSchema.parse(req.query);
    const result = await securityService.getIPReputation(payload.ipAddress);

    return sendSuccess(res, result, "IP reputation retrieved", 200);
  } catch (err) {
    return handleError(res, err);
  }
};

// ============ ACCOUNT LOCKOUT MANAGEMENT ============

/**
 * Lock an employee account manually
 */
export const lockAccountController = async (req: AuthRequest, res: Response) => {
  try {
    const payload = securityValidation.lockAccountSchema.parse(req.body);
    const result = await securityService.lockEmployeeAccount(
      payload.employeeId,
      0,
      payload.reason
    );

    return sendSuccess(res, result, "Account locked successfully", 200);
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * Unlock an employee account
 */
export const unlockAccountController = async (req: AuthRequest, res: Response) => {
  try {
    const payload = securityValidation.unlockAccountSchema.parse(req.body);
    const result = await securityService.unlockEmployeeAccount(
      payload.employeeId,
      req.user?.id!
    );

    return sendSuccess(res, result, "Account unlocked successfully", 200);
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * Get all locked accounts
 */
export const getLockedAccountsController = async (req: AuthRequest, res: Response) => {
  try {
    const query = securityValidation.getLockedAccountsSchema.parse(req.query);

    const lockedAccounts = await (require("../../config/postgres")).default.accountLockout.findMany({
      where: query.isLocked
        ? {
            unlockedAt: null,
            lockedUntil: { gt: new Date() },
          }
        : {},
      skip: query.offset,
      take: query.limit,
      include: {
        employee: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            department: true,
          },
        },
      },
      orderBy: { lockedAt: "desc" },
    });

    const total = await (require("../../config/postgres")).default.accountLockout.count({
      where: query.isLocked
        ? {
            unlockedAt: null,
            lockedUntil: { gt: new Date() },
          }
        : {},
    });

    return sendSuccess(
      res,
      {
        total,
        count: lockedAccounts.length,
        data: lockedAccounts,
      },
      "Retrieved locked accounts",
      200
    );
  } catch (err) {
    return handleError(res, err);
  }
};

// ============ LOGIN ATTEMPT TRACKING ============

/**
 * Get login attempts with filtering
 */
export const getLoginAttemptsController = async (req: AuthRequest, res: Response) => {
  try {
    const query = securityValidation.getLoginAttemptsSchema.parse(req.query);
    const where: any = {};

    if (query.username) where.username = query.username;
    if (query.employeeId) where.employeeId = query.employeeId;
    if (query.ipAddress) where.ipAddress = query.ipAddress;
    if (query.status) where.status = query.status;

    if (query.startDate || query.endDate) {
      where.timestamp = {};
      if (query.startDate) where.timestamp.gte = new Date(query.startDate);
      if (query.endDate) where.timestamp.lte = new Date(query.endDate);
    }

    const prisma = require("../../config/postgres").default;

    const attempts = await prisma.loginAttempt.findMany({
      where,
      skip: query.offset,
      take: query.limit,
      include: {
        employee: {
          select: { id: true, username: true, name: true, email: true },
        },
      },
      orderBy: { timestamp: "desc" },
    });

    const total = await prisma.loginAttempt.count({ where });

    return sendSuccess(
      res,
      {
        total,
        count: attempts.length,
        data: attempts,
      },
      "Retrieved login attempts",
      200
    );
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * Get statistics for login attempts
 */
export const getLoginStatisticsController = async (req: AuthRequest, res: Response) => {
  try {
    const query = securityValidation.getLoginAttemptsSchema.parse(req.query);
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;

    const result = await securityService.getLoginAttemptStatistics(startDate, endDate, query.limit);

    return sendSuccess(res, result, "Login statistics retrieved", 200);
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * Get detailed login history for an employee
 */
export const getEmployeeLoginHistoryController = async (req: AuthRequest, res: Response) => {
  try {
    const payload = securityValidation.getLoginHistorySchema.parse(req.query);
    const result = await securityService.getEmployeeLoginReport(payload.employeeId, payload.days);

    return sendSuccess(res, result, "Employee login history retrieved", 200);
  } catch (err) {
    return handleError(res, err);
  }
};

// ============ SECURITY AUDIT LOGS ============

/**
 * Get security audit logs
 */
export const getSecurityAuditLogsController = async (req: AuthRequest, res: Response) => {
  try {
    const query = securityValidation.getSecurityAuditLogsSchema.parse(req.query);

    const filters: any = {};
    if (query.employeeId) filters.employeeId = query.employeeId;
    if (query.action) filters.action = query.action;
    if (query.severity) filters.severity = query.severity;
    if (query.startDate || query.endDate) {
      filters.startDate = query.startDate ? new Date(query.startDate) : undefined;
      filters.endDate = query.endDate ? new Date(query.endDate) : undefined;
    }

    const prisma = require("../../config/postgres").default;

    const logs = await prisma.securityAuditLog.findMany({
      where: {
        ...(filters.employeeId && { employeeId: filters.employeeId }),
        ...(filters.action && { action: filters.action }),
        ...(filters.severity && { severity: filters.severity }),
        ...(filters.startDate || filters.endDate) && {
          timestamp: {
            ...(filters.startDate && { gte: filters.startDate }),
            ...(filters.endDate && { lte: filters.endDate }),
          },
        },
      },
      skip: query.offset,
      take: query.limit,
      include: {
        employee: {
          select: { id: true, username: true, name: true, email: true },
        },
      },
      orderBy: { timestamp: "desc" },
    });

    const total = await prisma.securityAuditLog.count({
      where: {
        ...(filters.employeeId && { employeeId: filters.employeeId }),
        ...(filters.action && { action: filters.action }),
        ...(filters.severity && { severity: filters.severity }),
        ...(filters.startDate || filters.endDate) && {
          timestamp: {
            ...(filters.startDate && { gte: filters.startDate }),
            ...(filters.endDate && { lte: filters.endDate }),
          },
        },
      },
    });

    return sendSuccess(
      res,
      {
        total,
        count: logs.length,
        data: logs,
      },
      "Retrieved security audit logs",
      200
    );
  } catch (err) {
    return handleError(res, err);
  }
};

// ============ SUSPICIOUS ACTIVITY DETECTION ============

/**
 * Get suspicious security activity
 */
export const getSuspiciousActivityController = async (req: AuthRequest, res: Response) => {
  try {
    const query = securityValidation.getSuspiciousActivitySchema.parse(req.query);
    const result = await securityService.getSuspiciousActivity(query.hoursBack, query.limit);

    return sendSuccess(res, result, "Suspicious activity retrieved", 200);
  } catch (err) {
    return handleError(res, err);
  }
};

// ============ SECURITY POLICY MANAGEMENT ============

/**
 * Get current security policy
 */
export const getSecurityPolicyController = async (req: AuthRequest, res: Response) => {
  try {
    const policy = await securityService.getSecurityPolicy();
    return sendSuccess(res, policy, "Security policy retrieved", 200);
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * Update security policy
 */
export const updateSecurityPolicyController = async (req: AuthRequest, res: Response) => {
  try {
    const payload = securityValidation.updateSecurityPolicySchema.parse(req.body);
    const policy = await securityService.getSecurityPolicy();
    const updated = await securityService.updateSecurityPolicy(policy.id, payload);

    return sendSuccess(res, updated, "Security policy updated successfully", 200);
  } catch (err) {
    return handleError(res, err);
  }
};

// ============ SECURITY REPORTING ============

/**
 * Generate comprehensive security report
 */
export const generateSecurityReportController = async (req: AuthRequest, res: Response) => {
  try {
    const payload = securityValidation.generateSecurityReportSchema.parse(req.body);
    const startDate = new Date(payload.startDate);
    const endDate = new Date(payload.endDate);

    if (startDate > endDate) {
      return sendError(res, "INVALID_DATE_RANGE", "Start date must be before end date");
    }

    const report = await securityService.generateSecurityReport(startDate, endDate);

    return sendSuccess(res, report, "Security report generated successfully", 200);
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * Get security dashboard overview
 */
export const getSecurityDashboardController = async (req: AuthRequest, res: Response) => {
  try {
    // Get stats for last 24 hours, 7 days, and 30 days
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [stats24h, stats7d, stats30d, suspicious, policy] = await Promise.all([
      securityService.getLoginAttemptStatistics(last24h, now),
      securityService.getLoginAttemptStatistics(last7d, now),
      securityService.getLoginAttemptStatistics(last30d, now),
      securityService.getSuspiciousActivity(24, 10),
      securityService.getSecurityPolicy(),
    ]);

    const prisma = require("../../config/postgres").default;

    const [blockedIPsCount, lockedAccountsCount] = await Promise.all([
      prisma.blockedIP.count({ where: { isActive: true } }),
      prisma.accountLockout.count({
        where: {
          unlockedAt: null,
          lockedUntil: { gt: now },
        },
      }),
    ]);

    return sendSuccess(
      res,
      {
        last24Hours: stats24h,
        last7Days: stats7d,
        last30Days: stats30d,
        suspiciousActivity: suspicious,
        activeBlockedIPs: blockedIPsCount,
        lockedAccounts: lockedAccountsCount,
        securityPolicy: policy,
      },
      "Security dashboard data retrieved",
      200
    );
  } catch (err) {
    return handleError(res, err);
  }
};
