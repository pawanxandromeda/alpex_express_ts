/**
 * PPIC Routes - Bulk import endpoints
 */

import { Router } from "express";
import { ppicController } from "./ppic.controller";
import { upload } from "../../common/utils/upload";
import { protect } from "../../common/middleware/auth.middleware";
import encryptResponse from "../../common/middleware/encryptResponse";

const router = Router();


router.use(protect);

router.post("/import", upload.single("file"), ppicController.bulkImport);
router.post("/detect-mapping", upload.single("file"), ppicController.detectMapping);
router.post("/test-mapping", ppicController.testMapping);

router.get("/batch/:batchId", ppicController.getBatchStatus);
router.get("/po-fields", ppicController.getPOFields);

router.get("/export", ppicController.exportPOs);
router.get("/pos", encryptResponse, ppicController.getAllPOs);
router.get("/pos/search", encryptResponse, ppicController.searchPOs);
router.get("/pos/:id", encryptResponse, ppicController.getPOById);
router.get("/pos/number/:poNo", encryptResponse, ppicController.getPOByNumber);

export default router;
