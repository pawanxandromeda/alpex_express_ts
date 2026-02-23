import express from "express";
import * as controller from "./performa.controller";
import { protect } from "../../common/middleware/auth.middleware";
import { validate } from '../../common/middleware/zod.validate';
import {
  createPIValidation,
  updatePIValidation,
  convertToPOValidation,
  rejectPIValidation,
} from "./performa.validation";

const router = express.Router();

// All routes require authentication
router.use(protect);

/**
 * POST /api/performa - Create a new Proforma Invoice
 */
router.post("/", validate(createPIValidation), controller.createPI);

/**
 * GET /api/performa - List all Proforma Invoices
 */
router.get("/", controller.listPIs);

/**
 * GET /api/performa/statistics - Get PI statistics
 */
router.get("/statistics", controller.getPIStatistics);

/**
 * GET /api/performa/:piId - Get PI details
 */
router.get("/:piId", controller.getPIById);

/**
 * PATCH /api/performa/:piId - Update PI details
 */
router.patch("/:piId", validate(updatePIValidation), controller.updatePI);

/**
 * DELETE /api/performa/:piId - Delete PI
 */
router.delete("/:piId", controller.deletePI);

/**
 * POST /api/performa/:piId/send - Send PI to customer
 */
router.post("/:piId/send", controller.sendPI);

/**
 * POST /api/performa/:piId/verify - Verify PI (Sales approval)
 */
router.post("/:piId/verify", controller.verifyPI);

/**
 * POST /api/performa/:piId/reject - Reject PI
 */
router.post("/:piId/reject", validate(rejectPIValidation), controller.rejectPI);

/**
 * POST /api/performa/:piId/convert-to-po - Convert verified PI to PO
 */
router.post("/:piId/convert-to-po", validate(convertToPOValidation), controller.convertToPO);

/**
 * POST /api/performa/:piId/line-items - Add line items to PI
 */
router.post("/:piId/line-items", controller.addLineItems);

/**
 * POST /api/performa/:piId/approvals - Add approvals to PI
 */
router.post("/:piId/approvals", controller.addApprovals);

/**
 * GET /api/performa/:piId/pdf - Generate PI PDF
 */
router.get("/:piId/pdf", controller.generatePIPDF);

export default router;
