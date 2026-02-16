import prisma from '../../../config/postgres';
import { logger, logAction } from '../../../common/utils/logger';
import { CreateLeaveRequest, LeaveStatusEnum } from '../hr.validation';

/**
 * LEAVE MANAGEMENT SERVICE
 */
export const leaveService = {
 async createLeaveRequest(data: any) {
  if (!data.employeeId || !data.requestedBy) {
    throw new Error('employeeId and requestedBy are required');
  }

  const numberOfDays =
    data.numberOfDays ||
    Math.ceil(
      (new Date(data.endDate).getTime() - new Date(data.startDate).getTime()) /
        (1000 * 60 * 60 * 24)
    ) + 1;

  const leaveRequest = await prisma.leaveRequest.create({
    data: {
      ...data,
      numberOfDays,
    },
  });

  await logAction({
    action: 'CREATE_LEAVE_REQUEST',
    performedBy: data.requestedBy,
    targetId: leaveRequest.id,
    details: {
      employeeId: data.employeeId,
      requestedBy: data.requestedBy,
      leaveType: data.leaveType,
      startDate: data.startDate,
      endDate: data.endDate,
      numberOfDays,
    },
  });

  return leaveRequest;
}
,

  async approveLeaveRequest(id: string, approverId: string, comments?: string) {
    try {
      const leaveRequest = await prisma.leaveRequest.update({
        where: { id },
        data: {
          status: 'Approved',
          approverComments: comments,
          approvedAt: new Date(),
          approverEmployeeId: approverId,
        },
        include: {
          employee: true,
          approverEmployee: true,
        },
      });

      // Update employee leave balance
      await prisma.employee.update({
        where: { id: leaveRequest.employeeId },
        data: {
          usedLeave: {
            increment: leaveRequest.numberOfDays,
          },
        },
      });

      // Log the action to audit trail
      await logAction({
        action: 'APPROVE_LEAVE_REQUEST',
        performedBy: approverId,
        targetId: id,
        details: {
          employeeId: leaveRequest.employeeId,
          approverComments: comments,
          numberOfDays: leaveRequest.numberOfDays,
        },
      });

      logger.info(`Leave request approved: ${id}`);
      return leaveRequest;
    } catch (error: any) {
      logger.error('Error approving leave request:', error);
      throw error;
    }
  },

  async rejectLeaveRequest(id: string, approverId: string, reason: string) {
    try {
      const leaveRequest = await prisma.leaveRequest.update({
        where: { id },
        data: {
          status: 'Rejected',
          rejectionReason: reason,
          rejectedAt: new Date(),
          approverEmployeeId: approverId,
        },
        include: {
          employee: true,
        },
      });

      // Log the action to audit trail
      await logAction({
        action: 'REJECT_LEAVE_REQUEST',
        performedBy: approverId,
        targetId: id,
        details: {
          employeeId: leaveRequest.employeeId,
          rejectionReason: reason,
        },
      });

      logger.info(`Leave request rejected: ${id}`);
      return leaveRequest;
    } catch (error: any) {
      logger.error('Error rejecting leave request:', error);
      throw error;
    }
  },

  async getLeaveRequests(query: any) {
    try {
      const {
        employeeId,
        status,
        leaveType,
        startDate,
        endDate,
        skip = 0,
        take = 10,
      } = query;

      const whereClause: any = {};

      if (employeeId) whereClause.employeeId = employeeId;
      if (status) whereClause.status = status;
      if (leaveType) whereClause.leaveType = leaveType;

      if (startDate || endDate) {
        whereClause.startDate = {};
        if (startDate) whereClause.startDate.$gte = new Date(startDate);
        if (endDate) whereClause.endDate = { $lte: new Date(endDate) };
      }

      const [leaveRequests, total] = await Promise.all([
        prisma.leaveRequest.findMany({
          where: whereClause,
          include: {
            employee: {
              select: {
                id: true,
                name: true,
                email: true,
                department: true,
              },
            },
            approverEmployee: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          skip,
          take,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.leaveRequest.count({ where: whereClause }),
      ]);

      return { leaveRequests, total, pages: Math.ceil(total / take) };
    } catch (error: any) {
      logger.error('Error fetching leave requests:', error);
      throw error;
    }
  },

  async getEmployeeLeaveBalance(employeeId: string) {
    try {
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: {
          id: true,
          name: true,
          totalLeaveBalance: true,
          usedLeave: true,
        },
      });

      if (!employee) {
        throw new Error('Employee not found');
      }

      return {
        totalBalance: employee.totalLeaveBalance || 0,
        usedLeave: employee.usedLeave || 0,
        remainingLeave: (employee.totalLeaveBalance || 0) - (employee.usedLeave || 0),
      };
    } catch (error: any) {
      logger.error('Error fetching leave balance:', error);
      throw error;
    }
  },
};

