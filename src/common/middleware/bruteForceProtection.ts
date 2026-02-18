import { Request, Response, NextFunction } from "express";
import {
  isIPBlocked,
  checkAndApplyBruteForceProtection,
  createSecurityAuditLog,
  getSecurityPolicy,
} from "../../modules/adminControl/security.service";

/**
 * Middleware for brute force protection on login endpoints
 * Should be applied to /auth/login route
 */
export const bruteForceProtection = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const ipAddress = req.ip || req.socket.remoteAddress || "unknown";
    const { username, password } = req.body;

    if (!username) {
      return res.status(400).json({ message: "Username is required" });
    }

    // Check if IP is blocked
    const blocked = await isIPBlocked(ipAddress);
    if (blocked) {
      await createSecurityAuditLog(
        undefined,
        "LOGIN_ATTEMPT_BLOCKED",
        ipAddress,
        "Warning",
        `Login attempt blocked - IP is already blocked`
      );

      return res.status(403).json({
        message:
          "Your IP address has been temporarily blocked due to multiple failed login attempts. Please try again later.",
        code: "IP_BLOCKED",
      });
    }

    // Store IP and username in request for later use
    req.loginAttemptInfo = {
      ipAddress,
      username,
      userAgent: req.get("user-agent"),
    };

    next();
  } catch (error) {
    console.error("Brute force protection middleware error:", error);
    // Don't block login on middleware error, just log it
    next();
  }
};

/**
 * Middleware to track successful or failed login attempts
 * Should be called after login attempt (in auth controller)
 */
export const trackLoginAttempt = async (
  ipAddress: string,
  username: string,
  success: boolean,
  failureReason?: string,
  employeeId?: string,
  userAgent?: string
) => {
  try {
    const securityService = await import("../../modules/adminControl/security.service");

    await securityService.recordLoginAttempt(
      username,
      ipAddress,
      userAgent,
      success ? "Success" : "Failed",
      failureReason,
      employeeId
    );

    // If failed, check for brute force
    if (!success) {
      const result = await securityService.checkAndApplyBruteForceProtection(username, ipAddress);
      if (!result.allowed) {
        return {
          blocked: true,
          reason: result.reason,
          message: result.action,
        };
      }
    }

    return { blocked: false };
  } catch (error) {
    console.error("Error tracking login attempt:", error);
    return { blocked: false }; // Don't block on error
  }
};

/**
 * Rate limiting middleware using Redis
 * Limits requests per IP address
 */
export const rateLimitByIP = async (
  req: Request,
  res: Response,
  next: NextFunction,
  windowSeconds: number = 60,
  maxRequests: number = 100
) => {
  try {
    const redisModule = await import("../../config/redis");
    const client = redisModule.getRedisClient();

    if (client) {
      const ipAddress = req.ip || req.socket.remoteAddress || "unknown";
      const key = `rate_limit:${ipAddress}`;

      const current = await client.incr(key);

      if (current === 1) {
        await client.expire(key, windowSeconds);
      }

      if (current > maxRequests) {
        return res.status(429).json({
          message: "Too many requests. Please try again later.",
          code: "RATE_LIMIT_EXCEEDED",
          retryAfter: windowSeconds,
        });
      }

      // Add remaining requests to response headers
      res.set("X-RateLimit-Limit", maxRequests.toString());
      res.set("X-RateLimit-Remaining", (maxRequests - current).toString());
      res.set("X-RateLimit-Reset", new Date(Date.now() + windowSeconds * 1000).toISOString());
    }

    next();
  } catch (error) {
    console.error("Rate limit middleware error:", error);
    // Don't block on error
    next();
  }
};

/**
 * Session timeout middleware
 * Invalidates sessions after a period of inactivity
 */
export const sessionTimeout = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const redisModule = await import("../../config/redis");
    const client = redisModule.getRedisClient();

    if (client && req.user) {
      const sessionKey = `session:${req.user.id}`;
      const lastActivity = await client.get(`${sessionKey}:lastActivity`);

      if (lastActivity) {
        const inactiveTime = Date.now() - parseInt(lastActivity);
        const securityModule = await import("../../modules/adminControl/security.service");
        const securityPolicy = await securityModule.getSecurityPolicy();
        const timeoutMs = securityPolicy.sessionTimeoutMinutes * 60 * 1000;

        if (inactiveTime > timeoutMs) {
          return res.status(401).json({
            message: "Session expired due to inactivity",
            code: "SESSION_EXPIRED",
          });
        }
      }

      // Update last activity time
      await client.set(`${sessionKey}:lastActivity`, Date.now().toString(), "EX", 86400);
    }

    next();
  } catch (error) {
    console.error("Session timeout middleware error:", error);
    next();
  }
};

/**
 * IP whitelist middleware
 * Restricts access to specific IPs
 */
export const ipWhitelist = (ipAddresses: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const securityModule = await import("../../modules/adminControl/security.service");
      const securityPolicy = await securityModule.getSecurityPolicy();

      if (!securityPolicy.enableIpWhitelisting) {
        return next();
      }

      const clientIP = req.ip || req.socket.remoteAddress || "unknown";

      if (!ipAddresses.includes(clientIP)) {
        await createSecurityAuditLog(
          undefined,
          "IP_WHITELIST_DENIED",
          clientIP,
          "Critical",
          `Access attempt from non-whitelisted IP`
        );

        return res.status(403).json({
          message: "Access denied. Your IP is not whitelisted.",
          code: "IP_NOT_WHITELISTED",
        });
      }

      next();
    } catch (error) {
      console.error("IP whitelist middleware error:", error);
      next();
    }
  };
};

/**
 * Geo-restriction middleware
 * Restricts access based on country
 */
export const geoRestriction = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const securityModule = await import("../../modules/adminControl/security.service");
    const securityPolicy = await securityModule.getSecurityPolicy();

    if (!securityPolicy.enableGeoRestriction || securityPolicy.allowedCountries.length === 0) {
      return next();
    }

    // This would require a GeoIP service integration
    // For now, you would need to implement integration with a service like MaxMind or IP2Location
    // const userCountry = geoIpService.getCountry(req.ip);

    // if (!securityPolicy.allowedCountries.includes(userCountry)) {
    //   return res.status(403).json({
    //     message: "Access denied from your country",
    //     code: "GEO_RESTRICTED",
    //   });
    // }

    next();
  } catch (error) {
    console.error("Geo-restriction middleware error:", error);
    next();
  }
};

/**
 * Device fingerprinting middleware
 * Detects suspicious devices
 */
export const deviceFingerprinting = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Create device fingerprint from user agent and other headers
    const userAgent = req.get("user-agent") || "";
    const acceptLanguage = req.get("accept-language") || "";
    const acceptEncoding = req.get("accept-encoding") || "";

    // Simple fingerprint (in production, use more sophisticated methods)
    const fingerprint = Buffer.from(
      `${userAgent}|${acceptLanguage}|${acceptEncoding}`
    ).toString("base64");

    req.deviceFingerprint = fingerprint;

    next();
  } catch (error) {
    console.error("Device fingerprinting middleware error:", error);
    next();
  }
};

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      loginAttemptInfo?: {
        ipAddress: string;
        username: string;
        userAgent?: string;
      };
      deviceFingerprint?: string;
    }
  }
}

export default {
  bruteForceProtection,
  trackLoginAttempt,
  rateLimitByIP,
  sessionTimeout,
  ipWhitelist,
  geoRestriction,
  deviceFingerprinting,
};
