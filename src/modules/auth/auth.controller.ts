import { Request, Response } from "express";
import * as service from "./auth.service";

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    const tokens = await service.login(username, password);
    res.json(tokens);
  } catch (e: any) {
    res.status(401).json({ message: e.message });
  }
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    const accessToken = await service.refresh(refreshToken);
    res.json({ accessToken });
  } catch {
    res.status(403).json({ message: "Invalid refresh token" });
  }
};

export const logout = async (req: Request, res: Response) => {
  await service.logout(req.body.userId);
  res.json({ message: "Logged out" });
};
