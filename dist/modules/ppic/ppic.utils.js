"use strict";
/**
 * PPIC Utilities - Advanced data processing helpers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PPICPerformance = exports.PPICDataProcessor = void 0;
class PPICDataProcessor {
    /**
     * Split array into chunks for batch processing
     */
    static chunk(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }
    /**
     * Merge contact information from multiple columns
     * Intelligently combines phone, email, name from different columns
     */
    static mergeContacts(contactFields) {
        const result = {};
        for (const [key, value] of Object.entries(contactFields)) {
            if (!value)
                continue;
            const lower = key.toLowerCase();
            // Phone detection
            if (lower.includes("phone") ||
                lower.includes("tel") ||
                lower.includes("mobile")) {
                result.phone = value;
            }
            // Email detection
            if (lower.includes("email") || lower.includes("mail")) {
                result.email = value;
            }
            // Name detection
            if (lower.includes("name") ||
                lower.includes("contact") ||
                key.match(/^contact/i)) {
                result.name = value;
            }
        }
        return result;
    }
    /**
     * Deduplicate rows based on PO number
     */
    static deduplicateRows(rows, keyField = "poNo") {
        const seen = new Map();
        const unique = [];
        for (const row of rows) {
            const key = row[keyField];
            if (!key) {
                unique.push(row);
                continue;
            }
            if (!seen.has(key)) {
                seen.set(key, [row]);
                unique.push(row);
            }
            else {
                seen.get(key).push(row);
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
    static mergeDuplicatePOs(pos, strategy = "merge") {
        if (strategy === "first")
            return pos[0];
        if (strategy === "last")
            return pos[pos.length - 1];
        // Merge strategy: combine non-empty fields, preferring later rows
        const merged = { ...pos[0] };
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
    static calculateDataQuality(row, requiredFields = ["poNo", "gstNo"]) {
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
            }
            else if (completeness < 60) {
                score = Math.min(score, 50);
            }
        }
        return Math.max(0, score);
    }
    /**
     * Generate import report
     */
    static generateReport(result) {
        const summary = {
            totalRecords: result.totalRows,
            successfulImports: result.successCount,
            failedImports: result.failureCount,
            successRate: result.totalRows > 0
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
${result.createdPOs.map((id) => `  - ${id}`).join("\n")}
`;
        if (result.errors && result.errors.length > 0) {
            details += `

ERRORS (Top 10):
`;
            result.errors.slice(0, 10).forEach((err) => {
                details += `
Row ${err.rowIndex} (PO: ${err.poNo || "N/A"}):
${err.errors.map((e) => `  - ${e.field}: ${e.message}`).join("\n")}
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
    static isRowValid(row, minRequiredFields = 3) {
        const filledFields = Object.values(row).filter((v) => v !== null && v !== undefined && v !== "").length;
        return filledFields >= minRequiredFields;
    }
    /**
     * Transform camelCase to snake_case for database
     */
    static toSnakeCase(obj) {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
            result[snakeKey] = value;
        }
        return result;
    }
    /**
     * Sanitize sensitive data for logging
     */
    static sanitizeForLogging(row, sensitiveFields = ["password", "token", "secret"]) {
        const sanitized = { ...row };
        for (const field of sensitiveFields) {
            if (field in sanitized) {
                sanitized[field] = "***REDACTED***";
            }
        }
        return sanitized;
    }
}
exports.PPICDataProcessor = PPICDataProcessor;
/**
 * Performance utilities for large-scale imports
 */
class PPICPerformance {
    /**
     * Parallel batch processing
     */
    static async processBatchesInParallel(batches, processor, concurrency = 3) {
        const results = [];
        const queue = [...batches];
        const worker = async () => {
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
    static async *streamLargeFile(buffer, chunkSize = 1000) {
        // Implementation would handle streaming parsing
        // This is a placeholder for the concept
        yield JSON.parse(buffer.toString());
    }
    /**
     * Calculate processing metrics
     */
    static calculateMetrics(totalRows, processingTimeMs, successCount) {
        return {
            rowsPerSecond: (totalRows / (processingTimeMs / 1000)) | 0,
            successPercentage: totalRows > 0 ? ((successCount / totalRows) * 100) | 0 : 0,
            estimatedTimeForMillionRows: (1000000 / (totalRows / (processingTimeMs / 1000))) | 0,
        };
    }
}
exports.PPICPerformance = PPICPerformance;
