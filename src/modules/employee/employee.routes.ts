import { Router } from "express";
import * as controller from "./employee.controller";
import { protect } from "../../common/middleware/auth.middleware";

const router = Router();

router.use(protect);


router.post("/create", controller.create);
router.get("/", controller.getAll);
router.put("/:id", controller.update);
router.delete("/:id", controller.remove);

// Admin approval routes

router.get("/approvals/pending", controller.getPendingApprovals);
router.post("/:id/approve", controller.approveEmployee);
router.post("/:id/reject", controller.rejectEmployee);

export default router;
