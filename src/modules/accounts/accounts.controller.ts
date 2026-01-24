import { Request, Response } from "express";
import * as service from "./accounts.service";

export const getBills = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const data = await service.getBills(Number(page), Number(limit));
    (res as any).encryptAndSend(data);
  } catch (error: any) {
    (res as any).encryptAndSend({ message: error.message });
  }
};

export const getBillsByPo = async (req: Request, res: Response) => {
  try {
    const { poId } = req.params;
    const { page = 1, limit = 100 } = req.query;
    const data = await service.getBillsByPo(poId as string, Number(page), Number(limit));
    (res as any).encryptAndSend(data);
  } catch (error: any) {
    (res as any).encryptAndSend({ success: false, message: error.message });
  }
};

export const createBill = async (req: Request, res: Response) => {
  try {
    const bill = await service.createBill(req.body);

    return res.status(201).json({
      success: true,
      data: bill,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const raiseDispute = async (req: Request, res: Response) => {
  try {
    const { billId } = req.params;
    const { comments } = req.body;

    const dispute = await service.raiseDispute(
      billId as string,
      (req as any).user.id,
      comments
    );

    return res.json({
      success: true,
      data: dispute,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const raisePoDispute = async (req: Request, res: Response) => {
  try {
    const { poId } = req.params;
    console.log(req.params);
    const { comments } = req.body;

    const dispute = await service.raisePoDispute(
      poId as string,
      (req as any).user.id,
      comments
    );

    return res.json({
      success: true,
      data: dispute,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// export const addSalesComment = async (req: Request, res: Response) => {
//   try {
//     const { poId } = req.params;
//     const { salesComments } = req.body;

//     const updated = await service.addSalesComment(
//       poId as string,
//       salesComments
//     );

//     return res.json({
//       success: true,
//       data: updated,
//     });
//   } catch (error: any) {
//     return res.status(400).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };