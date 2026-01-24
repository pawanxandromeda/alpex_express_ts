import express from "express";
import * as controller from "./accounts.controller";
import { protect } from "../../common/middleware/auth.middleware";
import encryptResponse from "../../common/middleware/encryptResponse";

const router = express.Router();


router.get("/", protect as any,encryptResponse, controller.getBills);
router.get("/po/:poId/bills", protect as any,encryptResponse, controller.getBillsByPo);
router.post("/", protect as any, controller.createBill);
router.post("/:billId/dispute", protect as any, controller.raiseDispute);
router.post("/po/:poId/dispute", protect as any, controller.raisePoDispute);
// router.post("/po/:poId/sales-comment", protect as any, controller.addSalesComment);

export default router;
