import prisma from '../../../config/postgres';
import { logAction, logger } from '../../../common/utils/logger';
import { CreateAttendance, UpdateAttendanceSchema } from '../hr.validation';

/**
 * ATTENDANCE MANAGEMENT SERVICE
 */
export const attendanceService = {
  async recordAttendance(data: any, performedBy?: string) {
    try {
      const attendanceDate = new Date(data.attendanceDate);
      attendanceDate.setHours(0, 0, 0, 0);

      // Check if record already exists for this date
      const existing = await prisma.attendance.findUnique({
        where: {
          employeeId_attendanceDate: {
            employeeId: data.employeeId,
            attendanceDate,
          },
        },
      });

      if (existing) {
        throw new Error('Attendance record already exists for this date');
      }

      const attendance = await prisma.attendance.create({
        data: {
          ...data,
          attendanceDate,
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
        action: 'CREATE_ATTENDANCE',
        performedBy: performedBy || 'SYSTEM',
        targetId: attendance.id,
        details: {
          employeeId: data.employeeId,
          status: data.status,
          attendanceDate,
        },
      });

      logger.info(`Attendance recorded: ${attendance.id}`);
      return attendance;
    } catch (error: any) {
      logger.error('Error recording attendance:', error);
      throw error;
    }
  },

  async updateAttendance(id: string, data: any) {
    try {
      const attendance = await prisma.attendance.update({
        where: { id },
        data,
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

      // Log the action to audit trail
      await logAction({
        action: 'UPDATE_ATTENDANCE',
        performedBy: data.performedBy || 'SYSTEM',
        targetId: id,
        details: data,
      });

      logger.info(`Attendance updated: ${id}`);
      return attendance;
    } catch (error: any) {
      logger.error('Error updating attendance:', error);
      throw error;
    }
  },

  async getAttendanceReport(query: any) {
    try {
      const { employeeId, month, year, skip = 0, take = 100 } = query;

      const whereClause: any = {};

      if (employeeId) whereClause.employeeId = employeeId;

      if (month && year) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        whereClause.attendanceDate = {
          $gte: startDate,
          $lte: endDate,
        };
      }

      const [records, total] = await Promise.all([
        prisma.attendance.findMany({
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
          orderBy: { attendanceDate: 'desc' },
        }),
        prisma.attendance.count({ where: whereClause }),
      ]);

      // Calculate summary
      const presentDays = records.filter((r) => r.status === 'Present').length;
      const absentDays = records.filter((r) => r.status === 'Absent').length;
      const leaveDays = records.filter((r) => r.status === 'Leave').length;

      return {
        records,
        summary: {
          presentDays,
          absentDays,
          leaveDays,
          totalWorkingDays: records.length,
        },
        total,
        pages: Math.ceil(total / take),
      };
    } catch (error: any) {
      logger.error('Error fetching attendance report:', error);
      throw error;
    }
  },

  async bulkImportAttendance(data: any[]) {
    try {
      const results = [];
      for (const record of data) {
        try {
          const attendance = await this.recordAttendance(record);
          results.push({ success: true, data: attendance });
        } catch (error: any) {
          results.push({ success: false, error: error.message, record });
        }
      }
      return results;
    } catch (error: any) {
      logger.error('Error bulk importing attendance:', error);
      throw error;
    }
  },
};
