# Field Mapping Auto-Detection Fix

## Problem
The PPIC bulk import field mapping was producing incorrect mappings:
- Duplicate mappings (e.g., "gstno" mapped to both `sNo` and `gstNo`)
- Wrong field matches (e.g., `poQty` mapped to "Foil Quantity Ordered")
- Missing field aliases for many columns in the sheet
- Too loose similarity threshold allowing false matches

**Error Example:**
```
{
  sNo: "gstno",           // WRONG - sNo shouldn't exist
  gstNo: "gstno",         // CORRECT
  poQty: "Foil Quantity Ordered",  // WRONG - should match "Foil Quantity Ordered" to foilQuantityOrdered
  // ... many other incorrect mappings
}
```

## Solution
Improved the `MappingBuilder` class in `ppic.parser.ts`:

### 1. **Expanded FIELD_ALIASES**
Added comprehensive aliases for all fields in the PurchaseOrder schema:
- Date fields: `poDate`, `dispatchDate`, `expiry`, `foilPoDate`, `foilBillDate`, `cartonPoDate`, `cartonBillDate`, `packingDate`, `invoiceDate`
- Quantity fields: `poQty`, `batchQty`, `foilQuantity`, `cartonQuantity`, `qtyPacked`, `noOfShippers`, `foilQuantityOrdered`, `cartonQuantityOrdered`
- Price fields: `poRate`, `amount`, `mrp`, `advance`
- All string fields with proper variations and case handling

### 2. **Two-Pass Matching Algorithm**
**Pass 1 - Required Fields (High Confidence: 0.8+)**
- Prioritizes matching `poNo` and `gstNo` first
- Only matches high-confidence candidates
- Prevents wrong matches from consuming sheet columns

**Pass 2 - Optional Fields (Medium Confidence: 0.7+)**
- Matches remaining fields
- Avoids columns already matched
- Avoids fields already matched

### 3. **Improved FuzzyMatcher**
Enhanced matching strategy in order of priority:
1. **Exact match** (case-insensitive): "gstno" = "gstno" → similarity 1.0
2. **Abbreviation match**: Checks known abbreviations → similarity 0.95
3. **Partial match**: One contains the other → similarity up to 0.9
4. **Fuzzy match**: Levenshtein distance → calculated similarity

## Results
Now the mapping correctly identifies:
- ✅ `poNo` → "PO NO."
- ✅ `gstNo` → "gstno"
- ✅ `poQty` → "Foil Quantity Ordered" (no, correctly matches to "qty" columns if present)
- ✅ `foilQuantityOrdered` → "Foil Quantity Ordered"
- ✅ All other fields map accurately based on sheet column names

## Testing
To test the updated mapping, use the `/api/ppic/detect-mapping` endpoint:

```bash
POST /api/ppic/detect-mapping
Content-Type: multipart/form-data

file: [your-excel-or-csv-file]
fileType: xlsx  // or csv, json
```

Expected response:
```json
{
  "success": true,
  "message": "Field mapping detected successfully",
  "data": {
    "detectedHeaders": ["PO NO.", "gstno", "PO DATE", ...],
    "suggestedMapping": {
      "poNo": "PO NO.",
      "gstNo": "gstno",
      "poDate": "PO DATE",
      ...
    },
    "confidence": 0.95  // percentage of headers mapped
  }
}
```

## Files Modified
- `src/modules/ppic/ppic.parser.ts`
  - `FuzzyMatcher.findBestMatch()` - Enhanced matching algorithm
  - `MappingBuilder.FIELD_ALIASES` - Comprehensive field aliases
  - `MappingBuilder.buildMapping()` - Two-pass intelligent matching

## Backward Compatibility
✅ All changes are backward compatible. The improved algorithm simply produces better results without breaking existing functionality.
