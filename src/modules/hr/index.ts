/**
 * HR Module - Main Export File
 * Exports all controllers, services, and utilities for the HR module
 */

// Controllers
export {
  hrLeaveController,
  hrAttendanceController,
  hrPayrollController,
  hrDocumentController,

  hrShiftController,
  hrTrainingController,

} from './hr.controller';

// Services
export { leaveService } from './leave/leave.service';
export { attendanceService } from './attendance/attendance.service';
export { payrollService } from './payroll/payroll.service';
export { employeeDocumentService } from './documents/documents.service';
export { shiftService } from './shift/shift.service';
export { trainingService } from './training/training.service';

// Utilities
// export { pdfExtractionService } from './utils/pdf.extraction';

// Validation Schemas
export {
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
  LeaveTypeEnum,
  LeaveStatusEnum,
  AttendanceStatusEnum,
  PayrollStatusEnum,
  PerformanceRatingEnum,
  GrievanceStatusEnum,
  DocumentTypeEnum,
  ShiftTypeEnum,
} from './hr.validation';

// Routes
export { default as hrRoutes } from './hr.routes';
