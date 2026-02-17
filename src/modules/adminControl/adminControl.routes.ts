import { Router } from "express";
import * as controller from "./adminControl.controller";
import { protect } from "../../common/middleware/auth.middleware";
import { authorize } from "../../common/middleware/authorization.middleware";

const router = Router();

// ============ ALL ROUTES REQUIRE AUTHENTICATION ============
router.use(protect);
router.use(authorize(["admin", "manager"]));

// ============ DASHBOARD & ANALYTICS ============
router.get("/dashboard/analytics", controller.getDashboardAnalyticsController);
router.get("/system/statistics", controller.getSystemStatistics);
router.get("/statistics/employees-by-department", controller.getEmployeeStatisticsByDepartment);
router.get("/statistics/leads", controller.getLeadStatistics);
router.get("/statistics/purchase-orders", controller.getPurchaseOrderStatistics);
router.get("/statistics/attendance", controller.getAttendanceStatistics);

// ============ AUDIT & LOGGING ============
router.get("/audit-logs", controller.getAuditLogsController);

// ============ EMPLOYEE MANAGEMENT ============
router.get("/employees/pending-approvals", controller.getPendingEmployeeApprovals);
router.get("/employees/by-status", controller.getEmployeesByStatus);
router.post("/employees/approve", controller.approveEmployeeController);
router.post("/employees/approve/bulk", controller.bulkApproveEmployees);
router.post("/employees/reject", controller.rejectEmployeeController);
router.post("/employees/update-role", controller.updateEmployeeRole);
router.post("/employees/update-status/bulk", controller.bulkUpdateEmployeeStatus);

// ============ CREDIT MANAGEMENT ============
router.get("/credit/pending-approvals", controller.getPendingCreditApprovals);
router.post("/credit/approve", controller.approveCustomerCredit);
router.post("/credit/approve/bulk", controller.bulkCreditApproval);
router.post("/credit/reject", controller.rejectCustomerCredit);

// ============ CUSTOMER BLACKLIST ============
router.get("/customers/blacklisted", controller.getBlacklistedCustomers);
router.post("/customers/blacklist", controller.blacklistCustomers);
router.post("/customers/unblacklist", controller.unblacklistCustomers);

// ============ PURCHASE ORDER APPROVAL ============
router.get("/purchase-orders/pending-approvals", controller.getPendingPurchaseOrders);
router.post("/purchase-orders/approve", controller.approvePurchaseOrder);
router.post("/purchase-orders/approve/bulk", controller.bulkApprovePOs);
router.post("/purchase-orders/reject", controller.rejectPurchaseOrder);

// ============ ASSIGNMENT MANAGEMENT ============
router.post("/assignments/customers/bulk", controller.bulkAssignCustomersController);
router.post("/assignments/leads/bulk", controller.bulkAssignLeadsController);
router.post("/assignments/purchase-orders/bulk", controller.bulkAssignPurchaseOrdersController);

// ============ LEAVE MANAGEMENT ============
router.get("/leaves/pending", controller.getPendingLeaves);
router.post("/leaves/approve/bulk", controller.approveLeaves);
router.post("/leaves/reject/bulk", controller.rejectLeaves);

// ============ GRIEVANCE MANAGEMENT ============
router.get("/grievances/pending", controller.getPendingGrievances);
router.post("/grievances/resolve", controller.resolveGrievanceController);

// ============ PAYROLL MANAGEMENT ============
router.get("/payroll/pending", controller.getPendingPayroll);
router.post("/payroll/approve/bulk", controller.approvePayroll);

// ============ MASTER DATA MANAGEMENT - DESIGNATIONS ============
router.get("/master/designations", controller.getAllDesignations);
router.post("/master/designations", controller.createDesignationController);

// ============ MASTER DATA MANAGEMENT - DEPARTMENTS ============
router.get("/master/departments", controller.getAllDepartments);
router.post("/master/departments", controller.createDepartmentController);

// ============ MASTER DATA MANAGEMENT - VENDORS ============
router.get("/master/vendors", controller.getAllVendors);
router.post("/master/vendors", controller.createVendorMasterController);

// ============ DATA MANAGEMENT - DELETE ============
router.post("/data/delete", controller.deleteRecords);

export default router;
