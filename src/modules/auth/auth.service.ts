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

// Login function
export const login = async (username: string, password: string) => {
  const employee = await prisma.employee.findUnique({ where: { username } });
  if (!employee) throw new Error("Invalid credentials");

  if (!employee.password) throw new Error("Password not set");

  const match = await bcrypt.compare(password, employee.password);
  if (!match) throw new Error("Invalid credentials");

  // Check approval status
  if (employee.status !== Status.Active) {
    throw new Error(
      "Your account has not been approved yet. Please contact your administrator."
    );
  }

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

  return { accessToken, refreshToken };
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
