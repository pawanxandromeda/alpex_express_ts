# Error Handling Flow Diagram

## Request → Response Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (React/Vue/Angular)                 │
│                                                                   │
│  fetch('/api/endpoint')                                           │
│     ↓                                                             │
│  result = await response.json()                                   │
│     ↓                                                             │
│  if (result.success) {                                            │
│    toast.success(result.message) ✅                              │
│  } else {                                                         │
│    toast.error(result.error?.message) ❌                         │
│  }                                                               │
└────────────────────────────┬──────────────────────────────────────┘
                             │
                    HTTP Request/Response
                             │
┌────────────────────────────▼──────────────────────────────────────┐
│                         CONTROLLER LAYER                           │
│                                                                   │
│  try {                                                            │
│    const payload = validateInput(req.body)                        │
│    const result = await service.doSomething(payload)              │
│    sendSuccess(res, result, "Success message", 201)               │
│  } catch (error) {                                                │
│    handleError(res, error) ← Centralized error handling          │
│  }                                                               │
│                                                                   │
│  Returns:                                                         │
│  ✅ Success: { success: true, message, data, pagination? }       │
│  ❌ Error:   { success: false, message, error: {code, message} } │
└────────────────────────────┬──────────────────────────────────────┘
                             │
                    Calls Service Function
                             │
┌────────────────────────────▼──────────────────────────────────────┐
│                         SERVICE LAYER                             │
│                                                                   │
│  export const doSomething = async (data) => {                     │
│    // Fetch from database                                         │
│    const resource = await prisma.table.findUnique(...)            │
│                                                                   │
│    // Validate business logic                                     │
│    if (!resource) {                                               │
│      throw new AppError(ERROR_CODES.NOT_FOUND)                    │
│    }                                                             │
│                                                                   │
│    if (resource.isBlacklisted) {                                  │
│      throw new AppError(                                          │
│        ERROR_CODES.BLACKLISTED_CUSTOMER,                          │
│        "Custom message here"                                      │
│      )                                                           │
│    }                                                             │
│                                                                   │
│    // Success - return data                                      │
│    return resource                                               │
│  }                                                               │
│                                                                   │
│  Throws: AppError(code, ?customMessage)                           │
└──────────────────────────────────────────────────────────────────┘
```

## AppError Class

```
┌──────────────────────────────────────────┐
│            AppError Class                │
├──────────────────────────────────────────┤
│ Properties:                              │
│  • code: string (ERROR_CODES.XXX)        │
│  • message: string (user-friendly)       │
│  • statusCode: number (HTTP status)      │
├──────────────────────────────────────────┤
│ Constructor:                             │
│  new AppError(code, customMessage?)      │
├──────────────────────────────────────────┤
│ Example:                                 │
│  throw new AppError(                     │
│    ERROR_CODES.CUSTOMER_NOT_FOUND        │
│  )                                       │
│  throw new AppError(                     │
│    ERROR_CODES.CREDIT_LIMIT_EXCEEDED,    │
│    "Order of $5000 exceeds limit $3000"  │
│  )                                       │
└──────────────────────────────────────────┘
```

## Error Code System

```
                    ┌─────────────────────────┐
                    │   ERROR_CODES (24+)     │
                    └────────┬────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
  │   GENERAL    │  │   CUSTOMER   │  │  PURCHASE    │
  │   ERRORS     │  │   ERRORS     │  │  ORDER       │
  ├──────────────┤  ├──────────────┤  ├──────────────┤
  │NOT_FOUND     │  │CUST_NOT_FND  │  │PO_NOT_FOUND  │
  │MISSING_FIELD │  │CUST_EXISTS   │  │PO_EXISTS     │
  │VALIDATION    │  │BLACKLISTED   │  │INVALID_PO    │
  │UNAUTHORIZED  │  │CREDIT_LIMIT  │  │              │
  │FORBIDDEN     │  │CREDIT_APPR   │  │              │
  │DUPLICATE     │  │              │  │              │
  └──────────────┘  └──────────────┘  └──────────────┘
        │                    │                    │
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                        ┌────▼─────┐
                        │  Message  │
                        └───────────┘
                             │
            "User-friendly, ready for toast!"
```

## Response Flow

### Success Path (Status 201)
```
Request
  │
  ├─→ Controller
  │     ├─→ Service
  │     │    └─→ Database
  │     │
  │     └─→ sendSuccess(res, data, "message", 201)
  │
  └─→ Response (201):
      {
        "success": true,
        "message": "Customer created successfully",
        "data": { "id": "123", "name": "ABC" }
      }
      
Frontend Toast: ✅ Customer created successfully
```

### Error Path (Status 400)
```
Request
  │
  ├─→ Controller → Service
  │     │
  │     └─→ throw AppError(CUSTOMER_ALREADY_EXISTS)
  │          └─→ Caught in catch block
  │               └─→ handleError(res, error)
  │
  └─→ Response (400):
      {
        "success": false,
        "message": "A customer with this GST number already exists.",
        "error": {
          "code": "CUSTOMER_ALREADY_EXISTS",
          "message": "A customer with this GST number already exists."
        }
      }

Frontend Toast: ❌ A customer with this GST number already exists.
```

## Bulk Import Flow

```
┌──────────────────────────────────────┐
│    Upload File + Mappings            │
└────────────────┬─────────────────────┘
                 │
                 ▼
        ┌────────────────────┐
        │  Validation Checks │
        ├────────────────────┤
        │ ☐ File exists?     │
        │ ☐ Mappings exist?  │
        │ ☐ File not empty?  │
        │ ☐ Records valid?   │
        └────────────┬───────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
    PASS                       FAIL
    │                          │
    ├─→ Process rows       ├─→ sendError(
    │    ├─→ Normalize       │   code,
    │    ├─→ Deduplicate     │   message
    │    └─→ Validate        │ )
    │                         │
    ├─→ bulkCreateCustomers  │
    │    │                    │
    │    ├─→ All success?    │
    │    │   ├─→ YES         │
    │    │   │   └─→ sendSuccess(
    │    │   │       data: {
    │    │   │         totalRows: 100,
    │    │   │         inserted: 100,
    │    │   │         skipped: 0
    │    │   │       }
    │    │   │     )
    │    │   │
    │    │   └─→ NO
    │    │       └─→ sendSuccess(
    │    │           code: IMPORT_PARTIAL,
    │    │           data: {
    │    │             totalRows: 100,
    │    │             inserted: 95,
    │    │             skipped: 5
    │    │           }
    │    │         )
    │    │
    │    └─→ Response (200)
    │
    └─→ Frontend Toast
        ├─→ All success?
        │   └─→ "✅ Imported 100 records"
        └─→ Partial?
            └─→ "⚠️ Imported 95/100. 5 skipped."
```

## Data Structure

### Error Codes Mapping
```
ERROR_CODE
   │
   ├─→ Error Message (default)
   ├─→ HTTP Status Code
   └─→ Custom Message (optional override)

Example:
CUSTOMER_ALREADY_EXISTS
   ├─→ "A customer with this GST number already exists." (default)
   ├─→ 400 (Bad Request)
   └─→ "Custom message here" (if provided)
```

### API Response Structure
```
{
  success: boolean,
  message?: string,
  data?: T,
  error?: {
    code: string,
    message: string
  },
  pagination?: {
    total: number,
    page: number,
    limit: number,
    totalPages: number
  }
}
```

## Error Handling Chain

```
┌─────────────────────────────────────────────┐
│         Frontend Toast Integration          │
└────────────────────┬────────────────────────┘
                     │
                 Needs:
                 response.error?.message
                     │
┌────────────────────▼────────────────────────┐
│         Response Formatter (Controller)     │
│   handleError(res, error) throws AppError   │
│   sendSuccess() / sendError()               │
└────────────────────┬────────────────────────┘
                     │
                 Creates:
                 error.code & error.message
                     │
┌────────────────────▼────────────────────────┐
│         AppError (Service Layer)            │
│  throw new AppError(CODE, ?customMessage)   │
└────────────────────┬────────────────────────┘
                     │
                 Based on:
                 Business logic validation
                     │
┌────────────────────▼────────────────────────┐
│         Service Functions (Database)        │
│      Check conditions, throw AppError       │
└─────────────────────────────────────────────┘
```

## Key Components

```
┌─────────────────────────────────────────────────────┐
│          src/common/utils/errorMessages.ts          │
│                                                      │
│  • ERROR_CODES (constants)                           │
│  • ERROR_MESSAGES (code → message mapping)           │
│  • AppError (class)                                  │
│  • createErrorResponse() (helper)                    │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│        src/common/utils/responseFormatter.ts        │
│                                                      │
│  • sendSuccess() → { success: true, ... }           │
│  • sendError() → { success: false, error: ... }     │
│  • handleError() → Catches AppError & formats       │
│  • ApiResponse<T> (TypeScript interface)            │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│      Service & Controller Layers (All Modules)      │
│                                                      │
│  Services: throw AppError(CODE, ?message)           │
│  Controllers: use sendSuccess/sendError/handleError │
└─────────────────────────────────────────────────────┘
```

---

**Visual Summary:**
- Simple flow: Request → Service throws error → Controller catches & formats → Response with error code & message → Frontend toast
- 24+ standardized error codes
- User-friendly messages built-in
- Type-safe with TypeScript
- One-line toast integration
- Consistent across all endpoints
