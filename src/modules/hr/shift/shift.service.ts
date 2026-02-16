import prisma from '../../../config/postgres';
import { logger, logAction } from '../../../common/utils/logger';

/**
 * SHIFT MANAGEMENT SERVICE
 */
export const shiftService = {
  async assignShift(data: any) {
    try {
      const shift = await prisma.employeeShift.create({
        data,
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
        action: 'ASSIGN_SHIFT',
        performedBy: 'SYSTEM',
        targetId: shift.id,
        details: {
          employeeId: data.employeeId,
          shiftType: data.shiftType,
          effectiveFrom: data.effectiveFrom,
        },
      });

      logger.info(`Shift assigned: ${shift.id}`);
      return shift;
    } catch (error: any) {
      logger.error('Error assigning shift:', error);
      throw error;
    }
  },

  async getEmployeeShift(employeeId: string) {
    try {
      const shift = await prisma.employeeShift.findFirst({
        where: {
          employeeId,
          effectiveUntil: null,
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

      return shift;
    } catch (error: any) {
      logger.error('Error fetching employee shift:', error);
      throw error;
    }
  },

  async getShiftHistory(employeeId: string) {
    try {
      const shifts = await prisma.employeeShift.findMany({
        where: { employeeId },
        include: {
          employee: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { effectiveFrom: 'desc' },
      });

      return shifts;
    } catch (error: any) {
      logger.error('Error fetching shift history:', error);
      throw error;
    }
  },

  async updateShift(id: string, data: any) {
    try {
      const shift = await prisma.employeeShift.update({
        where: { id },
        data,
        include: {
          employee: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      logger.info(`Shift updated: ${id}`);
      return shift;
    } catch (error: any) {
      logger.error('Error updating shift:', error);
      throw error;
    }
  },
};
