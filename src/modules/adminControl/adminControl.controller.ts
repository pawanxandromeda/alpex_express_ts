import { Response } from "express";
import { AuthRequest } from "../../common/middleware/auth.middleware";
import * as service from "./adminControl.service";
import * as validation from "./adminControl.validation";
import { sendSuccess, sendError, handleError } from "../../common/utils/responseFormatter";

// ============ EMPLOYEE MANAGEMENT ============

export const approveEmployeeController = async (req: AuthRequest, res: Response) => {
  try {
    const payload = validation.approveEmployeeSchema.parse(req.body);
    const result = await service.approveEmployee(payload.employeeId, req.user?.id!, payload.approverNotes);
    return sendSuccess(res, result, "Employee approved successfully", 200);
  } catch (err) {
    return handleError(res, err);
  }
};

export const rejectEmployeeController = async (req: AuthRequest, res: Response) => {
  try {
    const payload = validation.rejectEmployeeSchema.parse(req.body);
    const result = await service.rejectEmployee(
      payload.employeeId,
      req.user?.id!,
      payload.rejectionReason
    );
    return sendSuccess(res, result, "Employee rejected successfully", 200);
  } catch (err) {
    return handleError(res, err);
  }
};

export const bulkApproveEmployees = async (req: AuthRequest, res: Response) => {
  try {
    const payload = validation.bulkApproveEmployeesSchema.parse(req.body);
    const result = await service.bulkApproveEmployees(
      payload.employeeIds,
      req.user?.id!,
      payload.approverNotes
    );
    return sendSuccess(res, result, "Employees approved in bulk", 200);
  } catch (err) {
    return handleError(res, err);
  }
};

export const updateEmployeeRole = async (req: AuthRequest, res: Response) => {
  try {
    const payload = validation.updateEmployeeRoleSchema.parse(req.body);
    const result = await service.updateEmployeeRole(
      payload.employeeId,
      payload.newRole,
      payload.department,
      req.user?.id!,
      payload.approverNotes
    );
    return sendSuccess(res, result, "Employee role updated successfully", 200);
  } catch (err) {
    return handleError(res, err);
  }
};

export const getPendingEmployeeApprovals = async (req: AuthRequest, res: Response) => {
  try {
    const result = await service.getPendingEmployeeApprovals();
    return sendSuccess(
      res,
      result,
      `Found ${result.length} pending employee approvals`,
      200
    );
  } catch (err) {
    return handleError(res, err);
  }
};

export const getEmployeesByStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query;
    if (!status) {
      return sendError(res, "MISSING_REQUIRED_FIELD", "Status parameter required");
    }
    const result = await service.getEmployeesByStatus(status as string);
    return sendSuccess(res, result, `Retrieved employees with status: ${status}`, 200);
  } catch (err) {
    return handleError(res, err);
  }
};

export const bulkUpdateEmployeeStatus = async (req: AuthRequest, res: Response) => {
  try {
    const payload = validation.bulkUpdateEmployeeStatusSchema.parse(req.body);
    const result = await service.bulkUpdateEmployeeStatus(
      payload.employeeIds,
      payload.newStatus,
      req.user?.id!,
      payload.reason
    );
    return sendSuccess(res, result, "Employee statuses updated in bulk", 200);
  } catch (err) {
    return handleError(res, err);
  }
};

// ============ CREDIT APPROVAL ============

export const approveCustomerCredit = async (req: AuthRequest, res: Response) => {
  try {
    const payload = validation.approveCreditSchema.parse(req.body);
    const result = await service.approveCustomerCredit(
      payload.customerId,
      payload.approvedCreditLimit,
      req.user?.id!,
      payload.approverNotes
    );
    return sendSuccess(res, result, "Customer credit approved", 200);
  } catch (err) {
    return handleError(res, err);
  }
};

export const rejectCustomerCredit = async (req: AuthRequest, res: Response) => {
  try {
    const payload = validation.rejectCreditSchema.parse(req.body);
    const result = await service.rejectCustomerCredit(
      payload.customerId,
      req.user?.id!,
      payload.rejectionReason,
      payload.approverNotes
    );
    return sendSuccess(res, result, "Customer credit rejected", 200);
  } catch (err) {
    return handleError(res, err);
  }
};

export const bulkCreditApproval = async (req: AuthRequest, res: Response) => {
  try {
    const payload = validation.bulkCreditApprovalSchema.parse(req.body);
    const result = await service.bulkCreditApproval(
      payload.approvals,
      req.user?.id!,
      payload.approverNotes
    );
    return sendSuccess(res, result, `Approved ${result.length} customer credits`, 200);
  } catch (err) {
    return handleError(res, err);
  }
};

export const getPendingCreditApprovals = async (req: AuthRequest, res: Response) => {
  try {
    const result = await service.getPendingCreditApprovals();
    return sendSuccess(res, result, `Found ${result.length} pending credit approvals`, 200);
  } catch (err) {
    return handleError(res, err);
  }
};

export const getBlacklistedCustomers = async (req: AuthRequest, res: Response) => {
  try {
    const result = await service.getBlacklistedCustomers();
    return sendSuccess(res, result, `Found ${result.length} blacklisted customers`, 200);
  } catch (err) {
    return handleError(res, err);
  }
};

export const blacklistCustomers = async (req: AuthRequest, res: Response) => {
  try {
    const payload = validation.blacklistCustomerSchema.parse(req.body);
    const result = await service.blacklistCustomers(
      payload.customerIds,
      payload.reason,
      req.user?.id!,
      payload.approverNotes
    );
    return sendSuccess(res, result, `Blacklisted ${result.count} customers`, 200);
  } catch (err) {
    return handleError(res, err);
  }
};

export const unblacklistCustomers = async (req: AuthRequest, res: Response) => {
  try {
    const payload = validation.unblacklistCustomerSchema.parse(req.body);
    const result = await service.unblacklistCustomers(
      payload.customerIds,
      req.user?.id!,
      payload.reason
    );
    return sendSuccess(res, result, `Unblacklisted ${result.count} customers`, 200);
  } catch (err) {
    return handleError(res, err);
  }
};

// ============ PURCHASE ORDER APPROVAL ============

export const approvePurchaseOrder = async (req: AuthRequest, res: Response) => {
  try {
    const payload = validation.approvePurchaseOrderSchema.parse(req.body);
    const approvalType = req.query.type || "md";
    const result = await service.approvePurchaseOrder(
      payload.purchaseOrderId,
      approvalType as string,
      req.user?.id!,
      payload.approverNotes
    );
    return sendSuccess(res, result, "Purchase Order approved", 200);
  } catch (err) {
    return handleError(res, err);
  }
};

export const rejectPurchaseOrder = async (req: AuthRequest, res: Response) => {
  try {
    const payload = validation.rejectPurchaseOrderSchema.parse(req.body);
    const result = await service.rejectPurchaseOrder(
      payload.purchaseOrderId,
      req.user?.id!,
      payload.rejectionReason,
      payload.approverNotes
    );
    return sendSuccess(res, result, "Purchase Order rejected", 200);
  } catch (err) {
    return handleError(res, err);
  }
};

export const getPendingPurchaseOrders = async (req: AuthRequest, res: Response) => {
  try {
    const { approvalType } = req.query;
    const result = await service.getPendingPurchaseOrders(approvalType as string | undefined);
    return sendSuccess(res, result, `Found ${result.length} pending purchase orders`, 200);
  } catch (err) {
    return handleError(res, err);
  }
};

export const bulkApprovePOs = async (req: AuthRequest, res: Response) => {
  try {
    const payload = validation.bulkPOApprovalSchema.parse(req.body);
    const result = await service.bulkApprovePurchaseOrders(
      payload.purchaseOrderIds,
      payload.approvalType,
      req.user?.id!,
      payload.approverNotes
    );
    return sendSuccess(res, result, `Approved ${result.count} purchase orders`, 200);
  } catch (err) {
    return handleError(res, err);
  }
};

// ============ ASSIGNMENT MANAGEMENT ============

export const bulkAssignCustomersController = async (req: AuthRequest, res: Response) => {
  try {
    const payload = validation.bulkAssignCustomersSchema.parse(req.body);
    const result = await service.bulkAssignCustomers(
      payload.customerIds,
      payload.assignedToEmployeeId,
      req.user?.id!,
      payload.reason
    );
    return sendSuccess(res, result, `Assigned ${result.length} customers`, 200);
  } catch (err) {
    return handleError(res, err);
  }
};

export const bulkAssignLeadsController = async (req: AuthRequest, res: Response) => {
  try {
    const payload = validation.bulkAssignLeadsSchema.parse(req.body);
    const result = await service.bulkAssignLeads(
      payload.leadIds,
      payload.assignedToEmployeeId,
      req.user?.id!,
      payload.reason
    );
    return sendSuccess(res, result, `Assigned ${result.length} leads`, 200);
  } catch (err) {
    return handleError(res, err);
  }
};

export const bulkAssignPurchaseOrdersController = async (req: AuthRequest, res: Response) => {
  try {
    const payload = validation.bulkAssignPurchaseOrdersSchema.parse(req.body);
    const result = await service.bulkAssignPurchaseOrders(
      payload.purchaseOrderIds,
      payload.assignedToEmployeeId,
      req.user?.id!,
      payload.reason
    );
    return sendSuccess(res, result, `Assigned ${result.length} purchase orders`, 200);
  } catch (err) {
    return handleError(res, err);
  }
};

// ============ ANALYTICS ============

export const getDashboardAnalyticsController = async (req: AuthRequest, res: Response) => {
  try {
    const payload = validation.getDashboardAnalyticsSchema.parse(req.query);
    const result = await service.getDashboardAnalytics(
      payload.timeframe,
      payload.department
    );
    return sendSuccess(res, result, "Dashboard analytics retrieved", 200);
  } catch (err) {
    return handleError(res, err);
  }
};

export const getSystemStatistics = async (req: AuthRequest, res: Response) => {
  try {
    const result = await service.getSystemStatistics();
    return sendSuccess(res, result, "System statistics retrieved", 200);
  } catch (err) {
    return handleError(res, err);
  }
};

// ============ AUDIT LOGS ============

export const getAuditLogsController = async (req: AuthRequest, res: Response) => {
  try {
    const {
      action,
      performedBy,
      targetId,
      startDate,
      endDate,
      limit = 50,
      offset = 0,
    } = req.query;

    const result = await service.getAuditLogs(
      action as string | undefined,
      performedBy as string | undefined,
      targetId as string | undefined,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined,
      parseInt(limit as string, 10),
      parseInt(offset as string, 10)
    );

    return sendSuccess(res, result, "Audit logs retrieved", 200);
  } catch (err) {
    return handleError(res, err);
  }
};

// ============ MASTER DATA MANAGEMENT ============

export const createDesignationController = async (req: AuthRequest, res: Response) => {
  try {
    const payload = validation.createDesignationSchema.parse(req.body);
    const result = await service.createDesignation(payload, req.user?.id!);
    return sendSuccess(res, result, "Designation created successfully", 201);
  } catch (err) {
    return handleError(res, err);
  }
};

export const createDepartmentController = async (req: AuthRequest, res: Response) => {
  try {
    const payload = validation.createDepartmentSchema.parse(req.body);
    const result = await service.createDepartment(payload, req.user?.id!);
    return sendSuccess(res, result, "Department created successfully", 201);
  } catch (err) {
    return handleError(res, err);
  }
};

export const createVendorMasterController = async (req: AuthRequest, res: Response) => {
  try {
    const payload = validation.createVendorMasterSchema.parse(req.body);
    const result = await service.createVendorMaster(payload, req.user?.id!);
    return sendSuccess(res, result, "Vendor created successfully", 201);
  } catch (err) {
    return handleError(res, err);
  }
};

export const getAllDesignations = async (req: AuthRequest, res: Response) => {
  try {
    const result = await service.getAllDesignations();
    return sendSuccess(res, result, "Designations retrieved", 200);
  } catch (err) {
    return handleError(res, err);
  }
};

export const getAllDepartments = async (req: AuthRequest, res: Response) => {
  try {
    const result = await service.getAllDepartments();
    return sendSuccess(res, result, "Departments retrieved", 200);
  } catch (err) {
    return handleError(res, err);
  }
};

export const getAllVendors = async (req: AuthRequest, res: Response) => {
  try {
    const result = await service.getAllVendors();
    return sendSuccess(res, result, "Vendors retrieved", 200);
  } catch (err) {
    return handleError(res, err);
  }
};

// ============ LEAVE MANAGEMENT ============

export const approveLeaves = async (req: AuthRequest, res: Response) => {
  try {
    const payload = validation.approveLeavesSchema.parse(req.body);
    const result = await service.approveLeaveBulk(
      payload.leaveRequestIds,
      req.user?.id!,
      payload.approverComments
    );
    return sendSuccess(res, result, `Approved ${result.count} leave requests`, 200);
  } catch (err) {
    return handleError(res, err);
  }
};

export const rejectLeaves = async (req: AuthRequest, res: Response) => {
  try {
    const payload = validation.rejectLeavesSchema.parse(req.body);
    const result = await service.rejectLeaveBulk(
      payload.leaveRequestIds,
      req.user?.id!,
      payload.rejectionReason
    );
    return sendSuccess(res, result, `Rejected ${result.count} leave requests`, 200);
  } catch (err) {
    return handleError(res, err);
  }
};

export const getPendingLeaves = async (req: AuthRequest, res: Response) => {
  try {
    const result = await service.getPendingLeaves();
    return sendSuccess(res, result, `Found ${result.length} pending leave requests`, 200);
  } catch (err) {
    return handleError(res, err);
  }
};

// ============ GRIEVANCE MANAGEMENT ============

export const resolveGrievanceController = async (req: AuthRequest, res: Response) => {
  try {
    const payload = validation.resolveGrievanceSchema.parse(req.body);
    const result = await service.resolveGrievance(
      payload.grievanceId,
      payload.resolutionNotes,
      payload.status,
      req.user?.id!
    );
    return sendSuccess(res, result, "Grievance resolved successfully", 200);
  } catch (err) {
    return handleError(res, err);
  }
};

export const getPendingGrievances = async (req: AuthRequest, res: Response) => {
  try {
    const result = await service.getPendingGrievances();
    return sendSuccess(res, result, `Found ${result.length} pending grievances`, 200);
  } catch (err) {
    return handleError(res, err);
  }
};

// ============ PAYROLL MANAGEMENT ============

export const approvePayroll = async (req: AuthRequest, res: Response) => {
  try {
    const payload = validation.approvePayrollSchema.parse(req.body);
    const result = await service.approvePayrollBulk(
      payload.payrollIds,
      req.user?.id!,
      payload.remarks
    );
    return sendSuccess(res, result, `Approved ${result.count} payroll records`, 200);
  } catch (err) {
    return handleError(res, err);
  }
};

export const getPendingPayroll = async (req: AuthRequest, res: Response) => {
  try {
    const result = await service.getPendingPayroll();
    return sendSuccess(res, result, `Found ${result.length} pending payroll records`, 200);
  } catch (err) {
    return handleError(res, err);
  }
};

// ============ STATISTICS ============

export const getEmployeeStatisticsByDepartment = async (req: AuthRequest, res: Response) => {
  try {
    const result = await service.getEmployeeStatisticsByDepartment();
    return sendSuccess(res, result, "Employee statistics by department retrieved", 200);
  } catch (err) {
    return handleError(res, err);
  }
};

export const getLeadStatistics = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const result = await service.getLeadStatistics(
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );
    return sendSuccess(res, result, "Lead statistics retrieved", 200);
  } catch (err) {
    return handleError(res, err);
  }
};

export const getPurchaseOrderStatistics = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const result = await service.getPurchaseOrderStatistics(
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );
    return sendSuccess(res, result, "Purchase Order statistics retrieved", 200);
  } catch (err) {
    return handleError(res, err);
  }
};

export const getAttendanceStatistics = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const result = await service.getAttendanceStatistics(
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );
    return sendSuccess(res, result, "Attendance statistics retrieved", 200);
  } catch (err) {
    return handleError(res, err);
  }
};

// ============ DATA MANAGEMENT ============

export const deleteRecords = async (req: AuthRequest, res: Response) => {
  try {
    const payload = validation.deleteRecordsSchema.parse(req.body);
    const result = await service.deleteRecords(
      payload.recordType,
      payload.recordIds,
      req.user?.id!,
      payload.reason
    );
    return sendSuccess(res, result, `Deleted ${result.count} records`, 200);
  } catch (err) {
    return handleError(res, err);
  }
};
