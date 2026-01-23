import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";

export interface AuthRequest extends Request {
  user?: any;
}

export const protect = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer "))
    return res.status(401).json({ message: "Unauthorized" });

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};
