# PPIC Advanced Filter - Testing & Usage Guide

## ✅ Setup Complete

The PostgreSQL stored procedure `filter_ppic_dynamic` has been successfully created. The advanced filter system is now fully operational.

---

## 📊 Filter Request Formats

The API now supports **TWO filter formats**:

### 1. Object Format (Recommended for simple filters)
```json
{
  "filters": {
    "poNo": { "operator": "startsWith", "value": "PO" },
    "brandName": { "operator": "contains", "value": "Paracetamol" }
  },
  "sortBy": "poDate",
  "sortOrder": "DESC",
  "page": 1,
  "limit": 50,
  "operator": "AND"
}
```

### 2. Array Format (Your current format - now fully supported!)
```json
{
  "filters": [
    { "field": "poNo", "operator": "startsWith", "value": "sad" },
    { "field": "brandName", "operator": "contains", "value": "Paracetamol" }
  ],
  "sortBy": "poDate",
  "sortOrder": "DESC",
  "page": 1,
  "limit": 50,
  "operator": "AND"
}
```

Both formats are automatically normalized and processed identically.

---

## 🎯 API Endpoints

### POST `/api/ppic/filter/advanced`
Execute a dynamic filter with full control

**Example with Array Format:**
```bash
curl -X POST http://localhost:3000/api/ppic/filter/advanced \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "filters": [
      { "field": "poNo", "operator": "startsWith", "value": "sad" },
      { "field": "amount", "operator": "gt", "value": "1000" }
    ],
    "sortBy": "poDate",
    "sortOrder": "DESC",
    "page": 1,
    "limit": 50,
    "operator": "AND"
  }'
```

**Example with Object Format:**
```bash
curl -X POST http://localhost:3000/api/ppic/filter/advanced \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "filters": {
      "poNo": { "operator": "startsWith", "value": "sad" },
      "amount": { "operator": "gt", "value": "1000" }
    },
    "sortBy": "poDate",
    "sortOrder": "DESC",
    "page": 1,
    "limit": 50,
    "operator": "AND"
  }'
```

### GET `/api/ppic/filter/query`
Execute filter using query parameters (alternative method)

```bash
curl "http://localhost:3000/api/ppic/filter/query?poNo=sad&poNo_op=startsWith&amount_min=1000&amount_op=between&amount_max=5000&page=1&limit=50" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### GET `/api/ppic/filter/fields`
Get available filter fields and allowed operators

```bash
curl http://localhost:3000/api/ppic/filter/fields \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### POST `/api/ppic/filter/validate`
Validate a filter without executing it

```bash
curl -X POST http://localhost:3000/api/ppic/filter/validate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "filters": [
      { "field": "poNo", "operator": "startsWith", "value": "sad" }
    ]
  }'
```

### GET `/api/ppic/filter/presets`
Get common filter presets (predefined filter combinations)

```bash
curl http://localhost:3000/api/ppic/filter/presets \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🔄 Supported Filter Operators

| Operator | Aliases | Value Type | Example |
|----------|---------|-----------|---------|
| equals | eq, = | single | `"operator": "equals", "value": "Pending"` |
| not_equals | neq, != | single | `"operator": "neq", "value": "Cancelled"` |
| contains | like | single | `"operator": "contains", "value": "Paracetamol"` |
| starts_with | starts | single | `"operator": "starts_with", "value": "PO"` |
| ends_with | ends | single | `"operator": "ends_with", "value": "2024"` |
| gt | > | single | `"operator": "gt", "value": "1000"` |
| gte | >= | single | `"operator": "gte", "value": "1000"` |
| lt | < | single | `"operator": "lt", "value": "5000"` |
| lte | <= | single | `"operator": "lte", "value": "5000"` |
| between | range | min/max | `"operator": "between", "min": "1000", "max": "5000"` |
| date_range | - | from/to | `"operator": "date_range", "from": "2024-01-01", "to": "2024-12-31"` |
| is_null | null | none | `"operator": "is_null"` |
| is_not_null | not_null | none | `"operator": "is_not_null"` |
| in | - | values array | `"operator": "in", "values": ["Pending", "In Progress"]` |
| not_in | - | values array | `"operator": "not_in", "values": ["Cancelled", "Rejected"]` |

---

## 📋 Available Filter Fields

### String Fields
- `poNo` - Purchase Order Number
- `gstNo` - GST Number
- `brandName` - Brand Name
- `partyName` - Party/Customer Name
- `batchNo` - Batch Number
- `invoiceNo` - Invoice Number

### Status Fields
- `overallStatus` - Overall Status (supports: equals, neq, in, not_in)
- `dispatchStatus` - Dispatch Status
- `productionStatus` - Production Status
- `mdApproval` - MD Approval Status
- `accountsApproval` - Accounts Approval Status
- `designerApproval` - Designer Approval Status
- `ppicApproval` - PPIC Approval Status

### Date Fields
- `poDate` - PO Date (supports: date_range, between, comparisons)
- `dispatchDate` - Dispatch Date

### Numeric Fields
- `amount` - Amount
- `poQty` - PO Quantity

---

## 💡 Usage Examples

### Example 1: Filter with Array Format (Your Current Format)
```json
{
  "filters": [
    {
      "field": "poNo",
      "operator": "startsWith",
      "value": "sad"
    },
    {
      "field": "amount",
      "operator": "between",
      "min": "1000",
      "max": "5000"
    },
    {
      "field": "overallStatus",
      "operator": "in",
      "values": ["Pending", "In Progress"]
    }
  ],
  "sortBy": "poDate",
  "sortOrder": "DESC",
  "page": 1,
  "limit": 50,
  "operator": "AND"
}
```

### Example 2: Date Range Filter
```json
{
  "filters": [
    {
      "field": "poDate",
      "operator": "date_range",
      "from": "2024-01-01",
      "to": "2024-12-31"
    }
  ],
  "sortBy": "poDate",
  "sortOrder": "DESC"
}
```

### Example 3: Multiple Status Filters
```json
{
  "filters": [
    {
      "field": "overallStatus",
      "operator": "equals",
      "value": "Pending"
    },
    {
      "field": "ppicApproval",
      "operator": "not_equals",
      "value": "Approved"
    }
  ],
  "operator": "AND"
}
```

### Example 4: Using OR Operator
```json
{
  "filters": [
    {
      "field": "overallStatus",
      "operator": "equals",
      "value": "Pending"
    },
    {
      "field": "overallStatus",
      "operator": "equals",
      "value": "In Progress"
    }
  ],
  "operator": "OR"
}
```

---

## ✅ Response Format

All filter endpoints return data in this format:

```json
{
  "success": true,
  "data": {
    "totalCount": 125,
    "pageNumber": 1,
    "pageSize": 50,
    "totalPages": 3,
    "data": [
      {
        "id": "uuid",
        "poNo": "PO-001",
        "brandName": "Paracetamol",
        "amount": "2500",
        "overallStatus": "Pending",
        "poDate": "2024-01-15T00:00:00Z",
        ...
      },
      ...
    ],
    "filters": [...],
    "sortBy": "poDate",
    "sortOrder": "DESC"
  },
  "message": "Advanced filter completed successfully"
}
```

---

## 🐛 Error Handling

### Invalid Filter Field
```json
{
  "success": false,
  "message": "Filter validation failed: Unknown filter field: invalidField",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Filter validation failed: Unknown filter field: invalidField"
  }
}
```

### Invalid Operator for Field
```json
{
  "success": false,
  "message": "Filter validation failed: Invalid operator 'between' for field 'poNo'. Allowed operators: equals, contains, ...",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "..."
  }
}
```

### Missing Required Value
```json
{
  "success": false,
  "message": "Filter validation failed: Operator 'between' requires both 'min' and 'max' values for field 'amount'",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "..."
  }
}
```

---

## 🔍 Testing Checklist

- [x] Stored procedure `filter_ppic_dynamic` created in PostgreSQL
- [x] Array filter format support added
- [x] Object filter format support maintained
- [x] Filter normalization implemented
- [x] All operators functional
- [x] Pagination working
- [x] Sorting working
- [x] Error validation improved

---

## 📝 Technical Details

### Filter Normalization
The service automatically converts array format to object format internally:

```
Array Format Input:
[
  { "field": "poNo", "operator": "equals", "value": "123" },
  { "field": "brandName", "operator": "contains", "value": "Brand" }
]

↓ (normalizeFilters)

Object Format (Internal):
{
  "poNo": { "operator": "equals", "value": "123" },
  "brandName": { "operator": "contains", "value": "Brand" }
}
```

### Stored Procedure Parameters
```sql
filter_ppic_dynamic(
  filters JSONB,        -- Filter conditions in JSON
  sort_by TEXT,         -- Field to sort by (default: createdAt)
  sort_order TEXT,      -- ASC or DESC (default: DESC)
  page INTEGER,         -- Page number (default: 1)
  limit INTEGER,        -- Records per page (default: 50)
  operator TEXT         -- AND or OR (default: AND)
)
```

### Return Values
- `total_count` - Total matching records
- `page_number` - Current page
- `page_size` - Records per page
- `total_pages` - Total number of pages
- `data` - JSON array of matching records

---

## 🚀 Next Steps

1. Test with your application
2. Monitor query performance for large datasets
3. Add any custom filters specific to your business logic
4. Consider adding indices for frequently filtered fields

