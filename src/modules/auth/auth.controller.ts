import { Request, Response } from "express";
import * as service from "./auth.service";


const getClientIp = (req: Request): string => {
   const forwarded = req.headers["x-forwarded-for"] as string;

  let ip =
    forwarded?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "unknown";

  if (ip === "::1") return "127.0.0.1";

  if (ip.startsWith("::ffff:")) {
    ip = ip.replace("::ffff:", "");
  }

  return ip;
};

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    // ✅ REAL client IP (server-side only)
    const ipAddress = getClientIp(req);

    const userAgent = req.get("user-agent") || "unknown";

    // Device fingerprint (non-PII, safe)
    const deviceInfo = {
      userAgent,
      acceptLanguage: req.get("accept-language"),
      acceptEncoding: req.get("accept-encoding"),
      platform: req.get("sec-ch-ua-platform"),
      mobile: req.get("sec-ch-ua-mobile"),
    };

    const tokens = await service.login(
      username,
      password,
      ipAddress,
      userAgent,
      deviceInfo
    );

    res.status(200).json(tokens);
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
