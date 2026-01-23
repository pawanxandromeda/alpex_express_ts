/**
 * Audit Log Utility
 * Manages comprehensive action logging for Purchase Orders
 * Tracks all changes with timestamps, user info, and detailed descriptions
 */

export interface AuditAction {
  actionId: string;
  timestamp: string; // ISO 8601 format
  actionType: string; // 'CREATE', 'UPDATE', 'APPROVE', 'REJECT', 'DESIGN_UPDATE', etc.
  performedBy: {
    employeeId?: string;
    name?: string;
    department?: string;
  };
  details: {
    description: string; // Human readable description of the action
    changes?: Record<string, { oldValue: any; newValue: any }>; // Field changes
    remarks?: string; // Additional comments
    approvalStatus?: {
      mdApproval?: string;
      accountsApproval?: string;
      designerApproval?: string;
      ppicApproval?: string;
    };
  };
}

export interface AuditLog {
  actions: AuditAction[];
  lastModified?: string;
  totalActions?: number;
}

/**
 * Create a new audit action entry
 */
export const createAuditAction = (params: {
  actionType: string;
  performedBy?: {
    employeeId?: string;
    name?: string;
    department?: string;
  };
  description: string;
  changes?: Record<string, { oldValue: any; newValue: any }>;
  remarks?: string;
  approvalStatus?: {
    mdApproval?: string;
    accountsApproval?: string;
    designerApproval?: string;
    ppicApproval?: string;
  };
}): AuditAction => {
  const { actionType, performedBy, description, changes, remarks, approvalStatus } = params;

  return {
    actionId: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    actionType,
    performedBy: performedBy || { name: "System", department: "System" },
    details: {
      description,
      ...(changes && { changes }),
      ...(remarks && { remarks }),
      ...(approvalStatus && { approvalStatus }),
    },
  };
};

/**
 * Add action to existing audit log
 */
export const addActionToLog = (
  existingLog: AuditLog | null | undefined,
  action: AuditAction
): AuditLog => {
  const actions = existingLog?.actions || [];

  return {
    actions: [...actions, action],
    lastModified: action.timestamp,
    totalActions: (actions.length || 0) + 1,
  };
};

/**
 * Get audit log with actions
 */
export const getAuditLog = (log: any): AuditLog => {
  if (!log) {
    return {
      actions: [],
      lastModified: new Date().toISOString(),
      totalActions: 0,
    };
  }

  if (typeof log === "string") {
    try {
      return JSON.parse(log);
    } catch {
      return {
        actions: [],
        lastModified: new Date().toISOString(),
        totalActions: 0,
      };
    }
  }

  return log as AuditLog;
};

/**
 * Format audit log for display
 */
export const formatAuditLog = (log: AuditLog | null | undefined): string => {
  const auditLog = getAuditLog(log);

  if (auditLog.actions.length === 0) {
    return "No actions recorded";
  }

  return auditLog.actions
    .map((action) => {
      const timestamp = new Date(action.timestamp).toLocaleString();
      const performedBy = action.performedBy.name || "System";
      const dept = action.performedBy.department ? ` (${action.performedBy.department})` : "";

      let details = `[${timestamp}] ${action.actionType} by ${performedBy}${dept}\n`;
      details += `  Description: ${action.details.description}\n`;

      if (action.details.remarks) {
        details += `  Remarks: ${action.details.remarks}\n`;
      }

      if (action.details.changes) {
        details += `  Changes:\n`;
        Object.entries(action.details.changes).forEach(([field, change]) => {
          details += `    - ${field}: ${JSON.stringify(change.oldValue)} → ${JSON.stringify(change.newValue)}\n`;
        });
      }

      if (action.details.approvalStatus) {
        details += `  Approval Status:\n`;
        Object.entries(action.details.approvalStatus).forEach(([key, value]) => {
          if (value) {
            details += `    - ${key}: ${value}\n`;
          }
        });
      }

      return details;
    })
    .join("\n");
};

/**
 * Get recent actions (last N)
 */
export const getRecentActions = (log: AuditLog | null | undefined, count: number = 10): AuditAction[] => {
  const auditLog = getAuditLog(log);
  return auditLog.actions.slice(-count).reverse();
};

/**
 * Filter actions by type
 */
export const filterActionsByType = (
  log: AuditLog | null | undefined,
  actionType: string
): AuditAction[] => {
  const auditLog = getAuditLog(log);
  return auditLog.actions.filter((action) => action.actionType === actionType);
};

/**
 * Filter actions by department
 */
export const filterActionsByDepartment = (
  log: AuditLog | null | undefined,
  department: string
): AuditAction[] => {
  const auditLog = getAuditLog(log);
  return auditLog.actions.filter(
    (action) => action.performedBy.department === department
  );
};

/**
 * Get summary of all actions
 */
export const getActionSummary = (log: AuditLog | null | undefined) => {
  const auditLog = getAuditLog(log);
  const summary: Record<string, number> = {};

  auditLog.actions.forEach((action) => {
    summary[action.actionType] = (summary[action.actionType] || 0) + 1;
  });

  return {
    totalActions: auditLog.totalActions || 0,
    lastModified: auditLog.lastModified,
    actionBreakdown: summary,
  };
};

/**
 * Track field changes in audit log
 */
export const trackFieldChanges = (
  oldData: Record<string, any>,
  newData: Record<string, any>,
  fieldsToTrack?: string[]
): Record<string, { oldValue: any; newValue: any }> => {
  const changes: Record<string, { oldValue: any; newValue: any }> = {};

  const keysToCheck = fieldsToTrack || Object.keys(newData);

  keysToCheck.forEach((field) => {
    const oldValue = oldData?.[field];
    const newValue = newData?.[field];

    // Only track if values are different
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes[field] = { oldValue, newValue };
    }
  });

  return changes;
};
