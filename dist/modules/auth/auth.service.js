"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = exports.refresh = exports.login = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jwt_1 = require("../../common/utils/jwt");
const postgres_1 = __importDefault(require("../../config/postgres"));
const login = async (username, password) => {
    const employee = await postgres_1.default.employee.findUnique({ where: { username } });
    if (!employee)
        throw new Error("Invalid credentials");
    const match = await bcryptjs_1.default.compare(password, employee.password);
    if (!match)
        throw new Error("Invalid credentials");
    const accessToken = (0, jwt_1.generateAccessToken)({
        id: employee.id,
        role: employee.authorization,
        department: employee.department,
        username: employee.username,
        name: employee.name,
    });
    const refreshToken = (0, jwt_1.generateRefreshToken)({ id: employee.id });
    await postgres_1.default.employee.update({
        where: { id: employee.id },
        data: { refreshToken },
    });
    return { accessToken, refreshToken };
};
exports.login = login;
const refresh = async (token) => {
    const payload = (0, jwt_1.verifyRefreshToken)(token);
    const employee = await postgres_1.default.employee.findUnique({
        where: { id: payload.id },
    });
    if (!employee || employee.refreshToken !== token)
        throw new Error("Invalid refresh token");
    return (0, jwt_1.generateAccessToken)({
        id: employee.id,
        role: employee.authorization,
        department: employee.department,
        username: employee.username,
    });
};
exports.refresh = refresh;
const logout = async (id) => {
    await postgres_1.default.employee.update({
        where: { id },
        data: { refreshToken: null },
    });
};
exports.logout = logout;
