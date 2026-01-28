import bcrypt from "bcryptjs";
import prisma from "../../config/postgres";
import { logAction } from "../../common/utils/logger";

export interface EmployeeData {
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  createdByRole: string;
  dateOfJoining?: string | Date;
  ctc?: number;
}

// Helper: Normalize name → lowercase, remove spaces
function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ""); // rahul sharma → rahulsharma
}

// Helper: Generate username with collision check
async function generateUniqueUsername(baseName: string): Promise<string> {
  let username = `${baseName}.alpex`;
  let attempt = 1;

  while (true) {
    const conflict = await prisma.employee.findFirst({
      where: {
        username: { equals: username, mode: "insensitive" },
      },
    });

    if (!conflict) return username;

    username = `${baseName}${attempt}.alpex`;
    attempt++;
  }
}

// Helper: Generate password from last 4 phone digits
function generatePasswordFromPhone(phone: string): string {
  const digits = phone.replace(/\D/g, ""); // remove +, -, spaces, etc.
  if (digits.length < 4) {
    throw new Error("Phone number must have at least 4 digits");
  }
  const last4 = digits.slice(-4);
  return `user@${last4}`;
}

// Create employee – now auto-generates username + password if created by Admin/Superuser
export const createEmployee = async (data: EmployeeData) => {
  const existing = await prisma.employee.findFirst({
    where: {
      OR: [
        { email: data.email, status: "Active" },
        { phone: data.phone, status: "Active" },
      ],
    },
  });

  if (existing) {
    throw new Error("Active employee with same email or phone already exists.");
  }

  const isAdminCreated = ["Admin", "Superuser"].includes(data.createdByRole);
  const status = "Active"; // Status is always Active for all employees
  const approvedForCredentials = isAdminCreated ? "Approved" : "Pending";

  let username: string | null = null;
  let hashedPassword: string | null = null;
  let plainPassword: string | undefined = undefined;

  if (isAdminCreated) {
    // Auto-approve → generate credentials immediately
    const baseName = normalizeName(data.name);
    username = await generateUniqueUsername(baseName);
    plainPassword = generatePasswordFromPhone(data.phone);
    hashedPassword = await bcrypt.hash(plainPassword, 10);
  }

  const employee = await prisma.employee.create({
    data: {
      ...data,
      status, // Always Active
      approvedForCredentials,
      dateOfJoining: data.dateOfJoining ? new Date(data.dateOfJoining) : null,
      ctc: data.ctc ?? null,
      username,
      password: hashedPassword,
      // approvedBy / approvedAt can be set if you want to mark admin as approver
      ...(isAdminCreated && { approvedBy: "system", approvedAt: new Date() }),
    },
  });

  // Optional: log auto-approval
  if (isAdminCreated && username && plainPassword) {
    try {
      await logAction({
        action: "AUTO_APPROVE_EMPLOYEE",
        performedBy: "system", // or pass actual admin ID if available
        targetId: employee.id,
        details: { username, status: "Active", approvedForCredentials: "Approved" },
      });
    } catch (logError) {
      console.error('Error logging action:', logError);
      // Don't throw - just log the error and continue
    }
  }

  return {
    employee,
    credentials: isAdminCreated
      ? { username, password: plainPassword }
      : null,
  };

};

// Get all employees
export const getEmployees = async () =>
  prisma.employee.findMany({
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      department: true,
      phone: true,
      dateOfJoining: true,
      status: true,
      email: true,
      ctc: true,
      approvedForCredentials: true,
      createdAt: true,
      updatedAt: true,
    },
  });

// Get pending approvals (employees waiting for credential approval)
export const getPendingApprovals = async () =>
  prisma.employee.findMany({
    where: { 
      approvedForCredentials: "Pending",
      status: "Active" // Only active employees can be pending for credentials
    },
    select: {
      id: true,
      name: true,
      role: true,
      department: true,
      createdByRole: true,
      createdAt: true,
      status: true,
      approvedForCredentials: true,
    },
  });

// Approve employee credentials
export const approveEmployee = async (employeeId: string, adminId: string) => {
  const employee = await prisma.employee.findUnique({ 
    where: { id: employeeId } 
  });
  
  if (!employee) throw new Error("Employee not found");
  if (employee.status !== "Active") throw new Error("Only active employees can be approved for credentials");
  if (employee.approvedForCredentials !== "Pending") throw new Error("Employee credentials are not pending approval");

  const baseName = normalizeName(employee.name);
  const username = await generateUniqueUsername(baseName);
  const plainPassword = generatePasswordFromPhone(employee.phone);
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  const updatedEmployee = await prisma.employee.update({
    where: { id: employeeId },
    data: {
      approvedForCredentials: "Approved",
      approvedBy: adminId,
      approvedAt: new Date(),
      username,
      password: hashedPassword,
    },
  });

  try {
    await logAction({
      action: "APPROVE_EMPLOYEE_CREDENTIALS",
      performedBy: adminId,
      targetId: employeeId,
      details: { 
        username, 
        status: employee.status,
        approvedForCredentials: "Approved" 
      },
    });
  } catch (logError) {
    console.error('Error logging approval action:', logError);
    // Don't throw - just log the error and continue
  }

  return {
    employee: updatedEmployee,
    username,
    password: plainPassword, // temporary – show once / send via secure channel
  };
};

// Reject employee credentials
export const rejectEmployee = async (employeeId: string, adminId: string, reason: string) => {
  const employee = await prisma.employee.findUnique({ 
    where: { id: employeeId } 
  });
  
  if (!employee) throw new Error("Employee not found");
  if (employee.approvedForCredentials !== "Pending") throw new Error("Employee credentials are not pending approval");

  const updated = await prisma.employee.update({
    where: { id: employeeId },
    data: {
      approvedForCredentials: "Pending", // Keep as Pending or you could add a "Rejected" status
      approvedBy: adminId,
      rejectionReason: reason,
    },
  });

  try {
    await logAction({
      action: "REJECT_EMPLOYEE_CREDENTIALS",
      performedBy: adminId,
      targetId: employeeId,
      details: { 
        reason, 
        status: employee.status,
        approvedForCredentials: "Pending" 
      },
    });
  } catch (logError) {
    console.error('Error logging rejection action:', logError);
    // Don't throw - just log the error and continue
  }

  return updated;
};

// Update employee
export const updateEmployee = async (id: string, data: any) => {
  // 1️⃣ Trim ID
  const cleanId = id.trim();

  // 2️⃣ Sanitize all string fields
  Object.keys(data).forEach((key) => {
    if (typeof data[key] === 'string') {
      data[key] = data[key].trim();
    }
  });

  // 3️⃣ Convert date properly
  if (data.dateOfJoining) {
    data.dateOfJoining = new Date(data.dateOfJoining);
  }

  // 4️⃣ Hash password if present
  if (data.password) {
    data.password = await bcrypt.hash(data.password, 10);
  }

  // 5️⃣ Prisma update
  return prisma.employee.update({
    where: { id: cleanId },
    data,
  });
};


// Soft delete
export const deleteEmployee = async (id: string) =>
  prisma.employee.update({
    where: { id },
    data: { status: "Inactive" },
  });