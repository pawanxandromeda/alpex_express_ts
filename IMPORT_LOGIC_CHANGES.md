# Sheet Import Logic Changes

## Overview
Updated the PPIC (Purchase Order Import) service to implement a **pass-through import strategy** that saves EXACTLY what is in the imported sheet without any generation, transformation, or assumptions.

## Key Changes

### 1. **Pass-Through Mapping Strategy** (`ppic.parser.ts`)
**File:** `src/modules/ppic/ppic.parser.ts` - `MappingBuilder.buildMapping()`

**Before:** 
- Used fuzzy matching to try to map sheet headers to PO model fields
- Attempted to normalize and standardize field names
- Only included fields that could be matched to known PO schema fields

**After:**
```typescript
static buildMapping(sheetHeaders: string[]): Record<string, string> {
  // Simple pass-through: each header maps to itself
  // This ensures we save exactly what's in the sheet
  const mapping: Record<string, string> = {};
  for (const header of sheetHeaders) {
    mapping[header] = header;
  }
  return mapping;
}
```

**Impact:** All sheet column headers are preserved as-is and used directly for data saving.

---

### 2. **Sheet-Headers-Only Data Filtering** (`ppic.service.ts`)
**File:** `src/modules/ppic/ppic.service.ts` - `sanitizeData()`

**Before:**
- Filtered data against a predefined list of valid PO schema fields
- Trimmed and transformed string values
- Applied parsing rules to numbers and dates

**After:**
```typescript
private static sanitizeData(data: Record<string, any>, sheetHeaders: string[] = []): Record<string, any> {
  // If sheetHeaders provided, only keep those fields
  if (sheetHeaders.length > 0) {
    const sanitized: Record<string, any> = {};
    
    for (const header of sheetHeaders) {
      if (header in data) {
        const value = data[header];
        // Keep exact value from sheet - no transformation
        // Only skip if explicitly null/undefined
        if (value !== null && value !== undefined && value !== '') {
          sanitized[header] = value;
        }
      }
    }
    
    return sanitized;
  }
  // ... fallback logic for backward compatibility
}
```

**Impact:** 
- Only fields that exist in the sheet header are saved
- Values are preserved exactly as they appear (no trimming or transformation)
- All other fields in the PO model remain `null`/undefined
- No poNo or batchNo generation

---

### 3. **Updated Import Flow** (`ppic.service.ts`)

#### `bulkImport()`
- Now captures sheet headers: `const { headers, rows } = this.parseSheetData(...)`
- Passes headers to `createPurchaseOrders()`: `this.createPurchaseOrders(validatedRows, options, headers)`

#### `createPurchaseOrders()`
- Added parameter: `sheetHeaders: string[] = []`
- Passes headers to each row: `this.createSinglePurchaseOrder(row, options, sheetHeaders)`

#### `createSinglePurchaseOrder()`
- Added parameter: `sheetHeaders: string[] = []`
- Uses headers in sanitizeData: `const createData: any = this.sanitizeData(data, sheetHeaders)`
- **Does NOT auto-generate** poNo or batchNo
- Only adds `customerId` if GST match found, and `gstNo` if present in data
- Does NOT set any approval statuses, defaults, or other derived fields

---

## Behavior Examples

### Example 1: Sheet with minimal columns
```
Sheet Headers: ["Brand Name", "Party Name", "Amount"]
Row Data: { "Brand Name": "Aspirin 500mg", "Party Name": "ABC Pharma", "Amount": "5000" }

Saved to DB:
- brandName: "Aspirin 500mg"
- partyName: "ABC Pharma" 
- amount: "5000" (exact string value, not parsed)
- All other fields: null/undefined
- poNo: NOT generated (uses default uuid only if provided)
- batchNo: null
```

### Example 2: Sheet with partial PO data
```
Sheet Headers: ["PO NO", "GST NO", "PO Qty", "Rate"]
Row Data: { "PO NO": "PO-2026-001", "GST NO": "27ABCDE1234H1Z0", "PO Qty": "100", "Rate": "50.25" }

Saved to DB:
- poNo: "PO-2026-001"
- gstNo: "27ABCDE1234H1Z0" (customer linked if found)
- poQty: 100 (parsed as number)
- poRate: 50.25 (parsed as float)
- All other fields: null/undefined
- No default statuses set
```

---

## Important Notes

1. **NO Generation of PO Numbers:** The system does NOT generate or assign PO numbers. If the sheet doesn't have a PO No column, the poNo field will be null (or use Prisma defaults if set).

2. **NO Generation of Batch Numbers:** Same as above - batch numbers are only saved if they exist in the sheet.

3. **Exact Value Preservation:** All string values are saved exactly as they appear in the sheet with no transformation.

4. **Customer Linking:** If a `gstNo` field exists and a matching customer is found in the database, the `customerId` is automatically set.

5. **Backward Compatibility:** If no sheet headers are provided, the old field-based filtering is used as fallback.

6. **Field Type Parsing:** Basic type conversion is still applied during validation (dates, numbers) but the actual saved values come directly from the sheet.

---

## Testing Recommendations

1. **Test Case 1:** Import with only essential fields (PO No, GST No, Amount)
   - Verify all other fields are null
   - Verify PO No and Amount are saved exactly as provided

2. **Test Case 2:** Import with custom/extra columns not in PO schema
   - Verify custom columns are saved as-is
   - Verify system doesn't error on unknown fields

3. **Test Case 3:** Import with numeric strings
   - Verify string format is preserved (e.g., "00100" not "100")
   - Verify amount/rate values match sheet exactly

4. **Test Case 4:** Import without PO No column
   - Verify poNo is null or uses default UUID
   - Verify no auto-generation occurs

---

## Files Modified

1. **`src/modules/ppic/ppic.service.ts`**
   - Updated: `createPurchaseOrders()` - added sheetHeaders parameter
   - Updated: `createSinglePurchaseOrder()` - added sheetHeaders parameter
   - Updated: `sanitizeData()` - preserves exact sheet values
   - Updated: `bulkImport()` - passes headers through the flow

2. **`src/modules/ppic/ppic.parser.ts`**
   - Updated: `MappingBuilder.buildMapping()` - simplified to pass-through logic

