# gstNo Validation & Error Handling Fix

## Problem
Row 830 (and likely others) were reporting "gstNo is missing from row data - validation may have failed" error, but the real issue was unclear.

**Root Cause Analysis:**
1. `gstNo` field had very strict GST format validation (regex: `^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z0-9]{3}$`)
2. If GST number in the sheet didn't match this exact format, validation failed silently
3. When validation failed, `gstNo` wasn't added to the row data
4. The error message didn't explain WHY `gstNo` was missing

## Solution

### 1. **Made gstNo Optional in Validation** 
- Changed from required to optional in `PPICRowSchema`
- This allows rows to be processed even if gstNo validation fails
- Error gets captured in the row errors list for clarity

**File: `ppic.validation.ts`**
```typescript
// BEFORE
gstNo: z.string().regex(/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z0-9]{3}$/)

// AFTER
gstNo: z.string().regex(/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z0-9]{3}$/).optional()
```

### 2. **Improved GST Format Error Messages**
Shows the user exactly what GST format is expected and what value was provided

**File: `ppic.parser.ts` - SchemaMapper class**
```typescript
// BEFORE
message: "Invalid GST format"

// AFTER
message: `Invalid GST format. Expected: 15-digit Indian GSTIN (e.g., 27AAGCT7206N1Z0). Got: "${parsedValue}"`
```

### 3. **Better Error Reporting in Service**
Now checks if there's a specific gstNo validation error and includes it in the response

**File: `ppic.service.ts` - createSinglePurchaseOrder method**
```typescript
// BEFORE
if (!data.gstNo) {
  return { success: false, error: "gstNo is missing from row data - customer cannot be verified" };
}

// AFTER
if (!data.gstNo) {
  const gstNoError = row.errors.find((e) => e.field === "gstNo");
  if (gstNoError) {
    return { success: false, error: `gstNo validation failed: ${gstNoError.message}` };
  }
  return { success: false, error: "gstNo is required but missing from row data" };
}
```

### 4. **Fixed Case-Sensitivity Bug**
Fixed typo where code was accessing `data.gstno` (lowercase) instead of `data.gstNo` (camelCase)

## Expected Behavior After Fix

### For Valid GST Numbers
✅ Rows with valid 15-digit GST numbers process normally

### For Invalid GST Numbers  
Now users get a clear error message like:
```json
{
  "rowIndex": 830,
  "errors": [
    {
      "field": "gstNo",
      "message": "Invalid GST format. Expected: 15-digit Indian GSTIN (e.g., 27AAGCT7206N1Z0). Got: \"12345\"",
      "severity": "error"
    }
  ]
}
```

### For Missing GST Numbers
```json
{
  "rowIndex": 830,
  "errors": [
    {
      "field": "gstNo",
      "message": "Required field is empty",
      "severity": "error"
    }
  ]
}
```

## GST Number Format Reference
Indian GSTIN format (Goods and Services Tax Identification Number):
- **Total Length:** 15 characters
- **Format:** `XX[A-Z]{5}XXXX[A-Z]XXX`
  - Positions 1-2: State code (numeric, 01-35)
  - Positions 3-7: First 5 characters of PAN (alphabetic)
  - Positions 8-11: Sequential number (numeric)
  - Position 12: Check digit (alphabetic)
  - Position 13-15: Sub-category code (alphanumeric)

**Example:** `27AAGCT7206N1Z0`

## Testing
After importing with rows that have invalid GST numbers, you should now see:
1. Clear error messages indicating what the issue is
2. The actual value that failed validation
3. What format is expected

This helps users quickly fix their data and retry the import.

## Files Modified
1. `src/modules/ppic/ppic.validation.ts` - Made gstNo optional
2. `src/modules/ppic/ppic.parser.ts` - Improved GST error messages  
3. `src/modules/ppic/ppic.service.ts` - Better error reporting and fixed typo
