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
const express_1 = __importDefault(require("express"));
const controller = __importStar(require("./accounts.controller"));
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const encryptResponse_1 = __importDefault(require("../../common/middleware/encryptResponse"));
const router = express_1.default.Router();
// list bills (flattened across POs)
router.get("/", auth_middleware_1.protect, encryptResponse_1.default, controller.getBills);
// list bills for a specific PO
router.get("/po/:poId/bills", auth_middleware_1.protect, encryptResponse_1.default, controller.getBillsByPo);
// create new bill for a PO
router.post("/", auth_middleware_1.protect, controller.createBill);
// raise a dispute on a bill
router.post("/:billId/dispute", auth_middleware_1.protect, controller.raiseDispute);
// raise a PO-level dispute (only allowed for rejected POs)
router.post("/po/:poId/dispute", auth_middleware_1.protect, controller.raisePoDispute);
// add or update sales comment on PO
router.post("/po/:poId/sales-comment", auth_middleware_1.protect, controller.addSalesComment);
exports.default = router;
