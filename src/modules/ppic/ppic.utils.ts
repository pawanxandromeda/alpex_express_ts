/**
 * PPIC Utilities - Advanced data processing helpers
 */

export class PPICDataProcessor {
  /**
   * Split array into chunks for batch processing
   */
  static chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Merge contact information from multiple columns
   * Intelligently combines phone, email, name from different columns
   */
  static mergeContacts(
    contactFields: Record<string, any>
  ): {
    name?: string;
    phone?: string;
    email?: string;
  } {
    const result: any = {};

    for (const [key, value] of Object.entries(contactFields)) {
      if (!value) continue;

      const lower = key.toLowerCase();

      // Phone detection
      if (
        lower.includes("phone") ||
        lower.includes("tel") ||
        lower.includes("mobile")
      ) {
        result.phone = value;
      }

      // Email detection
      if (lower.includes("email") || lower.includes("mail")) {
        result.email = value;
      }

      // Name detection
      if (
        lower.includes("name") ||
        lower.includes("contact") ||
        key.match(/^contact/i)
      ) {
        result.name = value;
      }
    }

    return result;
  }

  /**
   * Deduplicate rows based on PO number
   */
  static deduplicateRows(
    rows: Record<string, any>[],
    keyField: string = "poNo"
  ): {
    unique: Record<string, any>[];
    duplicates: Array<{ key: string; rows: Record<string, any>[] }>;
  } {
    const seen = new Map<string, Record<string, any>[]>();
    const unique: Record<string, any>[] = [];

    for (const row of rows) {
      const key = row[keyField];
      if (!key) {
        unique.push(row);
        continue;
      }

      if (!seen.has(key)) {
        seen.set(key, [row]);
        unique.push(row);
      } else {
        seen.get(key)!.push(row);
      }
    }

    const duplicates = Array.from(seen.entries())
      .filter(([, rows]) => rows.length > 1)
      .map(([key, rows]) => ({ key, rows }));

    return { unique, duplicates };
  }

  /**
   * Handle duplicate POs - merge or select strategy
   */
  static mergeDuplicatePOs(
    pos: Record<string, any>[],
    strategy: "first" | "last" | "merge" = "merge"
  ): Record<string, any> {
    if (strategy === "first") return pos[0];
    if (strategy === "last") return pos[pos.length - 1];

    // Merge strategy: combine non-empty fields, preferring later rows
    const merged: Record<string, any> = { ...pos[0] };
    for (let i = 1; i < pos.length; i++) {
      for (const [key, value] of Object.entries(pos[i])) {
        if (value !== null && value !== undefined && value !== "") {
          merged[key] = value;
        }
      }
    }
    return merged;
  }

  /**
   * Validate data quality score (0-100)
   */
  static calculateDataQuality(
    row: Record<string, any>,
    requiredFields: string[] = ["poNo", "gstNo"]
  ): number {
    let score = 100;
    let totalFields = 0;
    let filledFields = 0;

    for (const [key, value] of Object.entries(row)) {
      totalFields++;
      if (value !== null && value !== undefined && value !== "") {
        filledFields++;
      }

      // Penalize missing required fields
      if (requiredFields.includes(key) && !value) {
        score -= 50;
      }
    }

    // Additional penalty for very sparse data
    if (totalFields > 0) {
      const completeness = (filledFields / totalFields) * 100;
      if (completeness < 30) {
        score = Math.min(score, 20);
      } else if (completeness < 60) {
        score = Math.min(score, 50);
      }
    }

    return Math.max(0, score);
  }

  /**
   * Generate import report
   */
  static generateReport(
    result: any
  ): {
    summary: Record<string, any>;
    details: string;
  } {
    const summary = {
      totalRecords: result.totalRows,
      successfulImports: result.successCount,
      failedImports: result.failureCount,
      successRate:
        result.totalRows > 0
          ? ((result.successCount / result.totalRows) * 100).toFixed(2) + "%"
          : "0%",
      status: result.status,
      processingTime: result.processingTime + "ms",
      timestamp: result.timestamp,
    };

    let details = `
=== PPIC BULK IMPORT REPORT ===
Batch ID: ${result.batchId}
Status: ${result.status.toUpperCase()}

SUMMARY:
- Total Records: ${summary.totalRecords}
- Successful: ${summary.successfulImports}
- Failed: ${summary.failedImports}
- Success Rate: ${summary.successRate}
- Processing Time: ${summary.processingTime}
- Completed: ${result.timestamp}

CREATED PO NUMBERS:
${result.createdPOs.map((id: string) => `  - ${id}`).join("\n")}
`;

    if (result.errors && result.errors.length > 0) {
      details += `

ERRORS (Top 10):
`;
      result.errors.slice(0, 10).forEach((err: any) => {
        details += `
Row ${err.rowIndex} (PO: ${err.poNo || "N/A"}):
${err.errors.map((e: any) => `  - ${e.field}: ${e.message}`).join("\n")}
`;
      });

      if (result.errors.length > 10) {
        details += `\n... and ${result.errors.length - 10} more errors`;
      }
    }

    return { summary, details };
  }

  /**
   * Validate row completeness
   */
  static isRowValid(
    row: Record<string, any>,
    minRequiredFields: number = 3
  ): boolean {
    const filledFields = Object.values(row).filter(
      (v) => v !== null && v !== undefined && v !== ""
    ).length;
    return filledFields >= minRequiredFields;
  }

  /**
   * Transform camelCase to snake_case for database
   */
  static toSnakeCase(obj: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
      result[snakeKey] = value;
    }
    return result;
  }

  /**
   * Sanitize sensitive data for logging
   */
  static sanitizeForLogging(
    row: Record<string, any>,
    sensitiveFields: string[] = ["password", "token", "secret"]
  ): Record<string, any> {
    const sanitized = { ...row };
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = "***REDACTED***";
      }
    }
    return sanitized;
  }
}

/**
 * Performance utilities for large-scale imports
 */
export class PPICPerformance {
  /**
   * Parallel batch processing
   */
  static async processBatchesInParallel<T, R>(
    batches: T[][],
    processor: (batch: T[]) => Promise<R>,
    concurrency: number = 3
  ): Promise<R[]> {
    const results: R[] = [];
    const queue = [...batches];

    const worker = async (): Promise<void> => {
      while (queue.length > 0) {
        const batch = queue.shift();
        if (batch) {
          const result = await processor(batch);
          results.push(result);
        }
      }
    };

    const workers = Array(Math.min(concurrency, batches.length))
      .fill(null)
      .map(() => worker());

    await Promise.all(workers);
    return results;
  }

  /**
   * Memory-efficient streaming parser for large files
   */
  static async* streamLargeFile(
    buffer: Buffer,
    chunkSize: number = 1000
  ): AsyncGenerator<Record<string, any>[]> {
    // Implementation would handle streaming parsing
    // This is a placeholder for the concept
    yield JSON.parse(buffer.toString());
  }

  /**
   * Calculate processing metrics
   */
  static calculateMetrics(
    totalRows: number,
    processingTimeMs: number,
    successCount: number
  ): {
    rowsPerSecond: number;
    successPercentage: number;
    estimatedTimeForMillionRows: number;
  } {
    return {
      rowsPerSecond: (totalRows / (processingTimeMs / 1000)) | 0,
      successPercentage:
        totalRows > 0 ? ((successCount / totalRows) * 100) | 0 : 0,
      estimatedTimeForMillionRows: (1000000 / (totalRows / (processingTimeMs / 1000))) | 0,
    };
  }
}
