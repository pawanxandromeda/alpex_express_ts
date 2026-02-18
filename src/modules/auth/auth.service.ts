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

    const match = await bcrypt.compare(password, employee.password);
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
    await securityService.createSecurityAuditLog(
      employee.id,
      "LOGIN_SUCCESS",
      ipAddress,
      "Info",
      `Successful login from IP: ${ipAddress}`,
      { username, userAgent, ...deviceInfo }
    );

    return { accessToken, refreshToken };
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
