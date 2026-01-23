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
exports.actionOnDesign = exports.uploadDesign = exports.updateDesignSpecs = exports.getDesignerList = void 0;
const service = __importStar(require("./designer.service"));
const getDesignerList = async (req, res, next) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const result = await service.getDesignerList(Number(page), Number(limit));
        res.encryptAndSend(result);
    }
    catch (error) {
        res.encryptAndSend({ message: error.message });
    }
};
exports.getDesignerList = getDesignerList;
const updateDesignSpecs = async (req, res, next) => {
    try {
        const { poId } = req.params;
        const data = req.body;
        const updated = await service.updateDesignSpecs(poId, data, req.user.id);
        return res.status(200).json({
            success: true,
            data: updated,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
exports.updateDesignSpecs = updateDesignSpecs;
const uploadDesign = async (req, res, next) => {
    try {
        const { poId } = req.params;
        const file = req.file;
        if (!file) {
            return res.status(400).json({
                success: false,
                message: "No file uploaded",
            });
        }
        const updated = await service.uploadDesign(poId, file.buffer, file.originalname, file.mimetype, req.user.id);
        return res.status(200).json({
            success: true,
            data: updated,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
exports.uploadDesign = uploadDesign;
const actionOnDesign = async (req, res, next) => {
    try {
        const { poId } = req.params;
        const { action, comments } = req.body;
        const updated = await service.actionOnDesign(poId, action, comments, req.user.id);
        return res.status(200).json({
            success: true,
            data: updated,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
exports.actionOnDesign = actionOnDesign;
