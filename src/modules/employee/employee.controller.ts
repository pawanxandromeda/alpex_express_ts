import { Response } from "express";
import * as service from "./employee.service";
import { AuthRequest } from "../../common/middleware/auth.middleware";

export const create = async (req: AuthRequest, res: Response) => {
  try {
    console.log('Request body received:', req.body);
    console.log('Request user role:', req.user?.role);

    const result = await service.createEmployee(req.body);

    console.log('Service result:', result);

    const response: any = {
      success: true,
      data: result?.employee || null,
    };

    if (result?.credentials?.username && result?.credentials?.password) {
      response.credentials = {
        username: result.credentials.username,
        password: result.credentials.password,
      };
    }

    res.status(201).json(response);
  } catch (error) {
    console.error('Error in create controller:', error);
    res.status(400).json({ success: false, message: (error as Error).message });
  }
};

export const getAll = async (_: AuthRequest, res: Response) =>
  res.json(await service.getEmployees());

export const getPendingApprovals = async (_: AuthRequest, res: Response) =>
  res.json(await service.getPendingApprovals());

export const approve = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = req.user!.id;
    const { employee, username, password } = await service.approveEmployee(req.params.id as string, adminId);
    res.json({ 
      success: true, 
      data: employee, 
      credentials: { username, password } 
    });
  } catch (error) {
    res.status(400).json({ success: false, message: (error as Error).message });
  }
};

export const rejectEmployee = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = req.user!.id;
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ message: "Rejection reason required" });
    const employee = await service.rejectEmployee(req.params.id as string, adminId, reason);
    res.json({ 
      success: true, 
      message: "Employee credentials rejected", 
      data: employee 
    });
  } catch (error) {
    res.status(400).json({ success: false, message: (error as Error).message });
  }
};

export const update = async (req: AuthRequest, res: Response) =>
  res.json(await service.updateEmployee(req.params.id as string, req.body));

export const remove = async (req: AuthRequest, res: Response) =>
  res.json({ 
    message: "Deleted", 
    data: await service.deleteEmployee(req.params.id as string) 
  });