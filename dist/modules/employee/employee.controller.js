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
exports.remove = exports.update = exports.rejectEmployee = exports.approveEmployee = exports.getPendingApprovals = exports.getAll = exports.create = void 0;
const service = __importStar(require("./employee.service"));
const create = async (req, res) => res.json(await service.createEmployee(req.body));
exports.create = create;
const getAll = async (_, res) => res.json(await service.getEmployees());
exports.getAll = getAll;
/**
 * Get pending employee approvals (Admin only)
 * GET /api/employees/approvals/pending
 */
const getPendingApprovals = async (_, res) => res.json(await service.getPendingApprovals());
exports.getPendingApprovals = getPendingApprovals;
/**
 * Approve an employee (Admin only)
 * POST /api/employees/:id/approve
 */
const approveEmployee = async (req, res) => {
    const adminId = req.user?.id;
    if (!adminId) {
        return res.status(401).json({ message: "Admin ID required" });
    }
    const employee = await service.approveEmployee(req.params.id, adminId);
    res.json({
        message: "Employee approved successfully",
        data: employee,
    });
};
exports.approveEmployee = approveEmployee;
/**
 * Reject an employee (Admin only)
 * POST /api/employees/:id/reject
 */
const rejectEmployee = async (req, res) => {
    const adminId = req.user?.id;
    if (!adminId) {
        return res.status(401).json({ message: "Admin ID required" });
    }
    const { reason } = req.body;
    if (!reason) {
        return res.status(400).json({ message: "Rejection reason required" });
    }
    const employee = await service.rejectEmployee(req.params.id, adminId, reason);
    res.json({
        message: "Employee rejected successfully",
        data: employee,
    });
};
exports.rejectEmployee = rejectEmployee;
const update = async (req, res) => res.json(await service.updateEmployee(req.params.id, req.body));
exports.update = update;
const remove = async (req, res) => {
    await service.deleteEmployee(req.params.id);
    res.json({ message: "Deleted" });
};
exports.remove = remove;
