/**
 * PPIC Advanced Filter Routes
 * Add these routes to your existing PPIC router
 */

import { Router } from "express";
import { ppicAdvancedFilterController } from "./ppic-advanced-filter.controller";

const router = Router();

/**
 * Advanced Filter Endpoints
 */

// POST /api/ppic/filter/advanced
// Execute advanced filter with JSON body
router.post(
  "/filter/advanced",
  ppicAdvancedFilterController.filterAdvanced.bind(ppicAdvancedFilterController)
);

// GET /api/ppic/filter/query
// Execute filter using query parameters
router.get(
  "/filter/query",
  ppicAdvancedFilterController.filterWithQueryParams.bind(ppicAdvancedFilterController)
);

// GET /api/ppic/filter/fields
// Get available filter fields and operators
router.get(
  "/filter/fields",
  ppicAdvancedFilterController.getFilterFields.bind(ppicAdvancedFilterController)
);

// POST /api/ppic/filter/validate
// Validate filter without executing
router.post(
  "/filter/validate",
  ppicAdvancedFilterController.validateFilter.bind(ppicAdvancedFilterController)
);

// GET /api/ppic/filter/presets
// Get common filter presets
router.get(
  "/filter/presets",
  ppicAdvancedFilterController.getFilterPresets.bind(ppicAdvancedFilterController)
);

export default router;

/**
 * Integration Example:
 * 
 * In your main PPIC router file (ppic.routes.ts):
 * 
 * import ppicFilterRoutes from './ppic-advanced-filter.routes';
 * 
 * // Add to your existing router
 * router.use('/', ppicFilterRoutes);
 */
