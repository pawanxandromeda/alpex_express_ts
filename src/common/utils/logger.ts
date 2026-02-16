import prisma from "../../config/postgres";
import { Prisma } from "@prisma/client";

interface LogActionData {
  action: string;
  performedBy: string;
  targetId: string;
  details?: Record<string, any>;
}

export async function logAction(data: LogActionData) {
  try {
    await prisma.auditLog.create({
      data: {
        action: data.action,
        performedBy: data.performedBy,
        targetId: data.targetId,
        details: data.details ?? Prisma.JsonNull,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
}

// Application logger for console output
export const logger = {
  info: (message: string, data?: any) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, data || "");
  },
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error || "");
  },
  warn: (message: string, data?: any) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, data || "");
  },
  debug: (message: string, data?: any) => {
    if (process.env.DEBUG === "true") {
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, data || "");
    }
  },
};
