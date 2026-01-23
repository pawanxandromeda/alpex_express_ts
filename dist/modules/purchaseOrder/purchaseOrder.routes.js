"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/purchaseOrder.router.ts
const express_1 = require("express");
const controller = __importStar(require("./purchaseOrder.controller"));
const encryptResponse_1 = __importDefault(require("../../common/middleware/encryptResponse"));
const upload_1 = require("../../common/utils/upload");
const router = (0, express_1.Router)();
router.post("/create", controller.createPO);
// static routes first
router.get("/analytics", encryptResponse_1.default, controller.getAnalytics);
router.get("/gstr", encryptResponse_1.default, controller.getGstrList);
router.get("/count", encryptResponse_1.default, controller.getPOCount);
router.get('/export', controller.exportPurchaseOrders);
router.get("/md-approved", encryptResponse_1.default, controller.getMDApproved);
router.get("/ppic-approved-batches", encryptResponse_1.default, controller.getPPICApprovedBatches);
router.get("/batch-numbers", encryptResponse_1.default, controller.getBatchNumbers);
router.get("/slab/:gstNo", encryptResponse_1.default, controller.getSlabLimit);
router.get("/gst/:gstNo", encryptResponse_1.default, controller.getPOByGST);
router.get("/po/:poNo", encryptResponse_1.default, controller.getPOByPoNo);
router.get("/", encryptResponse_1.default, controller.getAllPOs);
// dynamic routes LAST
router.get("/:id", encryptResponse_1.default, controller.getPOById);
router.put("/:id", controller.updatePO);
router.delete("/:id", controller.deletePO);
router.post("/import", upload_1.upload.single("file"), controller.importPurchaseOrders);
exports.default = router;
