# PPIC Module - Quick Reference Card

## 📌 Base URL
```
http://localhost:3000/api/ppic
```

## 🔐 Authentication
All endpoints require:
```
Authorization: Bearer <YOUR_JWT_TOKEN>
```

## 📡 API Endpoints

### 1️⃣ Bulk Import Purchase Orders
```
POST /import
Content-Type: multipart/form-data

Query Parameters:
  ?fileType=xlsx|csv|json      (optional, auto-detected)
  ?skipOnError=true|false      (default: false)
  ?updateIfExists=true|false   (default: false)
  ?autoDetectMapping=true|false(default: true)

Form Data:
  file: <binary file>
  mappingStrategy?: {"poNo": "Order ID", ...}
```

**Response**: `{ batchId, successCount, failureCount, createdPOs[], errors[] }`

---

### 2️⃣ Auto-Detect Field Mapping
```
POST /detect-mapping
Content-Type: multipart/form-data

Form Data:
  file: <binary file>
  ?fileType=xlsx|csv|json (optional)
```

**Response**: `{ detectedHeaders[], suggestedMapping{}, confidence% }`

---

### 3️⃣ Test Mapping with Sample Data
```
POST /test-mapping
Content-Type: application/json

Body:
{
  "sampleRows": [
    {"PO Number": "PO-001", "Customer GST": "27AABCT1234H1Z0", ...},
    ...
  ],
  "mapping": {
    "poNo": "PO Number",
    "gstNo": "Customer GST",
    ...
  }
}
```

**Response**: `{ validatedRows[], summary{ total, valid, errors } }`

---

### 4️⃣ Get Available PO Fields
```
GET /po-fields
```

**Response**: `{ required[], dates[], integers[], floats[], strings[] }`

---

### 5️⃣ Get Batch Import Status
```
GET /batch/{batchId}
```

**Response**: `{ batchId, status, details }`

---

## 🛠️ Curl Examples

### Basic Excel Import
```bash
curl -X POST http://localhost:3000/api/ppic/import \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@data.xlsx"
```

### CSV Import with Skip Errors
```bash
curl -X POST http://localhost:3000/api/ppic/import \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@data.csv" \
  -F "fileType=csv" \
  -F "skipOnError=true"
```

### Detect Mappings
```bash
curl -X POST http://localhost:3000/api/ppic/detect-mapping \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@data.xlsx"
```

### Test Mapping
```bash
curl -X POST http://localhost:3000/api/ppic/test-mapping \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sampleRows": [{"PO #": "PO-001", "GST": "27AAA..."}],
    "mapping": {"poNo": "PO #", "gstNo": "GST"}
  }'
```

### Get Fields Reference
```bash
curl http://localhost:3000/api/ppic/po-fields \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📋 Purchase Order Fields Mapping

### ❌ Required Fields
- `poNo` - Purchase Order Number (unique, max 50 chars)
- `gstNo` - Customer GST Number (15-char GSTIN format)

### 📅 Date Fields
- `poDate`, `dispatchDate`, `expiry`
- `foilPoDate`, `foilBillDate`
- `cartonPoDate`, `cartonBillDate`
- `packingDate`, `invoiceDate`

### 🔢 Integer Fields
- `poQty`, `batchQty`, `foilQuantity`, `cartonQuantity`
- `qtyPacked`, `noOfShippers`, `changePart`, `cyc`
- `foilQuantityOrdered`, `cartonQuantityOrdered`

### 💰 Float Fields
- `poRate`, `amount`, `mrp`, `advance`

### 📝 String Fields (examples)
- `brandName`, `partyName`, `batchNo`, `paymentTerms`
- `address`, `composition`, `notes`, `rmStatus`
- `aluAluBlisterStripBottle`, `packStyle`, `design`, etc.

---

## 🎯 Quick Workflow

### Step 1: Get Field Reference
```bash
curl http://localhost:3000/api/ppic/po-fields \
  -H "Authorization: Bearer TOKEN"
```

### Step 2: Detect Mappings (Optional)
```bash
curl -X POST http://localhost:3000/api/ppic/detect-mapping \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@data.xlsx"
```

### Step 3: Test with Sample Data (Optional)
```bash
curl -X POST http://localhost:3000/api/ppic/test-mapping \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sampleRows": [...], "mapping": {...}}'
```

### Step 4: Import Full Dataset
```bash
curl -X POST http://localhost:3000/api/ppic/import \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@data.xlsx" \
  -F "skipOnError=true"
```

### Step 5: Check Status
```bash
curl http://localhost:3000/api/ppic/batch/{batchId} \
  -H "Authorization: Bearer TOKEN"
```

---

## 💡 Data Format Examples

### Supported Phone Formats
```
Input              → Parsed Output
9876543210        → 9876543210
98-7654-3210      → 9876543210
+91-98-7654-3210  → 9876543210
034567804566      → 4567804566
```

### Supported Date Formats
```
Input                    → Output
15/01/2026             → 2026-01-15
2026-01-15             → 2026-01-15
01/15/2026             → 2026-01-15
45716 (Excel serial)   → 2026-01-15
```

### Contact Field Extraction
```
Input: "John Doe john@example.com 9876543210"
Output: {
  name: "John Doe",
  email: "john@example.com",
  phone: "9876543210"
}
```

---

## ⚙️ Configuration Parameters

### Skip On Error
```
skipOnError=true   → Continue importing on validation errors
skipOnError=false  → Stop on first validation error (default)
```

### Update If Exists
```
updateIfExists=true   → Update existing PO (by poNo)
updateIfExists=false  → Fail if PO already exists (default)
```

### Auto Detect Mapping
```
autoDetectMapping=true   → Auto-detect field mapping (default)
autoDetectMapping=false  → Use provided mappingStrategy only
```

---

## 📊 Response Structure

### Success Response
```json
{
  "success": true,
  "message": "Bulk import completed...",
  "data": {
    "batchId": "uuid-string",
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
          {"field": "gstNo", "message": "Invalid GST", "severity": "error"}
        ]
      }
    ],
    "processingTime": 2450,
    "timestamp": "2026-01-22T10:30:00Z"
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message here",
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message here"
  }
}
```

---

## 🔑 Important Notes

1. **GST Format**: Must be 15-character GSTIN (e.g., 27AABCT1234H1Z0)
2. **PO Number**: Must be unique in system
3. **Customer**: Customer must exist in system before importing PO
4. **Batch Size**: Default 50 rows per batch, adjustable
5. **Concurrency**: Up to 3 concurrent batches by default
6. **File Size**: Recommended max 50MB

---

## 🐛 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Customer not found" | Create customer with matching GST first |
| "PO already exists" | Use `updateIfExists=true` or delete existing PO |
| "Invalid GST format" | Check GST is 15 characters and valid GSTIN |
| "Could not detect mapping" | Provide `mappingStrategy` parameter explicitly |
| "Field type mismatch" | Ensure data types match schema (string/number/date) |

---

## 📚 Additional Resources

- **Full Docs**: See `PPIC_README.md`
- **Integration Guide**: See `INTEGRATION_GUIDE.md`
- **Examples**: Check `ppic.examples.ts`
- **Implementation Summary**: See `PPIC_IMPLEMENTATION_SUMMARY.md`

---

**Last Updated**: January 22, 2026  
**Version**: 1.0.0
