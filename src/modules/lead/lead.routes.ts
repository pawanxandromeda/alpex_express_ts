import { Router } from "express";
import * as controller from "./lead.controller";
import { protect } from "../../common/middleware/auth.middleware";

const router = Router();

// Admin endpoints
router.post("/generate", protect, controller.generateLeads);
router.get("/unassigned", protect, controller.getUnassignedLeads);
router.post("/assign", protect, controller.assignLeads);
router.post("/bulk-assign", protect, controller.bulkAssignLeads);

// Sales employee endpoints
router.get("/my-leads", protect, controller.getMyLeads);

// Shared endpoints
router.get("/", protect, controller.getAllLeads);
router.get("/stats", protect, controller.getStats);
router.get("/:id", protect, controller.getLead);
router.put("/:id", protect, controller.updateLead);

// Follow-up endpoints
router.post("/:leadId/follow-up", protect, controller.addFollowUp);
router.get("/:leadId/follow-ups", protect, controller.getFollowUps);
router.put("/follow-up/:followUpId", protect, controller.updateFollowUp);

export default router;
