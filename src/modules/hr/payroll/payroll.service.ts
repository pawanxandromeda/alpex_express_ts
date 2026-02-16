import prisma from '../../../config/postgres';
import { logger, logAction } from '../../../common/utils/logger';
import { CreatePayroll, ApprovePayrollSchema } from '../hr.validation';

/**
 * PAYROLL MANAGEMENT SERVICE
 */
export const payrollService = {
  async createPayroll(data: any, createdBy?: string) {
    try {
      const totalAdditions =
        data.baseSalary +
        data.housRentAllowance +
        data.conveyanceAllowance +
        data.medicalAllowance +
        data.specialAllowance +
        data.bonus +
        data.otherAdditions;

      const totalDeductions =
        data.incomeTax +
        data.providentFund +
        data.employeeStateInsurance +
        data.otherDeductions;

      const netSalary = totalAdditions - totalDeductions;

      const payroll = await prisma.payroll.create({
        data: {
          ...data,
          totalAdditions,
          totalDeductions,
          netSalary,
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
        },
      });

      // Log the action to audit trail
      await logAction({
        action: 'CREATE_PAYROLL',
        performedBy: createdBy || 'SYSTEM',
        targetId: payroll.id,
        details: {
          employeeId: data.employeeId,
          baseSalary: data.baseSalary,
          totalAdditions,
          totalDeductions,
          netSalary,
        },
      });

      logger.info(`Payroll created: ${payroll.id}`);
      return payroll;
    } catch (error: any) {
      logger.error('Error creating payroll:', error);
      throw error;
    }
  },

  async approvePayroll(id: string, approvedBy: string, remarks?: string) {
    try {
      const payroll = await prisma.payroll.update({
        where: { id },
        data: {
          status: 'Approved',
          approvedBy,
          approvedAt: new Date(),
          remarks,
        },
        include: {
          employee: true,
        },
      });

      // Log the action to audit trail
      await logAction({
        action: 'APPROVE_PAYROLL',
        performedBy: approvedBy,
        targetId: id,
        details: {
          remarks,
        },
      });

      logger.info(`Payroll approved: ${id}`);
      return payroll;
    } catch (error: any) {
      logger.error('Error approving payroll:', error);
      throw error;
    }
  },

  async processPayroll(id: string) {
    try {
      const payroll = await prisma.payroll.update({
        where: { id },
        data: {
          status: 'Processed',
        },
        include: {
          employee: true,
        },
      });

      // Log the action to audit trail
      await logAction({
        action: 'PROCESS_PAYROLL',
        performedBy: 'SYSTEM',
        targetId: id,
        details: {
          employeeId: payroll.employeeId,
        },
      });

      logger.info(`Payroll processed: ${id}`);
      return payroll;
    } catch (error: any) {
      logger.error('Error processing payroll:', error);
      throw error;
    }
  },

  async getPayrollRecords(query: any) {
    try {
      const { employeeId, status, month, skip = 0, take = 10 } = query;

      const whereClause: any = {};

      if (employeeId) whereClause.employeeId = employeeId;
      if (status) whereClause.status = status;

      if (month) {
        const monthDate = new Date(month);
        const startDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
        const endDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

        whereClause.payrollMonth = {
          $gte: startDate,
          $lte: endDate,
        };
      }

      const [payrolls, total] = await Promise.all([
        prisma.payroll.findMany({
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
          },
          skip,
          take,
          orderBy: { payrollMonth: 'desc' },
        }),
        prisma.payroll.count({ where: whereClause }),
      ]);

      return { payrolls, total, pages: Math.ceil(total / take) };
    } catch (error: any) {
      logger.error('Error fetching payroll records:', error);
      throw error;
    }
  },
};
