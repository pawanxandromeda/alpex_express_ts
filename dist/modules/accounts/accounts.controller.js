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
Object.defineProperty(exports, "__esModule", { value: true });
exports.addSalesComment = exports.raisePoDispute = exports.raiseDispute = exports.createBill = exports.getBillsByPo = exports.getBills = void 0;
const service = __importStar(require("./accounts.service"));
const getBills = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const data = await service.getBills(Number(page), Number(limit));
        res.encryptAndSend(data);
    }
    catch (error) {
        res.encryptAndSend({ message: error.message });
    }
};
exports.getBills = getBills;
const getBillsByPo = async (req, res) => {
    try {
        const { poId } = req.params;
        const { page = 1, limit = 100 } = req.query;
        const data = await service.getBillsByPo(poId, Number(page), Number(limit));
        res.encryptAndSend(data);
    }
    catch (error) {
        res.encryptAndSend({ success: false, message: error.message });
    }
};
exports.getBillsByPo = getBillsByPo;
const createBill = async (req, res) => {
    try {
        const bill = await service.createBill(req.body);
        return res.status(201).json({
            success: true,
            data: bill,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
exports.createBill = createBill;
const raiseDispute = async (req, res) => {
    try {
        const { billId } = req.params;
        const { comments } = req.body;
        const dispute = await service.raiseDispute(billId, req.user.id, comments);
        return res.json({
            success: true,
            data: dispute,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
exports.raiseDispute = raiseDispute;
const raisePoDispute = async (req, res) => {
    try {
        const { poId } = req.params;
        const { comments } = req.body;
        const dispute = await service.raisePoDispute(poId, req.user.id, comments);
        return res.json({
            success: true,
            data: dispute,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
exports.raisePoDispute = raisePoDispute;
const addSalesComment = async (req, res) => {
    try {
        const { poId } = req.params;
        const { salesComments } = req.body;
        const updated = await service.addSalesComment(poId, salesComments);
        return res.json({
            success: true,
            data: updated,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
exports.addSalesComment = addSalesComment;
