"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_js_1 = __importDefault(require("crypto-js"));
const secretKey = process.env.ENCRYPT_KEY;
if (!secretKey) {
    throw new Error("ENCRYPT_KEY is missing in .env");
}
// Middleware
const encryptResponse = (req, res, next) => {
    // Cast res to include encryptAndSend
    res.encryptAndSend =
        (data) => {
            const encryptedData = crypto_js_1.default.AES.encrypt(JSON.stringify(data), secretKey).toString();
            res.json({ payload: encryptedData });
        };
    next();
};
exports.default = encryptResponse;
