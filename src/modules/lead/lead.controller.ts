import { Request, Response } from "express";
import * as service from "./lead.service";
import prisma from "../../config/postgres";
import {
  generateLeadsSchema,
  assignLeadsSchema,
  createFollowUpSchema,
  updateLeadStatusSchema,
  updateFollowUpSchema,
  bulkAssignLeadsSchema,
} from "./lead.validation";
/**
 * Bulk assign leads to employees (admin)
 * Body: { assignments: [{ leadId, employeeId }] }
 */
export const bulkAssignLeads = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const payload = bulkAssignLeadsSchema.parse(req.body);
    const result = await service.bulkAssignLeadsToEmployees(payload.assignments, req.user.id);
    return sendSuccess(res, result, `Bulk assigned ${result.assigned} leads`, 200);
  } catch (err: any) {
    return handleError(res, err);
  }
};
import { sendSuccess, sendError, handleError } from "../../common/utils/responseFormatter";
import { AuthRequest } from "../../common/middleware/auth.middleware";
import { ERROR_CODES } from "../../common/utils/errorMessages";

/**
 * Generate random leads from customers
 * Admin only endpoint
 */
export const generateLeads = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const payload = generateLeadsSchema.parse(req.body);

    // Look up the employee by the user's ID to get the actual employee ID
    const employee = await prisma.employee.findUnique({
      where: { username: req.user.username },
      select: { id: true },
    });
console.log("Authenticated user:", req.user.username, "Employee record:", employee);
    if (!employee) {
      return res.status(404).json({ message: "Employee record not found for authenticated user" });
    }

    const result = await service.generateRandomLeads(payload.count, employee.id);

    return sendSuccess(
      res,
      result,
      `Generated ${result.generated} leads from ${result.available} available customers`,
      201
    );
  } catch (err: any) {
    return handleError(res, err);
  }
};

/**
 * Get all unassigned leads (admin view)
 */
export const getUnassignedLeads = async (req: AuthRequest, res: Response) => {
  try {
    const leads = await service.getUnassignedLeads();
    return sendSuccess(res, leads, "Unassigned leads retrieved", 200);
  } catch (err: any) {
    return handleError(res, err);
  }
};

/**
 * Assign leads to an employee
 * Admin only endpoint
 */
export const assignLeads = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const payload = assignLeadsSchema.parse(req.body);

    const result = await service.assignLeadsToEmployee(
      payload.leadIds,
      payload.employeeId,
      req.user.id
    );

    return sendSuccess(res, result, `Assigned ${result.assigned} leads`, 200);
  } catch (err: any) {
    return handleError(res, err);
  }
};

/**
 * Get leads assigned to logged-in sales employee
 */
export const getMyLeads = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const leads = await service.getLeadsForEmployee(req.user.id);
    return sendSuccess(res, leads, "Your leads retrieved", 200);
  } catch (err: any) {
    return handleError(res, err);
  }
};

/**
 * Get single lead with all details
 */
export const getLead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const lead = await service.getLeadDetails(id);
    return sendSuccess(res, lead, "Lead details retrieved", 200);
  } catch (err: any) {
    return handleError(res, err);
  }
};

/**
 * Update lead status and add notes
 */
export const updateLead = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const payload = updateLeadStatusSchema.parse(req.body);

    const lead = await service.updateLeadStatus(id, payload.status, payload.notes);

    return sendSuccess(res, lead, "Lead updated successfully", 200);
  } catch (err: any) {
    return handleError(res, err);
  }
};

/**
 * Create follow-up on a lead
 */
export const addFollowUp = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const payload = createFollowUpSchema.parse(req.body);

    const followUp = await service.createFollowUp(
      payload.leadId,
      payload.followUpType,
      req.user.id,
      payload.notes,
      payload.nextFollowUpDate ? new Date(payload.nextFollowUpDate) : undefined
    );

    return sendSuccess(res, followUp, "Follow-up added successfully", 201);
  } catch (err: any) {
    return handleError(res, err);
  }
};

/**
 * Get follow-up history for a lead
 */
export const getFollowUps = async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params as { leadId: string };
    const followUps = await service.getFollowUpHistory(leadId);
    return sendSuccess(res, followUps, "Follow-up history retrieved", 200);
  } catch (err: any) {
    return handleError(res, err);
  }
};

/**
 * Update follow-up status and date
 */
export const updateFollowUp = async (req: Request, res: Response) => {
  try {
    const { followUpId } = req.params as { followUpId: string };
    const payload = updateFollowUpSchema.parse(req.body);

    const followUp = await service.updateFollowUp(
      followUpId,
      payload.status,
      payload.notes,
      payload.nextFollowUpDate ? new Date(payload.nextFollowUpDate) : undefined
    );

    return sendSuccess(res, followUp, "Follow-up updated successfully", 200);
  } catch (err: any) {
    return handleError(res, err);
  }
};

/**
 * Get all leads with optional filters (admin dashboard)
 */
export const getAllLeads = async (req: Request, res: Response) => {
  try {
    const filters: any = {};

    if (req.query.status) {
      filters.status = req.query.status;
    }
    if (req.query.employeeId) {
      filters.assignedToEmployeeId = req.query.employeeId;
    }
    if (req.query.dateFrom) {
      filters.dateFrom = new Date(req.query.dateFrom as string);
    }
    if (req.query.dateTo) {
      filters.dateTo = new Date(req.query.dateTo as string);
    }

    const leads = await service.getAllLeads(filters);
    return sendSuccess(res, leads, "All leads retrieved", 200);
  } catch (err: any) {
    return handleError(res, err);
  }
};

/**
 * Get lead statistics
 */
export const getStats = async (req: Request, res: Response) => {
  try {
    const stats = await service.getLeadStats();
    return sendSuccess(res, stats, "Lead statistics retrieved", 200);
  } catch (err: any) {
    return handleError(res, err);
  }
};
