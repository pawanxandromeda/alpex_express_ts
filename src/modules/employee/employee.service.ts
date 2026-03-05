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

  // optional credential fields added to support new API behaviour
  username?: string;
  password?: string;
  autoGeneratePassword?: boolean; // front end may signal whether server should generate
}

// Helper: Normalize name → lowercase, remove spaces
function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ""); // rahul sharma → rahulsharma
}

// Helper: Extract first name from full name
function getFirstName(fullName: string): string {
  return fullName.split(" ")[0].toLowerCase();
}

// Helper: Generate username with collision check
async function generateUniqueUsername(firstName: string, department: string): Promise<string> {
  let username = `${firstName}.${department}`.toLowerCase();
  let attempt = 1;

  while (true) {
    const conflict = await prisma.employee.findFirst({
      where: {
        username: { equals: username, mode: "insensitive" },
      },
    });

    if (!conflict) return username;

    username = `${firstName}${attempt}.${department}`.toLowerCase();
    attempt++;
  }
}

// Helper: Generate password from first name
function generatePasswordFromFirstName(firstName: string): string {
  return `${firstName.toLowerCase()}@1234`;
}

// Create employee – now auto-generates username + password if created by Admin/Superuser
export const createEmployee = async (data: EmployeeData) => {
  // Normalize email: convert empty string to null
  const normalizedEmail = data.email && data.email.trim() ? data.email.trim() : null;

  // Build dynamic where condition for duplicate check - only check Active employees
  const whereConditions: any[] = [];
  
  // Check phone only against Active employees
  whereConditions.push({ phone: data.phone, status: "Active" });
  
  // Check email only if it's provided (not null)
  if (normalizedEmail) {
    whereConditions.push({ email: normalizedEmail, status: "Active" });
  }
  
  // if frontend provided a username we should also avoid creating a second active
  // user with the same username (inactive duplicates are still allowed by check)
  const providedUsername = data.username && data.username.trim()
    ? data.username.trim()
    : null;
  if (providedUsername) {
    whereConditions.push({ username: providedUsername, status: "Active" });
  }

  const existing = whereConditions.length > 0 
    ? await prisma.employee.findFirst({
        where: {
          OR: whereConditions,
        },
      })
    : null;

  if (existing) {
    throw new Error("Active employee with same email, phone or username already exists.");
  }

  const isAdminCreated = ["Admin", "Superuser"].includes(data.createdByRole);
  const status = "Active"; // Status is always Active for all employees

  // credentials state will default to pending unless we either auto-generate or
  // the front-end has supplied them explicitly.
  let approvedForCredentials: "Approved" | "Pending" = "Pending";

  let username: string | null = null;
  let hashedPassword: string | null = null;
  let plainPassword: string | undefined = undefined;

  // handle provided credentials from front end first; if both username & password
  // are supplied we'll take them as-is and do not generate anything on our side.
  if (providedUsername && data.password) {
    // prefer the trimmed username
    username = providedUsername;
    // hash the supplied password
    hashedPassword = await bcrypt.hash(data.password, 10);
    plainPassword = data.password;
    approvedForCredentials = "Approved";
  } else if (isAdminCreated && data.autoGeneratePassword !== false) {
    // fallback to previous behaviour: generate creds for admin/superuser when
    // autoGeneratePassword flag is not explicitly set to false
    const firstName = getFirstName(data.name);
    username = await generateUniqueUsername(firstName, data.department);
    plainPassword = generatePasswordFromFirstName(firstName);
    hashedPassword = await bcrypt.hash(plainPassword, 10);
    approvedForCredentials = "Approved";
  }

  // remove fields that are not part of the Prisma model before passing
  // note: we already extracted `providedUsername` earlier; we also omit the
  // frontend flags so prisma doesn't complain.
  const {
    autoGeneratePassword,
    username: _u,
    password: _p,
    ...prismaSafeData
  } = data as any;

  const employee = await prisma.employee.create({
    data: {
      ...prismaSafeData,
      email: normalizedEmail, // Use normalized email (null if not provided)
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

  // Optional: log auto-approval or manual supply of credentials.
  // `approvedForCredentials` will be set to Approved if we generated or
  // received them from front-end, so we log whenever credentials exist and
  // are not pending.
  if (approvedForCredentials === "Approved" && username && plainPassword) {
    try {
      await logAction({
        action: "AUTO_APPROVE_EMPLOYEE",
        performedBy: "system", // or pass actual admin ID if available
        targetId: employee.id,
        details: { username, status: "Active", approvedForCredentials },
      });
    } catch (logError) {
      console.error('Error logging action:', logError);
      // Don't throw - just log the error and continue
    }
  }

  const credentials = username && plainPassword ? { username, password: plainPassword } : null;

  return {
    employee,
    credentials,
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
      fatherName: true,
      canLogin: true,
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

  const firstName = getFirstName(employee.name);
  const username = await generateUniqueUsername(firstName, employee.department);
  const plainPassword = generatePasswordFromFirstName(firstName);
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


// Activate employee
export const activateEmployee = async (id: string, adminId: string) => {
  const employee = await prisma.employee.findUnique({ 
    where: { id } 
  });
  
  if (!employee) throw new Error("Employee not found");
  if (employee.status === "Active") throw new Error("Employee is already active");

  const updated = await prisma.employee.update({
    where: { id },
    data: { status: "Active",
      canLogin: true, },
  });

  try {
    await logAction({
      action: "ACTIVATE_EMPLOYEE",
      performedBy: adminId,
      targetId: id,
      details: { 
        status: "Active",
        previousStatus: employee.status
      },
    });
  } catch (logError) {
    console.error('Error logging activate action:', logError);
    // Don't throw - just log the error and continue
  }

  return updated;
};

// Toggle employee login access (independent of status)
export const toggleEmployeeLogin = async (id: string, canLogin: boolean, adminId: string) => {
  const employee = await prisma.employee.findUnique({ 
    where: { id } 
  });
  
  if (!employee) throw new Error("Employee not found");

  const updated = await prisma.employee.update({
    where: { id },
    data: { canLogin },
  });

  try {
    await logAction({
      action: canLogin ? "ENABLE_EMPLOYEE_LOGIN" : "DISABLE_EMPLOYEE_LOGIN",
      performedBy: adminId,
      targetId: id,
      details: { 
        canLogin,
        previousCanLogin: employee.canLogin
      },
    });
  } catch (logError) {
    console.error('Error logging login toggle action:', logError);
    // Don't throw - just log the error and continue
  }

  return updated;
};

// Soft delete
export const deleteEmployee = async (id: string) =>
  prisma.employee.update({
    where: { id },
    data: { status: "Inactive",
      canLogin: false,
     },
  });