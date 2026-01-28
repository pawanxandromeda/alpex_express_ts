import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware";

export const authorize = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const userRole = req.user?.role?.toLowerCase();
    const allowedRoles = roles.map(r => r.toLowerCase());
    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({ message: "Access denied: insufficient permissions." });
    }
    next();
  };
};
