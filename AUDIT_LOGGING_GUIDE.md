# Purchase Order Audit Logging System

## Overview

The Purchase Order (PO) audit logging system provides comprehensive tracking of all actions and modifications made to purchase orders throughout their lifecycle. All actions are stored in the `timestamp` JSON field of the PurchaseOrder model, creating a detailed audit trail for compliance, tracking, and troubleshooting.

## Features

### 1. **Comprehensive Action Tracking**
- **Creation Actions**: Tracks initial PO creation with details about the creator
- **Update Actions**: Records all field changes with old and new values
- **Approval Actions**: Logs all approval/rejection actions from different departments
- **Design Actions**: Tracks design uploads, spec updates, and approvals
- **Accounting Actions**: Records bill creation, disputes, comments
- **PPIC Actions**: Logs bulk import operations and PPIC-specific updates

### 2. **Detailed Information Captured**
Each audit action includes:
- **Unique Action ID**: Timestamp-based unique identifier
- **Timestamp**: ISO 8601 formatted timestamp of when the action occurred
- **Action Type**: Categorized action (CREATE, UPDATE, DESIGN_UPLOAD, BILL_CREATED, etc.)
- **Performer Info**: 
  - Employee ID
  - Employee Name
  - Department
- **Change Details**:
  - Human-readable description
  - Field-level changes (old value → new value)
  - Approval status changes
  - Remarks and comments
  - Additional context

### 3. **Field-Level Change Tracking**
When PO fields are updated, the system captures:
```
{
  "fieldName": {
    "oldValue": "previous value",
    "newValue": "new value"
  }
}
```

This enables granular tracking of what changed and when.

## Action Types

The following action types are tracked:

| Action Type | Module | Description |
|---|---|---|
| `CREATE` | PurchaseOrder | Initial PO creation |
| `UPDATE` | PurchaseOrder | General PO field updates |
| `BULK_IMPORT` | PurchaseOrder | PO imported via bulk upload |
| `AUTO_APPROVE` | PurchaseOrder | Automatic approval on credit check pass |
| `COMPLETE` | PurchaseOrder | PO marked as completed |
| `DESIGN_SPECS_UPDATE` | Designer | Design specifications updated |
| `DESIGN_UPLOAD` | Designer | Design file uploaded |
| `DESIGN_APPROVED` | Designer | Design approved by designer |
| `DESIGN_REJECTED` | Designer | Design rejected by designer |
| `BILL_CREATED` | Accounts | Bill created for PO |
| `BILL_DISPUTE_RAISED` | Accounts | Dispute raised on a bill |
| `PO_DISPUTE_RAISED` | Accounts | Dispute raised on PO level |
| `SALES_COMMENT_ADDED` | Accounts | Sales comment added |
| `PPIC_CREATE` | PPIC | PO created via PPIC bulk import |
| `PPIC_UPDATE` | PPIC | PO updated via PPIC bulk import |

## Timestamp JSON Structure

The `timestamp` field stores a complete audit log in the following JSON structure:

```typescript
{
  "actions": [
    {
      "actionId": "1234567890_abcdefg123",
      "timestamp": "2026-01-22T10:30:45.123Z",
      "actionType": "CREATE",
      "performedBy": {
        "employeeId": "emp-123",
        "name": "John Doe",
        "department": "Sales"
      },
      "details": {
        "description": "Purchase Order created for customer ABC Corp (GST: 27XXXX)",
        "changes": null,
        "remarks": "Standard order",
        "approvalStatus": null
      }
    },
    {
      "actionId": "1234567891_hijklmn456",
      "timestamp": "2026-01-22T11:15:30.456Z",
      "actionType": "UPDATE",
      "performedBy": {
        "employeeId": "emp-456",
        "name": "Jane Smith",
        "department": "Operations"
      },
      "details": {
        "description": "Purchase Order updated - 3 field(s) modified",
        "changes": {
          "poQty": { "oldValue": 100, "newValue": 150 },
          "amount": { "oldValue": 10000, "newValue": 15000 },
          "notes": { "oldValue": "Urgent", "newValue": "Urgent - Rush delivery" }
        },
        "remarks": "Quantity increased per customer request",
        "approvalStatus": null
      }
    }
  ],
  "lastModified": "2026-01-22T11:15:30.456Z",
  "totalActions": 2
}
```

## Usage Examples

### 1. **Creating a Purchase Order with Audit Trail**

The audit logging is **automatic** - no additional code needed. Just create a PO normally:

```typescript
const po = await service.createPurchaseOrder({
  poNo: "PO-2026-001",
  gstNumber: "27XXXXXXXXXXXX",
  partyName: "ABC Corp",
  amount: 10000,
  createdBy: "john.doe",
  createdByDept: "Sales"
});

// timestamp field automatically initialized with CREATE action
```

### 2. **Updating a Purchase Order**

Updates are automatically tracked:

```typescript
const updated = await service.updatePurchaseOrder(poId, {
  poQty: 150,
  amount: 15000,
  notes: "Updated notes",
  updatedByName: "Jane Smith",
  updatedByDept: "Operations",
  updateRemarks: "Quantity increased per customer request"
});

// UPDATE action automatically added to timestamp
```

### 3. **Accessing Audit Information**

Retrieve the audit trail:

```typescript
import { getAuditLog, getRecentActions, formatAuditLog } from "@/common/utils/auditLog";

const po = await prisma.purchaseOrder.findUnique({ where: { id: poId } });

// Get structured audit log
const auditLog = getAuditLog(po.timestamp);

// Get last 5 actions
const recentActions = getRecentActions(po.timestamp, 5);

// Get formatted audit log for display
const formatted = formatAuditLog(po.timestamp);
console.log(formatted);
```

### 4. **Querying Audit History**

```typescript
import {
  filterActionsByType,
  filterActionsByDepartment,
  getActionSummary
} from "@/common/utils/auditLog";

const auditLog = getAuditLog(po.timestamp);

// Get all UPDATE actions
const updates = filterActionsByType(auditLog, "UPDATE");

// Get all actions by Design department
const designActions = filterActionsByDepartment(auditLog, "Design");

// Get summary
const summary = getActionSummary(po.timestamp);
// { totalActions: 5, lastModified: "...", actionBreakdown: { CREATE: 1, UPDATE: 2, ... } }
```

## API Response Example

When fetching a PO, the timestamp field is included:

```json
{
  "id": "uuid-123",
  "poNo": "PO-2026-001",
  "amount": 15000,
  "timestamp": {
    "actions": [...],
    "lastModified": "2026-01-22T11:15:30.456Z",
    "totalActions": 3
  }
}
```

## Audit Trail Visualization

The audit trail can be displayed in a timeline format in the frontend:

```
[2026-01-22 10:30:45] CREATE by John Doe (Sales)
  Description: Purchase Order created for customer ABC Corp (GST: 27XXXX)
  Remarks: Standard order

[2026-01-22 11:15:30] UPDATE by Jane Smith (Operations)
  Description: Purchase Order updated - 3 field(s) modified
  Changes:
    - poQty: 100 → 150
    - amount: 10000 → 15000
    - notes: "Urgent" → "Urgent - Rush delivery"
  Remarks: Quantity increased per customer request

[2026-01-22 14:00:00] DESIGN_UPLOAD by Mike Johnson (Design)
  Description: Design file uploaded - design.pdf
  Changes:
    - design: null → https://s3.../designs/...pdf
```

## Module Integration

### **PurchaseOrder Module** (`purchaseOrder.service.ts`)
- Tracks: CREATE, UPDATE, BULK_IMPORT, AUTO_APPROVE, COMPLETE
- No changes needed to existing API contracts

### **Designer Module** (`designer.service.ts`)
- Tracks: DESIGN_SPECS_UPDATE, DESIGN_UPLOAD, DESIGN_APPROVED, DESIGN_REJECTED
- Maintains existing `designerActions` field for backward compatibility

### **Accounts Module** (`accounts.service.ts`)
- Tracks: BILL_CREATED, BILL_DISPUTE_RAISED, PO_DISPUTE_RAISED, SALES_COMMENT_ADDED
- Maintains existing dispute and bill tracking

### **PPIC Module** (`ppic.service.ts`)
- Tracks: PPIC_CREATE, PPIC_UPDATE
- Captures bulk import operations

## Backward Compatibility

✅ **All existing functionality is preserved**
- No breaking changes to API contracts
- Existing fields and operations work as before
- Audit logging is transparent to existing code
- Old POs without timestamp data are handled gracefully

## Best Practices

### 1. **Always Provide User Context**
When updating a PO, pass user information:

```typescript
await updatePurchaseOrder(poId, {
  fieldName: value,
  updatedByName: req.user.name,
  updatedByDept: req.user.department,
  updateRemarks: "Brief explanation of changes"
});
```

### 2. **Use Meaningful Descriptions**
Provide context about why changes were made. The system generates descriptions automatically, but add remarks for additional clarity.

### 3. **Regular Audit Review**
Periodically review audit trails for compliance and error detection:

```typescript
const auditLog = getAuditLog(po.timestamp);
if (auditLog.totalActions > 50) {
  console.warn("PO has extensive modification history");
}
```

### 4. **Export Audit Trails**
For compliance reports, export complete audit trails:

```typescript
const formatted = formatAuditLog(po.timestamp);
// Use formatted output for PDF reports, audit logs, etc.
```

## Performance Considerations

- **JSON field indexing**: The `timestamp` field is stored as JSON in PostgreSQL
- **Unbounded growth**: Old POs may accumulate many actions over time
- **Recommended practice**: Archive or summarize old audit logs periodically
- **No performance impact**: Audit logging doesn't affect existing query performance

## Security & Compliance

- ✅ Immutable audit trail (actions are appended, not modified)
- ✅ User attribution (who made the change)
- ✅ Timestamp tracking (when the change occurred)
- ✅ Change details (what changed)
- ✅ Remarks (why it was changed)

## Troubleshooting

### Missing Audit Data
If a PO doesn't have audit data:
```typescript
const auditLog = getAuditLog(po.timestamp); // Returns empty structure safely
```

### Parsing Audit Log
If timestamp is stored as string:
```typescript
const auditLog = getAuditLog(JSON.parse(po.timestamp));
```

## Future Enhancements

Potential improvements:
- Audit log archival/rotation strategy
- Real-time audit log streaming
- Approval workflow notifications
- Advanced filtering and search
- Audit trail comparison (before/after snapshots)
- Automated compliance reports

## Summary

The audit logging system provides a complete, transparent, and non-disruptive way to track all PO modifications. All changes are automatically captured with detailed context, enabling better compliance, debugging, and operational insights.
