# Maintenance & Assets Management Module

A comprehensive, enterprise-grade maintenance management system designed for pharmaceutical manufacturing environments. This module provides dynamic machine tracking, preventive maintenance scheduling, parts inventory management, and fixed assets tracking.

## Features

### 1. **Machine Management**
- ✅ Dynamic machine type creation with custom fields support
- ✅ Comprehensive machine tracking (operational hours, utilization, warranty)
- ✅ Real-time machine status updates (Operational, UnderMaintenance, Breakdown, Inactive, Reserved)
- ✅ Machine assignment to maintenance teams
- ✅ Maintenance schedule tracking
- ✅ Machine asset depreciation tracking

### 2. **Maintenance Management**
- ✅ Scheduled, preventive, corrective, and emergency maintenance types
- ✅ Complete maintenance lifecycle (Scheduled → InProgress → Completed)
- ✅ Maintenance cost tracking (labor + material costs)
- ✅ Parts usage logging during maintenance
- ✅ Broken parts disposition tracking
- ✅ Maintenance statistics and analytics
- ✅ Upcoming maintenance schedule forecasting

### 3. **Parts & Spare Parts Management**
- ✅ Comprehensive parts master database
- ✅ Real-time inventory tracking
- ✅ Automatic reorder point alerts
- ✅ Parts compatibility mapping to machines
- ✅ Supplier management and tracking
- ✅ Parts usage history

### 4. **Part Orders & Supply Chain**
- ✅ PO generation and tracking
- ✅ Expected delivery vs actual delivery tracking
- ✅ Payment status management
- ✅ Automatic inventory updates on receipt
- ✅ Supplier contact management
- ✅ Part order history and analytics

### 5. **Fixed Assets Tracking**
- ✅ Spare equipment and tool inventory
- ✅ Asset check-in/check-out system
- ✅ Asset condition tracking
- ✅ Usage history and logs
- ✅ Asset depreciation calculation
- ✅ Asset location management

### 6. **Real-Time Status Tracking**
- ✅ Current machine status monitoring
- ✅ Asset assignment tracking
- ✅ Downtime monitoring
- ✅ Production line integration (future)
- ✅ Maintenance team assignments
- ✅ Operator/maintainer visibility

## Database Schema

### Core Models

#### Machine Type
```typescript
{
  id: string // UUID
  name: string // e.g., "Tablet Press"
  code: string // e.g., "TP-001"
  category: string // "Production", "Utility", "Support"
  customFields: JSON // Dynamic field structure
  ...metadata
}
```

#### Machine
```typescript
{
  id: string
  name: string
  code: string
  machineTypeId: string (FK)
  serialNumber: string
  location: string
  department: string
  status: "Operational" | "UnderMaintenance" | "Breakdown" | "Inactive" | "Reserved"
  purchaseDate: DateTime
  purchasePrice: Float
  warrantyExpiry: DateTime
  lastMaintenanceDate: DateTime
  nextScheduledMaintenance: DateTime
  operatingHours: Float
  customFields: JSON
  assignedToEmployeeId: string (FK)
}
```

#### MaintenanceRecord
```typescript
{
  id: string
  machineId: string (FK)
  maintenanceType: "Preventive" | "Corrective" | "Predictive" | "Emergency"
  status: "Scheduled" | "InProgress" | "OnHold" | "Completed" | "Cancelled"
  scheduledDate: DateTime
  startDate: DateTime
  completionDate: DateTime
  findings: string
  workDone: string
  partsUsed: MaintenancePartUsage[]
  brokenParts: BrokenPart[]
  laborCost: Float
  materialCost: Float
  totalCost: Float
  nextMaintenanceDate: DateTime
}
```

#### Part
```typescript
{
  id: string
  name: string
  code: string
  category: string
  manufacturer: string
  quantityInStock: Int
  minimumStock: Int
  reorderPoint: Int
  reorderQuantity: Int
  unitCost: Float
  status: "Available" | "OutOfStock" | "OnOrder" | "Damaged" | "Obsolete"
  usageHistory: MaintenancePartUsage[]
  orders: PartOrder[]
}
```

#### PartOrder
```typescript
{
  id: string
  orderNumber: string
  partId: string (FK)
  supplierId: string
  supplierName: string
  quantity: Int
  unitPrice: Float
  totalPrice: Float
  orderDate: DateTime
  expectedDelivery: DateTime
  actualDelivery: DateTime
  deliveryStatus: "Pending" | "Delivered" | "Delayed" | "Cancelled"
  paymentStatus: "Unpaid" | "Paid" | "Partial"
}
```

#### BrokenPart
```typescript
{
  id: string
  maintenanceRecordId: string (FK)
  partId: string (FK - optional)
  partName: string
  originalQuantity: Int
  disposition: "Scrapped" | "InStorage" | "ReturnedToVendor" | "RepairInProgress" | "Sold" | "Recycled"
  dispositionDate: DateTime
  dispositionNotes: string
  approvalStatus: string
}
```

#### FixedAsset
```typescript
{
  id: string
  name: string // "Drill Machine", "LED Work Light"
  code: string
  assetCategory: string // "Equipment", "Tools", "Spare Parts"
  manufacturer: string
  serialNumber: string
  currentLocation: string
  quantity: Int
  status: "Available" | "InUse" | "Reserved" | "Damaged" | "Obsolete"
  purchaseDate: DateTime
  purchasePrice: Float
  currentValue: Float
  condition: "Good" | "Fair" | "Poor"
  lastUsedDate: DateTime
  assignedToEmployeeId: string (FK - optional)
  usageHistory: FixedAssetUsageLog[]
}
```

#### MachineCurrentStatus (Real-time)
```typescript
{
  id: string
  machineId: string (FK - unique)
  currentStatus: MachineStatus
  statusChangedAt: DateTime
  usedInProduction: Boolean
  productionLineId: string
  currentActivity: string
  operatorEmployeeId: string
  maintainerEmployeeId: string
  estimatedDowntimeEnd: DateTime
}
```

## API Endpoints

### Machine Management

```
POST   /maintenance/machine-types              - Create Machine Type
POST   /maintenance/machines                   - Create Machine
PUT    /maintenance/machines/:machineId        - Update Machine
PATCH  /maintenance/machines/:machineId/status - Update Machine Status
GET    /maintenance/machines/:machineId        - Get Machine Details
GET    /maintenance/machines                   - List Machines
GET    /maintenance/machines-statistics        - Get Machine Stats
GET    /maintenance/machines/due-for-maintenance - Get Due Maintenance
```

### Maintenance Records

```
POST   /maintenance/maintenance-records                    - Create Record
PATCH  /maintenance/maintenance-records/:id/start          - Start Maintenance
PATCH  /maintenance/maintenance-records/:id/complete       - Complete Maintenance
GET    /maintenance/maintenance-records/:id                - Get Record
GET    /maintenance/maintenance-records                    - List Records
GET    /maintenance/maintenance-statistics                 - Get Statistics
GET    /maintenance/upcoming-maintenance                   - Get Schedule
```

### Parts Management

```
POST   /maintenance/parts                    - Create Part
GET    /maintenance/parts/:partId            - Get Part Details
GET    /maintenance/parts                    - List Parts
GET    /maintenance/parts/reorder-list       - Parts Due for Reorder
```

### Part Orders

```
POST   /maintenance/part-orders                     - Create Order
PATCH  /maintenance/part-orders/:orderId/receive    - Receive Order
GET    /maintenance/part-orders/:orderId            - Get Order
GET    /maintenance/part-orders                     - List Orders
```

### Fixed Assets

```
POST   /maintenance/fixed-assets                     - Create Asset
POST   /maintenance/fixed-assets/:assetId/checkout   - Check Out
POST   /maintenance/fixed-assets/:assetId/checkin    - Check In
GET    /maintenance/fixed-assets/:assetId            - Get Asset
GET    /maintenance/fixed-assets                     - List Assets
GET    /maintenance/assets-statistics                - Get Statistics
```

## Usage Examples

### 1. Create a Machine Type

```bash
POST /maintenance/machine-types
{
  "name": "Tablet Press",
  "code": "TP-001",
  "category": "Production",
  "manufacturer": "Korsch",
  "modelNumber": "PH3000",
  "maintenanceFrequency": "Monthly",
  "customFieldStructure": {
    "pressureCapacity": {
      "type": "number",
      "required": true,
      "default": 100
    },
    "tablets_per_hour": {
      "type": "number",
      "required": true
    }
  }
}
```

### 2. Create a Machine

```bash
POST /maintenance/machines
{
  "name": "Tablet Press - A1",
  "code": "TP-A1",
  "machineTypeId": "uuid-of-machine-type",
  "serialNumber": "SN123456",
  "location": "Production Floor - Section A",
  "department": "Manufacturing",
  "purchaseDate": "2024-01-15",
  "purchasePrice": 500000,
  "supplier": "Korsch India",
  "warrantyExpiry": "2026-01-15",
  "customFields": {
    "pressureCapacity": 100,
    "tablets_per_hour": 150000
  }
}
```

### 3. Schedule Preventive Maintenance

```bash
POST /maintenance/maintenance-records
{
  "machineId": "uuid-of-machine",
  "maintenanceType": "Preventive",
  "scheduledDate": "2025-03-10",
  "description": "Monthly preventive maintenance - bearing check, seal replacement",
  "assignedToEmployeeId": "uuid-of-technician",
  "estimatedDurationHours": 4
}
```

### 4. Complete Maintenance with Parts Used

```bash
PATCH /maintenance/maintenance-records/:maintenanceRecordId/complete
{
  "completionDate": "2025-03-10",
  "findings": "Seals worn, bearing slightly degraded",
  "workDone": "Replaced main seal, lubricated bearings, pressure tested",
  "actualDurationHours": 3,
  "downtime": 180,
  "laborCost": 5000,
  "materialCost": 15000,
  "nextMaintenanceDate": "2025-04-10",
  "partsUsed": [
    {
      "partId": "part-uuid",
      "quantityUsed": 2,
      "unitCost": 5000
    },
    {
      "partId": "part-uuid-2",
      "quantityUsed": 1,
      "unitCost": 5000
    }
  ],
  "brokenParts": [
    {
      "partId": "part-uuid",
      "partName": "Main Seal",
      "originalQuantity": 1,
      "disposition": "Scrapped",
      "dispositionNotes": "Not repairable, damaged beyond use"
    }
  ]
}
```

### 5. Create Part Order

```bash
POST /maintenance/part-orders
{
  "partId": "uuid-of-part",
  "supplierId": "SUPP001",
  "supplierName": "XYZ Parts Pvt Ltd",
  "quantity": 20,
  "unitPrice": 5000,
  "expectedDelivery": "2025-03-15",
  "purchaseOrderNumber": "PO-2025-003"
}
```

### 6. Check Out Fixed Asset

```bash
POST /maintenance/fixed-assets/:assetId/checkout
{
  "usedByEmployeeId": "uuid-of-employee",
  "usedForMachineId": "uuid-of-machine",
  "usedForDescription": "Bearing inspection and alignment"
}
```

## Integration Points

### 1. Connect with Production Module
- Track which machine is running which production line
- Monitor real-time availability for production scheduling

### 2. Connect with Purchase Order Module
- Link generated part orders to main PO system
- Integrate cost tracking

### 3. Connect with HR Module
- Assign maintenance tasks to technicians
- Track technician workload and availability

### 4. Connect with Analytics Dashboard
- Real-time machine status visualization
- Maintenance cost analysis
- Equipment utilization reports
- Downtime analytics

### 5. Notification System
- Alert on machines due for maintenance
- Notification on parts reaching reorder point
- Alert on maintenance deadline approach

## Advanced Features

### Dynamic Field Validation
Each machine type can have custom fields that are validated at creation time.

### Real-Time Status Tracking
The `MachineCurrentStatus` table provides instant visibility into:
- Current operational status
- Ongoing activities
- Estimated downtime
- Assigned personnel

### Cost Tracking
- Labor costs per maintenance activity
- Material costs (parts used)
- Total maintenance cost per machine
- Average cost calculations

### Inventory Management
- Automatic low-stock alerts
- Reorder point calculations
- Supplier tracking
- Payment status management

### Broken Parts Lifecycle
Track the complete lifecycle of broken parts:
- Identification during maintenance
- Evaluation for repair vs replacement
- Disposition (scrap, return, repair, storage, sale)
- Approval workflow

## Best Practices

1. **Preventive Maintenance**: Schedule regular preventive maintenance based on machine operating hours
2. **Parts Stocking**: Maintain critical parts in stock to minimize downtime
3. **Supplier Relationships**: Track supplier performance and delivery times
4. **Cost Analysis**: Review maintenance costs regularly to identify optimization opportunities
5. **Asset Tracking**: Use the fixed assets module for tools and equipment to prevent loss
6. **Documentation**: Record all maintenance activities and findings for historical analysis

## Future Enhancements

- [ ] Predictive maintenance using ML
- [ ] IoT sensor integration for real-time monitoring
- [ ] Mobile app for field technicians
- [ ] Automated alerts and notifications
- [ ] SLA tracking and vendor management
- [ ] Advanced analytics and reporting
- [ ] Historical trend analysis
- [ ] Compliance reporting (ISO 9001, etc.)
- [ ] Integration with ERP financial module
- [ ] Audit trails and change logs

## Error Handling

The module uses consistent error handling with the following error codes:
- `VALIDATION_ERROR`: Invalid input data
- `NOT_FOUND`: Resource not found
- `INTERNAL_SERVER_ERROR`: Server-side error

## Caching

Redis caching is implemented for:
- Machine queries
- Maintenance records
- Parts inventory
- Fixed assets

Cache is automatically invalidated on any modifications.

## Author
Pharma ERP Maintenance Module \
Built with TypeScript, Node.js, Prisma ORM, and PostgreSQL
