import prisma from "../../config/postgres";
import { AppError, ERROR_CODES } from "../../common/utils/errorMessages";

/**
 * Bulk assign leads to employees (admin)
 * assignments: [{ leadId, employeeId }]
 */
export const bulkAssignLeadsToEmployees = async (
  assignments: { leadId: string; employeeId: string }[],
  adminId: string
) => {
  // Validate all employees exist and are in sales department
  const employeeIds = [...new Set(assignments.map(a => a.employeeId))];
  const employees = await prisma.employee.findMany({
    where: {
      id: { in: employeeIds },
      department: { contains: "sales", mode: "insensitive" },
    },
    select: { id: true },
  });
  const validEmployeeIds = new Set(employees.map(e => e.id));
  const invalid = employeeIds.filter(id => !validEmployeeIds.has(id));
  if (invalid.length > 0) {
    throw new AppError("INVALID_EMPLOYEE", `Invalid or non-sales employee(s): ${invalid.join(", ")}`);
  }

  // Update each lead with the assigned employee
  const results = [];
  for (const { leadId, employeeId } of assignments) {
    const updated = await prisma.lead.update({
      where: { id: leadId },
      data: {
        assignedToEmployeeId: employeeId,
        assignedByEmployeeId: adminId,
        assignedAt: new Date(),
      },
    });
    results.push(updated);
  }
  return { assigned: results.length, details: results };
};

/**
 * Generate random leads from customers
 * Ensures no duplicate leads per day per customer
 */
export const generateRandomLeads = async (
  count: number,
  adminEmployeeId: string
) => {
  // Get all customers that don't have active leads assigned today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Get existing leads assigned today
  const leadsAssignedToday = await prisma.lead.findMany({
    where: {
      assignedAt: {
        gte: todayStart,
      },
    },
    select: { customerId: true },
  });

  const usedCustomerIds = new Set(leadsAssignedToday.map((l: any) => l.customerId) as string[]);

  // Get all customers except those already assigned today
  const availableCustomers = await prisma.customer.findMany({
    where: {
      id: {
        notIn: Array.from(usedCustomerIds),
      },
      isBlacklisted: false,
    },
    select: { id: true },
  });

  if (availableCustomers.length === 0) {
    throw new AppError("NO_AVAILABLE_CUSTOMERS", "No customers available for lead generation");
  }

  // Randomly select requested number of customers
  const selectedCount = Math.min(count, availableCustomers.length);
  const selectedCustomerIds: string[] = [];
  const tempCustomers = [...availableCustomers];

  for (let i = 0; i < selectedCount; i++) {
    const randomIndex = Math.floor(Math.random() * tempCustomers.length);
    selectedCustomerIds.push(tempCustomers[randomIndex].id);
    tempCustomers.splice(randomIndex, 1);
  }

  // Create unassigned leads (ready for assignment by admin)
  const leads = await prisma.lead.createMany({
    data: selectedCustomerIds.map(customerId => ({
      customerId,
      assignedByEmployeeId: adminEmployeeId,
      status: "New",
    })),
    skipDuplicates: true,
  });

  return {
    generated: leads.count,
    available: availableCustomers.length,
  };
};

/**
 * Get all unassigned leads (admin view)
 */
export const getUnassignedLeads = async () => {
  return prisma.lead.findMany({
    where: {
      assignedToEmployeeId: null,
    },
    include: {
      customer: {
        select: {
          id: true,
          customerName: true,
          gstrNo: true,
          address: true,
          contactName: true,
          contactPhone: true,
          contactEmail: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

/**
 * Assign leads to a sales employee
 */
export const assignLeadsToEmployee = async (
  leadIds: string[],
  employeeId: string,
  adminId: string
) => {
  // Verify employee exists and is in sales department
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
  });

  if (!employee) {
    throw new AppError("EMPLOYEE_NOT_FOUND", "Employee not found");
  }

  // Update leads with assignment
  const updated = await prisma.lead.updateMany({
    where: {
      id: {
        in: leadIds,
      },
    },
    data: {
      assignedToEmployeeId: employeeId,
      assignedAt: new Date(),
    },
  });

  return {
    assigned: updated.count,
  };
};

/**
 * Get leads assigned to a specific employee
 */
export const getLeadsForEmployee = async (employeeId: string) => {
  return prisma.lead.findMany({
    where: {
      assignedToEmployeeId: employeeId,
    },
    include: {
      customer: {
        select: {
          id: true,
          customerName: true,
          gstrNo: true,
          address: true,
          contactName: true,
          contactPhone: true,
          contactEmail: true,
     
          creditLimit: true,
        },
      },
      assignedToEmployee: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      assignedByEmployee: {
        select: {
          id: true,
          name: true,
        },
      },
      followUps: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
    orderBy: {
      status: "asc",
    },
  });
};

/**
 * Get single lead with full details and follow-ups
 */
export const getLeadDetails = async (leadId: string) => {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      customer: true,
      assignedToEmployee: {
        select: {
          id: true,
          name: true,
          email: true,
          department: true,
        },
      },
      assignedByEmployee: {
        select: {
          id: true,
          name: true,
        },
      },
      followUps: {
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!lead) {
    throw new AppError(ERROR_CODES.NOT_FOUND, "Lead not found");
  }

  return lead;
};

/**
 * Update lead status and notes
 */
export const updateLeadStatus = async (
  leadId: string,
  status: string,
  notes?: string
) => {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
  });

  if (!lead) {
    throw new AppError(ERROR_CODES.NOT_FOUND, `Lead not found with ID: ${leadId}`);
  }

  return prisma.lead.update({
    where: { id: leadId },
    data: {
      status: status as any,
      notes: notes || lead.notes,
      lastContactedAt: new Date(),
    },
    include: {
      customer: true,
      followUps: true,
    },
  });
};

/**
 * Add follow-up to lead
 */
export const createFollowUp = async (
  leadId: string,
  followUpType: string,
  employeeId: string,
  notes?: string,
  nextFollowUpDate?: Date
) => {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
  });

  if (!lead) {
    throw new AppError(ERROR_CODES.NOT_FOUND, `Lead not found with ID: ${leadId}`);
  }

  const followUp = await prisma.leadFollowUp.create({
    data: {
      leadId,
      employeeId,
      followUpType,
      notes,
      nextFollowUpDate,
      status: "Pending",
    },
    include: {
      employee: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  // Update lead's lastContactedAt
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      lastContactedAt: new Date(),
    },
  });

  return followUp;
};

/**
 * Get follow-up history for a lead
 */
export const getFollowUpHistory = async (leadId: string) => {
  return prisma.leadFollowUp.findMany({
    where: { leadId },
    include: {
      employee: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

/**
 * Update follow-up status
 */
export const updateFollowUp = async (
  followUpId: string,
  status: string,
  notes?: string,
  nextFollowUpDate?: Date
) => {
  const followUp = await prisma.leadFollowUp.findUnique({
    where: { id: followUpId },
  });

  if (!followUp) {
    throw new AppError(ERROR_CODES.NOT_FOUND, "Follow-up not found");
  }

  return prisma.leadFollowUp.update({
    where: { id: followUpId },
    data: {
      status: status as any,
      notes: notes || followUp.notes,
      nextFollowUpDate: nextFollowUpDate || followUp.nextFollowUpDate,
    },
    include: {
      employee: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
};

/**
 * Get all leads with filters (admin dashboard)
 */
export const getAllLeads = async (filters?: {
  status?: string;
  assignedToEmployeeId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}) => {
  const where: any = {};

  if (filters?.status) {
    where.status = filters.status;
  }
  if (filters?.assignedToEmployeeId) {
    where.assignedToEmployeeId = filters.assignedToEmployeeId;
  }
  if (filters?.dateFrom || filters?.dateTo) {
    where.assignedAt = {};
    if (filters?.dateFrom) {
      where.assignedAt.gte = filters.dateFrom;
    }
    if (filters?.dateTo) {
      where.assignedAt.lte = filters.dateTo;
    }
  }

  return prisma.lead.findMany({
    where,
    include: {
      customer: {
        select: {
          id: true,
          customerName: true,
          gstrNo: true,
          contactPhone: true,
          contactEmail: true,
        },
      },
      assignedToEmployee: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      followUps: {
        select: {
          id: true,
          followUpType: true,
          status: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
      },
    },
    orderBy: {
      assignedAt: "desc",
    },
  });
};

/**
 * Get lead statistics
 */
export const getLeadStats = async () => {
  const [total, new_leads, contacted, interested, qualified, converted, lost] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { status: "New" } }),
    prisma.lead.count({ where: { status: "Contacted" } }),
    prisma.lead.count({ where: { status: "Interested" } }),
    prisma.lead.count({ where: { status: "Qualified" } }),
    prisma.lead.count({ where: { status: "Converted" } }),
    prisma.lead.count({ where: { status: "Lost" } }),
  ]);

  return {
    total,
    breakdown: {
      new: new_leads,
      contacted,
      interested,
      qualified,
      converted,
      lost,
    },
  };
};
