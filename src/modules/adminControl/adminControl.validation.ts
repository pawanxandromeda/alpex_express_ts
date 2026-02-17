import { z } from "zod";

// ============ EMPLOYEE MANAGEMENT ============
export const approveEmployeeSchema = z.object({
  employeeId: z.string().uuid("Invalid employee ID"),
  approverNotes: z.string().optional(),
});

export const rejectEmployeeSchema = z.object({
  employeeId: z.string().uuid("Invalid employee ID"),
  rejectionReason: z.string().min(10, "Rejection reason must be at least 10 characters"),
});

export const bulkApproveEmployeesSchema = z.object({
  employeeIds: z.array(z.string().uuid()).min(1, "At least one employee ID required"),
  approverNotes: z.string().optional(),
});

export const updateEmployeeRoleSchema = z.object({
  employeeId: z.string().uuid("Invalid employee ID"),
  newRole: z.string().min(1, "Role is required"),
  department: z.string().optional(),
  approverNotes: z.string().optional(),
});

// ============ CREDIT APPROVAL ============
export const approveCreditSchema = z.object({
  customerId: z.string().uuid("Invalid customer ID"),
  approvedCreditLimit: z.number().positive("Credit limit must be positive"),
  approverNotes: z.string().optional(),
});

export const rejectCreditSchema = z.object({
  customerId: z.string().uuid("Invalid customer ID"),
  rejectionReason: z.string().min(10, "Rejection reason required"),
  approverNotes: z.string().optional(),
});

export const bulkCreditApprovalSchema = z.object({
  approvals: z.array(
    z.object({
      customerId: z.string().uuid(),
      approvedCreditLimit: z.number().positive(),
    })
  ).min(1),
  approverNotes: z.string().optional(),
});

// ============ PURCHASE ORDER APPROVAL ============
export const approvePurchaseOrderSchema = z.object({
  purchaseOrderId: z.string().uuid("Invalid PO ID"),
  approverNotes: z.string().optional(),
});

export const rejectPurchaseOrderSchema = z.object({
  purchaseOrderId: z.string().uuid("Invalid PO ID"),
  rejectionReason: z.string().min(10, "Rejection reason required"),
  approverNotes: z.string().optional(),
});

export const bulkPOApprovalSchema = z.object({
  purchaseOrderIds: z.array(z.string().uuid()).min(1),
  approvalType: z.enum(["md", "accounts", "designer", "ppic"]),
  approverNotes: z.string().optional(),
});

// ============ LEAVE MANAGEMENT ============
export const approveLeavesSchema = z.object({
  leaveRequestIds: z.array(z.string().uuid()).min(1),
  approverComments: z.string().optional(),
});

export const rejectLeavesSchema = z.object({
  leaveRequestIds: z.array(z.string().uuid()).min(1),
  rejectionReason: z.string().min(10, "Rejection reason required"),
});

// ============ ASSIGNMENT MANAGEMENT ============
export const bulkAssignCustomersSchema = z.object({
  customerIds: z.array(z.string().uuid()).min(1),
  assignedToEmployeeId: z.string().uuid("Invalid employee ID"),
  reason: z.string().optional(),
});

export const bulkAssignLeadsSchema = z.object({
  leadIds: z.array(z.string().uuid()).min(1),
  assignedToEmployeeId: z.string().uuid("Invalid employee ID"),
  reason: z.string().optional(),
});

export const bulkAssignPurchaseOrdersSchema = z.object({
  purchaseOrderIds: z.array(z.string().uuid()).min(1),
  assignedToEmployeeId: z.string().uuid("Invalid employee ID"),
  reason: z.string().optional(),
});

// ============ MASTER DATA MANAGEMENT ============
export const createDesignationSchema = z.object({
  name: z.string().min(1, "Designation name required"),
  description: z.string().optional(),
  department: z.string().min(1, "Department required"),
  reportingTo: z.string().optional(),
  baseSalaryRange: z.string().optional(),
  skills: z.array(z.string()).optional(),
});

export const createDepartmentSchema = z.object({
  name: z.string().min(1, "Department name required"),
  code: z.string().optional(),
  description: z.string().optional(),
  headOfDepartment: z.string().optional(),
  budget: z.number().optional(),
});

export const createVendorMasterSchema = z.object({
  vendorName: z.string().min(1, "Vendor name required"),
  vendorCode: z.string().optional(),
  contactPerson: z.string().optional(),
  vendorEmail: z.string().email().optional(),
  vendorPhone: z.string().optional(),
  vendorAdress: z.string().optional(),
  vendorState: z.string().optional(),
  vendorGSTNo: z.string().optional(),
  paymentTerms: z.string().optional(),
  vendorBankName: z.string().optional(),
  vendorAccountNumber: z.string().optional(),
  vendorIFSC: z.string().optional(),
});

// ============ ANALYTICS & REPORTING ============
export const analyticsFilterSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  department: z.string().optional(),
  status: z.string().optional(),
  limit: z.number().int().positive().default(50),
  offset: z.number().int().nonnegative().default(0),
});

export const exportReportSchema = z.object({
  reportType: z.enum(["employees", "customers", "purchaseorders", "leads", "attendance", "payroll"]),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  department: z.string().optional(),
  status: z.string().optional(),
});

// ============ AUDIT & LOGGING ============
export const auditLogFilterSchema = z.object({
  action: z.string().optional(),
  performedBy: z.string().optional(),
  targetId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.number().int().positive().default(50),
  offset: z.number().int().nonnegative().default(0),
});

export const getAuditLogsSchema = z.object({
  filter: auditLogFilterSchema.optional(),
});

// ============ CUSTOMER BLACKLIST ============
export const blacklistCustomerSchema = z.object({
  customerIds: z.array(z.string().uuid()).min(1),
  reason: z.string().min(10, "Reason required"),
  approverNotes: z.string().optional(),
});

export const unblacklistCustomerSchema = z.object({
  customerIds: z.array(z.string().uuid()).min(1),
  reason: z.string().optional(),
});

// ============ PERFORMANCE & KPI ============
export const getEmployeePerformanceSchema = z.object({
  employeeId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  department: z.string().optional(),
});

export const getDashboardAnalyticsSchema = z.object({
  timeframe: z.enum(["day", "week", "month", "quarter", "year"]).default("month"),
  department: z.string().optional(),
});

// ============ DATA MANAGEMENT ============
export const deleteRecordsSchema = z.object({
  recordType: z.enum(["lead", "todo", "notification", "auditlog"]),
  recordIds: z.array(z.string().uuid()).min(1),
  reason: z.string().optional(),
  confirmDelete: z.boolean().refine(val => val === true, "Deletion must be confirmed"),
});

export const archiveRecordsSchema = z.object({
  recordType: z.enum(["customer", "employee", "purchaseorder"]),
  recordIds: z.array(z.string().uuid()).min(1),
  reason: z.string().optional(),
});

// ============ STATUS MANAGEMENT ============
export const updateEmployeeStatusSchema = z.object({
  employeeId: z.string().uuid("Invalid employee ID"),
  newStatus: z.enum(["Pending", "Active", "Inactive"]),
  reason: z.string().optional(),
});

export const bulkUpdateEmployeeStatusSchema = z.object({
  employeeIds: z.array(z.string().uuid()).min(1),
  newStatus: z.enum(["Pending", "Active", "Inactive"]),
  reason: z.string().optional(),
});

// ============ GRIEVANCE MANAGEMENT ============
export const resolveGrievanceSchema = z.object({
  grievanceId: z.string().uuid("Invalid grievance ID"),
  resolutionNotes: z.string().min(20, "Resolution notes must be detailed"),
  status: z.enum(["Resolved", "Closed", "Withdrawn"]),
});

export const assignGrievanceSchema = z.object({
  grievanceId: z.string().uuid("Invalid grievance ID"),
  assignedToEmployeeId: z.string().uuid("Invalid employee ID"),
  notes: z.string().optional(),
});

// ============ PAYROLL MANAGEMENT ============
export const approvePayrollSchema = z.object({
  payrollIds: z.array(z.string().uuid()).min(1),
  approvedBy: z.string().optional(),
  remarks: z.string().optional(),
});

export const generatePayrollReportSchema = z.object({
  payrollMonth: z.string().datetime(),
  department: z.string().optional(),
  status: z.enum(["Draft", "Submitted", "Approved", "Processed", "Paid", "Rejected"]).optional(),
});
