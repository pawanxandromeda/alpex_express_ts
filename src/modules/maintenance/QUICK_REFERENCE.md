# Quick Reference Guide - Maintenance Module

## API Request Examples

### Machine Management

#### 1. Create Machine Type
```bash
POST /api/maintenance/machine-types
Content-Type: application/json

{
  "name": "Tablet Press",
  "code": "TP-001",
  "category": "Production",
  "description": "High-speed tablet compression machine",
  "manufacturer": "Korsch",
  "modelNumber": "PH3000",
  "capacity": "150,000 tablets/hour",
  "powerRequirement": "15 KW",
  "maintenanceFrequency": "Monthly",
  "customFieldStructure": {
    "pressureCapacity": {
      "type": "number",
      "required": true,
      "default": 100,
      "description": "Max pressure in tons"
    },
    "tabletsPerHour": {
      "type": "number",
      "required": true,
      "description": "Tablets produced per hour"
    },
    "operatingFluid": {
      "type": "select",
      "required": true,
      "options": ["Oil", "Water"],
      "default": "Oil"
    }
  }
}

Response: 201 Created
{
  "success": true,
  "data": { "id": "machine-type-uuid", ... },
  "message": "Machine Type created successfully"
}
```

#### 2. Create Machine
```bash
POST /api/maintenance/machines
Content-Type: application/json
Authorization: Bearer {token}

{
  "name": "Tablet Press - Production Line A",
  "code": "TP-A1",
  "machineTypeId": "machine-type-uuid",
  "serialNumber": "KORSCH-2024-001",
  "location": "Production Floor - Section A, Row 1",
  "department": "Manufacturing",
  "purchaseDate": "2024-01-15T00:00:00Z",
  "purchasePrice": 5000000,
  "supplier": "Korsch India Pvt Ltd",
  "warrantyExpiry": "2026-01-15T00:00:00Z",
  "installationDate": "2024-02-01T00:00:00Z",
  "documentation": "https://docs.example.com/korsch-ph3000.pdf",
  "powerRequirement": "15 KW",
  "spaceRequired": "4m x 2m",
  "customFields": {
    "pressureCapacity": 100,
    "tabletsPerHour": 150000,
    "operatingFluid": "Oil"
  }
}

Response: 201 Created
{
  "success": true,
  "data": {
    "id": "machine-uuid",
    "name": "Tablet Press - Production Line A",
    "status": "Operational",
    "customFields": { ... }
  },
  "message": "Machine created successfully"
}
```

#### 3. Update Machine Status
```bash
PATCH /api/maintenance/machines/machine-uuid/status
Content-Type: application/json

{
  "status": "UnderMaintenance",
  "currentActivity": "Preventive maintenance - bearing replacement"
}

Response: 200 OK
{
  "success": true,
  "data": {
    "machine": { ... },
    "status": {
      "machineId": "machine-uuid",
      "currentStatus": "UnderMaintenance",
      "currentActivity": "Preventive maintenance - bearing replacement",
      "statusChangedAt": "2025-03-10T10:30:00Z"
    }
  }
}
```

#### 4. List Machines with Filters
```bash
GET /api/maintenance/machines?department=Manufacturing&status=Operational&page=1&limit=10

Response: 200 OK
{
  "success": true,
  "data": [ ... list of machines ... ],
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 10,
    "totalPages": 3
  }
}
```

#### 5. Get Machines Due for Maintenance
```bash
GET /api/maintenance/machines/due-for-maintenance

Response: 200 OK
{
  "success": true,
  "data": [
    {
      "id": "machine-uuid",
      "name": "Tablet Press - A1",
      "nextScheduledMaintenance": "2025-03-15T00:00:00Z",
      "lastMaintenanceDate": "2025-02-15T00:00:00Z"
    }
  ]
}
```

#### 6. Get Machine Statistics
```bash
GET /api/maintenance/machines-statistics?department=Manufacturing

Response: 200 OK
{
  "success": true,
  "data": {
    "operational": 12,
    "breakdown": 1,
    "maintenance": 2,
    "inactive": 0,
    "reserved": 1,
    "total": 16
  }
}
```

### Maintenance Management

#### 1. Create Maintenance Record
```bash
POST /api/maintenance/maintenance-records
Content-Type: application/json
Authorization: Bearer {token}

{
  "machineId": "machine-uuid",
  "maintenanceType": "Preventive",
  "scheduledDate": "2025-03-10T10:00:00Z",
  "description": "Monthly preventive maintenance - bearing check, seal replacement, pressure test",
  "assignedToEmployeeId": "technician-uuid",
  "estimatedDurationHours": 4
}

Response: 201 Created
{
  "success": true,
  "data": {
    "id": "maintenance-record-uuid",
    "status": "Scheduled",
    "scheduledDate": "2025-03-10T10:00:00Z"
  },
  "message": "Maintenance Record created successfully"
}
```

#### 2. Start Maintenance
```bash
PATCH /api/maintenance/maintenance-records/record-uuid/start
Content-Type: application/json

{}

Response: 200 OK
{
  "success": true,
  "data": {
    "id": "maintenance-record-uuid",
    "status": "InProgress",
    "startDate": "2025-03-10T10:15:00Z"
  },
  "message": "Maintenance started successfully"
}
```

#### 3. Complete Maintenance with All Details
```bash
PATCH /api/maintenance/maintenance-records/record-uuid/complete
Content-Type: application/json

{
  "completionDate": "2025-03-10T14:30:00Z",
  "findings": "Main bearing shows slight wear, seals slightly degraded, pressure test passed at 105 bar",
  "workDone": "Replaced main seal assembly, cleaned & lubricated bearings, pressure tested to specification, replaced oil filter",
  "actualDurationHours": 3.5,
  "downtime": 210,
  "laborCost": 7000,
  "materialCost": 25000,
  "nextMaintenanceDate": "2025-04-10T00:00:00Z",
  "partsUsed": [
    {
      "partId": "seal-part-uuid",
      "quantityUsed": 2,
      "unitCost": 8000
    },
    {
      "partId": "bearing-part-uuid",
      "quantityUsed": 1,
      "unitCost": 5000
    },
    {
      "partId": "filter-part-uuid",
      "quantityUsed": 1,
      "unitCost": 2000
    }
  ],
  "brokenParts": [
    {
      "partId": "seal-part-uuid",
      "partName": "Main Seal Assembly",
      "originalQuantity": 1,
      "disposition": "Scrapped",
      "dispositionNotes": "Worn beyond acceptable limits, not repairable"
    }
  ]
}

Response: 200 OK
{
  "success": true,
  "data": {
    "id": "maintenance-record-uuid",
    "status": "Completed",
    "totalCost": 32000,
    "machine": { ... },
    "partsUsed": [ ... ],
    "brokenParts": [ ... ]
  },
  "message": "Maintenance completed successfully"
}
```

#### 4. List Maintenance Records
```bash
GET /api/maintenance/maintenance-records?machineId=machine-uuid&status=Completed&page=1&limit=5

Response: 200 OK
{
  "success": true,
  "data": [ ... list of records ... ],
  "pagination": {
    "total": 12,
    "page": 1,
    "limit": 5,
    "totalPages": 3
  }
}
```

#### 5. Get Maintenance Statistics
```bash
GET /api/maintenance/maintenance-statistics?machineId=machine-uuid

Response: 200 OK
{
  "success": true,
  "data": {
    "statuses": {
      "scheduled": 2,
      "inProgress": 0,
      "completed": 12,
      "onHold": 0,
      "cancelled": 0,
      "total": 14
    },
    "costs": {
      "totalCost": 425000,
      "totalLaborCost": 140000,
      "totalMaterialCost": 285000,
      "averageCost": 30357
    }
  }
}
```

#### 6. Get Upcoming Maintenance Schedule
```bash
GET /api/maintenance/upcoming-maintenance?daysAhead=30

Response: 200 OK
{
  "success": true,
  "data": [
    {
      "id": "record-uuid",
      "machine": { "name": "Tablet Press - A1", ... },
      "scheduledDate": "2025-03-15T10:00:00Z",
      "assignedToEmployee": { "name": "John Technician", ... }
    }
  ]
}
```

### Parts Management

#### 1. Create Part
```bash
POST /api/maintenance/parts
Content-Type: application/json

{
  "name": "Main Seal Assembly - SKF",
  "code": "PART-SEAL-TP-001",
  "description": "Main shaft seal assembly for tablet press",
  "category": "Seal",
  "partNumber": "PS-8000-X",
  "manufacturer": "SKF",
  "supplierIds": ["supplier-uuid-1", "supplier-uuid-2"],
  "quantityInStock": 5,
  "minimumStock": 2,
  "reorderPoint": 3,
  "reorderQuantity": 10,
  "unitCost": 8000,
  "sellingPrice": 10000
}

Response: 201 Created
{
  "success": true,
  "data": { "id": "part-uuid", ... },
  "message": "Part created successfully"
}
```

#### 2. Create Part Order
```bash
POST /api/maintenance/part-orders
Content-Type: application/json
Authorization: Bearer {token}

{
  "partId": "part-uuid",
  "supplierId": "SUPP-001",
  "supplierName": "Precision Parts Pvt Ltd",
  "quantity": 20,
  "unitPrice": 7800,
  "expectedDelivery": "2025-03-20T00:00:00Z",
  "purchaseOrderNumber": "PO-2025-0342",
  "notes": "Urgent - needed for preventive maintenance schedule"
}

Response: 201 Created
{
  "success": true,
  "data": {
    "id": "order-uuid",
    "orderNumber": "PO-xxxx-yyyyy",
    "totalPrice": 156000,
    "deliveryStatus": "Pending"
  },
  "message": "Part Order created successfully"
}
```

#### 3. Receive Part Order
```bash
PATCH /api/maintenance/part-orders/order-uuid/receive
Content-Type: application/json

{
  "quantityReceived": 20
}

Response: 200 OK
{
  "success": true,
  "data": {
    "id": "order-uuid",
    "deliveryStatus": "Delivered",
    "actualDelivery": "2025-03-18T14:30:00Z"
  },
  "message": "Part received successfully"
}
```

#### 4. Get Parts for Reorder
```bash
GET /api/maintenance/parts/reorder-list

Response: 200 OK
{
  "success": true,
  "data": [
    {
      "id": "part-uuid",
      "name": "Bearing SKF 6309",
      "code": "PART-BEARING-001",
      "quantityInStock": 2,
      "reorderPoint": 5,
      "reorderQuantity": 20,
      "orders": [ ... ]
    }
  ]
}
```

### Fixed Assets

#### 1. Create Fixed Asset
```bash
POST /api/maintenance/fixed-assets
Content-Type: application/json
Authorization: Bearer {token}

{
  "name": "Hydraulic Drill Machine",
  "code": "ASSET-DRILL-001",
  "assetCategory": "Equipment",
  "description": "Portable hydraulic drill for hole drilling during assembly",
  "manufacturer": "Bosch",
  "modelNumber": "GBH 36 VRE",
  "serialNumber": "SN-BOSCH-2024-001",
  "currentLocation": "Warehouse - Shelf A5",
  "quantity": 1,
  "minThreshold": 1,
  "purchaseDate": "2023-06-15T00:00:00Z",
  "purchasePrice": 250000,
  "supplier": "Bosch Tools",
  "condition": "Good"
}

Response: 201 Created
{
  "success": true,
  "data": {
    "id": "asset-uuid",
    "status": "Available"
  },
  "message": "Fixed Asset created successfully"
}
```

#### 2. Check Out Asset
```bash
POST /api/maintenance/fixed-assets/asset-uuid/checkout
Content-Type: application/json

{
  "usedByEmployeeId": "employee-uuid",
  "usedForMachineId": "machine-uuid",
  "usedForDescription": "Maintenance work on Tablet Press - A1, bearing assembly hole drilling"
}

Response: 200 OK
{
  "success": true,
  "data": {
    "asset": {
      "id": "asset-uuid",
      "status": "InUse",
      "assignedToEmployeeId": "employee-uuid"
    },
    "logEntry": {
      "checkOutDate": "2025-03-10T10:00:00Z"
    }
  },
  "message": "Asset checked out successfully"
}
```

#### 3. Check In Asset
```bash
POST /api/maintenance/fixed-assets/asset-uuid/checkin
Content-Type: application/json

{
  "condition": "Good",
  "notes": "Drill bit changed, cooling system checked, ready for next use"
}

Response: 200 OK
{
  "success": true,
  "data": {
    "asset": {
      "id": "asset-uuid",
      "status": "Available"
    },
    "logUpdate": {
      "checkInDate": "2025-03-10T14:30:00Z",
      "duration": 4
    }
  },
  "message": "Asset checked in successfully"
}
```

#### 4. Get Assets Statistics
```bash
GET /api/maintenance/assets-statistics

Response: 200 OK
{
  "success": true,
  "data": {
    "available": 8,
    "inUse": 2,
    "reserved": 1,
    "damaged": 0,
    "obsolete": 0,
    "total": 11,
    "totalValue": 2500000
  }
}
```

## Response Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | OK | Successful GET, PATCH, or PUT |
| 201 | Created | Successful POST |
| 400 | Bad Request | Validation error |
| 404 | Not Found | Resource not found |
| 500 | Server Error | Internal error |

## Common Filters

### Machine Filter
```
?machineTypeId=uuid
?location=string
?department=string
?status=Operational|UnderMaintenance|Breakdown|Inactive|Reserved
?searchTerm=string
?page=1
?limit=10
```

### Maintenance Record Filter
```
?machineId=uuid
?status=Scheduled|InProgress|OnHold|Completed|Cancelled
?maintenanceType=Preventive|Corrective|Predictive|Emergency
?assignedToEmployeeId=uuid
?dateFrom=2025-03-01
?dateTo=2025-03-31
?page=1
?limit=10
```

### Parts Filter
```
?category=string
?status=Available|OutOfStock|OnOrder|Damaged|Obsolete
?searchTerm=string
?lowStockOnly=true
?page=1
?limit=10
```

### Fixed Assets Filter
```
?assetCategory=Equipment|Tools|Spareparts|Consumables
?status=Available|InUse|Reserved|Damaged|Obsolete
?location=string
?searchTerm=string
?page=1
?limit=10
```

## Error Response Format

```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE",
  "errors": ["Field specific errors"] // Optional
}
```

## Tips & Best Practices

1. **Always set next maintenance date** when completing maintenance
2. **Log all parts used** during maintenance for accurate costing
3. **Track broken parts disposition** for compliance and reordering
4. **Keep supplier contact info updated** for quick ordering
5. **Use custom fields** to track machine-specific parameters
6. **Check assets regularly** to prevent loss
7. **Monitor stock levels** to avoid production delays
8. **Track labor costs** for accurate maintenance budgeting
9. **Review maintenance history** quarterly for trends
10. **Update machine location** if moved to different area
