"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteEmployee = exports.updateEmployee = exports.rejectEmployee = exports.approveEmployee = exports.getPendingApprovals = exports.getEmployees = exports.createEmployee = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const postgres_1 = __importDefault(require("../../config/postgres"));
const createEmployee = async (data) => {
    data.password = await bcryptjs_1.default.hash(data.password, 10);
    // New employees start with "Pending" approval status
    data.approvalStatus = "Pending";
    return postgres_1.default.employee.create({ data });
};
exports.createEmployee = createEmployee;
const getEmployees = async () => postgres_1.default.employee.findMany({
    select: {
        id: true,
        username: true,
        name: true,
        designation: true,
        department: true,
        approvalStatus: true,
        status: true,
        createdAt: true,
        updatedAt: true,
    },
});
exports.getEmployees = getEmployees;
/**
 * Get pending employee approvals (for admin)
 */
const getPendingApprovals = async () => postgres_1.default.employee.findMany({
    where: { approvalStatus: "Pending" },
    select: {
        id: true,
        username: true,
        name: true,
        designation: true,
        department: true,
        authorization: true,
        createdAt: true,
    },
});
exports.getPendingApprovals = getPendingApprovals;
/**
 * Approve an employee
 */
const approveEmployee = async (employeeId, adminId) => {
    const employee = await postgres_1.default.employee.update({
        where: { id: employeeId },
        data: {
            approvalStatus: "Approved",
            status: "Active",
            approvedBy: adminId,
            approvedAt: new Date(),
        },
    });
    return employee;
};
exports.approveEmployee = approveEmployee;
/**
 * Reject an employee
 */
const rejectEmployee = async (employeeId, adminId, reason) => {
    const employee = await postgres_1.default.employee.update({
        where: { id: employeeId },
        data: {
            approvalStatus: "Rejected",
            approvedBy: adminId,
            rejectionReason: reason,
            approvedAt: new Date(),
        },
    });
    return employee;
};
exports.rejectEmployee = rejectEmployee;
const updateEmployee = async (id, data) => {
    if (data.password)
        data.password = await bcryptjs_1.default.hash(data.password, 10);
    return postgres_1.default.employee.update({ where: { id }, data });
};
exports.updateEmployee = updateEmployee;
const deleteEmployee = async (id) => postgres_1.default.employee.delete({ where: { id } });
exports.deleteEmployee = deleteEmployee;
