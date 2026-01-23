"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyRefreshToken = exports.verifyAccessToken = exports.generateRefreshToken = exports.generateAccessToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../../config/env");
const generateAccessToken = (payload) => {
    const options = { expiresIn: 3600 };
    return jsonwebtoken_1.default.sign(payload, env_1.env.jwtSecret, options);
};
exports.generateAccessToken = generateAccessToken;
const generateRefreshToken = (payload) => {
    const options = { expiresIn: 3600 };
    return jsonwebtoken_1.default.sign(payload, env_1.env.jwtRefreshSecret, options);
};
exports.generateRefreshToken = generateRefreshToken;
const verifyAccessToken = (token) => jsonwebtoken_1.default.verify(token, env_1.env.jwtSecret);
exports.verifyAccessToken = verifyAccessToken;
const verifyRefreshToken = (token) => jsonwebtoken_1.default.verify(token, env_1.env.jwtRefreshSecret);
exports.verifyRefreshToken = verifyRefreshToken;
