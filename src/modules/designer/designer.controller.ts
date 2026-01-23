// designer.controller.ts
import { Request, Response, NextFunction } from "express";
import * as service from "./designer.service";
import { AuthRequest } from "../../common/middleware/auth.middleware";

export const getDesignerList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const result = await service.getDesignerList(Number(page), Number(limit));
    (res as any).encryptAndSend(result);
  } catch (error: any) {
    (res as any).encryptAndSend({ message: error.message });
  }
};

export const updateDesignSpecs = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { poId } = req.params
    const data = req.body

    const updated = await service.updateDesignSpecs(
      poId as string,
      data,
      req.user.id
    )

    return res.status(200).json({
      success: true,
      data: updated,
    })
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

export const uploadDesign = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { poId } = req.params
    const file = (req as any).file

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      })
    }

    const updated = await service.uploadDesign(
      poId as string,
      file.buffer,
      file.originalname,
      file.mimetype,
      req.user.id
    )

    return res.status(200).json({
      success: true,
      data: updated,
    })
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}


export const actionOnDesign = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { poId } = req.params
    const { action, comments } = req.body

    const updated = await service.actionOnDesign(
      poId as string,
      action,
      comments,
      req.user.id
    )

    return res.status(200).json({
      success: true,
      data: updated,
    })
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}
