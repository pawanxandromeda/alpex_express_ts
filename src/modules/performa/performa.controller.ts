import { Response } from "express";
import { AuthRequest } from "../../common/middleware/auth.middleware";
import { sendSuccess, sendError, handleError } from "../../common/utils/responseFormatter";
import { ERROR_CODES } from "../../common/utils/errorMessages";
import ProformaInvoiceService from "./performa.service";

/**
 * Create a new Proforma Invoice
 */
export const createPI = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, ERROR_CODES.UNAUTHORIZED);
    }

    const { customerId, brandName, partyName, gstNo, composition, compositionId, piQty, piRate, amount, mrp, paymentTerms, deliveryTerms, address, notes } = req.body;

    if (!customerId) {
      return sendError(res, Object.assign({}, ERROR_CODES.VALIDATION_ERROR, { message: "Customer ID is required" }));
    }

    const pi = await ProformaInvoiceService.createPI({
      customerId,
      brandName,
      partyName,
      gstNo,
      composition,
      compositionId,
      piQty,
      piRate,
      amount,
      mrp,
      paymentTerms,
      deliveryTerms,
      address,
      notes,
      createdBy: req.user.id,
    });

    return sendSuccess(res, pi, "Proforma Invoice created successfully", 201);
  } catch (error) {
    return handleError(res, error);
  }
};

/**
 * Get PI details
 */
export const getPIById = async (req: AuthRequest, res: Response) => {
  try {
    const { piId } = req.params;

    if (!piId) {
      return sendError(res, Object.assign({}, ERROR_CODES.VALIDATION_ERROR, { message: "PI ID is required" }));
    }

    const pi = await ProformaInvoiceService.getPIById(piId as string);

    return sendSuccess(res, pi, "Proforma Invoice retrieved successfully");
  } catch (error) {
    return handleError(res, error);
  }
};

/**
 * List all PIs
 */
export const listPIs = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return sendError(res, ERROR_CODES.UNAUTHORIZED);
    }

    const { page = 1, limit = 10, customerId, status, verificationStatus, searchTerm } = req.query;

    const filters: any = {};
    if (customerId) filters.customerId = customerId;
    if (status) filters.status = status;
    if (verificationStatus) filters.verificationStatus = verificationStatus;
    if (searchTerm) filters.searchTerm = searchTerm;

    const result = await ProformaInvoiceService.listPIs(
      filters,
      parseInt(page as string),
      parseInt(limit as string),
      req.user.id
    );

    return sendSuccess(res, result, "Proforma Invoices retrieved successfully");
  } catch (error) {
    return handleError(res, error);
  }
};

/**
 * Send PI to customer
 */
export const sendPI = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, ERROR_CODES.UNAUTHORIZED);
    }

    const { piId } = req.params;

    if (!piId) {
      return sendError(res, Object.assign({}, ERROR_CODES.VALIDATION_ERROR, { message: "PI ID is required" }));
    }

    const pi = await ProformaInvoiceService.sendPI(piId as string, req.user.id);

    return sendSuccess(res, pi, "Proforma Invoice sent successfully");
  } catch (error) {
    return handleError(res, error);
  }
};

/**
 * Verify PI (Sales approval)
 */
export const verifyPI = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, ERROR_CODES.UNAUTHORIZED);
    }

    const { piId } = req.params;

    if (!piId) {
      return sendError(res, Object.assign({}, ERROR_CODES.VALIDATION_ERROR, { message: "PI ID is required" }));
    }

    const pi = await ProformaInvoiceService.verifyPI(piId as string, req.user.id);

    return sendSuccess(res, pi, "Proforma Invoice verified successfully");
  } catch (error) {
    return handleError(res, error);
  }
};

/**
 * Reject PI
 */
export const rejectPI = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, ERROR_CODES.UNAUTHORIZED);
    }

    const { piId } = req.params;
    const { rejectionReason } = req.body;

    if (!piId || !rejectionReason) {
      return sendError(res, Object.assign({}, ERROR_CODES.VALIDATION_ERROR, { message: "PI ID and rejection reason are required" }));
    }

    const pi = await ProformaInvoiceService.rejectPI(piId as string, rejectionReason, req.user.id);

    return sendSuccess(res, pi, "Proforma Invoice rejected successfully");
  } catch (error) {
    return handleError(res, error);
  }
};

/**
 * Convert verified PI to PO
 */
export const convertToPO = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, ERROR_CODES.UNAUTHORIZED);
    }

    const { piId } = req.params;

    if (!piId) {
      return sendError(res, Object.assign({}, ERROR_CODES.VALIDATION_ERROR, { message: "PI ID is required" }));
    }

    const result = await ProformaInvoiceService.convertToPO(
      piId as string,
      req.user.id
    );

    return sendSuccess(res, result, "Proforma Invoice converted to Purchase Order successfully", 201);
  } catch (error) {
    return handleError(res, error);
  }
};

/**
 * Update PI details
 */
export const updatePI = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, ERROR_CODES.UNAUTHORIZED);
    }

    const { piId } = req.params;

    if (!piId) {
      return sendError(res, Object.assign({}, ERROR_CODES.VALIDATION_ERROR, { message: "PI ID is required" }));
    }

    const pi = await ProformaInvoiceService.updatePI(piId as string, { ...req.body, createdBy: req.user.id });

    return sendSuccess(res, pi, "Proforma Invoice updated successfully");
  } catch (error) {
    return handleError(res, error);
  }
};

/**
 * Delete PI
 */
export const deletePI = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, ERROR_CODES.UNAUTHORIZED);
    }

    const { piId } = req.params;

    if (!piId) {
      return sendError(res, Object.assign({}, ERROR_CODES.VALIDATION_ERROR, { message: "PI ID is required" }));
    }

    const result = await ProformaInvoiceService.deletePI(piId as string);

    return sendSuccess(res, result, "Proforma Invoice deleted successfully");
  } catch (error) {
    return handleError(res, error);
  }
};

/**
 * Get PI statistics
 */
export const getPIStatistics = async (req: AuthRequest, res: Response) => {
  try {
    const { customerId } = req.query;

    const stats = await ProformaInvoiceService.getPIStatistics(customerId as string);

    return sendSuccess(res, stats, "PI statistics retrieved successfully");
  } catch (error) {
    return handleError(res, error);
  }
};

/**
 * Add line items to PI
 */
export const addLineItems = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, ERROR_CODES.UNAUTHORIZED);
    }

    const { piId } = req.params;
    const { lineItems } = req.body;

    if (!piId || !lineItems || !Array.isArray(lineItems)) {
      return sendError(
        res,
        Object.assign({}, ERROR_CODES.VALIDATION_ERROR, { message: "PI ID and line items array are required" })
      );
    }

    const result = await ProformaInvoiceService.addLineItems(piId as string, lineItems);

    return sendSuccess(res, result, "Line items added successfully");
  } catch (error) {
    return handleError(res, error);
  }
};

/**
 * Add approvals to PI
 */
export const addApprovals = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, ERROR_CODES.UNAUTHORIZED);
    }

    const { piId } = req.params;
    const {
      preparedByEmployeeId,
      checkedByEmployeeId,
      accountantEmployeeId,
      designerEmployeeId,
      authorisedByEmployeeId,
    } = req.body;

    if (!piId) {
      return sendError(res, Object.assign({}, ERROR_CODES.VALIDATION_ERROR, { message: "PI ID is required" }));
    }

    const result = await ProformaInvoiceService.addApprovals(piId as string, {
      preparedByEmployeeId,
      checkedByEmployeeId,
      accountantEmployeeId,
      designerEmployeeId,
      authorisedByEmployeeId,
    });

    return sendSuccess(res, result, "Approvals added successfully");
  } catch (error) {
    return handleError(res, error);
  }
};

/**
 * Generate PI PDF
 */
export const generatePIPDF = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, ERROR_CODES.UNAUTHORIZED);
    }

    const { piId } = req.params;

    if (!piId) {
      return sendError(res, Object.assign({}, ERROR_CODES.VALIDATION_ERROR, { message: "PI ID is required" }));
    }

    const pi = await ProformaInvoiceService.getPIById(piId as string);

    // Generate PDF
    const { PDFGenerator } = await import("../../common/utils/pdfGenerator");
    const pdfBuffer = await PDFGenerator.generateProformaInvoicePDF(pi as any);

    // Set response headers
    res.contentType("application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${pi.piNo || "PI"}.pdf"`);

    // Send PDF
    res.send(pdfBuffer);
    return;
  } catch (error) {
    return handleError(res, error);
  }
};
