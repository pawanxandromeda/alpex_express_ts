"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const errorHandler = (err, _, res, __) => {
    console.error(err);
    res.status(500).json({
        success: false,
        message: "Internal Server Error",
        error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
};
exports.errorHandler = errorHandler;
