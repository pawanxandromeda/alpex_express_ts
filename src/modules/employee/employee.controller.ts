import { Request, Response } from "express";
import * as service from "./employee.service";
import { AuthRequest } from "../../common/middleware/auth.middleware";

export const create = async (req: AuthRequest, res: Response) => {
  const employee = await service.createEmployee(req.body, req.user);
  res.json(employee);
};

export const getAll = async (_: Request, res: Response) =>
  res.json(await service.getEmployees());

/**
 * Get pending employee approvals (Admin only)
 * GET /api/employees/approvals/pending
 */
export const getPendingApprovals = async (_: Request, res: Response) =>
  res.json(await service.getPendingApprovals());

/**
 * Approve an employee (Admin only)
 * POST /api/employees/:id/approve
 */
export const approveEmployee = async (req: Request, res: Response) => {
  const adminId = (req as any).user?.id;
  if (!adminId) {
    return res.status(401).json({ message: "Admin ID required" });
  }
  
  const employee = await service.approveEmployee(
    req.params.id as string,
    adminId
  );
  res.json({
    message: "Employee approved successfully",
    data: employee,
  });
};

/**
 * Reject an employee (Admin only)
 * POST /api/employees/:id/reject
 */
export const rejectEmployee = async (req: Request, res: Response) => {
  const adminId = (req as any).user?.id;
  if (!adminId) {
    return res.status(401).json({ message: "Admin ID required" });
  }

  const { reason } = req.body;
  if (!reason) {
    return res.status(400).json({ message: "Rejection reason required" });
  }

  const employee = await service.rejectEmployee(
    req.params.id as string,
    adminId,
    reason
  );
  res.json({
    message: "Employee rejected successfully",
    data: employee,
  });
};

export const update = async (req: Request, res: Response) =>
  res.json(await service.updateEmployee(req.params.id as string, req.body));

export const remove = async (req: Request, res: Response) => {
  await service.deleteEmployee(req.params.id as string);
  res.json({ message: "Deleted" });
};
