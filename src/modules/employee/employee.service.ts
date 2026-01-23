import bcrypt from "bcryptjs";
import prisma from "../../config/postgres";

export const createEmployee = async (data: any, creator: any) => {
  const isAdminCreator = creator?.department === "admin";

  return prisma.employee.create({
    data: {
      ...data,

      approvalStatus: isAdminCreator ? "Approved" : "Pending",
      status: isAdminCreator ? "Active" : "Inactive",

      approvedBy: isAdminCreator ? creator.id : null,
      approvedAt: isAdminCreator ? new Date() : null,
    },
  });
};


export const getEmployees = async () =>
  prisma.employee.findMany({
    select: {
      id: true,
      username: true,
      name: true,
      designation: true,
      department: true,
      approvalStatus: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

/**
 * Get pending employee approvals (for admin)
 */
export const getPendingApprovals = async () =>
  prisma.employee.findMany({
    where: { approvalStatus: "Pending" },
    select: {
      id: true,
      username: true,
      name: true,
      designation: true,
      department: true,
      authorization: true,
      createdAt: true,
      approvalStatus: true,
    },
  });

/**
 * Approve an employee
 */
export const approveEmployee = async (
  employeeId: string,
  adminId: string
) => {
  const employee = await prisma.employee.update({
    where: { id: employeeId },
    data: {
      approvalStatus: "Approved",
      status: "Active",
      approvedBy: adminId,
      approvedAt: new Date(),
    },
  });
  return employee;
};

/**
 * Reject an employee
 */
export const rejectEmployee = async (
  employeeId: string,
  adminId: string,
  reason: string
) => {
  const employee = await prisma.employee.update({
    where: { id: employeeId },
    data: {
      approvalStatus: "Rejected",
      approvedBy: adminId,
      rejectionReason: reason,
      approvedAt: new Date(),
    },
  });
  return employee;
};

export const updateEmployee = async (id: string, data: any) => {
  if (data.password)
    data.password = await bcrypt.hash(data.password, 10);

  return prisma.employee.update({ where: { id }, data });
};

export const deleteEmployee = async (id: string) =>
  prisma.employee.delete({ where: { id } });

