// src/routes/purchaseOrder.router.ts
import { Router } from "express";
import * as controller from "./purchaseOrder.controller";
import encryptResponse from "../../common/middleware/encryptResponse";
import { upload } from "../../common/utils/upload";
import { authorize } from "../../common/middleware/authorization.middleware";
import { protect } from "../../common/middleware/auth.middleware";


const router = Router();
router.use(protect);

router.post("/create",authorize(["admin","manager"]), controller.createPO);

router.get("/analytics", encryptResponse,authorize(["admin","manager"]), controller.getAnalytics);
router.get("/gstr", encryptResponse, controller.getGstrList);
router.get("/count", encryptResponse, controller.getPOCount);
router.get('/export', controller.exportPurchaseOrders);
router.get("/md-approved", encryptResponse, controller.getMDApproved);
router.get("/ppic-approved-batches", encryptResponse, controller.getPPICApprovedBatches);
router.get("/batch-numbers", encryptResponse, controller.getBatchNumbers);
router.get("/slab/:gstNo", encryptResponse, controller.getSlabLimit);
router.get("/gst/:gstNo", encryptResponse, controller.getPOByGST);

// Approvals routes
router.get("/approvals/pending", encryptResponse, controller.getPendingApprovalsApi);
router.post("/:id/approve", controller.approvePoApi);
router.post("/:id/reject", controller.rejectPoApi);

// router.get("/po/:poNo", encryptResponse, controller.getPOByPoNo);
router.get("/", encryptResponse, controller.getAllPOs);


router.get("/:id", encryptResponse, controller.getPOById);
router.put("/:id", controller.updatePO);
router.delete("/:id", authorize(["admin"]), controller.deletePO);
router.post(
  "/import",
  upload.single("file"),
  controller.importPurchaseOrders
);

export default router;