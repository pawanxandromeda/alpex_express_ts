import { Router } from 'express';
import { protect } from '../../../src/common/middleware/auth.middleware';
import { authorize } from '../../common/middleware/authorization.middleware';
import { validate } from '../../common/middleware/zod.validate';
import {
  hrLeaveController,
  hrAttendanceController,
  hrPayrollController,
  hrDocumentController,
  hrShiftController,
  hrTrainingController,

} from './hr.controller';
import {
  CreateLeaveRequestSchema,
  UpdateLeaveRequestSchema,
  CreateAttendanceSchema,
  UpdateAttendanceSchema,
  CreatePayrollSchema,
  ApprovePayrollSchema,
  CreatePerformanceReviewSchema,
  CreateGrievanceSchema,
  UpdateGrievanceSchema,
  CreateEmployeeShiftSchema,
  CreateTrainingSchema,
  UpdateTrainingSchema,
  CreateBenefitSchema,
  CreateEmployeeDocumentSchema,
} from './hr.validation';

const router = Router();

// Middleware
router.use(protect);

// ============ LEAVE MANAGEMENT ROUTES ============
router.post('/leave/request', validate(CreateLeaveRequestSchema), hrLeaveController.createLeaveRequest);
router.get('/leave/requests', hrLeaveController.getLeaveRequests);
router.post('/leave/request/:id/approve', authorize(['admin', 'manager']), hrLeaveController.approveLeaveRequest);
router.post('/leave/request/:id/reject', authorize(['admin', 'manager']), hrLeaveController.rejectLeaveRequest);
router.get('/leave/balance/:employeeId', hrLeaveController.getLeaveBalance);

// ============ ATTENDANCE ROUTES ============
router.post('/attendance', validate(CreateAttendanceSchema), authorize(['admin', 'manager']), hrAttendanceController.recordAttendance);
router.put('/attendance/:id', validate(UpdateAttendanceSchema), authorize(['admin', 'manager']), hrAttendanceController.updateAttendance);
router.get('/attendance/report', hrAttendanceController.getAttendanceReport);
router.post('/attendance/bulk-import', authorize(['admin']), hrAttendanceController.bulkImportAttendance);

// ============ PAYROLL ROUTES ============
router.post('/payroll', validate(CreatePayrollSchema), authorize(['admin', 'manager']), hrPayrollController.createPayroll);
router.post('/payroll/:id/approve', validate(ApprovePayrollSchema), authorize(['admin']), hrPayrollController.approvePayroll);
router.post('/payroll/:id/process', authorize(['admin']), hrPayrollController.processPayroll);
router.get('/payroll/records', hrPayrollController.getPayrollRecords);

// ============ EMPLOYEE DOCUMENTS ROUTES ============
router.post(
  '/documents/upload',
  validate(CreateEmployeeDocumentSchema),
  hrDocumentController.uploadDocument
);
router.put('/documents/:id/verify', authorize(['admin', 'manager']), hrDocumentController.verifyDocument);
router.get('/documents/employee/:employeeId', hrDocumentController.getEmployeeDocuments);
router.post('/documents/extract', hrDocumentController.extractDocumentData);





// ============ SHIFT MANAGEMENT ROUTES ============
router.post('/shift/assign', validate(CreateEmployeeShiftSchema), authorize(['admin', 'manager']), hrShiftController.assignShift);
router.get('/shift/current/:employeeId', hrShiftController.getEmployeeShift);
router.get('/shift/history/:employeeId', hrShiftController.getShiftHistory);
router.put('/shift/:id', authorize(['admin', 'manager']), hrShiftController.updateShift);

// ============ TRAINING ROUTES ============
router.post('/training/enroll', validate(CreateTrainingSchema), authorize(['admin', 'manager']), hrTrainingController.enrollTraining);
router.put(
  '/training/:id/complete',
  validate(UpdateTrainingSchema),
  authorize(['admin', 'manager']),
  hrTrainingController.completeTraining
);
router.get('/training/history/:employeeId', hrTrainingController.getEmployeeTrainingHistory);
router.get('/training/stats/:employeeId', hrTrainingController.getTrainingStats);



export default router;
