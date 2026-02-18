import prisma from "../../config/postgres";

export interface NavbarPermissionData {
  employeeId: string;
  employeeName: string;
  email: string;
  allowedMenuItems: string[];
}

// Get default menu items based on role
const getDefaultMenuItemsByRole = (role: string): string[] => {
  const menuPermissions: Record<string, string[]> = {
    admin: [
      "dashboard",
      "employees",
      "customers",
      "purchase-orders",
      "leads",
      "designers",
      "accounts",
      "ppic",
      "master",
      "hr",
      "todos",
      "security",
      "admin-control",
      "notifications"
    ],
    manager: [
      "dashboard",
      "employees",
      "customers",
      "purchase-orders",
      "leads",
      "ppic",
      "todos",
      "notifications"
    ],
    employee: [
      "dashboard",
      "customers",
      "leads",
      "todos",
      "notifications"
    ],
    designer: [
      "dashboard",
      "designer",
      "ppic",
      "todos",
      "notifications"
    ],
    accountant: [
      "dashboard",
      "accounts",
      "purchase-orders",
      "notifications"
    ],
    hr: [
      "dashboard",
      "hr",
      "employees",
      "notifications"
    ],
    default: [
      "dashboard",
      "notifications"
    ]
  };

  const roleKey = role.toLowerCase();
  return menuPermissions[roleKey] || menuPermissions["default"];
};

/**
 * Get navbar permissions for a specific employee
 */
export const getEmployeeNavbarPermissions = async (employeeId: string) => {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { id: true, name: true, email: true, role: true, status: true },
  });

  if (!employee) {
    throw new Error("Employee not found");
  }

  if (employee.status !== "Active") {
    throw new Error("Employee account is not active");
  }

  // Check if custom permissions exist
  let permissions = await prisma.navbarPermission.findUnique({
    where: { employeeId },
  });

  // If no custom permissions, generate from role
  if (!permissions) {
    const defaultMenuItems = getDefaultMenuItemsByRole(employee.role);
    return {
      id: undefined,
      employeeId: employee.id,
      employeeName: employee.name,
      email: employee.email || "",
      allowedMenuItems: defaultMenuItems,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    id: permissions.id,
    employeeId: permissions.employeeId,
    employeeName: permissions.employeeName,
    email: permissions.email,
    allowedMenuItems: permissions.allowedMenuItems,
    createdAt: permissions.createdAt.toISOString(),
    updatedAt: permissions.updatedAt.toISOString(),
  };
};

/**
 * Get all navbar permissions (admin only)
 */
export const getAllNavbarPermissions = async () => {
  const permissions = await prisma.navbarPermission.findMany({
    orderBy: { createdAt: "desc" },
  });

  return permissions.map((perm: any) => ({
    id: perm.id,
    employeeId: perm.employeeId,
    employeeName: perm.employeeName,
    email: perm.email,
    allowedMenuItems: perm.allowedMenuItems,
    createdAt: perm.createdAt.toISOString(),
    updatedAt: perm.updatedAt.toISOString(),
  }));
};

/**
 * Create or update navbar permissions for an employee
 */
export const setNavbarPermissions = async (payload: NavbarPermissionData) => {
  const { employeeId, employeeName, email, allowedMenuItems } = payload;

  // Verify employee exists
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { id: true, name: true, email: true },
  });

  if (!employee) {
    throw new Error("Employee not found");
  }

  // Create or update
  const permissions = await prisma.navbarPermission.upsert({
    where: { employeeId },
    create: {
      employeeId,
      employeeName,
      email,
      allowedMenuItems,
    },
    update: {
      employeeName,
      email,
      allowedMenuItems,
    },
  });

  return {
    id: permissions.id,
    employeeId: permissions.employeeId,
    employeeName: permissions.employeeName,
    email: permissions.email,
    allowedMenuItems: permissions.allowedMenuItems,
    createdAt: permissions.createdAt.toISOString(),
    updatedAt: permissions.updatedAt.toISOString(),
  };
};

/**
 * Update navbar permissions for an employee
 */
export const updateNavbarPermissions = async (
  employeeId: string,
  payload: Partial<NavbarPermissionData>
) => {
  // Verify permissions exist
  const existing = await prisma.navbarPermission.findUnique({
    where: { employeeId },
  });

  if (!existing) {
    throw new Error("Navbar permissions not found for this employee");
  }

  const updateData: any = {};
  if (payload.employeeName) updateData.employeeName = payload.employeeName;
  if (payload.email) updateData.email = payload.email;
  if (payload.allowedMenuItems)
    updateData.allowedMenuItems = payload.allowedMenuItems;

  const permissions = await prisma.navbarPermission.update({
    where: { employeeId },
    data: updateData,
  });

  return {
    id: permissions.id,
    employeeId: permissions.employeeId,
    employeeName: permissions.employeeName,
    email: permissions.email,
    allowedMenuItems: permissions.allowedMenuItems,
    createdAt: permissions.createdAt.toISOString(),
    updatedAt: permissions.updatedAt.toISOString(),
  };
};

/**
 * Delete navbar permissions for an employee
 */
export const deleteNavbarPermissions = async (employeeId: string) => {
  const permissions = await prisma.navbarPermission.delete({
    where: { employeeId },
  });

  return {
    id: permissions.id,
    employeeId: permissions.employeeId,
    employeeName: permissions.employeeName,
    email: permissions.email,
    allowedMenuItems: permissions.allowedMenuItems,
    createdAt: permissions.createdAt.toISOString(),
    updatedAt: permissions.updatedAt.toISOString(),
  };
};

/**
 * Bulk update navbar permissions for multiple employees
 */
export const bulkUpdateNavbarPermissions = async (
  permissions: NavbarPermissionData[]
) => {
  const results = [];

  for (const perm of permissions) {
    try {
      const result = await setNavbarPermissions(perm);
      results.push(result);
    } catch (error: any) {
      results.push({
        employeeId: perm.employeeId,
        error: error.message,
      });
    }
  }

  return results;
};
