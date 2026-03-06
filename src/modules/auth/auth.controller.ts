import { Request, Response } from "express";
import * as service from "./auth.service";
import { AuthRequest } from "../../common/middleware/auth.middleware";



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
// Create or update master password (admin only)
export const createOrUpdateMasterPassword = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { masterPassword } = req.body;
    const adminEmployeeId = req.user?.id; // Assuming auth middleware sets req.user

    if (!adminEmployeeId) {
      return res.status(401).json({ message: "Unauthorized - User not authenticated" });
    }

    if (!masterPassword || typeof masterPassword !== "string") {
      return res.status(400).json({ message: "Master password is required" });
    }

    if (masterPassword.length < 6) {
      return res.status(400).json({ message: "Master password must be at least 6 characters" });
    }

    const result = await service.createOrUpdateMasterPassword(
      masterPassword,
      adminEmployeeId
    );

    res.status(200).json(result);
  } catch (e: any) {
    if (e.message.includes("Only admin")) {
      res.status(403).json({ message: e.message });
    } else {
      res.status(500).json({ message: e.message });
    }
  }
};

// Login with master password (admin only)
export const loginWithMasterPassword = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { masterPassword, targetUsername } = req.body;
    const adminEmployeeId = req.user?.id; // Assuming auth middleware sets req.user

    if (!adminEmployeeId) {
      return res.status(401).json({ message: "Unauthorized - User not authenticated" });
    }

    if (!masterPassword || typeof masterPassword !== "string") {
      return res.status(400).json({ message: "Master password is required" });
    }

    if (!targetUsername || typeof targetUsername !== "string") {
      return res.status(400).json({ message: "Target username is required" });
    }

    const ipAddress = getClientIp(req);
    const userAgent = req.get("user-agent") || "unknown";
    const deviceInfo = {
      userAgent,
      acceptLanguage: req.get("accept-language"),
      acceptEncoding: req.get("accept-encoding"),
      platform: req.get("sec-ch-ua-platform"),
      mobile: req.get("sec-ch-ua-mobile"),
    };

    const tokens = await service.loginWithMasterPassword(
      masterPassword,
      targetUsername,
      adminEmployeeId,
      ipAddress,
      userAgent,
      deviceInfo
    );

    res.status(200).json(tokens);
  } catch (e: any) {
    if (e.message.includes("Only admin")) {
      res.status(403).json({ message: e.message });
    } else if (e.message.includes("not configured")) {
      res.status(404).json({ message: e.message });
    } else if (
      e.message.includes("Invalid") ||
      e.message.includes("not found")
    ) {
      res.status(401).json({ message: e.message });
    } else {
      res.status(500).json({ message: e.message });
    }
  }
};