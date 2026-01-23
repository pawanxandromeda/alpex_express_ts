import { Request, Response, NextFunction } from "express";

export const errorHandler = (
  err: Error,
  _: Request,
  res: Response,
  __: NextFunction
) => {
  console.error(err);
  res.status(500).json({
    success: false,
    message: "Internal Server Error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
};
