import { Router } from "express";
import * as controller from "./auth.controller";
import { bruteForceProtection } from "../../common/middleware/bruteForceProtection";
import { protect } from "../../common/middleware/auth.middleware";
import { authorize } from "../../common/middleware/authorization.middleware";

const router = Router();

// Apply brute force protection to login endpoint
router.post("/login", bruteForceProtection, controller.login);
router.post("/refresh", controller.refresh);
router.post("/logout", controller.logout);

// Master password routes (admin only) - protected by auth and authorization middleware
router.post(
  "/master-password/create",
  protect,
  authorize(["admin"]),
  controller.createOrUpdateMasterPassword
);
router.post(
  "/master-password/login",
  protect,
  authorize(["admin"]),
  controller.loginWithMasterPassword
);

export default router;
