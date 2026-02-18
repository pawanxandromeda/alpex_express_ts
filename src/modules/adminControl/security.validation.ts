import { z } from "zod";

// IP Address regex pattern for validation
const ipAddressRegex = /^(\d{1,3}\.){3}\d{1,3}$/;

// Flexible date parser for query parameters - accepts various date formats
const flexibleDateTime = z.string().refine(
  (val) => !isNaN(new Date(val).getTime()),
  "Invalid date format"
);

// ============ BRUTE FORCE & LOGIN TRACKING VALIDATION ============

export const blockIPSchema = z.object({
  ipAddress: z.string().regex(ipAddressRegex, "Invalid IP address"),
  reason: z.string().optional(),
});

export const unblockIPSchema = z.object({
  ipAddress: z.string().regex(ipAddressRegex, "Invalid IP address"),
});

export const lockAccountSchema = z.object({
  employeeId: z.string().uuid("Invalid employee ID"),
  reason: z.string(),
});

export const unlockAccountSchema = z.object({
  employeeId: z.string().uuid("Invalid employee ID"),
});

export const getLoginAttemptsSchema = z.object({
  username: z.string().optional(),
  employeeId: z.string().uuid().optional(),
  ipAddress: z.string().optional(),
  startDate: flexibleDateTime.optional(),
  endDate: flexibleDateTime.optional(),
  status: z.enum(["Success", "Failed", "Blocked"]).optional(),
  limit: z.coerce.number().int().positive().max(1000).default(100),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export const getIPReputationSchema = z.object({
  ipAddress: z.string().regex(ipAddressRegex, "Invalid IP address"),
});

export const getSecurityAuditLogsSchema = z.object({
  employeeId: z.string().uuid().optional(),
  action: z.string().optional(),
  severity: z.enum(["Info", "Warning", "Critical"]).optional(),
  startDate: flexibleDateTime.optional(),
  endDate: flexibleDateTime.optional(),
  limit: z.coerce.number().int().positive().max(1000).default(100),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export const updateSecurityPolicySchema = z.object({
  maxLoginAttemptsPerIp: z.number().int().positive().optional(),
  maxLoginAttemptsPerUsername: z.number().int().positive().optional(),
  loginAttemptWindowMinutes: z.number().int().positive().optional(),
  accountLockoutDurationMinutes: z.number().int().positive().optional(),
  ipBlockDurationMinutes: z.number().int().positive().optional(),
  requireMfa: z.boolean().optional(),
  requireStrongPassword: z.boolean().optional(),
  passwordMinLength: z.number().int().min(6).max(20).optional(),
  passwordRequireNumbers: z.boolean().optional(),
  passwordRequireSpecialChars: z.boolean().optional(),
  passwordRequireUpperCase: z.boolean().optional(),
  passwordExpiryDays: z.number().int().positive().optional(),
  sessionTimeoutMinutes: z.number().int().positive().optional(),
  enableIpWhitelisting: z.boolean().optional(),
  enableGeoRestriction: z.boolean().optional(),
  allowedCountries: z.array(z.string()).optional(),
  suspiciousActivityAlert: z.boolean().optional(),
  logAllAttempts: z.boolean().optional(),
  enableAnomalyDetection: z.boolean().optional(),
});

export const generateSecurityReportSchema = z.object({
  startDate: flexibleDateTime,
  endDate: flexibleDateTime,
});

export const checkBruteForceSchema = z.object({
  username: z.string().min(1),
  ipAddress: z.string().regex(ipAddressRegex, "Invalid IP address"),
});

export const getLoginHistorySchema = z.object({
  employeeId: z.string().uuid("Invalid employee ID"),
  days: z.coerce.number().int().positive().default(30),
});

export const getSuspiciousActivitySchema = z.object({
  hoursBack: z.coerce.number().int().positive().default(24),
  limit: z.coerce.number().int().positive().max(1000).default(50),
});

export const getBlockedIPsSchema = z.object({
  isActive: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().positive().max(1000).default(100),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export const getLockedAccountsSchema = z.object({
  isLocked: z.coerce.boolean().default(true),
  limit: z.coerce.number().int().positive().max(1000).default(100),
  offset: z.coerce.number().int().nonnegative().default(0),
});
