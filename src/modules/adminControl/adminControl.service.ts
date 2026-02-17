import prisma from "../../config/postgres";
import { logAction } from "../../common/utils/logger";

// ============ EMPLOYEE MANAGEMENT ============
export const approveEmployee = async (employeeId: string, approverId: string, approverNotes?: string) => {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
  });

  if (!employee) throw new Error("Employee not found");
  if (employee.approvedForCredentials === "Approved") throw new Error("Employee already approved");

  const updated = await prisma.employee.update({
    where: { id: employeeId },
    data: {
      approvedForCredentials: "Approved",
      status: "Active",
      approvedBy: approverId,
      approvedAt: new Date(),
    },
  });

  await logAction({
    action: "EMPLOYEE_APPROVED",
    performedBy: approverId,
    targetId: employeeId,
    details: {
      approverNotes,
      employeeName: employee.name,
      email: employee.email,
    },
  });

  return updated;
};

export const rejectEmployee = async (
  employeeId: string,
  approverId: string,
  rejectionReason: string
) => {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
  });

  if (!employee) throw new Error("Employee not found");

  const updated = await prisma.employee.update({
    where: { id: employeeId },
    data: {
      approvedForCredentials: "Pending",
      status: "Inactive",
      rejectionReason,
      approvedBy: approverId,
      approvedAt: new Date(),
    },
  });

  await logAction({
    action: "EMPLOYEE_REJECTED",
    performedBy: approverId,
    targetId: employeeId,
    details: {
      rejectionReason,
      employeeName: employee.name,
    },
  });

  return updated;
};

export const bulkApproveEmployees = async (
  employeeIds: string[],
  approverId: string,
  approverNotes?: string
) => {
  const updated = await prisma.employee.updateMany({
    where: { id: { in: employeeIds } },
    data: {
      approvedForCredentials: "Approved",
      status: "Active",
      approvedBy: approverId,
      approvedAt: new Date(),
    },
  });

  await logAction({
    action: "BULK_EMPLOYEES_APPROVED",
    performedBy: approverId,
    targetId: JSON.stringify(employeeIds),
    details: {
      approverNotes,
      count: updated.count,
    },
  });

  return updated;
};

export const updateEmployeeRole = async (
  employeeId: string,
  newRole: string,
  department: string | undefined,
  approverId: string,
  approverNotes?: string
) => {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
  });

  if (!employee) throw new Error("Employee not found");

  const updated = await prisma.employee.update({
    where: { id: employeeId },
    data: {
      role: newRole,
      department: department,
    },
  });

  await logAction({
    action: "EMPLOYEE_ROLE_UPDATED",
    performedBy: approverId,
    targetId: employeeId,
    details: {
      oldRole: employee.role,
      newRole,
      department,
      approverNotes,
    },
  });

  return updated;
};

export const getTotalEmployees = async () => {
  return prisma.employee.count();
};

export const getPendingEmployeeApprovals = async () => {
  return prisma.employee.findMany({
    where: {
      approvedForCredentials: "Pending",
      status: "Pending",
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      department: true,
      createdAt: true,
    },
  });
};

export const getEmployeesByStatus = async (status: string) => {
  return prisma.employee.findMany({
    where: { status: status as any },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      status: true,
      createdAt: true,
    },
  });
};

export const bulkUpdateEmployeeStatus = async (
  employeeIds: string[],
  newStatus: string,
  approverId: string,
  reason?: string
) => {
  const updated = await prisma.employee.updateMany({
    where: { id: { in: employeeIds } },
    data: { status: newStatus as any },
  });

  await logAction({
    action: "BULK_EMPLOYEE_STATUS_UPDATED",
    performedBy: approverId,
    targetId: JSON.stringify(employeeIds),
    details: {
      newStatus,
      reason,
      count: updated.count,
    },
  });

  return updated;
};

// ============ CREDIT APPROVAL ============
export const approveCustomerCredit = async (
  customerId: string,
  approvedCreditLimit: number,
  approverId: string,
  approverNotes?: string
) => {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });

  if (!customer) throw new Error("Customer not found");

  const updated = await prisma.customer.update({
    where: { id: customerId },
    data: {
      creditLimit: approvedCreditLimit,
      creditApprovalStatus: "Approved",
    },
  });

  await logAction({
    action: "CREDIT_APPROVED",
    performedBy: approverId,
    targetId: customerId,
    details: {
      customerName: customer.customerName,
      approvedCreditLimit,
      approverNotes,
    },
  });

  return updated;
};

export const rejectCustomerCredit = async (
  customerId: string,
  approverId: string,
  rejectionReason: string,
  approverNotes?: string
) => {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });

  if (!customer) throw new Error("Customer not found");

  const updated = await prisma.customer.update({
    where: { id: customerId },
    data: {
      creditApprovalStatus: "Rejected",
      creditLimit: 0,
    },
  });

  await logAction({
    action: "CREDIT_REJECTED",
    performedBy: approverId,
    targetId: customerId,
    details: {
      customerName: customer.customerName,
      rejectionReason,
      approverNotes,
    },
  });

  return updated;
};

export const bulkCreditApproval = async (
  approvals: Array<{ customerId: string; approvedCreditLimit: number }>,
  approverId: string,
  approverNotes?: string
) => {
  const results = await Promise.all(
    approvals.map(({ customerId, approvedCreditLimit }) =>
      approveCustomerCredit(customerId, approvedCreditLimit, approverId, approverNotes)
    )
  );

  await logAction({
    action: "BULK_CREDIT_APPROVED",
    performedBy: approverId,
    targetId: JSON.stringify(approvals),
    details: {
      count: results.length,
      approverNotes,
    },
  });

  return results;
};

export const getPendingCreditApprovals = async () => {
  return prisma.customer.findMany({
    where: { creditApprovalStatus: "Pending" },
    select: {
      id: true,
      customerName: true,
      gstrNo: true,
      creditLimit: true,
      contactEmail: true,
      contactPhone: true,
      createdAt: true,
    },
  });
};

export const getBlacklistedCustomers = async () => {
  return prisma.customer.findMany({
    where: { isBlacklisted: true },
    select: {
      id: true,
      customerName: true,
      gstrNo: true,
      blacklistReason: true,
      blacklistedAt: true,
      contactEmail: true,
    },
  });
};

export const blacklistCustomers = async (
  customerIds: string[],
  reason: string,
  approverId: string,
  approverNotes?: string
) => {
  const updated = await prisma.customer.updateMany({
    where: { id: { in: customerIds } },
    data: {
      isBlacklisted: true,
      blacklistReason: reason,
      blacklistedAt: new Date(),
    },
  });

  await logAction({
    action: "CUSTOMERS_BLACKLISTED",
    performedBy: approverId,
    targetId: JSON.stringify(customerIds),
    details: {
      reason,
      approverNotes,
      count: updated.count,
    },
  });

  return updated;
};

export const unblacklistCustomers = async (
  customerIds: string[],
  approverId: string,
  reason?: string
) => {
  const updated = await prisma.customer.updateMany({
    where: { id: { in: customerIds } },
    data: {
      isBlacklisted: false,
      blacklistReason: null,
      blacklistedAt: null,
    },
  });

  await logAction({
    action: "CUSTOMERS_UNBLACKLISTED",
    performedBy: approverId,
    targetId: JSON.stringify(customerIds),
    details: {
      reason,
      count: updated.count,
    },
  });

  return updated;
};

// ============ PURCHASE ORDER APPROVAL ============
export const approvePurchaseOrder = async (
  purchaseOrderId: string,
  approvalType: string,
  approverId: string,
  approverNotes?: string
) => {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: purchaseOrderId },
  });

  if (!po) throw new Error("Purchase Order not found");

  const updateData: any = {};

  if (approvalType === "md") updateData.mdApproval = "Approved";
  else if (approvalType === "accounts") updateData.accountsApproval = "Approved";
  else if (approvalType === "designer") updateData.designerApproval = "Approved";
  else if (approvalType === "ppic") updateData.ppicApproval = "Approved";

  // If all approvals are done, update overall status
  if (
    updateData.mdApproval === "Approved" || po.mdApproval === "Approved"
  ) {
    updateData.overallStatus = "Processing";
  }

  const updated = await prisma.purchaseOrder.update({
    where: { id: purchaseOrderId },
    data: updateData,
  });

  await logAction({
    action: "PO_APPROVED",
    performedBy: approverId,
    targetId: purchaseOrderId,
    details: {
      approvalType,
      poNo: po.poNo,
      approverNotes,
    },
  });

  return updated;
};

export const rejectPurchaseOrder = async (
  purchaseOrderId: string,
  approverId: string,
  rejectionReason: string,
  approverNotes?: string
) => {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: purchaseOrderId },
  });

  if (!po) throw new Error("Purchase Order not found");

  const updated = await prisma.purchaseOrder.update({
    where: { id: purchaseOrderId },
    data: {
      overallStatus: "Rejected",
    },
  });

  await logAction({
    action: "PO_REJECTED",
    performedBy: approverId,
    targetId: purchaseOrderId,
    details: {
      poNo: po.poNo,
      rejectionReason,
      approverNotes,
    },
  });

  return updated;
};

export const getPendingPurchaseOrders = async (approvalType?: string) => {
  const where: any = {};

  if (approvalType === "md") where.mdApproval = "Pending";
  else if (approvalType === "accounts") where.accountsApproval = "Pending";
  else if (approvalType === "designer") where.designerApproval = "Pending";
  else if (approvalType === "ppic") where.ppicApproval = "Pending";

  return prisma.purchaseOrder.findMany({
    where,
    select: {
      id: true,
      poNo: true,
      poDate: true,
      partyName: true,
      amount: true,
      overallStatus: true,
      mdApproval: true,
      accountsApproval: true,
      designerApproval: true,
      ppicApproval: true,
      createdAt: true,
    },
  });
};

export const bulkApprovePurchaseOrders = async (
  purchaseOrderIds: string[],
  approvalType: string,
  approverId: string,
  approverNotes?: string
) => {
  const updateData: any = {};

  if (approvalType === "md") updateData.mdApproval = "Approved";
  else if (approvalType === "accounts") updateData.accountsApproval = "Approved";
  else if (approvalType === "designer") updateData.designerApproval = "Approved";
  else if (approvalType === "ppic") updateData.ppicApproval = "Approved";

  const updated = await prisma.purchaseOrder.updateMany({
    where: { id: { in: purchaseOrderIds } },
    data: updateData,
  });

  await logAction({
    action: "BULK_PO_APPROVED",
    performedBy: approverId,
    targetId: JSON.stringify(purchaseOrderIds),
    details: {
      approvalType,
      approverNotes,
      count: updated.count,
    },
  });

  return updated;
};

// ============ ASSIGNMENT MANAGEMENT ============
export const bulkAssignCustomers = async (
  customerIds: string[],
  assignedToEmployeeId: string,
  approverId: string,
  reason?: string
) => {
  const assignmentHistories = await Promise.all(
    customerIds.map(async (customerId) => {
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        select: { assignedToEmployeeId: true },
      });

      await prisma.customer.update({
        where: { id: customerId },
        data: {
          assignedToEmployeeId,
          assignedAt: new Date(),
        },
      });

      return prisma.customerAssignmentHistory.create({
        data: {
          customerId,
          assignedToEmployeeId,
          assignedByEmployeeId: approverId,
          previousEmployeeId: customer?.assignedToEmployeeId || null,
          reason,
        },
      });
    })
  );

  await logAction({
    action: "BULK_CUSTOMERS_ASSIGNED",
    performedBy: approverId,
    targetId: JSON.stringify(customerIds),
    details: {
      assignedToEmployeeId,
      reason,
      count: customerIds.length,
    },
  });

  return assignmentHistories;
};

export const bulkAssignLeads = async (
  leadIds: string[],
  assignedToEmployeeId: string,
  approverId: string,
  reason?: string
) => {
  const leads = await prisma.lead.findMany({
    where: { id: { in: leadIds } },
  });

  const assignmentHistories = await Promise.all(
    leads.map(async (lead: any) => {
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          assignedToEmployeeId,
          assignedAt: new Date(),
        },
      });

      return prisma.leadAssignmentHistory.create({
        data: {
          leadId: lead.id,
          assignedToEmployeeId,
          assignedByEmployeeId: approverId,
          notes: reason,
        },
      });
    })
  );

  await logAction({
    action: "BULK_LEADS_ASSIGNED",
    performedBy: approverId,
    targetId: JSON.stringify(leadIds),
    details: {
      assignedToEmployeeId,
      reason,
      count: leadIds.length,
    },
  });

  return assignmentHistories;
};

export const bulkAssignPurchaseOrders = async (
  purchaseOrderIds: string[],
  assignedToEmployeeId: string,
  approverId: string,
  reason?: string
) => {
  const assignmentHistories = await Promise.all(
    purchaseOrderIds.map(async (poId) => {
      const po = await prisma.purchaseOrder.findUnique({
        where: { id: poId },
        select: { assignedToEmployeeId: true },
      });

      await prisma.purchaseOrder.update({
        where: { id: poId },
        data: {
          assignedToEmployeeId,
          assignedAt: new Date(),
        },
      });

      return prisma.purchaseOrderAssignmentHistory.create({
        data: {
          purchaseOrderId: poId,
          assignedToEmployeeId,
          assignedByEmployeeId: approverId,
          previousEmployeeId: po?.assignedToEmployeeId || null,
          reason,
        },
      });
    })
  );

  await logAction({
    action: "BULK_POS_ASSIGNED",
    performedBy: approverId,
    targetId: JSON.stringify(purchaseOrderIds),
    details: {
      assignedToEmployeeId,
      reason,
      count: purchaseOrderIds.length,
    },
  });

  return assignmentHistories;
};

// ============ ANALYTICS ============
export const getDashboardAnalytics = async (timeframe: string, department?: string) => {
  const now = new Date();
  let startDate = new Date();

  if (timeframe === "day") startDate.setDate(now.getDate() - 1);
  else if (timeframe === "week") startDate.setDate(now.getDate() - 7);
  else if (timeframe === "month") startDate.setMonth(now.getMonth() - 1);
  else if (timeframe === "quarter") startDate.setMonth(now.getMonth() - 3);
  else if (timeframe === "year") startDate.setFullYear(now.getFullYear() - 1);

  const whereEmployee = department ? { department } : {};

  const [
    totalEmployees,
    activeEmployees,
    inactiveEmployees,
    pendingApprovals,
    totalCustomers,
    blacklistedCustomers,
    pendingCreditApprovals,
    totalPurchaseOrders,
    processingPOs,
    totalLeads,
    totalAttendance,
    avgAttendanceRate,
  ] = await Promise.all([
    prisma.employee.count({ where: whereEmployee }),
    prisma.employee.count({ where: { ...whereEmployee, status: "Active" } }),
    prisma.employee.count({ where: { ...whereEmployee, status: "Inactive" } }),
    prisma.employee.count({
      where: { ...whereEmployee, approvedForCredentials: "Pending" },
    }),
    prisma.customer.count(),
    prisma.customer.count({ where: { isBlacklisted: true } }),
    prisma.customer.count({ where: { creditApprovalStatus: "Pending" } }),
    prisma.purchaseOrder.count(),
    prisma.purchaseOrder.count({
      where: { overallStatus: "Processing" },
    }),
    prisma.lead.count(),
    prisma.attendance.count({ where: { attendanceDate: { gte: startDate } } }),
    prisma.attendance.count({
      where: {
        attendanceDate: { gte: startDate },
        status: "Present",
      },
    }),
  ]);

  const employeePerformance = await getTopPerformingEmployees(5, department);

  return {
    timeframe,
    period: { startDate, endDate: now },
    employees: {
      total: totalEmployees,
      active: activeEmployees,
      inactive: inactiveEmployees,
      pendingApprovals,
    },
    customers: {
      total: totalCustomers,
      blacklisted: blacklistedCustomers,
      pendingCreditApprovals,
    },
    purchaseOrders: {
      total: totalPurchaseOrders,
      processing: processingPOs,
    },
    leads: {
      total: totalLeads,
    },
    attendance: {
      total: totalAttendance,
      presentCount: avgAttendanceRate,
      rate: totalAttendance > 0 ? (avgAttendanceRate / totalAttendance) * 100 : 0,
    },
    topPerformers: employeePerformance,
  };
};

export const getTopPerformingEmployees = async (limit: number = 5, department?: string) => {
  return prisma.employee.findMany({
    where: {
      ...(department && { department }),
      status: "Active",
    },
    include: {
      assignedCustomers: true,
      assignedLeads: true,
      assignedPurchaseOrders: true,
    },
    take: limit,
    orderBy: { createdAt: "desc" },
  });
};

export const getSystemStatistics = async () => {
  const [
    totalEmployees,
    totalCustomers,
    totalPOs,
    totalLeads,
    totalTodos,
    totalLeaveRequests,
    totalAttendanceRecords,
  ] = await Promise.all([
    prisma.employee.count(),
    prisma.customer.count(),
    prisma.purchaseOrder.count(),
    prisma.lead.count(),
    prisma.todo.count(),
    prisma.leaveRequest.count(),
    prisma.attendance.count(),
  ]);

  return {
    employees: totalEmployees,
    customers: totalCustomers,
    purchaseOrders: totalPOs,
    leads: totalLeads,
    todos: totalTodos,
    leaveRequests: totalLeaveRequests,
    attendanceRecords: totalAttendanceRecords,
  };
};

// ============ AUDIT LOGS ============
export const getAuditLogs = async (
  action?: string,
  performedBy?: string,
  targetId?: string,
  startDate?: Date,
  endDate?: Date,
  limit: number = 50,
  offset: number = 0
) => {
  const where: any = {};

  if (action) where.action = { contains: action, mode: "insensitive" };
  if (performedBy) where.performedBy = performedBy;
  if (targetId) where.targetId = targetId;
  if (startDate || endDate) {
    where.timestamp = {};
    if (startDate) where.timestamp.gte = startDate;
    if (endDate) where.timestamp.lte = endDate;
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total, limit, offset };
};

// ============ MASTER DATA MANAGEMENT ============
export const createDesignation = async (data: any, createdBy: string) => {
  const designation = await prisma.designation.create({
    data,
  });

  await logAction({
    action: "DESIGNATION_CREATED",
    performedBy: createdBy,
    targetId: designation.id,
    details: {
      designation: designation.name,
    },
  });

  return designation;
};

export const createDepartment = async (data: any, createdBy: string) => {
  const department = await prisma.department.create({
    data,
  });

  await logAction({
    action: "DEPARTMENT_CREATED",
    performedBy: createdBy,
    targetId: department.id,
    details: {
      department: department.name,
    },
  });

  return department;
};

export const createVendorMaster = async (data: any, createdBy: string) => {
  const vendor = await prisma.vendorMaster.create({
    data,
  });

  await logAction({
    action: "VENDOR_CREATED",
    performedBy: createdBy,
    targetId: vendor.id,
    details: {
      vendor: vendor.vendorName,
    },
  });

  return vendor;
};

export const getAllDesignations = async () => {
  return prisma.designation.findMany({
    where: { status: "Active" },
    orderBy: { createdAt: "desc" },
  });
};

export const getAllDepartments = async () => {
  return prisma.department.findMany({
    where: { status: "Active" },
    orderBy: { createdAt: "desc" },
  });
};

export const getAllVendors = async () => {
  return prisma.vendorMaster.findMany({
    orderBy: { createdAt: "desc" },
  });
};

// ============ LEAVE MANAGEMENT ============
export const approveLeaveBulk = async (
  leaveRequestIds: string[],
  approverId: string,
  approverComments?: string
) => {
  const updated = await prisma.leaveRequest.updateMany({
    where: { id: { in: leaveRequestIds } },
    data: {
      status: "Approved",
      approverEmployeeId: approverId,
      approverComments,
      approvedAt: new Date(),
    },
  });

  await logAction({
    action: "BULK_LEAVES_APPROVED",
    performedBy: approverId,
    targetId: JSON.stringify(leaveRequestIds),
    details: {
      approverComments,
      count: updated.count,
    },
  });

  return updated;
};

export const rejectLeaveBulk = async (
  leaveRequestIds: string[],
  approverId: string,
  rejectionReason: string
) => {
  const updated = await prisma.leaveRequest.updateMany({
    where: { id: { in: leaveRequestIds } },
    data: {
      status: "Rejected",
      approverEmployeeId: approverId,
      rejectionReason,
      rejectedAt: new Date(),
    },
  });

  await logAction({
    action: "BULK_LEAVES_REJECTED",
    performedBy: approverId,
    targetId: JSON.stringify(leaveRequestIds),
    details: {
      rejectionReason,
      count: updated.count,
    },
  });

  return updated;
};

export const getPendingLeaves = async () => {
  return prisma.leaveRequest.findMany({
    where: { status: "Pending" },
    include: {
      employee: {
        select: {
          id: true,
          name: true,
          email: true,
          department: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

// ============ GRIEVANCE MANAGEMENT ============
export const resolveGrievance = async (
  grievanceId: string,
  resolutionNotes: string,
  status: string,
  resolvedBy: string
) => {
  const grievance = await prisma.grievance.findUnique({
    where: { id: grievanceId },
  });

  if (!grievance) throw new Error("Grievance not found");

  const updated = await prisma.grievance.update({
    where: { id: grievanceId },
    data: {
      status: status as any,
      resolution: resolutionNotes,
      resolutionDate: new Date(),
    },
  });

  await logAction({
    action: "GRIEVANCE_RESOLVED",
    performedBy: resolvedBy,
    targetId: grievanceId,
    details: {
      status,
      resolutionNotes,
    },
  });

  return updated;
};

export const getPendingGrievances = async () => {
  return prisma.grievance.findMany({
    where: {
      status: { in: ["Filed", "UnderReview", "InProgress"] },
    },
    include: {
      employee: {
        select: {
          id: true,
          name: true,
          email: true,
          department: true,
        },
      },
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { submittedDate: "asc" },
  });
};

// ============ PAYROLL MANAGEMENT ============
export const approvePayrollBulk = async (
  payrollIds: string[],
  approverId: string,
  remarks?: string
) => {
  const updated = await prisma.payroll.updateMany({
    where: { id: { in: payrollIds } },
    data: {
      status: "Approved",
      approvedBy: approverId,
      approvedAt: new Date(),
      remarks,
    },
  });

  await logAction({
    action: "BULK_PAYROLL_APPROVED",
    performedBy: approverId,
    targetId: JSON.stringify(payrollIds),
    details: {
      remarks,
      count: updated.count,
    },
  });

  return updated;
};

export const getPendingPayroll = async () => {
  return prisma.payroll.findMany({
    where: { status: "Submitted" },
    include: {
      employee: {
        select: {
          id: true,
          name: true,
          email: true,
          department: true,
        },
      },
    },
    orderBy: { payrollMonth: "desc" },
  });
};

// ============ DATA MANAGEMENT ============
export const deleteRecords = async (
  recordType: string,
  recordIds: string[],
  deletedBy: string,
  reason?: string
) => {
  let deleted: any;

  switch (recordType) {
    case "lead":
      deleted = await prisma.lead.deleteMany({
        where: { id: { in: recordIds } },
      });
      break;
    case "todo":
      deleted = await prisma.todo.deleteMany({
        where: { id: { in: recordIds } },
      });
      break;
    case "notification":
      deleted = await prisma.notification.deleteMany({
        where: { id: { in: recordIds } },
      });
      break;
    case "auditlog":
      deleted = await prisma.auditLog.deleteMany({
        where: { id: { in: recordIds } },
      });
      break;
    default:
      throw new Error("Invalid record type");
  }

  await logAction({
    action: "BULK_DELETE",
    performedBy: deletedBy,
    targetId: JSON.stringify(recordIds),
    details: {
      recordType,
      reason,
      count: deleted.count,
    },
  });

  return deleted;
};

export const getEmployeeStatisticsByDepartment = async () => {
  const departments = await prisma.department.findMany({
    where: { status: "Active" },
  });

  const stats = await Promise.all(
    departments.map(async (dept: any) => {
      const total = await prisma.employee.count({
        where: { department: dept.name },
      });
      const active = await prisma.employee.count({
        where: { department: dept.name, status: "Active" },
      });
      return {
        department: dept.name,
        total,
        active,
        inactive: total - active,
      };
    })
  );

  return stats;
};

export const getLeadStatistics = async (startDate?: Date, endDate?: Date) => {
  const where: any = {};
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  const statuses = ["New", "Contacted", "Interested", "Qualified", "Converted", "Lost",  "OnHold"];
  const stats = await Promise.all(
    statuses.map(async (status) => {
      const count = await prisma.lead.count({
        where: { ...where, status: status as any },
      });
      return { status, count };
    })
  );

  return stats;
};

export const getPurchaseOrderStatistics = async (startDate?: Date, endDate?: Date) => {
  const where: any = {};
  if (startDate || endDate) {
    where.poDate = {};
    if (startDate) where.poDate.gte = startDate;
    if (endDate) where.poDate.lte = endDate;
  }

  const statuses = ["Pending", "Processing", "Completed", "Rejected", "Cancelled"];
  const stats = await Promise.all(
    statuses.map(async (status) => {
      const count = await prisma.purchaseOrder.count({
        where: { ...where, overallStatus: status },
      });
      return { status, count };
    })
  );

  return stats;
};

export const getAttendanceStatistics = async (startDate?: Date, endDate?: Date) => {
  const where: any = {};
  if (startDate || endDate) {
    where.attendanceDate = {};
    if (startDate) where.attendanceDate.gte = startDate;
    if (endDate) where.attendanceDate.lte = endDate;
  }

  const statuses = ["Present", "Absent", "Leave", "HalfDay", "WFH", "Holidays", "WeekOff"];
  const stats = await Promise.all(
    statuses.map(async (status) => {
      const count = await prisma.attendance.count({
        where: { ...where, status: status as any },
      });
      return { status, count };
    })
  );

  return stats;
};
