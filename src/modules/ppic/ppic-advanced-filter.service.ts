/**
 * PPIC Advanced Filter Service
 * Integrates with PostgreSQL stored procedure for dynamic filtering
 */

import prisma from "../../config/postgres";
import { Prisma } from "@prisma/client";

/**
 * Filter operator types supported by the stored procedure
 */
export type FilterOperator =
  | "equals" | "eq" | "="
  | "not_equals" | "neq" | "!="
  | "contains" | "like"
  | "starts_with" | "starts"
  | "ends_with" | "ends"
  | "gt" | ">"
  | "gte" | ">="
  | "lt" | "<"
  | "lte" | "<="
  | "between" | "range"
  | "is_null" | "null"
  | "is_not_null" | "not_null"
  | "in"
  | "not_in"
  | "date_range";

/**
 * Filter condition structure
 */
export interface FilterCondition {
  operator: FilterOperator;
  value?: string | number | boolean;
  min?: string | number;
  max?: string | number;
  from?: string;
  to?: string;
  values?: Array<string | number>;
}

/**
 * Array format filter (with field property)
 */
export interface ArrayFilterCondition extends FilterCondition {
  field: string;
}

/**
 * Dynamic filter request structure
 * Supports both object format: {fieldName: {operator, value}} and array format: [{field, operator, value}]
 */
export interface DynamicFilterRequest {
  filters: Record<string, FilterCondition> | ArrayFilterCondition[];
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
  page?: number;
  limit?: number;
  operator?: "AND" | "OR"; // How to combine multiple filters
}

/**
 * Dynamic filter response structure
 */
export interface DynamicFilterResponse {
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  data: any[];
}

/**
 * PPICAdvancedFilterService
 * Provides advanced filtering capabilities using PostgreSQL stored procedure
 */
export class PPICAdvancedFilterService {
  /**
   * Convert array filter format to object format
   * Transforms [{field: "poNo", operator: "equals", value: "123"}]
   * to {poNo: {operator: "equals", value: "123"}}
   */
  static normalizeFilters(
    filters: Record<string, FilterCondition> | ArrayFilterCondition[]
  ): Record<string, FilterCondition> {
    // If already in object format, return as-is
    if (!Array.isArray(filters)) {
      return filters;
    }

    // Convert array format to object format
    const normalized: Record<string, FilterCondition> = {};
    for (const filter of filters) {
      const { field, ...condition } = filter;
      normalized[field] = condition as FilterCondition;
    }
    return normalized;
  }

  /**
   * Execute dynamic filter query using stored procedure
   */
  static async filterDynamic(
    request: DynamicFilterRequest
  ): Promise<DynamicFilterResponse> {
    try {
      const {
        filters = {},
        sortBy = "createdAt",
        sortOrder = "DESC",
        page = 1,
        limit = 50,
        operator = "AND",
      } = request;

      // Normalize filters to object format if they're in array format
      const normalizedFilters = this.normalizeFilters(filters);

      // Validate page and limit
      const validPage = Math.max(1, page);
      const validLimit = Math.max(1, Math.min(limit, 1000)); // Max 1000 records per page

      // Convert filters to JSONB format expected by stored procedure
      const filtersJson = JSON.stringify(normalizedFilters);

      // Execute stored procedure
      const result = await prisma.$queryRaw<Array<{
        total_count: bigint;
        page_number: number;
        page_size: number;
        total_pages: number;
        data: any;
      }>>`
        SELECT * FROM filter_ppic_dynamic(
          ${filtersJson}::JSONB,
          ${sortBy}::TEXT,
          ${sortOrder}::TEXT,
          ${validPage}::INTEGER,
          ${validLimit}::INTEGER,
          ${operator}::TEXT
        )
      `;

      if (!result || result.length === 0) {
        return {
          totalCount: 0,
          pageNumber: validPage,
          pageSize: validLimit,
          totalPages: 1,
          data: [],
        };
      }

      const row = result[0];

      return {
        totalCount: Number(row.total_count),
        pageNumber: row.page_number,
        pageSize: row.page_size,
        totalPages: row.total_pages,
        data: row.data || [],
      };
    } catch (err) {
      throw new Error(
        `Dynamic filter failed: ${(err as Error).message}`
      );
    }
  }

  /**
   * Build filter from query parameters
   * Useful for converting HTTP query params to filter format
   */
  static buildFilterFromQuery(query: Record<string, any>): DynamicFilterRequest {
    const filters: Record<string, FilterCondition> = {};

    // Process each query parameter
    for (const [key, value] of Object.entries(query)) {
      // Skip pagination and sorting params
      if (["page", "limit", "sortBy", "sortOrder", "operator"].includes(key)) {
        continue;
      }

      // Handle different parameter patterns
      if (key.endsWith("_from") || key.endsWith("_to")) {
        // Date range parameter
        const fieldName = key.replace(/_from$|_to$/, "");
        if (!filters[fieldName]) {
          filters[fieldName] = { operator: "date_range" };
        }
        if (key.endsWith("_from")) {
          filters[fieldName].from = String(value);
        } else {
          filters[fieldName].to = String(value);
        }
      } else if (key.endsWith("_min") || key.endsWith("_max")) {
        // Numeric range parameter
        const fieldName = key.replace(/_min$|_max$/, "");
        if (!filters[fieldName]) {
          filters[fieldName] = { operator: "between" };
        }
        if (key.endsWith("_min")) {
          filters[fieldName].min = String(value);
        } else {
          filters[fieldName].max = String(value);
        }
      } else if (key.endsWith("_op")) {
        // Operator specification (e.g., brandName_op=contains)
        // Skip - will be processed with the value
      } else {
        // Regular field filter
        const operatorKey = `${key}_op`;
        const operator = query[operatorKey] as FilterOperator || "contains";
        
        filters[key] = {
          operator,
          value: String(value),
        };
      }
    }

    return {
      filters,
      sortBy: query.sortBy || "createdAt",
      sortOrder: query.sortOrder?.toUpperCase() === "ASC" ? "ASC" : "DESC",
      page: parseInt(query.page) || 1,
      limit: parseInt(query.limit) || 50,
      operator: query.operator?.toUpperCase() === "OR" ? "OR" : "AND",
    };
  }

  /**
   * Get available filter fields with their types
   */
  static getAvailableFilters(): Record<string, {
    type: string;
    operators: FilterOperator[];
    description?: string;
  }> {
    return {
      poNo: {
        type: "string",
        operators: ["equals", "contains", "starts_with", "ends_with", "is_null", "is_not_null"],
        description: "Purchase Order Number",
      },
      gstNo: {
        type: "string",
        operators: ["equals", "contains", "is_null", "is_not_null"],
        description: "GST Number",
      },
      brandName: {
        type: "string",
        operators: ["equals", "contains", "starts_with", "ends_with", "in", "not_in"],
        description: "Brand Name",
      },
      partyName: {
        type: "string",
        operators: ["equals", "contains", "starts_with", "ends_with", "in", "not_in"],
        description: "Party/Customer Name",
      },
      overallStatus: {
        type: "string",
        operators: ["equals", "not_equals", "in", "not_in"],
        description: "Overall Status",
      },
      dispatchStatus: {
        type: "string",
        operators: ["equals", "not_equals", "in", "not_in"],
        description: "Dispatch Status",
      },
      productionStatus: {
        type: "string",
        operators: ["equals", "not_equals", "in", "not_in", "is_null", "is_not_null"],
        description: "Production Status",
      },
      poDate: {
        type: "date",
        operators: ["equals", "gt", "gte", "lt", "lte", "between", "date_range"],
        description: "PO Date",
      },
      dispatchDate: {
        type: "date",
        operators: ["equals", "gt", "gte", "lt", "lte", "between", "date_range", "is_null", "is_not_null"],
        description: "Dispatch Date",
      },
      amount: {
        type: "number",
        operators: ["equals", "not_equals", "gt", "gte", "lt", "lte", "between"],
        description: "Amount",
      },
      poQty: {
        type: "number",
        operators: ["equals", "not_equals", "gt", "gte", "lt", "lte", "between"],
        description: "PO Quantity",
      },
      batchNo: {
        type: "string",
        operators: ["equals", "contains", "starts_with", "ends_with"],
        description: "Batch Number",
      },
      invoiceNo: {
        type: "string",
        operators: ["equals", "contains", "is_null", "is_not_null"],
        description: "Invoice Number",
      },
      mdApproval: {
        type: "string",
        operators: ["equals", "not_equals", "in", "not_in"],
        description: "MD Approval Status",
      },
      accountsApproval: {
        type: "string",
        operators: ["equals", "not_equals", "in", "not_in"],
        description: "Accounts Approval Status",
      },
      designerApproval: {
        type: "string",
        operators: ["equals", "not_equals", "in", "not_in"],
        description: "Designer Approval Status",
      },
      ppicApproval: {
        type: "string",
        operators: ["equals", "not_equals", "in", "not_in"],
        description: "PPIC Approval Status",
      },
    };
  }

  /**
   * Validate filter request
   */
  static validateFilterRequest(request: DynamicFilterRequest): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const availableFilters = this.getAvailableFilters();

    // Normalize filters to object format
    const normalizedFilters = this.normalizeFilters(request.filters);

    // Validate each filter
    for (const [fieldName, condition] of Object.entries(normalizedFilters)) {
      const fieldConfig = availableFilters[fieldName];
      
      if (!fieldConfig) {
        errors.push(`Unknown filter field: ${fieldName}`);
        continue;
      }

      if (!fieldConfig.operators.includes(condition.operator)) {
        errors.push(
          `Invalid operator '${condition.operator}' for field '${fieldName}'. ` +
          `Allowed operators: ${fieldConfig.operators.join(", ")}`
        );
      }

      // Validate operator-specific requirements
      if (["between", "range"].includes(condition.operator)) {
        if (condition.min === undefined || condition.max === undefined) {
          errors.push(`Operator '${condition.operator}' requires both 'min' and 'max' values for field '${fieldName}'`);
        }
      } else if (condition.operator === "date_range") {
        if (condition.from === undefined && condition.to === undefined) {
          errors.push(`Operator 'date_range' requires at least 'from' or 'to' value for field '${fieldName}'`);
        }
      } else if (["in", "not_in"].includes(condition.operator)) {
        if (!condition.values || !Array.isArray(condition.values) || condition.values.length === 0) {
          errors.push(`Operator '${condition.operator}' requires non-empty 'values' array for field '${fieldName}'`);
        }
      } else if (!["is_null", "is_not_null", "null", "not_null"].includes(condition.operator)) {
        if (condition.value === undefined) {
          errors.push(`Operator '${condition.operator}' requires 'value' for field '${fieldName}'`);
        }
      }
    }

    // Validate pagination
    if (request.page !== undefined && request.page < 1) {
      errors.push("Page number must be >= 1");
    }

    if (request.limit !== undefined && (request.limit < 1 || request.limit > 1000)) {
      errors.push("Limit must be between 1 and 1000");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

export default PPICAdvancedFilterService;
