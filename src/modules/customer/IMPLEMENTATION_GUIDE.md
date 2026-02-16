# Backend Customer Module - Implementation Guide

## Overview

The customer module has been fully implemented to align with the frontend React application. It handles all customer management operations with proper authentication, validation, and error handling.

## File Structure

```
src/modules/customer/
├── customer.controller.ts      # Request handlers
├── customer.service.ts         # Business logic
├── customer.validation.ts      # Input validation (Zod schemas)
├── customer.routes.ts          # Route definitions
├── customer.types.ts           # TypeScript interfaces
└── CUSTOMER_API.md             # API documentation
```

## Key Features Implemented

### 1. Authentication & Authorization ✅
- JWT-based authentication using `protect` middleware
- Employee-specific customer isolation (employees only see their customers)
- Public endpoints for login and token verification

### 2. CRUD Operations ✅
- **Create**: `POST /api/customers/create` (protected)
- **Read**: `GET /api/customers/` (protected, user-specific)
- **Update**: `PUT /api/customers/:id` (protected)
- **Delete**: `DELETE /api/customers/:id` (protected)

### 3. Bulk Operations ✅
- **Import**: `POST /api/customers/import` (protected)
  - Supports CSV and Excel files
  - Column mapping with auto-detection
  - Validation and error reporting
  - Duplicate skipping with `skipDuplicates: true`
  
- **Export**: `GET /api/customers/export` (protected)
  - Generates Excel file with all customer data
  - Formatted dates and boolean values
  - Filename: `customers.xlsx`

### 4. GST Operations ✅
- **Lookup**: `GET /api/customers/gst-lookup?gstNo=...` (protected)
  - First checks database
  - Falls back to external source if configured
  - Normalizes and validates contact information
  
- **GST List**: `GET /api/customers/gstr` (public)
  - Returns all GST numbers and customer names
  - Used for customer selection dropdowns

### 5. Credit Management ✅
- **Request Credit**: `POST /api/customers/request-credit` (protected)
  - Updates credit limit status to "Pending"
  - Validates customer isn't blacklisted
  
- **Blacklist**: `POST /api/customers/blacklist` (protected)
  - Marks customer as blacklisted with reason
  - Records timestamp

### 6. Login System ✅
- **Customer Login**: `POST /api/customers/login` (public)
  - GST Number + Customer ID authentication
  - Returns JWT token
  
- **Token Verification**: `POST /api/customers/status/verifyToken` (public)
  - Validates JWT token

## Database Schema

```typescript
model Customer {
  id                      String    @id @default(uuid())
  customerName            String
  address                 String?
  creditLimit             Float     @default(0)
  creditApprovalStatus    String    @default("Pending")
  paymentTerms            String
  throughVia              String?
  gstrNo                  String    @unique
  createdByEmployeeId     String?
  createdByEmployee       Employee? @relation(fields: [createdByEmployeeId], references: [id])
  kycProfile              String?
  contactName             String?
  contactPhone            String?
  contactEmail            String?
  contacts                Json?     // Array of contact objects
  remarks                 String?
  relationshipStatus      String?
  gstCopy                 String?
  drugLicense             String?
  dlExpiry                DateTime?
  isBlacklisted           Boolean   @default(false)
  blacklistReason         String?
  blacklistedAt           DateTime?
  annualTurnover          String?
  purchaseOrders          PurchaseOrder[]
  leads                   Lead[]
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt
}
```

## Data Flow

### Create Customer
```
Frontend Form
    ↓
POST /api/customers/create (with auth)
    ↓
createCustomer (controller)
    ↓
Zod Validation (createCustomerSchema)
    ↓
service.createCustomer()
    ↓
Check for duplicate GSTRNo
    ↓
prisma.customer.create()
    ↓
Response with created customer
```

### Bulk Import
```
Frontend Upload Form
    ↓
POST /api/customers/import (multipart/form-data)
    ↓
Parse CSV/Excel
    ↓
Map columns using provided mappings
    ↓
Transform and normalize data
    ↓
Validate required fields
    ↓
prisma.customer.createMany()
    ↓
Return import statistics
```

## Validation Rules

### Create/Update Customer
```typescript
{
  // Required
  customerName: string (min 1)
  gstrNo: string (min 1, unique)
  
  // Optional with defaults
  paymentTerms: string (default: "Cash")
  creditLimit: number (default: 0)
  isBlacklisted: boolean (default: false)
  
  // Optional
  address: string
  throughVia: string
  drugLicense: string
  dlExpiry: date (YYYY-MM-DD)
  contactName: string
  contactPhone: string
  contactEmail: string
  contacts: array of {name, phone, email, role}
  remarks: string
  relationshipStatus: string
  blacklistReason: string (required if isBlacklisted=true)
  kycProfile: string
  annualTurnover: string
}
```

## Error Handling

All errors are returned with consistent format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description"
  }
}
```

### Common Error Codes
- `CUSTOMER_NOT_FOUND`: Customer doesn't exist
- `CUSTOMER_ALREADY_EXISTS`: GST already registered
- `FILE_REQUIRED`: Import file is missing
- `EMPTY_FILE`: File has no data
- `NO_VALID_RECORDS`: All import records are invalid
- `IMPORT_PARTIAL_SUCCESS`: Some records failed
- `MISSING_REQUIRED_FIELD`: Required field is blank
- `BLACKLISTED_CUSTOMER`: Can't approve credit for blacklisted customer

## Testing Guide

### 1. Create Customer
```bash
curl -X POST http://localhost:5000/api/customers/create \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "Test Pharmacy",
    "gstrNo": "27AAAAAA0001A1Z0",
    "paymentTerms": "Net 30",
    "address": "123 Main St",
    "creditLimit": 50000
  }'
```

### 2. Get All Customers
```bash
curl -X GET http://localhost:5000/api/customers/ \
  -H "Authorization: Bearer <token>"
```

### 3. Bulk Import
```bash
curl -X POST http://localhost:5000/api/customers/import \
  -H "Authorization: Bearer <token>" \
  -F "file=@customers.csv" \
  -F 'mappings={
    "customerName": "Customer Name",
    "gstrNo": "GST Number",
    "address": "Address",
    "paymentTerms": "Payment Terms"
  }'
```

### 4. Export Customers
```bash
curl -X GET http://localhost:5000/api/customers/export \
  -H "Authorization: Bearer <token>" \
  --output customers.xlsx
```

### 5. GST Lookup
```bash
curl -X GET "http://localhost:5000/api/customers/gst-lookup?gstNo=27AAAAAA0001A1Z0" \
  -H "Authorization: Bearer <token>"
```

### 6. Blacklist Customer
```bash
curl -X POST http://localhost:5000/api/customers/blacklist \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "uuid",
    "blacklistReason": "Payment fraud"
  }'
```

## Frontend Integration Checklist

- [x] Customer creation form validates inputs
- [x] Customers filtered by current user
- [x] GST auto-fill from database/external source
- [x] Bulk import with column mapping
- [x] Export to Excel format
- [x] Blacklist/credit management
- [x] Error handling and user feedback
- [x] Loading states during operations
- [x] Token-based authentication

## Environment Configuration

```env
# JWT
JWT_SECRET=your_secret_key_here

# Optional: External GST Reference File
CUSTOMER_REFERENCE_URL=https://your-cdn.com/customer_reference.xlsx

# File Upload
MAX_FILE_SIZE=52428800  # 50MB
UPLOAD_TIMEOUT=30000    # 30 seconds
```

## Performance Considerations

1. **Database Indexes**: 
   - `gstrNo` is unique indexed
   - `createdByEmployeeId` is indexed for user-specific queries
   
2. **Bulk Operations**:
   - `createMany` with `skipDuplicates: true` prevents duplicates
   - Large files (>50MB) are chunked by client
   
3. **Response Encryption**:
   - Uses `encryptResponse` middleware for GET requests
   - File downloads bypass encryption

## Migration Steps

To apply the updated customer module to an existing project:

1. **Update Prisma Schema**: Run `npx prisma migrate dev --name update_customer_model`
2. **Update Node Modules**: Run `npm install`
3. **Restart Server**: `npm run dev`
4. **Test Endpoints**: Use the testing guide above

## Troubleshooting

### Issue: "Customer not found"
- Verify customer exists for the current user
- Check if customer was created by same employee

### Issue: "GST already exists"
- Customer with same GST is already registered
- Use lookup to find existing customer

### Issue: Import fails with "No valid records"
- Verify column mappings are correct
- Check required fields (customerName, gstrNo) exist
- Validate file format (CSV/Excel)

### Issue: Export returns empty file
- Verify customers exist for the user
- Check authentication token is valid
- Try getting customers list first

## Future Enhancements

- [ ] Batch approval workflow for credit limits
- [ ] Customer performance metrics (orders, spending)
- [ ] Relationship status automation
- [ ] Document upload and storage for KYC
- [ ] Customer balance tracking
- [ ] Automated email notifications
- [ ] Customer segmentation and analytics
