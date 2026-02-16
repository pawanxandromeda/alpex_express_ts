import { z } from 'zod';

// ============ LEAVE MANAGEMENT VALIDATION ============
export const LeaveTypeEnum = z.enum([
  'Sick',
  'Casual',
  'Earned',
  'Maternity',
  'Paternity',
  'Unpaid',
  'Special',
  'Bereavement',
  'Marriage',
  'Study',
]);

export const LeaveStatusEnum = z.enum([
  'Pending',
  'Approved',
  'Rejected',
  'Cancelled',
]);

export const CreateLeaveRequestSchema = z.object({
  body: z.object({
    employeeId: z.string().uuid('Invalid employee ID').optional(),
    leaveType: LeaveTypeEnum,
    startDate: z.preprocess((val) => {
      if (typeof val === 'string') {
        return new Date(val);
      }
      return val;
    }, z.date().refine((date) => !isNaN(date.getTime()), 'Invalid date')),
    endDate: z.preprocess((val) => {
      if (typeof val === 'string') {
        return new Date(val);
      }
      return val;
    }, z.date().refine((date) => !isNaN(date.getTime()), 'Invalid date')),
    numberOfDays: z.number().int().min(1).max(365).optional(),
    reason: z.string().optional(),
    attachmentUrl: z.string().url().optional(),
  }).refine((data) => data.endDate >= data.startDate, {
    message: 'End date must be after start date',
    path: ['endDate'],
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const UpdateLeaveRequestSchema = z.object({
  status: LeaveStatusEnum.optional(),
  approverComments: z.string().optional(),
  rejectionReason: z.string().optional(),
});

export const LeaveQuerySchema = z.object({
  employeeId: z.string().optional(),
  status: LeaveStatusEnum.optional(),
  leaveType: LeaveTypeEnum.optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  skip: z.coerce.number().default(0),
  take: z.coerce.number().default(10),
});

// ============ ATTENDANCE VALIDATION ============
export const AttendanceStatusEnum = z.enum([
  'Present',
  'Absent',
  'Leave',
  'HalfDay',
  'WFH',
  'Holidays',
  'WeekOff',
]);

export const CreateAttendanceSchema = z.object({
  body: z.object({
    employeeId: z.string().uuid('Invalid employee ID'),
    attendanceDate: z.coerce.date().or(z.string().datetime()),
    status: AttendanceStatusEnum,
    checkInTime: z.coerce.date().optional(),
    checkOutTime: z.coerce.date().optional(),
    workingHours: z.number().min(0).max(24).optional(),
    location: z.string().optional(),
    notes: z.string().optional(),
    deviceId: z.string().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const UpdateAttendanceSchema = z.object({
  body: z.object({
    status: AttendanceStatusEnum.optional(),
    checkOutTime: z.coerce.date().optional(),
    workingHours: z.number().min(0).max(24).optional(),
    notes: z.string().optional(),
    verifiedBy: z.string().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid().optional(),
  }).optional(),
});

export const AttendanceReportSchema = z.object({
  employeeId: z.string().optional(),
  month: z.coerce.date().optional(),
  year: z.number().optional(),
  skip: z.coerce.number().default(0),
  take: z.coerce.number().default(10),
});

// ============ PAYROLL VALIDATION ============
export const PayrollStatusEnum = z.enum([
  'Draft',
  'Submitted',
  'Approved',
  'Processed',
  'Paid',
  'Rejected',
]);

export const CreatePayrollSchema = z.object({
  body: z.object({
    employeeId: z.string().uuid('Invalid employee ID'),
    payrollMonth: z.coerce.date(),
    baseSalary: z.number().min(0),
    housRentAllowance: z.number().min(0).default(0),
    conveyanceAllowance: z.number().min(0).default(0),
    medicalAllowance: z.number().min(0).default(0),
    specialAllowance: z.number().min(0).default(0),
    bonus: z.number().min(0).default(0),
    otherAdditions: z.number().min(0).default(0),
    incomeTax: z.number().min(0).default(0),
    providentFund: z.number().min(0).default(0),
    employeeStateInsurance: z.number().min(0).default(0),
    otherDeductions: z.number().min(0).default(0),
    remarks: z.string().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const ApprovePayrollSchema = z.object({
  body: z.object({
    approvedBy: z.string(),
    remarks: z.string().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid().optional(),
  }).optional(),
});

export const PayrollQuerySchema = z.object({
  employeeId: z.string().optional(),
  status: PayrollStatusEnum.optional(),
  month: z.coerce.date().optional(),
  skip: z.coerce.number().default(0),
  take: z.coerce.number().default(10),
});

// ============ EMPLOYEE DOCUMENT VALIDATION ============
export const DocumentTypeEnum = z.enum([
  'Aadhar',
  'PAN',
  'DrivingLicense',
  'Passport',
  'EducationCertificate',
  'ExperienceCertificate',
  'MedicalReport',
  'Other',
]);

export const CreateEmployeeDocumentSchema = z.object({
  body: z.object({
    employeeId: z.string().uuid('Invalid employee ID'),
    documentType: DocumentTypeEnum,
    documentName: z.string().min(1),
    documentNumber: z.string().optional(),
    fileUrl: z.string().url('Invalid file URL'),
    expiryDate: z.coerce.date().optional(),
    issueDate: z.coerce.date().optional(),
    issuingAuthority: z.string().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const VerifyDocumentSchema = z.object({
  body: z.object({
    verificationStatus: z.enum(['Pending', 'Verified', 'Rejected']),
    verifiedBy: z.string().optional(),
    remarks: z.string().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid().optional(),
  }).optional(),
});

// ============ PERFORMANCE REVIEW VALIDATION ============
export const PerformanceRatingEnum = z.enum([
  'Outstanding',
  'Exceeds',
  'Meets',
  'Developing',
  'Unsatisfactory',
]);

export const CreatePerformanceReviewSchema = z.object({
  body: z.object({
    revieweeId: z.string().uuid('Invalid employee ID'),
    reviewerId: z.string().uuid('Invalid reviewer ID'),
    reviewPeriodStart: z.coerce.date(),
    reviewPeriodEnd: z.coerce.date(),
    overallRating: PerformanceRatingEnum,
    technicalSkills: PerformanceRatingEnum.optional(),
    communication: PerformanceRatingEnum.optional(),
    teamwork: PerformanceRatingEnum.optional(),
    leadership: PerformanceRatingEnum.optional(),
    reliability: PerformanceRatingEnum.optional(),
    innovation: PerformanceRatingEnum.optional(),
    achievements: z.string().optional(),
    areasOfImprovement: z.string().optional(),
    feedback: z.string().optional(),
    goals: z.string().optional(),
    developmentPlan: z.string().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

// ============ GRIEVANCE VALIDATION ============
export const GrievanceStatusEnum = z.enum([
  'Filed',
  'UnderReview',
  'InProgress',
  'Resolved',
  'Closed',
  'Withdrawn',
]);

export const CreateGrievanceSchema = z.object({
  body: z.object({
    employeeId: z.string().uuid('Invalid employee ID'),
    grievanceType: z.string().min(1),
    description: z.string().min(10),
    dateOfIncident: z.coerce.date(),
    attachments: z.array(z.string().url()).optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const UpdateGrievanceSchema = z.object({
  body: z.object({
    status: GrievanceStatusEnum.optional(),
    assignedToId: z.string().uuid().optional(),
    investigationNotes: z.string().optional(),
    resolution: z.string().optional(),
    resolutionDate: z.coerce.date().optional(),
    followUpRequired: z.boolean().default(false),
    followUpDate: z.coerce.date().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid().optional(),
  }).optional(),
});

// ============ SHIFT MANAGEMENT VALIDATION ============
export const ShiftTypeEnum = z.enum(['Day', 'Night', 'Rotational']);

export const CreateEmployeeShiftSchema = z.object({
  body: z.object({
    employeeId: z.string().uuid('Invalid employee ID'),
    shiftType: ShiftTypeEnum,
    startTime: z.coerce.date().optional(),
    endTime: z.coerce.date().optional(),
    effectiveFrom: z.coerce.date(),
    effectiveUntil: z.coerce.date().optional(),
    breakDuration: z.number().min(0).optional(),
    rotationPattern: z.string().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

// ============ TRAINING VALIDATION ============
export const CreateTrainingSchema = z.object({
  body: z.object({
    employeeId: z.string().uuid('Invalid employee ID'),
    trainingName: z.string().min(1),
    trainingProvider: z.string().optional(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional(),
    duration: z.number().min(0).optional(),
    skillsAcquired: z.string().optional(),
    cost: z.number().min(0).optional(),
  }).refine((data) => !data.endDate || data.endDate >= data.startDate, {
    message: 'End date must be after start date',
    path: ['endDate'],
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const UpdateTrainingSchema = z.object({
  body: z.object({
    completionDate: z.coerce.date().optional(),
    certificateUrl: z.string().url().optional(),
    status: z.enum(['Scheduled', 'InProgress', 'Completed', 'Cancelled']).optional(),
    assessmentScore: z.number().min(0).max(100).optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid().optional(),
  }).optional(),
});

// ============ BENEFITS VALIDATION ============
export const CreateBenefitSchema = z.object({
  body: z.object({
    employeeId: z.string().uuid('Invalid employee ID'),
    benefitName: z.string().min(1),
    benefitDescription: z.string().optional(),
    benefitType: z.string(),
    enrollmentDate: z.coerce.date(),
    expiryDate: z.coerce.date().optional(),
    benefitAmount: z.number().min(0).optional(),
    provider: z.string().optional(),
    policyNumber: z.string().optional(),
    documentUrl: z.string().url().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

// Type exports
export type CreateLeaveRequest = z.infer<typeof CreateLeaveRequestSchema>;
export type UpdateLeaveRequest = z.infer<typeof UpdateLeaveRequestSchema>;
export type CreateAttendance = z.infer<typeof CreateAttendanceSchema>;
export type CreatePayroll = z.infer<typeof CreatePayrollSchema>;
export type CreatePerformanceReview = z.infer<typeof CreatePerformanceReviewSchema>;
export type CreateGrievance = z.infer<typeof CreateGrievanceSchema>;
export type CreateEmployeeDocument = z.infer<typeof CreateEmployeeDocumentSchema>;