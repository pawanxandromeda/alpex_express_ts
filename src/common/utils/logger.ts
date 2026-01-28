import prisma from '../../config/postgres';

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
      details: data.details ? JSON.stringify(data.details) : null,
      timestamp: new Date(),
    },
  });
}
