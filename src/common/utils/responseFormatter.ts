/**
 * Response Formatter for Standardized API Responses
 * 
 * Ensures consistent response format across all endpoints
 * Frontend can always access: response.success, response.message, response.error, response.data
 */

import { Response } from "express";
import { AppError, ERROR_CODES, createErrorResponse } from "./errorMessages";

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Send success response
 */
export const sendSuccess = <T>(
  res: Response,
  data: T,
  message: string = "Success",
  statusCode: number = 200
) => {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
  };

  // If data has pagination, include it
  if (data && typeof data === "object" && "pagination" in data) {
    response.pagination = (data as any).pagination;
  }

  return res.status(statusCode).json(response);
};

/**
 * Send error response
 */
export const sendError = (
  res: Response,
  code: string,
  customMessage?: string,
  statusCode?: number
) => {
  const errorResponse = createErrorResponse(code, customMessage);
  
  const response: ApiResponse = {
    success: false,
    message: errorResponse.message,
    error: {
      code: errorResponse.code,
      message: errorResponse.message,
    },
  };

  return res.status(statusCode || errorResponse.statusCode).json(response);
};

/**
 * Handle errors in catch blocks
 */
export const handleError = (res: Response, error: any) => {
  console.error("API Error:", error);

  if (error instanceof AppError) {
    return sendError(res, error.code, error.message, error.statusCode);
  }

  if (error.code === "P2002") {
    // Prisma unique constraint error
    return sendError(res, ERROR_CODES.DUPLICATE_ENTRY);
  }

  if (error.message?.includes("not found")) {
    return sendError(res, ERROR_CODES.NOT_FOUND);
  }

  if (error instanceof SyntaxError) {
    return sendError(res, ERROR_CODES.VALIDATION_ERROR);
  }

  // Default error
  return sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR);
};
