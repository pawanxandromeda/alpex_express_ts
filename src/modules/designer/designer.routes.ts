// designer.router.ts
import express from "express";
import * as controller from "./designer.controller";
import { protect } from "../../common/middleware/auth.middleware";
import { upload } from "../../common/utils/upload";
import encryptResponse from "../../common/middleware/encryptResponse";

const router = express.Router();

router.get("/", protect, encryptResponse, controller.getDesignerList);
router.put("/:poId/specs", protect, controller.updateDesignSpecs);
router.patch(
  "/:poId/design",
  protect,
  upload.single("file"),
  controller.uploadDesign
);
router.post("/:poId/action", protect, controller.actionOnDesign);

export default router;