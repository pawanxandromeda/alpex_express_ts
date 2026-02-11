import { Router } from "express";
import * as controller from "./employee.controller";
import { protect } from "../../common/middleware/auth.middleware";
import { authorize } from "../../common/middleware/authorization.middleware";

const router = Router();
router.use(protect);

router.post("/create", authorize(["admin", "manager"]), controller.create);
router.get("/", controller.getAll);
router.put("/:id", authorize(["admin", "manager"]), controller.update);
router.delete("/:id", authorize(["admin"]), controller.remove);

router.get("/approvals/pending", authorize(["admin"]), controller.getPendingApprovals);
router.post("/:id/approve", authorize(["admin"]), controller.approve);
router.post("/:id/reject", authorize(["admin"]), controller.rejectEmployee);
router.post("/:id/activate", authorize(["admin"]), controller.activate);

export default router;