import prisma from "../../config/postgres";
import { Prisma } from "@prisma/client";

interface LogActionData {
  action: string;
  performedBy: string;
  targetId: string;
  details?: Record<string, any>;
}

export async function logAction(data: LogActionData) {
  await prisma.auditLog.create({
    data: {
      action: data.action,
      performedBy: data.performedBy,
      targetId: data.targetId,
      details: data.details ?? Prisma.JsonNull,
      timestamp: new Date(),
    },
  });
}
