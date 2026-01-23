"use strict";
/**
 * PPIC Routes - Bulk import endpoints
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ppic_controller_1 = require("./ppic.controller");
const upload_1 = require("../../common/utils/upload");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const encryptResponse_1 = __importDefault(require("../../common/middleware/encryptResponse"));
const router = (0, express_1.Router)();
// 🔐 Protect all routes
router.use(auth_middleware_1.protect);
router.post("/import", upload_1.upload.single("file"), ppic_controller_1.ppicController.bulkImport);
router.post("/detect-mapping", upload_1.upload.single("file"), ppic_controller_1.ppicController.detectMapping);
router.post("/test-mapping", ppic_controller_1.ppicController.testMapping);
router.get("/batch/:batchId", ppic_controller_1.ppicController.getBatchStatus);
router.get("/po-fields", ppic_controller_1.ppicController.getPOFields);
router.get("/export", ppic_controller_1.ppicController.exportPOs);
router.get("/pos", encryptResponse_1.default, ppic_controller_1.ppicController.getAllPOs);
router.get("/pos/search", encryptResponse_1.default, ppic_controller_1.ppicController.searchPOs);
router.get("/pos/:id", encryptResponse_1.default, ppic_controller_1.ppicController.getPOById);
router.get("/pos/number/:poNo", encryptResponse_1.default, ppic_controller_1.ppicController.getPOByNumber);
exports.default = router;
