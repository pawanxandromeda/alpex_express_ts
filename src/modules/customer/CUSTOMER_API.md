# Customer Module API Documentation

## Overview
The Customer Module handles all customer management operations including CRUD operations, bulk import/export, GST lookup, and credit management.

## API Endpoints

### Authentication
All endpoints except `/login` and `/status/verifyToken` require authentication via JWT token in the Authorization header.

```
Authorization: Bearer <jwt_token>
```

---

## Endpoints

### 1. Login Customer (Public)
**POST** `/customers/login`

**Description:** Authenticate customer using GST number and Customer ID.

**Request Body:**
```json
{
  "gstrNo": "27AAAAP5055K1Z0",
  "customerID": "customer_id"
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs..."
  },
  "message": "Login successful"
}
```

---

### 2. Verify Token (Public)
**POST** `/customers/status/verifyToken`

**Description:** Verify JWT token validity.

**Request Body:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (Success):**
```json
{
  "valid": true,
  "decoded": {
    "customerId": "...",
    "iat": 1708...
  }
}
```

---

### 3. Create Customer (Protected)
**POST** `/customers/create`

**Description:** Create a new customer record.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "customerName": "ABC Pharmacy",
  "gstrNo": "27AAAAAA0000A1Z5",
  "paymentTerms": "Net 30",
  "throughVia": "John Doe",
  "address": "123 Main St, City",
  "creditLimit": 50000,
  "drugLicense": "DL-123456",
  "dlExpiry": "2025-12-31",
  "contactName": "Ram Singh",
  "contactPhone": "+91-9999999999",
  "contactEmail": "contact@abc.com",
  "contacts": [
    {
      "name": "Ram Singh",
      "phone": "+91-9999999999",
      "email": "contact@abc.com",
      "role": "Owner"
    }
  ],
  "remarks": "New customer",
  "relationshipStatus": "Active",
  "isBlacklisted": false,
  "kycProfile": "Individual",
  "annualTurnover": "1000000"
}
```

**Response (Success - 201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "customerName": "ABC Pharmacy",
    "gstrNo": "27AAAAAA0000A1Z5",
    "address": "123 Main St, City",
    "creditLimit": 50000,
    "paymentTerms": "Net 30",
    "throughVia": "John Doe",
    "createdAt": "2025-02-12T10:00:00Z",
    "updatedAt": "2025-02-12T10:00:00Z"
  },
  "message": "Customer created successfully"
}
```

---

### 4. Get All Customers (Protected)
**GET** `/customers/`

**Description:** Fetch all customers created by the authenticated user.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "customerName": "ABC Pharmacy",
      "gstrNo": "27AAAAAA0000A1Z5",
      "address": "123 Main St",
      "creditLimit": 50000,
      "paymentTerms": "Net 30",
      "throughVia": "John Doe",
      "kycProfile": "Individual",
      "isBlacklisted": false,
      "relationshipStatus": "Active",
      "createdAt": "2025-02-12T10:00:00Z",
      "updatedAt": "2025-02-12T10:00:00Z"
    }
  ]
}
```

---

### 5. Get GST List (Public)
**GET** `/customers/gstr`

**Description:** Get list of all GST numbers and customer names.

**Response (Success - 200):**
```json
[
  {
    "gstrNo": "27AAAAAA0000A1Z5",
    "customerName": "ABC Pharmacy"
  }
]
```

---

### 6. GST Lookup (Protected)
**GET** `/customers/gst-lookup?gstNo=27AAAAAA0000A1Z5`

**Description:** Lookup customer details by GST number. First checks database, then external source if configured.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `gstNo` (required): GST number to lookup

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "customerName": "ABC Pharmacy",
    "gstrNo": "27AAAAAA0000A1Z5",
    "address": "123 Main St",
    "contactName": "Ram Singh",
    "contactPhone": "+91-9999999999",
    "contactEmail": "contact@abc.com",
    "creditLimit": 50000,
    "paymentTerms": "Net 30"
  },
  "message": "Customer found in database"
}
```

---

### 7. Update Customer (Protected)
**PUT** `/customers/:id`

**Description:** Update an existing customer record.

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
- `id` (required): Customer ID

**Request Body:** (All fields optional)
```json
{
  "customerName": "Updated Name",
  "paymentTerms": "Net 45",
  "creditLimit": 75000
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "customerName": "Updated Name",
    ...
  },
  "message": "Customer updated successfully"
}
```

---

### 8. Delete Customer (Protected)
**DELETE** `/customers/:id`

**Description:** Delete a customer record.

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
- `id` (required): Customer ID

**Response (Success - 200):**
```json
{
  "success": true,
  "data": null,
  "message": "Customer deleted successfully"
}
```

---

### 9. Bulk Import Customers (Protected)
**POST** `/customers/import`

**Description:** Import multiple customers from CSV or Excel file.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
- `file` (required): CSV or Excel file
- `mappings` (required): JSON string mapping file columns to database fields

**Mapping Example:**
```json
{
  "customerName": "Customer Name",
  "gstrNo": "GST Number",
  "address": "Address",
  "paymentTerms": "Payment Terms",
  "creditLimit": "Credit Limit",
  "contactName": "Contact Name",
  "contactPhone": "Contact Phone",
  "contactEmail": "Contact Email"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "totalRows": 100,
    "inserted": 95,
    "skipped": 5
  },
  "message": "All customers imported successfully"
}
```

**Response (Partial Success - 200):**
```json
{
  "success": false,
  "error": {
    "code": "IMPORT_PARTIAL_SUCCESS"
  },
  "data": {
    "totalRows": 100,
    "inserted": 95,
    "skipped": 5
  }
}
```

---

### 10. Export Customers (Protected)
**GET** `/customers/export`

**Description:** Export all user's customers as Excel file.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (Success - 200):**
- Returns Excel file (.xlsx) with customers data
- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Filename: `customers.xlsx`

---

### 11. Request Credit Approval (Protected)
**POST** `/customers/request-credit`

**Description:** Request credit limit approval for a customer.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "customerId": "uuid",
  "creditLimit": 100000
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "customerId": "uuid",
    "creditLimit": 100000,
    "creditApprovalStatus": "Pending"
  },
  "message": "Credit approval request submitted successfully"
}
```

---

### 12. Blacklist Customer (Protected)
**POST** `/customers/blacklist`

**Description:** Blacklist a customer with reason.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "customerId": "uuid",
  "blacklistReason": "Payment fraud detected"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "isBlacklisted": true,
    "blacklistReason": "Payment fraud detected",
    "blacklistedAt": "2025-02-12T10:00:00Z"
  },
  "message": "Customer has been blacklisted successfully"
}
```

---

## Error Responses

### 401 Unauthorized
```json
{
  "message": "Unauthorized"
}
```

### 400 Bad Request
```json
{
  "success": false,
  "error": {
    "code": "MISSING_REQUIRED_FIELD",
    "message": "customerId and creditLimit are required"
  }
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": {
    "code": "CUSTOMER_NOT_FOUND",
    "message": "Customer not found"
  }
}
```

### 409 Conflict
```json
{
  "success": false,
  "error": {
    "code": "CUSTOMER_ALREADY_EXISTS",
    "message": "Customer with this GST number already exists"
  }
}
```

---

## Field Validation

### Required Fields (Create)
- `customerName` (string, min 1 char)
- `gstrNo` (string, min 1 char, unique)

### Optional Fields
- `address` (string)
- `paymentTerms` (string, default: "Cash")
- `throughVia` (string)
- `drugLicense` (string)
- `dlExpiry` (date string, format: YYYY-MM-DD)
- `creditLimit` (number, default: 0)
- `contactName` (string)
- `contactPhone` (string)
- `contactEmail` (string)
- `contacts` (array of contact objects)
- `remarks` (string)
- `relationshipStatus` (string)
- `isBlacklisted` (boolean, default: false)
- `blacklistReason` (string)
- `kycProfile` (string)
- `annualTurnover` (string)

---

## Environment Variables

```env
# JWT Configuration
JWT_SECRET=your_secret_key

# Customer Reference Data (optional)
CUSTOMER_REFERENCE_URL=https://your-domain.com/customer_reference.xlsx
```

---

## Notes

1. **Authentication**: Use `/login` to get JWT token for customer authentication.
2. **User Segregation**: Each employee only sees customers they created.
3. **Bulk Import**: File should have headers. Supported formats: CSV, XLSX, XLS.
4. **GST Lookup**: First checks database, then external source if configured.
5. **Contacts**: Can be stored as JSON array or individual fields.
6. **Blacklist**: Blacklisted customers cannot request credit approval.

