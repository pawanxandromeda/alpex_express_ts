import { Router } from "express";
import * as controller from "./auth.controller";
import { bruteForceProtection } from "../../common/middleware/bruteForceProtection";

const router = Router();

// Apply brute force protection to login endpoint
router.post("/login", bruteForceProtection, controller.login);
router.post("/refresh", controller.refresh);
router.post("/logout", controller.logout);

export default router;
