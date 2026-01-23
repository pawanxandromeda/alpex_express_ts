# PPIC Module Integration Guide

## Quick Start

### 1. Module Already Integrated ✅

The PPIC module has been automatically integrated into your main application:

```typescript
// src/app.ts - Already includes:
import ppicRoutes from "./modules/ppic/ppic.routes";
app.use("/api/ppic", ppicRoutes);
```

### 2. Required Dependencies ✅

All required dependencies are installed:
```
- xlsx: ^0.18.5 (for Excel parsing)
- uuid: ^9.0.1 (for batch IDs)
- zod: ^4.3.5 (for validation)
- Other existing packages
```

### 3. API Endpoints Now Available

#### Base URL: `http://localhost:3000/api/ppic`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/import` | POST | Bulk import purchase orders from file |
| `/detect-mapping` | POST | Auto-detect field mappings from headers |
| `/test-mapping` | POST | Test mapping with sample rows |
| `/po-fields` | GET | Get list of available PO fields |
| `/batch/:batchId` | GET | Get status of batch import |

### 4. Usage Examples

#### Upload Excel File for Import
```bash
curl -X POST http://localhost:3000/api/ppic/import \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@purchases.xlsx"
```

#### Upload CSV with Auto-Mapping
```bash
curl -X POST http://localhost:3000/api/ppic/import \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@purchases.csv" \
  -F "fileType=csv" \
  -F "skipOnError=true"
```

#### Get Available Fields Reference
```bash
curl -X GET http://localhost:3000/api/ppic/po-fields \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Test Mapping Before Full Import
```bash
curl -X POST http://localhost:3000/api/ppic/test-mapping \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sampleRows": [
      {"PO Number": "PO-001", "Customer GST": "27AABCT1234H1Z0", "Brand": "Aspirin"}
    ],
    "mapping": {
      "poNo": "PO Number",
      "gstNo": "Customer GST",
      "brandName": "Brand"
    }
  }'
```

### 5. Programmatic Usage

```typescript
import { PPICService } from '@modules/ppic';
import fs from 'fs';

// Read file
const buffer = fs.readFileSync('data.xlsx');

// Import with options
const result = await PPICService.bulkImport(buffer, 'xlsx', {
  autoDetectMapping: true,
  skipOnError: false,
  updateIfExists: false,
});

// Check results
console.log(`Created ${result.successCount} POs`);
console.log(`Failed ${result.failureCount} rows`);
console.log(`Batch ID: ${result.batchId}`);
```

### 6. Data Format Examples

#### Input: CSV Format
```csv
PO Number,Customer GST,Brand Name,Quantity,Rate
PO-001,27AABCT1234H1Z0,Aspirin,1000,50.50
PO-002,27AABCT1234H1Z0,Paracetamol,500,75.00
```

#### Input: Excel Format
Same columns as CSV, but in Excel format (.xlsx or .xls)

#### Input: JSON Format
```json
[
  {
    "PO Number": "PO-001",
    "Customer GST": "27AABCT1234H1Z0",
    "Brand Name": "Aspirin",
    "Quantity": 1000,
    "Rate": 50.50
  }
]
```

#### Output Response
```json
{
  "success": true,
  "message": "Bulk import completed. Success: 148, Failed: 2",
  "data": {
    "batchId": "550e8400-e29b-41d4-a716-446655440000",
    "totalRows": 150,
    "successCount": 148,
    "failureCount": 2,
    "status": "partial",
    "createdPOs": ["id1", "id2", ...],
    "errors": [
      {
        "rowIndex": 5,
        "poNo": "PO-001",
        "errors": [
          {
            "field": "gstNo",
            "message": "Invalid GST format",
            "severity": "error"
          }
        ]
      }
    ],
    "processingTime": 2450,
    "timestamp": "2026-01-22T10:30:00Z"
  }
}
```

### 7. Common Use Cases

#### Case 1: Import from MailChimp-exported CSV
```typescript
const result = await PPICService.bulkImport(csvBuffer, 'csv', {
  autoDetectMapping: true, // Will find columns like "Email", "Phone", etc.
  skipOnError: true, // Continue on errors
  updateIfExists: true, // Update if PO exists
});
```

#### Case 2: Structured Excel Import with Known Mapping
```typescript
const mapping = {
  poNo: "Order ID",
  gstNo: "Tax ID",
  brandName: "Product",
  poQty: "Quantity",
  poRate: "Unit Price",
  amount: "Total",
  poDate: "Order Date"
};

const result = await PPICService.bulkImport(excelBuffer, 'xlsx', {
  mappingStrategy: mapping,
  autoDetectMapping: false,
  skipOnError: false,
});
```

#### Case 3: Validate Data Before Import
```typescript
const { headers, rows } = PPICService.parseSheetData(buffer, 'xlsx');
const mapping = PPICService.detectFieldMapping(headers);

// Test with sample
const testResult = PPICService.testMapping(rows.slice(0, 10), mapping);
console.log(`Data Quality: ${testResult.summary.valid}/${testResult.summary.total}`);

// If quality is acceptable, proceed with full import
if (testResult.summary.valid >= testResult.summary.total * 0.9) {
  const result = await PPICService.bulkImport(buffer, 'xlsx', {
    mappingStrategy: mapping,
    skipOnError: true,
  });
}
```

### 8. Handling Messy Data

The PPIC module intelligently handles various data inconsistencies:

```typescript
import { DataNormalizer } from '@modules/ppic';

// Phone: "9876543210", "98-7654-3210", "+91-98-7654-3210" -> "9876543210"
DataNormalizer.parsePhone("98-7654-3210");

// Date: "15/01/2026", "2026-01-15", "45716" (Excel) -> Date object
DataNormalizer.parseDate("15/01/2026");

// Number: "1000.50", "1,000.50", "₹1000" -> 1000.5
DataNormalizer.parseNumber("1,000.50", "float");

// Contact: "John 9876543210 john@example.com" -> { name, phone, email }
DataNormalizer.parseContact("John 9876543210 john@example.com");
```

### 9. Monitoring & Debugging

```typescript
import { PPICDataProcessor } from '@modules/ppic';

// Check data quality
const quality = PPICDataProcessor.calculateDataQuality(row);
console.log(`Data Quality Score: ${quality}/100`);

// Detect duplicates
const { unique, duplicates } = PPICDataProcessor.deduplicateRows(rows, 'poNo');

// Generate detailed report
const { summary, details } = PPICDataProcessor.generateReport(result);
console.log(details); // Pretty-printed report
```

### 10. Performance Tips

- **For small imports (< 1000 rows)**: Use default settings
- **For medium imports (1000-10000 rows)**: Set `batchSize: 50-100`
- **For large imports (> 10000 rows)**: Set `batchSize: 200, concurrency: 5`
- **For very large imports**: Use `skipOnError: true` to prevent full rollback

### 11. Error Resolution

Common errors and solutions:

| Error | Cause | Solution |
|-------|-------|----------|
| "Could not determine field mapping" | Incompatible headers | Provide `mappingStrategy` parameter |
| "Customer (GST) not found" | Invalid GST | Verify customer exists in system |
| "PO already exists" | Duplicate PO number | Set `updateIfExists: true` |
| "Invalid GST format" | Wrong format | Ensure GST is 15-character GSTIN |
| "Type mismatch" | Wrong data type | Check mapping and data format |

### 12. Testing

Run examples:
```bash
npm run ts-node src/modules/ppic/ppic.examples.ts
```

This will run 10 comprehensive examples showing all features.

## Architecture Overview

```
Request → Controller → Service → Parser → Database
           ↓
         Validation (Zod)
         ↓
         Field Mapping (Fuzzy Matcher)
         ↓
         Data Normalization (DataNormalizer)
         ↓
         Schema Mapping & Validation
         ↓
         Batch Processing (Transactions)
         ↓
         Response Formatting
```

## File Structure

```
src/modules/ppic/
├── ppic.parser.ts          # Core parsing logic
├── ppic.service.ts         # Business logic
├── ppic.controller.ts      # HTTP handlers
├── ppic.routes.ts          # Route definitions
├── ppic.validation.ts      # Zod schemas
├── ppic.utils.ts           # Helper functions
├── ppic.examples.ts        # Usage examples
├── index.ts               # Exports
└── PPIC_README.md         # Full documentation
```

## Troubleshooting

### Issue: Slow Performance
- Reduce `batchSize`
- Check database connection pooling
- Monitor system resources

### Issue: High Memory Usage
- Reduce batch size
- Implement streaming for very large files
- Process files incrementally

### Issue: Import Fails Completely
- Try `skipOnError: true`
- Test mapping first with sample data
- Check error logs for specific issues

## Support

For issues or questions:
1. Check PPIC_README.md for detailed documentation
2. Review ppic.examples.ts for usage patterns
3. Check server logs for error details
4. Contact development team

---

**Module Version**: 1.0.0  
**Status**: Production Ready  
**Last Updated**: January 22, 2026
