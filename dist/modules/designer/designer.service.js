"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.actionOnDesign = exports.uploadDesign = exports.updateDesignSpecs = exports.getDesignerList = void 0;
// designer.service.ts
const postgres_1 = __importDefault(require("../../config/postgres"));
const s3_1 = require("../../common/utils/s3");
const crypto_1 = require("crypto");
const getDesignerList = async (page = 1, limit = 20) => {
    const skip = (page - 1) * limit;
    const whereCondition = {
        mdApproval: "Approved",
        accountsApproval: "Approved",
    };
    const [data, total] = await Promise.all([
        postgres_1.default.purchaseOrder.findMany({
            skip,
            take: limit,
            where: whereCondition,
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                poNo: true,
                poDate: true,
                brandName: true,
                partyName: true,
                orderThrough: true,
                composition: true,
                section: true,
                tabletCapsuleDrySyrupBottle: true,
                roundOvalTablet: true,
                tabletColour: true,
                aluAluBlisterStripBottle: true,
                packStyle: true,
                productNewOld: true,
                batchQty: true,
                pvcColourBase: true,
                foilSize: true,
                design: true,
                designerApproval: true,
                createdAt: true,
            },
        }),
        postgres_1.default.purchaseOrder.count({
            where: whereCondition,
        }),
    ]);
    return { data, total, page, limit };
};
exports.getDesignerList = getDesignerList;
const updateDesignSpecs = async (poId, data, employeeId) => {
    // 1️⃣ Validate designer
    const emp = await postgres_1.default.employee.findUnique({
        where: { id: employeeId },
    });
    if (!emp || emp.department.toLowerCase() !== "design") {
        throw new Error("Only designer can update specs");
    }
    // 2️⃣ Fetch existing PO & actions
    const poRecord = await postgres_1.default.purchaseOrder.findUnique({
        where: { id: poId },
        select: { designerActions: true },
    });
    if (!poRecord) {
        throw new Error("Purchase Order not found");
    }
    const existingActions = Array.isArray(poRecord.designerActions)
        ? poRecord.designerActions
        : [];
    // 3️⃣ Create action with remarks
    const newAction = {
        id: (0, crypto_1.randomUUID)(),
        employeeId,
        employeeName: emp.name,
        action: "Specs Updated",
        remarks: data.remarks ?? null, // ✅ DESIGNER REMARKS
        createdAt: new Date().toISOString(),
    };
    // 4️⃣ Remove remarks from main update payload
    const { remarks, ...specsData } = data;
    // 5️⃣ Update PO
    const updated = await postgres_1.default.purchaseOrder.update({
        where: { id: poId },
        data: {
            // 🔹 Allowed design spec fields
            tabletCapsuleDrySyrupBottle: specsData.tabletCapsuleDrySyrupBottle,
            roundOvalTablet: specsData.roundOvalTablet,
            tabletColour: specsData.tabletColour,
            aluAluBlisterStripBottle: specsData.aluAluBlisterStripBottle,
            packStyle: specsData.packStyle,
            productNewOld: specsData.productNewOld,
            batchQty: specsData.batchQty,
            pvcColourBase: specsData.pvcColourBase,
            foilSize: specsData.foilSize,
            // 🔹 Reset approval
            designerApproval: "Pending",
            // 🔹 Append action log
            designerActions: [...existingActions, newAction],
        },
    });
    return updated;
};
exports.updateDesignSpecs = updateDesignSpecs;
const uploadDesign = async (poId, buffer, originalName, mimeType, employeeId) => {
    const emp = await postgres_1.default.employee.findUnique({ where: { id: employeeId } });
    if (!emp)
        throw new Error("Employee not found");
    if (emp.department.toLowerCase() !== "designer") {
        throw new Error("Only designer can upload design");
    }
    const key = `designs/${poId}/${Date.now()}-${originalName.replace(/\s+/g, "_")}`;
    const url = await (0, s3_1.uploadBufferToS3)(buffer, key, mimeType);
    // append action to PO designerActions
    const poRecord = await postgres_1.default.purchaseOrder.findUnique({ where: { id: poId } });
    const actions = Array.isArray(poRecord?.designerActions) ? poRecord.designerActions : [];
    const newAction = {
        id: (0, crypto_1.randomUUID)(),
        employeeId,
        action: "Design Uploaded",
        comments: null,
        createdAt: new Date().toISOString(),
    };
    const updatedPO = await postgres_1.default.purchaseOrder.update({
        where: { id: poId },
        data: {
            design: url,
            designerApproval: "Pending",
            designerActions: [...actions, newAction],
        },
    });
    return updatedPO;
};
exports.uploadDesign = uploadDesign;
const actionOnDesign = async (poId, action, comments, employeeId) => {
    const emp = await postgres_1.default.employee.findUnique({ where: { id: employeeId } });
    if (!emp)
        throw new Error("Employee not found");
    if ((emp.department || "").toLowerCase() !== "design")
        throw new Error("Only designer department members can approve or reject designs");
    if (!["approve", "reject"].includes(action))
        throw new Error("Invalid action");
    const dbAction = action === "approve" ? "Approved" : "Rejected";
    // append approval/rejection action
    const poRecord = await postgres_1.default.purchaseOrder.findUnique({ where: { id: poId } });
    const actions = Array.isArray(poRecord?.designerActions) ? poRecord.designerActions : [];
    const newAction = {
        id: (0, crypto_1.randomUUID)(),
        employeeId,
        action: dbAction,
        comments: comments || null,
        createdAt: new Date().toISOString(),
    };
    const updated = await postgres_1.default.purchaseOrder.update({
        where: { id: poId },
        data: { designerApproval: dbAction, designerActions: [...actions, newAction] },
    });
    return updated;
};
exports.actionOnDesign = actionOnDesign;
