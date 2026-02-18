import { Router } from "express";
import * as controller from "./navbarPermissions.controller";
import { protect } from "../../common/middleware/auth.middleware";
import { authorize } from "../../common/middleware/authorization.middleware";

const router = Router();

// Public endpoint - Get navbar permissions for a specific employee
router.get("/employee/:employeeId", controller.getEmployeeNavbarPermissions);

// Protected endpoints
router.use(protect);

// Get all navbar permissions (admin only)
router.get("/", authorize(["admin"]), controller.getAllNavbarPermissions);

// Create or update navbar permissions
router.post("/", authorize(["admin"]), controller.setNavbarPermissions);

// Update navbar permissions for an employee (admin only)
router.put("/:employeeId", authorize(["admin"]), controller.updateNavbarPermissions);

// Delete navbar permissions for an employee (admin only)
router.delete("/:employeeId", authorize(["admin"]), controller.deleteNavbarPermissions);

// Bulk update navbar permissions (admin only)
router.post("/bulk", authorize(["admin"]), controller.bulkUpdateNavbarPermissions);

export default router;
