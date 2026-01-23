/**
 * PPIC Module Examples & Test Cases
 * Comprehensive usage examples for the PPIC bulk import system
 */

import { PPICService, PPICDataProcessor, DataNormalizer, FuzzyMatcher } from "./index";
import fs from "fs";
import path from "path";

// ============================================================================
// EXAMPLE 1: Basic Bulk Import from Excel File
// ============================================================================
export async function example1_basicExcelImport() {
  console.log("=== EXAMPLE 1: Basic Excel Import ===\n");

  try {
    const buffer = fs.readFileSync("data/purchase_orders.xlsx");

    const result = await PPICService.bulkImport(buffer, "xlsx", {
      autoDetectMapping: true,
      skipOnError: false,
    });

    console.log("Import Result:");
    console.log(`- Total Rows: ${result.totalRows}`);
    console.log(`- Success: ${result.successCount}`);
    console.log(`- Failed: ${result.failureCount}`);
    console.log(`- Status: ${result.status}`);
    console.log(`- Processing Time: ${result.processingTime}ms`);

    if (result.errors && result.errors.length > 0) {
      console.log("\nFirst 3 Errors:");
      result.errors.slice(0, 3).forEach((err) => {
        console.log(`  Row ${err.rowIndex}: ${err.errors.map((e) => e.message).join(", ")}`);
      });
    }
  } catch (error) {
    console.error("Error:", (error as Error).message);
  }
}

// ============================================================================
// EXAMPLE 2: Import with Custom Field Mapping
// ============================================================================
export async function example2_customMapping() {
  console.log("\n=== EXAMPLE 2: Custom Field Mapping ===\n");

  try {
    const buffer = fs.readFileSync("data/purchase_orders_custom.csv");

    const customMapping = {
      poNo: "Order_ID",
      gstNo: "Tax_ID",
      brandName: "Product_Name",
      poQty: "Quantity_Ordered",
      poRate: "Unit_Price",
      amount: "Total_Amount",
      partyName: "Supplier_Name",
      poDate: "Order_Date",
    };

    const result = await PPICService.bulkImport(buffer, "csv", {
      mappingStrategy: customMapping,
      autoDetectMapping: false,
      skipOnError: true, // Skip rows with errors
      updateIfExists: true, // Update if PO already exists
    });

    console.log("Import completed with custom mapping");
    console.log(`Success: ${result.successCount}/${result.totalRows}`);
  } catch (error) {
    console.error("Error:", (error as Error).message);
  }
}

// ============================================================================
// EXAMPLE 3: Auto-Detect Field Mapping
// ============================================================================
export async function example3_detectMapping() {
  console.log("\n=== EXAMPLE 3: Auto-Detect Field Mapping ===\n");

  try {
    const buffer = fs.readFileSync("data/messy_data.xlsx");

    // Parse sheet to get headers
    const { headers, rows } = PPICService.parseSheetData(buffer, "xlsx");

    console.log("Detected Headers:", headers);

    // Auto-detect mapping
    const mapping = PPICService.detectFieldMapping(headers);

    console.log("\nSuggested Mapping:");
    Object.entries(mapping).forEach(([poField, sheetCol]) => {
      console.log(`  ${poField} <- ${sheetCol}`);
    });

    // Optionally test mapping with sample rows
    const sampleRows = rows.slice(0, 5);
    const testResult = PPICService.testMapping(sampleRows, mapping);

    console.log(
      `\nMapping Test: ${testResult.summary.valid}/${testResult.summary.total} rows valid`
    );
  } catch (error) {
    console.error("Error:", (error as Error).message);
  }
}

// ============================================================================
// EXAMPLE 4: Handle Messy Data - Phone Numbers
// ============================================================================
export function example4_phoneNumberParsing() {
  console.log("\n=== EXAMPLE 4: Intelligent Phone Parsing ===\n");

  const testPhones = [
    "9876543210",
    "98-7654-3210",
    "98 7654 3210",
    "+91-98-7654-3210",
    "+91 98 7654 3210",
    "034567804566", // 12-digit number
    "567804566", // 9 digits
    "Not a phone",
    "",
  ];

  testPhones.forEach((phone) => {
    const parsed = DataNormalizer.parsePhone(phone);
    console.log(`  "${phone}" -> ${parsed || "(invalid)"}`);
  });
}

// ============================================================================
// EXAMPLE 5: Handle Messy Data - Dates
// ============================================================================
export function example5_dateParsing() {
  console.log("\n=== EXAMPLE 5: Intelligent Date Parsing ===\n");

  const testDates = [
    "15/01/2026",
    "15-01-2026",
    "2026-01-15",
    "01/15/2026",
    "15 January 2026",
    45716, // Excel serial
    "2026-01-15T10:30:00Z", // ISO
    "invalid-date",
  ];

  testDates.forEach((date) => {
    const parsed = DataNormalizer.parseDate(date);
    console.log(`  "${date}" -> ${parsed?.toLocaleDateString("en-IN") || "(invalid)"}`);
  });
}

// ============================================================================
// EXAMPLE 6: Contact Field Extraction
// ============================================================================
export function example6_contactExtraction() {
  console.log("\n=== EXAMPLE 6: Contact Field Extraction ===\n");

  const mixedContacts = [
    "John Doe john@example.com 9876543210",
    "9876543210, Jane Smith",
    "contact@company.com 9876543210 Mr. Smith",
    "Dr. Patel 9876543210",
    "support@alpex.com",
  ];

  mixedContacts.forEach((contact) => {
    const parsed = DataNormalizer.parseContact(contact);
    console.log(`  Input: "${contact}"`);
    console.log(`  Parsed:`, parsed);
    console.log();
  });
}

// ============================================================================
// EXAMPLE 7: Fuzzy Field Matching
// ============================================================================
export function example7_fuzzyMatching() {
  console.log("\n=== EXAMPLE 7: Fuzzy Field Matching ===\n");

  const sheetHeaders = [
    "Order #",
    "Customer GSTN",
    "Product Brand",
    "Qty Ordered",
    "Unit Cost",
    "Total Amount",
  ];

  const searchTerms = ["phone", "po number", "gst", "quantity", "brand"];

  searchTerms.forEach((term) => {
    const match = FuzzyMatcher.findBestMatch(term, sheetHeaders);
    if (match) {
      console.log(
        `  "${term}" -> "${match.match}" (similarity: ${(match.similarity * 100).toFixed(0)}%)`
      );
    } else {
      console.log(`  "${term}" -> No match found`);
    }
  });
}

// ============================================================================
// EXAMPLE 8: Data Quality Scoring
// ============================================================================
export function example8_dataQuality() {
  console.log("\n=== EXAMPLE 8: Data Quality Scoring ===\n");

  const testRows = [
    {
      poNo: "PO-001",
      gstNo: "27AABCT1234H1Z0",
      brandName: "Aspirin",
      poQty: 1000,
      poRate: 50.5,
      poDate: "15/01/2026",
    }, // Complete
    {
      poNo: "PO-002",
      gstNo: "27AABCT1234H1Z0",
      brandName: "Paracetamol",
      poQty: 500,
    }, // Partial
    { poNo: "PO-003" }, // Minimal
    {
      poNo: "PO-004",
      gstNo: "27AABCT1234H1Z0",
      brandName: "Antibiotic",
      poQty: 2000,
      poRate: 75.0,
      poDate: "20/01/2026",
      address: "Mumbai",
      composition: "Ciprofloxacin",
      notes: "Urgent",
    }, // Very complete
  ];

  testRows.forEach((row, idx) => {
    const score = PPICDataProcessor.calculateDataQuality(row, ["poNo", "gstNo"]);
    console.log(`  Row ${idx + 1}: Quality Score = ${score}/100`);
  });
}

// ============================================================================
// EXAMPLE 9: Duplicate Detection & Merging
// ============================================================================
export function example9_duplicates() {
  console.log("\n=== EXAMPLE 9: Duplicate Detection & Merging ===\n");

  const rows = [
    { poNo: "PO-001", gstNo: "27AAA", brandName: "Product A", poQty: 100 },
    { poNo: "PO-002", gstNo: "27BBB", brandName: "Product B", poQty: 200 },
    { poNo: "PO-001", gstNo: "27AAA", brandName: "Product A", poQty: 150 }, // Duplicate
    { poNo: "PO-003", gstNo: "27CCC", brandName: "Product C", poQty: 300 },
    { poNo: "PO-001", gstNo: "27AAA", poRate: 50.5 }, // Duplicate with different data
  ];

  const { unique, duplicates } = PPICDataProcessor.deduplicateRows(rows, "poNo");

  console.log(`Total Rows: ${rows.length}`);
  console.log(`Unique: ${unique.length}`);
  console.log(`Duplicates: ${duplicates.length}`);

  if (duplicates.length > 0) {
    console.log("\nDuplicate Groups:");
    duplicates.forEach(({ key, rows: dupRows }) => {
      console.log(`  ${key}: ${dupRows.length} occurrences`);
      const merged = PPICDataProcessor.mergeDuplicatePOs(dupRows, "merge");
      console.log(`    Merged: ${JSON.stringify(merged)}`);
    });
  }
}

// ============================================================================
// EXAMPLE 10: Generate Import Report
// ============================================================================
export async function example10_importReport() {
  console.log("\n=== EXAMPLE 10: Import Report Generation ===\n");

  try {
    const buffer = fs.readFileSync("data/purchase_orders.xlsx");
    const result = await PPICService.bulkImport(buffer, "xlsx", {
      autoDetectMapping: true,
      skipOnError: true,
    });

    const { summary, details } = PPICDataProcessor.generateReport(result);

    console.log("SUMMARY:", summary);
    console.log("\nDETAILS:");
    console.log(details);
  } catch (error) {
    console.error("Error:", (error as Error).message);
  }
}

// ============================================================================
// RUN ALL EXAMPLES
// ============================================================================
export async function runAllExamples() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║         PPIC MODULE - COMPREHENSIVE EXAMPLES              ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  // Run non-async examples
  example4_phoneNumberParsing();
  example5_dateParsing();
  example6_contactExtraction();
  example7_fuzzyMatching();
  example8_dataQuality();
  example9_duplicates();

  // Run async examples (if data files exist)
  try {
    if (fs.existsSync("data/purchase_orders.xlsx")) {
      await example1_basicExcelImport();
    }

    if (fs.existsSync("data/purchase_orders_custom.csv")) {
      await example2_customMapping();
    }

    if (fs.existsSync("data/messy_data.xlsx")) {
      await example3_detectMapping();
    }

    await example10_importReport();
  } catch (err) {
    console.log("\nNote: Async examples skipped (data files not found)");
  }

  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║                  EXAMPLES COMPLETED                       ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
}

// Run if this file is executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}
