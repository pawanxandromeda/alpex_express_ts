# Frontend Error Handling & Toast Notifications Guide

## Overview
All API responses now follow a standardized format with structured error codes and messages that can be easily used in frontend toast notifications.

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Success message here",
  "data": {
    // Your data here
  },
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "User-friendly error message for toast",
  "error": {
    "code": "ERROR_CODE_NAME",
    "message": "User-friendly error message for toast"
  }
}
```

## Accessing Error Information in Frontend

### Using Fetch/Axios
```typescript
// Fetch Example
try {
  const response = await fetch('/api/customers', {
    method: 'POST',
    body: JSON.stringify(data)
  });
  const result = await response.json();

  if (result.success) {
    // Handle success
    toast.success(result.message);
  } else {
    // Handle error
    const errorCode = result.error?.code;
    const errorMessage = result.error?.message;
    toast.error(errorMessage);
  }
} catch (error) {
  toast.error('Something went wrong');
}
```

```typescript
// Axios Example
import axios from 'axios';

try {
  const response = await axios.post('/api/customers', data);
  const result = response.data;

  if (result.success) {
    toast.success(result.message);
  } else {
    toast.error(result.error?.message);
  }
} catch (error: any) {
  if (error.response?.data?.error) {
    toast.error(error.response.data.error.message);
  } else {
    toast.error('An unexpected error occurred');
  }
}
```

## Available Error Codes

### General Errors
- `INTERNAL_SERVER_ERROR` - Something went wrong. Please try again later.
- `VALIDATION_ERROR` - Please check your input and try again.
- `UNAUTHORIZED` - You are not authorized to perform this action.
- `FORBIDDEN` - You do not have permission to access this resource.
- `NOT_FOUND` - The requested resource was not found.
- `DUPLICATE_ENTRY` - This record already exists in the system.
- `MISSING_REQUIRED_FIELD` - Please fill in all required fields.

### Customer Errors
- `CUSTOMER_NOT_FOUND` - Customer not found. Please verify the GST number.
- `CUSTOMER_ALREADY_EXISTS` - A customer with this GST number already exists.
- `INVALID_GST_FORMAT` - Invalid GST format. Please enter a valid GST number.
- `BLACKLISTED_CUSTOMER` - This customer is blacklisted and cannot create orders.
- `CREDIT_LIMIT_EXCEEDED` - Order amount exceeds available credit limit.
- `CREDIT_NOT_APPROVED` - Customer credit approval is pending MD approval.

### Purchase Order Errors
- `PO_NOT_FOUND` - Purchase order not found.
- `PO_ALREADY_EXISTS` - A purchase order with this PO number already exists.
- `INVALID_PO_FORMAT` - Invalid purchase order format.
- `CUSTOMER_NOT_LINKED` - Unable to link customer to this purchase order.

### Import/Bulk Errors
- `FILE_REQUIRED` - Please upload an Excel file.
- `INVALID_FILE_FORMAT` - Invalid file format. Please upload an Excel file (.xlsx or .xls).
- `EMPTY_FILE` - The uploaded file is empty. Please check and try again.
- `NO_VALID_RECORDS` - No valid records found in the file. Please check the data and mappings.
- `MAPPINGS_REQUIRED` - Column mappings are required for import.
- `IMPORT_PARTIAL_SUCCESS` - Import completed with some records skipped due to duplicates or validation errors.
- `IMPORT_FAILED` - Import failed. Please check the file and try again.

## Toast Integration Examples

### React with React-Toastify
```typescript
import { toast } from 'react-toastify';

async function createCustomer(data: any) {
  try {
    const response = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();

    if (result.success) {
      toast.success(result.message || 'Customer created successfully');
      // Redirect or refresh data
    } else {
      toast.error(result.error?.message || 'Failed to create customer');
    }
  } catch (error) {
    toast.error('An unexpected error occurred');
  }
}
```

### Vue with Vue-Toastify
```typescript
import { useToast } from 'vue-toastify';

export default {
  setup() {
    const toast = useToast();

    async function createCustomer(data: any) {
      try {
        const response = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
          toast.success(result.message || 'Customer created successfully');
        } else {
          toast.error(result.error?.message || 'Failed to create customer');
        }
      } catch (error) {
        toast.error('An unexpected error occurred');
      }
    }

    return { createCustomer };
  }
};
```

### Angular with NgxToastr
```typescript
import { ToastrService } from 'ngx-toastr';

export class CustomerService {
  constructor(
    private toastr: ToastrService,
    private http: HttpClient
  ) {}

  createCustomer(data: any): void {
    this.http.post<any>('/api/customers', data).subscribe(
      (result) => {
        if (result.success) {
          this.toastr.success(result.message || 'Customer created successfully');
        } else {
          this.toastr.error(result.error?.message || 'Failed to create customer');
        }
      },
      (error) => {
        const errorMessage = error.error?.error?.message || 'An unexpected error occurred';
        this.toastr.error(errorMessage);
      }
    );
  }
}
```

## Bulk Import Response Format

For bulk import operations (customer/purchase order imports):

### Success with All Records Imported
```json
{
  "success": true,
  "message": "All customers imported successfully",
  "data": {
    "totalRows": 100,
    "inserted": 100,
    "skipped": 0
  }
}
```

### Partial Success (Some records skipped)
```json
{
  "success": true,
  "message": "Import completed with some records skipped due to duplicates or validation errors.",
  "error": {
    "code": "IMPORT_PARTIAL_SUCCESS",
    "message": "Import completed with some records skipped due to duplicates or validation errors."
  },
  "data": {
    "totalRows": 100,
    "inserted": 95,
    "skipped": 5
  }
}
```

### Handling Bulk Import in Frontend
```typescript
async function importCustomers(file: File, mappings: any) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('mappings', JSON.stringify(mappings));

  try {
    const response = await fetch('/api/customers/import', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    if (result.success) {
      const { inserted, skipped, totalRows } = result.data;
      
      if (skipped > 0) {
        toast.warning(
          `Imported ${inserted} of ${totalRows} records. ${skipped} were skipped.`
        );
      } else {
        toast.success(`Successfully imported ${inserted} customers`);
      }
    } else {
      toast.error(result.error?.message || 'Import failed');
    }
  } catch (error) {
    toast.error('An error occurred during import');
  }
}
```

## Best Practices

1. **Always check `success` field first** - This is the primary indicator of success/failure
2. **Use `error.code` for programmatic handling** - If you need to handle specific error types differently
3. **Use `error.message` for user-facing messages** - Messages are already formatted for user consumption
4. **Fallback messages** - Always have a fallback message in case the API doesn't return one
5. **List responses preserve structure** - The `pagination` field is included in list responses to maintain compatibility
6. **Error codes are consistent** - The same error code always returns the same message

## Accessing Pagination in List Responses

```typescript
async function getCustomers() {
  try {
    const response = await fetch('/api/customers?page=1&limit=10');
    const result = await response.json();

    if (result.success) {
      const customers = result.data; // Array of customers
      const pagination = result.pagination; // Pagination info

      console.log(`Total: ${pagination.total}`);
      console.log(`Current Page: ${pagination.page}`);
      console.log(`Total Pages: ${pagination.totalPages}`);

      // Display customers and pagination controls
    }
  } catch (error) {
    console.error('Failed to fetch customers');
  }
}
```

## TypeScript Interfaces

```typescript
interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface BulkImportResponse {
  totalRows: number;
  inserted: number;
  skipped: number;
}
```

## Summary

The new error handling system provides:
- ✅ Consistent response format across all endpoints
- ✅ User-friendly error messages in `error.message`
- ✅ Machine-readable error codes in `error.code`
- ✅ Easy integration with toast notification libraries
- ✅ Preserved list response structure with pagination
- ✅ Clear messaging for bulk imports with statistics
