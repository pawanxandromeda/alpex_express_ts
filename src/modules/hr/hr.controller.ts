import { Request, Response } from 'express';
import { sendSuccess, sendError, handleError } from '../../common/utils/responseFormatter';
import { ERROR_CODES } from '../../common/utils/errorMessages';
import { logger } from '../../common/utils/logger';
import {
  CreateLeaveRequestSchema,
  UpdateLeaveRequestSchema,
  LeaveQuerySchema,
  CreateAttendanceSchema,
  UpdateAttendanceSchema,
  AttendanceReportSchema,
  CreatePayrollSchema,
  ApprovePayrollSchema,
  PayrollQuerySchema,
  CreateEmployeeDocumentSchema,
  VerifyDocumentSchema,
  CreatePerformanceReviewSchema,
  CreateGrievanceSchema,
  UpdateGrievanceSchema,
  CreateEmployeeShiftSchema,
  CreateTrainingSchema,
  UpdateTrainingSchema,
  CreateBenefitSchema,
} from '../hr/hr.validation';
import { leaveService } from '../hr/leave/leave.service';
import { attendanceService } from '../hr//attendance/attendance.service';
import { payrollService } from '../hr/payroll/payroll.service';
import { employeeDocumentService } from '../hr/documents/documents.service';
import { shiftService } from '../hr/shift/shift.service';
import { trainingService } from '../hr/training/training.service';
import prisma from '../../config/postgres';

/**
 * HR LEAVE CONTROLLER
 */
export const hrLeaveController = {
 async createLeaveRequest(req: Request, res: Response) {
  try {
    const parsed = CreateLeaveRequestSchema.parse({
      body: req.body,
      query: req.query,
      params: req.params
    });

    const data = parsed.body;
    const user = (req as any).user;

    if (!user?.id) {
      return sendError(res, ERROR_CODES.UNAUTHORIZED, 'Unauthorized', 401);
    }

    // Who is creating
    const requestedBy = user.id;

    // If employeeId not provided, assume self
    if (!data.employeeId) {
      data.employeeId = user.id;
    }

    // 🔒 Permission checks
    if (user.role === 'user' && data.employeeId !== user.id) {
      return sendError(res, ERROR_CODES.FORBIDDEN, 'Employees can only request their own leave', 403);
    }

    if (['manager', 'hr'].includes(user.role)) {
      const targetEmployee = await prisma.employee.findUnique({
        where: { id: data.employeeId },
      });

      if (!targetEmployee) {
        return sendError(res, ERROR_CODES.NOT_FOUND, 'Employee not found', 404);
      }

      // Optional: dept restriction
      if (user.role === 'manager' && targetEmployee.department !== user.department) {
        return sendError(res, ERROR_CODES.FORBIDDEN, 'Cannot request leave for another department', 403);
      }
    }

    const result = await leaveService.createLeaveRequest({
      ...data,
      requestedBy,
    });

    return sendSuccess(res, result, 'Leave request created successfully', 201);
  } catch (error) {
    logger.error('Error in createLeaveRequest:', error);
    return handleError(res, error);
  }
}
,
  async approveLeaveRequest(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { approverId, comments } = req.body;

      if (!approverId) {
        return sendError(res, ERROR_CODES.VALIDATION_ERROR, 'Approver ID is required', 400);
      }

      const result = await leaveService.approveLeaveRequest(id as string, approverId, comments);
      return sendSuccess(res, result, 'Leave request approved');
    } catch (error: any) {
      logger.error('Error in approveLeaveRequest:', error);
      return handleError(res, error);
    }
  },

  async rejectLeaveRequest(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { approverId, rejectionReason } = req.body;

      if (!approverId || !rejectionReason) {
        return sendError(res, ERROR_CODES.VALIDATION_ERROR, 'Approver ID and rejection reason are required', 400);
      }

      const result = await leaveService.rejectLeaveRequest(id as string, approverId, rejectionReason);
      return sendSuccess(res, result, 'Leave request rejected');
    } catch (error: any) {
      logger.error('Error in rejectLeaveRequest:', error);
      return handleError(res, error);
    }
  },

  async getLeaveRequests(req: Request, res: Response) {
    try {
      const query = LeaveQuerySchema.parse(req.query);
      const result = await leaveService.getLeaveRequests(query);
      return sendSuccess(res, result, 'Leave requests fetched successfully');
    } catch (error: any) {
      logger.error('Error in getLeaveRequests:', error);
      return handleError(res, error);
    }
  },

  async getLeaveBalance(req: Request, res: Response) {
    try {
      const { employeeId } = req.params;
      const result = await leaveService.getEmployeeLeaveBalance(employeeId as string);
      return sendSuccess(res, result, 'Leave balance fetched');
    } catch (error: any) {
      logger.error('Error in getLeaveBalance:', error);
      return handleError(res, error);
    }
  },
};

/**
 * HR ATTENDANCE CONTROLLER
 */
export const hrAttendanceController = {
  async recordAttendance(req: Request, res: Response) {
    try {
      const parsed = CreateAttendanceSchema.parse({ body: req.body, query: req.query, params: req.params });
      const data = parsed.body;
      const result = await attendanceService.recordAttendance(data);
      return sendSuccess(res, result, 'Attendance recorded successfully', 201);
    } catch (error: any) {
      logger.error('Error in recordAttendance:', error);
      return handleError(res, error);
    }
  },

  async updateAttendance(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const parsed = UpdateAttendanceSchema.parse({ body: req.body, query: req.query, params: req.params });
      const data = parsed.body;
      const result = await attendanceService.updateAttendance(id as string, data);
      return sendSuccess(res, result, 'Attendance updated');
    } catch (error: any) {
      logger.error('Error in updateAttendance:', error);
      return handleError(res, error);
    }
  },

  async getAttendanceReport(req: Request, res: Response) {
    try {
      const query = AttendanceReportSchema.parse(req.query);
      const result = await attendanceService.getAttendanceReport(query);
      return sendSuccess(res, result, 'Attendance report fetched');
    } catch (error: any) {
      logger.error('Error in getAttendanceReport:', error);
      return handleError(res, error);
    }
  },

  async bulkImportAttendance(req: Request, res: Response) {
    try {
      const { attendanceRecords } = req.body;

      if (!Array.isArray(attendanceRecords)) {
        return sendError(res, ERROR_CODES.VALIDATION_ERROR, 'Attendance records must be an array', 400);
      }

      const results = await attendanceService.bulkImportAttendance(attendanceRecords);
      return sendSuccess(res, results, 'Attendance records imported', 201);
    } catch (error: any) {
      logger.error('Error in bulkImportAttendance:', error);
      return handleError(res, error);
    }
  },
};

/**
 * HR PAYROLL CONTROLLER
 */
export const hrPayrollController = {
  async createPayroll(req: Request, res: Response) {
    try {
      const parsed = CreatePayrollSchema.parse({ body: req.body, query: req.query, params: req.params });
      const data = parsed.body;
      const result = await payrollService.createPayroll(data);
      return sendSuccess(res, result, 'Payroll created', 201);
    } catch (error: any) {
      logger.error('Error in createPayroll:', error);
      return handleError(res, error);
    }
  },

  async approvePayroll(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const parsed = ApprovePayrollSchema.parse({ body: req.body, query: req.query, params: req.params });
      const data = parsed.body;

      const result = await payrollService.approvePayroll(id as string, data.approvedBy, data.remarks);
      return sendSuccess(res, result, 'Payroll approved');
    } catch (error: any) {
      logger.error('Error in approvePayroll:', error);
      return handleError(res, error);
    }
  },

  async processPayroll(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await payrollService.processPayroll(id as string);
      return sendSuccess(res, result, 'Payroll processed');
    } catch (error: any) {
      logger.error('Error in processPayroll:', error);
      return handleError(res, error);
    }
  },

  async getPayrollRecords(req: Request, res: Response) {
    try {
      const query = PayrollQuerySchema.parse(req.query);
      const result = await payrollService.getPayrollRecords(query);
      return sendSuccess(res, result, 'Payroll records fetched');
    } catch (error: any) {
      logger.error('Error in getPayrollRecords:', error);
      return handleError(res, error);
    }
  },
};

/**
 * HR DOCUMENT CONTROLLER
 */
export const hrDocumentController = {
  async uploadDocument(req: Request, res: Response) {
    try {
      const parsed = CreateEmployeeDocumentSchema.parse({ body: req.body, query: req.query, params: req.params });
      const data = parsed.body;
      const result = await employeeDocumentService.uploadDocument(data);
      return sendSuccess(res, result, 'Document uploaded successfully', 201);
    } catch (error: any) {
      logger.error('Error in uploadDocument:', error);
      return handleError(res, error);
    }
  },

  async verifyDocument(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, verifiedBy, remarks } = req.body;

      const result = await employeeDocumentService.verifyDocument(
        id as string,
        status,
        verifiedBy,
        remarks
      );
      return sendSuccess(res, result, 'Document verified');
    } catch (error: any) {
      logger.error('Error in verifyDocument:', error);
      return handleError(res, error);
    }
  },

  async getEmployeeDocuments(req: Request, res: Response) {
    try {
      const { employeeId } = req.params;
      const result = await employeeDocumentService.getEmployeeDocuments(employeeId as string);
      return sendSuccess(res, result, 'Documents fetched');
    } catch (error: any) {
      logger.error('Error in getEmployeeDocuments:', error);
      return handleError(res, error);
    }
  },

  async extractDocumentData(req: Request, res: Response) {
    try {
      const { fileUrl } = req.body;

      if (!fileUrl) {
        return sendError(res, ERROR_CODES.VALIDATION_ERROR, 'File URL is required', 400);
      }

      const result = await employeeDocumentService.extractDocumentData(fileUrl);
      return sendSuccess(res, result, 'Document data extracted');
    } catch (error: any) {
      logger.error('Error in extractDocumentData:', error);
      return handleError(res, error);
    }
  },
};



/**
 * HR SHIFT CONTROLLER
 */
export const hrShiftController = {
  async assignShift(req: Request, res: Response) {
    try {
      const parsed = CreateEmployeeShiftSchema.parse({ body: req.body, query: req.query, params: req.params });
      const data = parsed.body;
      const result = await shiftService.assignShift(data);
      return sendSuccess(res, result, 'Shift assigned', 201);
    } catch (error: any) {
      logger.error('Error in assignShift:', error);
      return handleError(res, error);
    }
  },

  async getEmployeeShift(req: Request, res: Response) {
    try {
      const { employeeId } = req.params;
      const result = await shiftService.getEmployeeShift(employeeId as string);
      return sendSuccess(res, result, 'Employee shift fetched');
    } catch (error: any) {
      logger.error('Error in getEmployeeShift:', error);
      return handleError(res, error);
    }
  },

  async getShiftHistory(req: Request, res: Response) {
    try {
      const { employeeId } = req.params;
      const result = await shiftService.getShiftHistory(employeeId as string);
      return sendSuccess(res, result, 'Shift history fetched');
    } catch (error: any) {
      logger.error('Error in getShiftHistory:', error);
      return handleError(res, error);
    }
  },

  async updateShift(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body;
      const result = await shiftService.updateShift(id as string, data);
      return sendSuccess(res, result, 'Shift updated');
    } catch (error: any) {
      logger.error('Error in updateShift:', error);
      return handleError(res, error);
    }
  },
};

/**
 * HR TRAINING CONTROLLER
 */
export const hrTrainingController = {
  async enrollTraining(req: Request, res: Response) {
    try {
      const parsed = CreateTrainingSchema.parse({ body: req.body, query: req.query, params: req.params });
      const data = parsed.body;
      const result = await trainingService.enrollTraining(data);
      return sendSuccess(res, result, 'Training enrollment created', 201);
    } catch (error: any) {
      logger.error('Error in enrollTraining:', error);
      return handleError(res, error);
    }
  },

  async completeTraining(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const parsed = UpdateTrainingSchema.parse({ body: req.body, query: req.query, params: req.params });
      const data = parsed.body;
      const result = await trainingService.completeTraining(id as string, data);
      return sendSuccess(res, result, 'Training completed');
    } catch (error: any) {
      logger.error('Error in completeTraining:', error);
      return handleError(res, error);
    }
  },

  async getEmployeeTrainingHistory(req: Request, res: Response) {
    try {
      const { employeeId } = req.params;
      const result = await trainingService.getEmployeeTrainingHistory(employeeId as string);
      return sendSuccess(res, result, 'Training history fetched');
    } catch (error: any) {
      logger.error('Error in getEmployeeTrainingHistory:', error);
      return handleError(res, error);
    }
  },

  async getTrainingStats(req: Request, res: Response) {
    try {
      const { employeeId } = req.params;
      const result = await trainingService.getTrainingStats(employeeId as string);
      return sendSuccess(res, result, 'Training stats fetched');
    } catch (error: any) {
      logger.error('Error in getTrainingStats:', error);
      return handleError(res, error);
    }
  },
};


