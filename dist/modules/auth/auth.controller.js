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
exports.logout = exports.refresh = exports.login = void 0;
const service = __importStar(require("./auth.service"));
const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        const tokens = await service.login(username, password);
        res.json(tokens);
    }
    catch (e) {
        res.status(401).json({ message: e.message });
    }
};
exports.login = login;
const refresh = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        const accessToken = await service.refresh(refreshToken);
        res.json({ accessToken });
    }
    catch {
        res.status(403).json({ message: "Invalid refresh token" });
    }
};
exports.refresh = refresh;
const logout = async (req, res) => {
    await service.logout(req.body.userId);
    res.json({ message: "Logged out" });
};
exports.logout = logout;
