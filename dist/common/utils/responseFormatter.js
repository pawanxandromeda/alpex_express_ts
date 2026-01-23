"use strict";
/**
 * Response Formatter for Standardized API Responses
 *
 * Ensures consistent response format across all endpoints
 * Frontend can always access: response.success, response.message, response.error, response.data
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleError = exports.sendError = exports.sendSuccess = void 0;
const errorMessages_1 = require("./errorMessages");
/**
 * Send success response
 */
const sendSuccess = (res, data, message = "Success", statusCode = 200) => {
    const response = {
        success: true,
        message,
        data,
    };
    // If data has pagination, include it
    if (data && typeof data === "object" && "pagination" in data) {
        response.pagination = data.pagination;
    }
    return res.status(statusCode).json(response);
};
exports.sendSuccess = sendSuccess;
/**
 * Send error response
 */
const sendError = (res, code, customMessage, statusCode) => {
    const errorResponse = (0, errorMessages_1.createErrorResponse)(code, customMessage);
    const response = {
        success: false,
        message: errorResponse.message,
        error: {
            code: errorResponse.code,
            message: errorResponse.message,
        },
    };
    return res.status(statusCode || errorResponse.statusCode).json(response);
};
exports.sendError = sendError;
/**
 * Handle errors in catch blocks
 */
const handleError = (res, error) => {
    console.error("API Error:", error);
    if (error instanceof errorMessages_1.AppError) {
        return (0, exports.sendError)(res, error.code, error.message, error.statusCode);
    }
    if (error.code === "P2002") {
        // Prisma unique constraint error
        return (0, exports.sendError)(res, errorMessages_1.ERROR_CODES.DUPLICATE_ENTRY);
    }
    if (error.message?.includes("not found")) {
        return (0, exports.sendError)(res, errorMessages_1.ERROR_CODES.NOT_FOUND);
    }
    if (error instanceof SyntaxError) {
        return (0, exports.sendError)(res, errorMessages_1.ERROR_CODES.VALIDATION_ERROR);
    }
    // Default error
    return (0, exports.sendError)(res, errorMessages_1.ERROR_CODES.INTERNAL_SERVER_ERROR);
};
exports.handleError = handleError;
