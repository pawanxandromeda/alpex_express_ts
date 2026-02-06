/**
 * PPIC Advanced Filter Controller
 * Endpoints for dynamic filtering with stored procedure
 */

import { Request, Response, NextFunction } from "express";
import { PPICAdvancedFilterService, DynamicFilterRequest } from "./ppic-advanced-filter.service";
import { sendSuccess, sendError } from "../../common/utils/responseFormatter";
import { ERROR_CODES } from "../../common/utils/errorMessages";

class PPICAdvancedFilterController {
  /**
   * Advanced dynamic filter endpoint
   * POST /api/ppic/filter/advanced
   * 
   * Supports TWO filter formats:
   * 
   * 1. OBJECT FORMAT (recommended):
   * {
   *   "filters": {
   *     "brandName": { "operator": "contains", "value": "Paracetamol" },
   *     "poDate": { "operator": "date_range", "from": "2024-01-01", "to": "2024-12-31" },
   *     "amount": { "operator": "between", "min": "1000", "max": "5000" },
   *     "overallStatus": { "operator": "in", "values": ["Pending", "In Progress"] }
   *   },
   *   "sortBy": "poDate",
   *   "sortOrder": "DESC",
   *   "page": 1,
   *   "limit": 50,
   *   "operator": "AND"
   * }
   * 
   * 2. ARRAY FORMAT (alternative):
   * {
   *   "filters": [
   *     { "field": "poNo", "operator": "startsWith", "value": "sad" },
   *     { "field": "brandName", "operator": "contains", "value": "Paracetamol" },
   *     { "field": "amount", "operator": "between", "min": "1000", "max": "5000" }
   *   ],
   *   "sortBy": "poDate",
   *   "sortOrder": "DESC",
   *   "page": 1,
   *   "limit": 50,
   *   "operator": "AND"
   * }
   */
  async filterAdvanced(req: Request, res: Response, next: NextFunction) {
    try {
      const filterRequest: DynamicFilterRequest = req.body;

      // Validate request
      const validation = PPICAdvancedFilterService.validateFilterRequest(filterRequest);
      if (!validation.isValid) {
        return sendError(
          res,
          ERROR_CODES.VALIDATION_ERROR,
          `Filter validation failed: ${validation.errors.join(", ")}`
        );
      }

      // Execute filter
      const result = await PPICAdvancedFilterService.filterDynamic(filterRequest);

      return sendSuccess(
        res,
        {
          ...result,
          filters: filterRequest.filters,
          sortBy: filterRequest.sortBy,
          sortOrder: filterRequest.sortOrder,
        },
        "Advanced filter completed successfully"
      );
    } catch (err) {
      next(err);
    }
  }

  /**
   * Advanced filter with query parameters (alternative to POST)
   * GET /api/ppic/filter/query?brandName=Paracetamol&brandName_op=contains&poDate_from=2024-01-01&poDate_to=2024-12-31
   */
  async filterWithQueryParams(req: Request, res: Response, next: NextFunction) {
    try {
      // Build filter request from query params
      const filterRequest = PPICAdvancedFilterService.buildFilterFromQuery(req.query);

      // Validate request
      const validation = PPICAdvancedFilterService.validateFilterRequest(filterRequest);
      if (!validation.isValid) {
        return sendError(
          res,
          ERROR_CODES.VALIDATION_ERROR,
          `Filter validation failed: ${validation.errors.join(", ")}`
        );
      }

      // Execute filter
      const result = await PPICAdvancedFilterService.filterDynamic(filterRequest);

      return sendSuccess(
        res,
        {
          ...result,
          appliedFilters: filterRequest.filters,
        },
        "Query filter completed successfully"
      );
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get available filter fields and operators
   * GET /api/ppic/filter/fields
   */
  async getFilterFields(req: Request, res: Response, next: NextFunction) {
    try {
      const fields = PPICAdvancedFilterService.getAvailableFilters();
      
      return sendSuccess(
        res,
        {
          fields,
          totalFields: Object.keys(fields).length,
        },
        "Available filter fields retrieved"
      );
    } catch (err) {
      next(err);
    }
  }

  /**
   * Validate filter without executing
   * POST /api/ppic/filter/validate
   */
  async validateFilter(req: Request, res: Response, next: NextFunction) {
    try {
      const filterRequest: DynamicFilterRequest = req.body;
      
      const validation = PPICAdvancedFilterService.validateFilterRequest(filterRequest);
      
      return sendSuccess(
        res,
        {
          isValid: validation.isValid,
          errors: validation.errors,
          filterCount: Object.keys(filterRequest.filters || {}).length,
        },
        validation.isValid 
          ? "Filter is valid" 
          : "Filter validation failed"
      );
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get filter presets (common filter combinations)
   * GET /api/ppic/filter/presets
   */
  async getFilterPresets(req: Request, res: Response, next: NextFunction) {
    try {
      const presets = {
        pendingOrders: {
          name: "Pending Orders",
          description: "All orders with pending status",
          filters: {
            overallStatus: { operator: "equals", value: "Pending" },
          },
          sortBy: "poDate",
          sortOrder: "DESC",
        },
        thisMonthOrders: {
          name: "This Month Orders",
          description: "Orders from current month",
          filters: {
            poDate: {
              operator: "date_range",
              from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
              to: new Date().toISOString().split('T')[0],
            },
          },
          sortBy: "poDate",
          sortOrder: "DESC",
        },
        highValueOrders: {
          name: "High Value Orders",
          description: "Orders with amount > 10000",
          filters: {
            amount: { operator: "gt", value: "10000" },
          },
          sortBy: "amount",
          sortOrder: "DESC",
        },
        pendingApprovals: {
          name: "Pending Approvals",
          description: "Orders pending any approval",
          filters: {
            mdApproval: { operator: "equals", value: "Pending" },
          },
          operator: "OR",
          sortBy: "createdAt",
          sortOrder: "DESC",
        },
        readyToDispatch: {
          name: "Ready to Dispatch",
          description: "Orders ready for dispatch",
          filters: {
            productionStatus: { operator: "equals", value: "Completed" },
            dispatchStatus: { operator: "equals", value: "Pending" },
          },
          sortBy: "packingDate",
          sortOrder: "ASC",
        },
        overdueOrders: {
          name: "Overdue Orders",
          description: "Orders with past dispatch date and pending dispatch",
          filters: {
            dispatchDate: { 
              operator: "lt", 
              value: new Date().toISOString().split('T')[0] 
            },
            dispatchStatus: { operator: "in", values: ["Pending", "Partial"] },
          },
          sortBy: "dispatchDate",
          sortOrder: "ASC",
        },
      };

      return sendSuccess(
        res,
        {
          presets,
          presetCount: Object.keys(presets).length,
        },
        "Filter presets retrieved"
      );
    } catch (err) {
      next(err);
    }
  }
}

export const ppicAdvancedFilterController = new PPICAdvancedFilterController();
