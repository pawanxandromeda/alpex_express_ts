/**
 * Error Messages & Codes for Frontend Toast Notifications
 * 
 * Structure: { code: string, message: string, statusCode: number }
 * Access in frontend: response.error?.code and response.error?.message
 */

export const ERROR_CODES = {
  // General Errors
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  DUPLICATE_ENTRY: "DUPLICATE_ENTRY",
  MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD",

  // Customer Errors
  CUSTOMER_NOT_FOUND: "CUSTOMER_NOT_FOUND",
  CUSTOMER_ALREADY_EXISTS: "CUSTOMER_ALREADY_EXISTS",
  INVALID_GST_FORMAT: "INVALID_GST_FORMAT",
  BLACKLISTED_CUSTOMER: "BLACKLISTED_CUSTOMER",
  CREDIT_LIMIT_EXCEEDED: "CREDIT_LIMIT_EXCEEDED",
  CREDIT_NOT_APPROVED: "CREDIT_NOT_APPROVED",

  // Purchase Order Errors
  PO_NOT_FOUND: "PO_NOT_FOUND",
  PO_ALREADY_EXISTS: "PO_ALREADY_EXISTS",
  INVALID_PO_FORMAT: "INVALID_PO_FORMAT",
  CUSTOMER_NOT_LINKED: "CUSTOMER_NOT_LINKED",

  // Import/Bulk Errors
  FILE_REQUIRED: "FILE_REQUIRED",
  INVALID_FILE_FORMAT: "INVALID_FILE_FORMAT",
  EMPTY_FILE: "EMPTY_FILE",
  NO_VALID_RECORDS: "NO_VALID_RECORDS",
  MAPPINGS_REQUIRED: "MAPPINGS_REQUIRED",
  IMPORT_PARTIAL_SUCCESS: "IMPORT_PARTIAL_SUCCESS",
  IMPORT_FAILED: "IMPORT_FAILED",
};

export const ERROR_MESSAGES: Record<string, { message: string; statusCode: number }> = {
  // General Errors
  [ERROR_CODES.INTERNAL_SERVER_ERROR]: {
    message: "Something went wrong. Please try again later.",
    statusCode: 500,
  },
  [ERROR_CODES.VALIDATION_ERROR]: {
    message: "Please check your input and try again.",
    statusCode: 400,
  },
  [ERROR_CODES.UNAUTHORIZED]: {
    message: "You are not authorized to perform this action.",
    statusCode: 401,
  },
  [ERROR_CODES.FORBIDDEN]: {
    message: "You do not have permission to access this resource.",
    statusCode: 403,
  },
  [ERROR_CODES.NOT_FOUND]: {
    message: "The requested resource was not found.",
    statusCode: 404,
  },
  [ERROR_CODES.DUPLICATE_ENTRY]: {
    message: "This record already exists in the system.",
    statusCode: 400,
  },
  [ERROR_CODES.MISSING_REQUIRED_FIELD]: {
    message: "Please fill in all required fields.",
    statusCode: 400,
  },

  // Customer Errors
  [ERROR_CODES.CUSTOMER_NOT_FOUND]: {
    message: "Customer not found. Please verify the GST number.",
    statusCode: 404,
  },
  [ERROR_CODES.CUSTOMER_ALREADY_EXISTS]: {
    message: "A customer with this GST number already exists.",
    statusCode: 400,
  },
  [ERROR_CODES.INVALID_GST_FORMAT]: {
    message: "Invalid GST format. Please enter a valid GST number.",
    statusCode: 400,
  },
  [ERROR_CODES.BLACKLISTED_CUSTOMER]: {
    message: "This customer is blacklisted and cannot create orders.",
    statusCode: 400,
  },
  [ERROR_CODES.CREDIT_LIMIT_EXCEEDED]: {
    message: "Order amount exceeds available credit limit.",
    statusCode: 400,
  },
  [ERROR_CODES.CREDIT_NOT_APPROVED]: {
    message: "Customer credit approval is pending MD approval.",
    statusCode: 400,
  },

  // Purchase Order Errors
  [ERROR_CODES.PO_NOT_FOUND]: {
    message: "Purchase order not found.",
    statusCode: 404,
  },
  [ERROR_CODES.PO_ALREADY_EXISTS]: {
    message: "A purchase order with this PO number already exists.",
    statusCode: 400,
  },
  [ERROR_CODES.INVALID_PO_FORMAT]: {
    message: "Invalid purchase order format.",
    statusCode: 400,
  },
  [ERROR_CODES.CUSTOMER_NOT_LINKED]: {
    message: "Unable to link customer to this purchase order.",
    statusCode: 400,
  },

  // Import/Bulk Errors
  [ERROR_CODES.FILE_REQUIRED]: {
    message: "Please upload an Excel file.",
    statusCode: 400,
  },
  [ERROR_CODES.INVALID_FILE_FORMAT]: {
    message: "Invalid file format. Please upload an Excel file (.xlsx or .xls).",
    statusCode: 400,
  },
  [ERROR_CODES.EMPTY_FILE]: {
    message: "The uploaded file is empty. Please check and try again.",
    statusCode: 400,
  },
  [ERROR_CODES.NO_VALID_RECORDS]: {
    message: "No valid records found in the file. Please check the data and mappings.",
    statusCode: 400,
  },
  [ERROR_CODES.MAPPINGS_REQUIRED]: {
    message: "Column mappings are required for import.",
    statusCode: 400,
  },
  [ERROR_CODES.IMPORT_PARTIAL_SUCCESS]: {
    message: "Import completed with some records skipped due to duplicates or validation errors.",
    statusCode: 200,
  },
  [ERROR_CODES.IMPORT_FAILED]: {
    message: "Import failed. Please check the file and try again.",
    statusCode: 400,
  },
};

/**
 * Create an error response object
 * @param code - Error code from ERROR_CODES
 * @param customMessage - Optional custom message to override default
 * @returns Object with code, message, and statusCode
 */
export const createErrorResponse = (code: string, customMessage?: string) => {
  const errorInfo = ERROR_MESSAGES[code] || ERROR_MESSAGES[ERROR_CODES.INTERNAL_SERVER_ERROR];
  return {
    code,
    message: customMessage || errorInfo.message,
    statusCode: errorInfo.statusCode,
  };
};

/**
 * Custom Error class with code support
 */
export class AppError extends Error {
  public code: string;
  public statusCode: number;

  constructor(code: string, customMessage?: string) {
    const errorInfo = ERROR_MESSAGES[code] || ERROR_MESSAGES[ERROR_CODES.INTERNAL_SERVER_ERROR];
    const message = customMessage || errorInfo.message;
    super(message);
    this.code = code;
    this.statusCode = errorInfo.statusCode;
    this.name = "AppError";
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
