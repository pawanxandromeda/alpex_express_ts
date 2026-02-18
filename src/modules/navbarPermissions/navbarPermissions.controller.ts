import { Request, Response } from "express";
import * as service from "./navbarPermissions.service";
import { AuthRequest } from "../../common/middleware/auth.middleware";

export const getEmployeeNavbarPermissions = async (req: Request, res: Response) => {
  try {
    const employeeId = Array.isArray(req.params.employeeId) 
      ? req.params.employeeId[0] 
      : req.params.employeeId;

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: "employeeId is required",
      });
    }

    const permissions = await service.getEmployeeNavbarPermissions(employeeId);

    res.status(200).json({
      success: true,
      data: permissions,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAllNavbarPermissions = async (req: AuthRequest, res: Response) => {
  try {
    const permissions = await service.getAllNavbarPermissions();

    res.status(200).json({
      success: true,
      data: permissions,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const setNavbarPermissions = async (req: Request, res: Response) => {
  try {
    const { employeeId, employeeName, email, allowedMenuItems } = req.body;

    if (!employeeId || !allowedMenuItems) {
      return res.status(400).json({
        success: false,
        message: "employeeId and allowedMenuItems are required",
      });
    }

    const permissions = await service.setNavbarPermissions({
      employeeId,
      employeeName,
      email,
      allowedMenuItems,
    });

    res.status(201).json({
      success: true,
      data: permissions,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateNavbarPermissions = async (req: Request, res: Response) => {
  try {
    const employeeId = Array.isArray(req.params.employeeId)
      ? req.params.employeeId[0]
      : req.params.employeeId;
    const payload = req.body;

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: "employeeId is required",
      });
    }

    const permissions = await service.updateNavbarPermissions(employeeId, payload);

    res.status(200).json({
      success: true,
      data: permissions,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteNavbarPermissions = async (req: Request, res: Response) => {
  try {
    const employeeId = Array.isArray(req.params.employeeId)
      ? req.params.employeeId[0]
      : req.params.employeeId;

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: "employeeId is required",
      });
    }

    const permissions = await service.deleteNavbarPermissions(employeeId);

    res.status(200).json({
      success: true,
      message: "Navbar permissions deleted successfully",
      data: permissions,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const bulkUpdateNavbarPermissions = async (req: Request, res: Response) => {
  try {
    const { permissions } = req.body;

    if (!permissions || !Array.isArray(permissions)) {
      return res.status(400).json({
        success: false,
        message: "permissions array is required",
      });
    }

    const results = await service.bulkUpdateNavbarPermissions(permissions);

    res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
