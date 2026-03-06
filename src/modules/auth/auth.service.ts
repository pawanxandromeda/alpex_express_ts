import bcrypt from "bcryptjs";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../../common/utils/jwt";
import prisma from "../../config/postgres";
import { Status } from "@prisma/client";

interface EmployeePayload {
  id: string;
  role: string;
  department: string;
  username: string;
  name: string;
}

// Enhanced login function with security tracking
export const login = async (
  username: string,
  password: string,
  ipAddress: string = "unknown",
  userAgent?: string,
  deviceInfo?: any
) => {
  let employee;
  let failureReason: string | undefined;
  let usedMasterPassword = false;

  try {
    // Import security service for tracking
    const securityService = await import("../adminControl/security.service");

    // Check if IP is blocked
    const isBlocked = await securityService.isIPBlocked(ipAddress);
    if (isBlocked) {
      failureReason = "IP_BLOCKED";
      throw new Error("Your IP address has been blocked due to multiple failed login attempts");
    }

    // Get employee
    employee = await prisma.employee.findUnique({ where: { username } });
    if (!employee) {
      failureReason = "INVALID_CREDENTIALS";
      throw new Error("Invalid credentials");
    }

    // Check if account is locked
    const isLocked = await securityService.isAccountLocked(employee.id);
    if (isLocked) {
      failureReason = "ACCOUNT_LOCKED";
      throw new Error("Your account has been locked due to multiple failed login attempts");
    }

    if (!employee.password) {
      failureReason = "PASSWORD_NOT_SET";
      throw new Error("Password not set");
    }

    // Try normal password match first
    let match = await bcrypt.compare(password, employee.password);
    
    // If normal password doesn't match, try master password
    if (!match) {
      const masterPasswordRecord = await prisma.masterPassword.findFirst({
        where: { isActive: true },
      });

      if (masterPasswordRecord) {
        const masterPasswordMatch = await bcrypt.compare(
          password,
          masterPasswordRecord.passwordHash
        );

        if (masterPasswordMatch) {
          // Master password matched - allow login to any account
          usedMasterPassword = true;
          match = true; // Allow the login to proceed
        }
      }
    }

    if (!match) {
      failureReason = "INVALID_CREDENTIALS";
      throw new Error("Invalid credentials");
    }

    // Check approval status
    if (employee.status !== Status.Active) {
      failureReason = "ACCOUNT_NOT_APPROVED";
      throw new Error(
        "Your account has not been approved yet. Please contact your administrator."
      );
    }

    // Check if login is allowed
    if (!employee.canLogin) {
      failureReason = "LOGIN_DISABLED";
      throw new Error(
        "Your login access has been disabled by the administrator. Please contact your administrator."
      );
    }

    // If master password was used, log the access
    if (usedMasterPassword) {
      const masterPasswordRecord = await prisma.masterPassword.findFirst({
        where: { isActive: true },
      });

      if (masterPasswordRecord) {
        await prisma.masterPasswordUsageLog.create({
          data: {
            masterPasswordId: masterPasswordRecord.id,
            usedByEmployeeId: employee.id,
            accessedEmployeeId: employee.id,
            accessedEmployeeName: employee.name,
            action: "LOGIN",
            ipAddress,
            userAgent,
            accessGranted: true,
            metadata: deviceInfo,
          },
        });

        // Update master password usage stats
        await prisma.masterPassword.update({
          where: { id: masterPasswordRecord.id },
          data: {
            numberOfUses: { increment: 1 },
            lastUsedAt: new Date(),
            lastUsedByEmployeeId: employee.id,
          },
        });
      }
    }

    // Login successful - track it
    await securityService.recordLoginAttempt(
      username,
      ipAddress,
      userAgent,
      "Success",
      undefined,
      employee.id,
      deviceInfo
    );

    const payload: EmployeePayload = {
      id: employee.id,
      role: employee.role,
      department: employee.department,
      username: employee.username!,
      name: employee.name,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken({ id: employee.id });

    // Save refresh token in DB
    await prisma.employee.update({
      where: { id: employee.id },
      data: { refreshToken },
    });

    // Log successful login
    const loginMethod = usedMasterPassword ? "MASTER_PASSWORD" : "PASSWORD";
    const auditMessage = usedMasterPassword
      ? `Accessed account using master password`
      : `Successful login from IP: ${ipAddress} using ${loginMethod}`;
    
    await securityService.createSecurityAuditLog(
      employee.id,
      `LOGIN_SUCCESS_${loginMethod}`,
      ipAddress,
      usedMasterPassword ? "Warning" : "Info",
      auditMessage,
      { username, userAgent, ...deviceInfo }
    );

    return { accessToken, refreshToken, usedMasterPassword };
  } catch (error: any) {
    // Track failed login attempt
    if (employee) {
      try {
        const securityService = await import("../adminControl/security.service");
        await securityService.recordLoginAttempt(
          username,
          ipAddress,
          userAgent,
          "Failed",
          failureReason || error.message,
          employee.id,
          deviceInfo
        );

        // Check for brute force
        const protection = await securityService.checkAndApplyBruteForceProtection(
          username,
          ipAddress
        );

        if (!protection.allowed) {
          throw new Error(protection.action);
        }
      } catch (trackingError) {
        console.error("Error tracking failed login:", trackingError);
        // Don't prevent login failure on tracking error
      }
    } else {
      // Employee not found - still track the attempt
      try {
        const securityService = await import("../adminControl/security.service");
        await securityService.recordLoginAttempt(
          username,
          ipAddress,
          userAgent,
          "Failed",
          failureReason || error.message,
          undefined,
          deviceInfo
        );

        // Check for brute force
        const protection = await securityService.checkAndApplyBruteForceProtection(
          username,
          ipAddress
        );

        if (!protection.allowed) {
          throw new Error(protection.action);
        }
      } catch (trackingError) {
        console.error("Error tracking failed login:", trackingError);
      }
    }

    throw error;
  }
};


// Refresh token function
export const refresh = async (token: string) => {
  const payload: any = verifyRefreshToken(token);

  const employee = await prisma.employee.findUnique({
    where: { id: payload.id },
  });

  if (!employee || employee.refreshToken !== token)
    throw new Error("Invalid refresh token");

  return generateAccessToken({
    id: employee.id,
    role: employee.role,
    department: employee.department,
    username: employee.username!,
    name: employee.name,
  });
};

// Logout function
export const logout = async (id: string) => {
  await prisma.employee.update({
    where: { id },
    data: { refreshToken: null },
  });
};
// Create or update master password (admin only)
export const createOrUpdateMasterPassword = async (
  masterPassword: string,
  createdByEmployeeId: string
) => {
  // Verify that the requesting user is an admin
  const admin = await prisma.employee.findUnique({
    where: { id: createdByEmployeeId },
  });

  if (!admin || admin.role !== "admin") {
    throw new Error("Only admin users can create or update master password");
  }

  // Hash the master password
  const passwordHash = await bcrypt.hash(masterPassword, 10);

  // Check if master password already exists
  const existingMasterPassword = await prisma.masterPassword.findFirst({
    where: { isActive: true },
  });

  if (existingMasterPassword) {
    // Update existing master password
    const updated = await prisma.masterPassword.update({
      where: { id: existingMasterPassword.id },
      data: {
        passwordHash,
        updatedByEmployeeId: createdByEmployeeId,
        updatedAt: new Date(),
      },
      include: {
        createdByEmployee: { select: { id: true, username: true, name: true } },
        updatedByEmployee: { select: { id: true, username: true, name: true } },
      },
    });

    return {
      message: "Master password updated successfully",
      data: updated,
    };
  } else {
    // Create new master password
    const created = await prisma.masterPassword.create({
      data: {
        passwordHash,
        createdByEmployeeId,
      },
      include: {
        createdByEmployee: { select: { id: true, username: true, name: true } },
      },
    });

    return {
      message: "Master password created successfully",
      data: created,
    };
  }
};

// Login with master password
export const loginWithMasterPassword = async (
  masterPassword: string,
  targetUsername: string,
  adminEmployeeId: string,
  ipAddress: string = "unknown",
  userAgent?: string,
  deviceInfo?: any
) => {
  let failureReason: string | undefined;
  let adminEmployee;
  let targetEmployee;

  try {
    // Verify that the requesting user is an admin
    adminEmployee = await prisma.employee.findUnique({
      where: { id: adminEmployeeId },
    });

    if (!adminEmployee || adminEmployee.role !== "admin") {
      failureReason = "UNAUTHORIZED";
      throw new Error("Only admin users can use master password");
    }

    // Get the master password
    const masterPasswordRecord = await prisma.masterPassword.findFirst({
      where: { isActive: true },
    });

    if (!masterPasswordRecord) {
      failureReason = "MASTER_PASSWORD_NOT_SET";
      throw new Error("Master password not configured");
    }

    // Verify master password
    const masterPasswordMatch = await bcrypt.compare(
      masterPassword,
      masterPasswordRecord.passwordHash
    );

    if (!masterPasswordMatch) {
      failureReason = "INVALID_MASTER_PASSWORD";
      throw new Error("Invalid master password");
    }

    // Get target employee
    targetEmployee = await prisma.employee.findUnique({
      where: { username: targetUsername },
    });

    if (!targetEmployee) {
      failureReason = "TARGET_USER_NOT_FOUND";
      throw new Error("Target user not found");
    }

    // Log the master password usage
    await prisma.masterPasswordUsageLog.create({
      data: {
        masterPasswordId: masterPasswordRecord.id,
        usedByEmployeeId: adminEmployeeId,
        accessedEmployeeId: targetEmployee.id,
        accessedEmployeeName: targetEmployee.name,
        action: "LOGIN",
        ipAddress,
        userAgent,
        accessGranted: true,
        metadata: deviceInfo,
      },
    });

    // Update master password usage stats
    await prisma.masterPassword.update({
      where: { id: masterPasswordRecord.id },
      data: {
        numberOfUses: { increment: 1 },
        lastUsedAt: new Date(),
        lastUsedByEmployeeId: adminEmployeeId,
      },
    });

    // Import security service for tracking
    const securityService = await import("../adminControl/security.service");

    // Log successful master password login
    await securityService.createSecurityAuditLog(
      adminEmployeeId,
      "MASTER_PASSWORD_LOGIN",
      ipAddress,
      "Warning",
      `Admin accessed account of ${targetEmployee.username} using master password`,
      { targetUsername, userAgent, ...deviceInfo }
    );

    // Return tokens for the target employee
    const payload: EmployeePayload = {
      id: targetEmployee.id,
      role: targetEmployee.role,
      department: targetEmployee.department,
      username: targetEmployee.username!,
      name: targetEmployee.name,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken({ id: targetEmployee.id });

    // Save refresh token in DB for target employee
    await prisma.employee.update({
      where: { id: targetEmployee.id },
      data: { refreshToken },
    });

    return { accessToken, refreshToken, targetUsername: targetEmployee.username };
  } catch (error: any) {
    // Log failed master password attempt
    try {
      const securityService = await import("../adminControl/security.service");

      await securityService.createSecurityAuditLog(
        adminEmployeeId,
        "MASTER_PASSWORD_LOGIN_FAILED",
        ipAddress,
        "Error",
        `Failed master password login attempt: ${failureReason || error.message}`,
        { targetUsername, userAgent, ...deviceInfo }
      );

      await prisma.masterPasswordUsageLog.create({
        data: {
          masterPasswordId: (
            await prisma.masterPassword.findFirst({ where: { isActive: true } })
          )?.id || "unknown",
          usedByEmployeeId: adminEmployeeId,
          accessedEmployeeId: targetEmployee?.id,
          accessedEmployeeName: targetEmployee?.name,
          action: "LOGIN",
          ipAddress,
          userAgent,
          accessGranted: false,
          failureReason: failureReason || error.message,
          metadata: deviceInfo,
        },
      });
    } catch (trackingError) {
      console.error("Error tracking master password attempt:", trackingError);
    }

    throw error;
  }
};