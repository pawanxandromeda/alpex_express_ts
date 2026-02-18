import { Router } from "express";
import * as controller from "./security.controller";
import { protect } from "../../common/middleware/auth.middleware";
import { authorize } from "../../common/middleware/authorization.middleware";

const router = Router();

// ============ ALL ROUTES REQUIRE AUTHENTICATION & ADMIN ROLE ============
router.use(protect);
router.use(authorize(["admin"]));

// ============ BRUTE FORCE & LOGIN ATTEMPT TRACKING ============

// Check if login attempt is allowed (for auth middleware to call)
router.post("/check-brute-force", controller.checkBruteForceController);

// Get login attempts with filtering
router.get("/login-attempts", controller.getLoginAttemptsController);
router.get("/login-statistics", controller.getLoginStatisticsController);
router.get("/login-history/:employeeId", controller.getEmployeeLoginHistoryController);

// ============ IP ADDRESS MANAGEMENT ============

// Block/Unblock IPs
router.post("/block-ip", controller.blockIPController);
router.post("/unblock-ip", controller.unblockIPController);
router.get("/blocked-ips", controller.getBlockedIPsController);

// Get IP reputation
router.get("/ip-reputation", controller.getIPReputationController);

// ============ ACCOUNT LOCKOUT MANAGEMENT ============

// Lock/Unlock accounts
router.post("/lock-account", controller.lockAccountController);
router.post("/unlock-account", controller.unlockAccountController);
router.get("/locked-accounts", controller.getLockedAccountsController);

// ============ SECURITY AUDIT LOGGING ============

// Security audit logs
router.get("/audit-logs", controller.getSecurityAuditLogsController);

// ============ SUSPICIOUS ACTIVITY DETECTION ============

// Get suspicious activity
router.get("/suspicious-activity", controller.getSuspiciousActivityController);

// ============ SECURITY POLICY MANAGEMENT ============

// Security policy (view and update)
router.get("/policy", controller.getSecurityPolicyController);
router.put("/policy", controller.updateSecurityPolicyController);

// ============ SECURITY REPORTS ============

// Generate security reports
router.post("/generate-report", controller.generateSecurityReportController);

// Security dashboard
router.get("/dashboard", controller.getSecurityDashboardController);

export default router;
