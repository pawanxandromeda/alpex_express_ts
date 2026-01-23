// src/routes/purchaseOrder.router.ts
import { Router } from "express";
import * as controller from "./purchaseOrder.controller";
import encryptResponse from "../../common/middleware/encryptResponse";
import { upload } from "../../common/utils/upload";


const router = Router();

router.post("/create", controller.createPO);

router.get("/analytics", encryptResponse, controller.getAnalytics);
router.get("/gstr", encryptResponse, controller.getGstrList);
router.get("/count", encryptResponse, controller.getPOCount);
router.get('/export', controller.exportPurchaseOrders);
router.get("/md-approved", encryptResponse, controller.getMDApproved);
router.get("/ppic-approved-batches", encryptResponse, controller.getPPICApprovedBatches);
router.get("/batch-numbers", encryptResponse, controller.getBatchNumbers);
router.get("/slab/:gstNo", encryptResponse, controller.getSlabLimit);
router.get("/gst/:gstNo", encryptResponse, controller.getPOByGST);
router.get("/po/:poNo", encryptResponse, controller.getPOByPoNo);
router.get("/", encryptResponse, controller.getAllPOs);


router.get("/:id", encryptResponse, controller.getPOById);
router.put("/:id", controller.updatePO);
router.delete("/:id", controller.deletePO);
router.post(
  "/import",
  upload.single("file"),
  controller.importPurchaseOrders
);

export default router;