# API Documentation - Medical Warehouse Management System

## Base URL
```
http://localhost:3000/api/v1
```

## Authentication

All endpoints except login and register require JWT authentication.

### Headers
```
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```

---

## 1. Authentication & Authorization (8 Endpoints)

### POST `/api/v1/auth/register`
Register a new user (admin only)

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "firstName": "Ahmed",
  "lastName": "Ali",
  "role": "WAREHOUSE_MANAGER",
  "phone": "+966501234567"
}
```

### POST `/api/v1/auth/login`
User login

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "...", "role": "..." },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

### POST `/api/v1/auth/refresh`
Refresh access token

**Request Body:**
```json
{
  "refreshToken": "eyJhbGc..."
}
```

### POST `/api/v1/auth/logout`
Logout user

### POST `/api/v1/auth/change-password`
Change user password

**Request Body:**
```json
{
  "currentPassword": "OldPass123",
  "newPassword": "NewPass456"
}
```

### GET `/api/v1/auth/me`
Get current user profile

### POST `/api/v1/auth/forgot-password`
Request password reset

### POST `/api/v1/auth/reset-password`
Reset password with token

---

## 2. User Management (10 Endpoints)

### GET `/api/v1/users?page=1&limit=20&search=ahmed&role=PHARMACIST&isActive=true`
List all users with pagination and filters

### GET `/api/v1/users/:id`
Get user by ID

### POST `/api/v1/users`
Create new user (admin only)

### PUT `/api/v1/users/:id`
Update user

### DELETE `/api/v1/users/:id`
Delete user (soft delete)

### PUT `/api/v1/users/:id/activate`
Activate user

### PUT `/api/v1/users/:id/deactivate`
Deactivate user

### PUT `/api/v1/users/:id/role`
Update user role

### GET `/api/v1/users/statistics`
Get user statistics

---

## 3. Warehouse Management (9 Endpoints)

### GET `/api/v1/warehouses?page=1&limit=20&search=main&isActive=true`
List all warehouses

### GET `/api/v1/warehouses/:id`
Get warehouse by ID

### POST `/api/v1/warehouses`
Create new warehouse

**Request Body:**
```json
{
  "code": "WH-001",
  "name": "Main Warehouse",
  "nameAr": "المستودع الرئيسي",
  "type": "MAIN",
  "address": "Riyadh, Saudi Arabia",
  "city": "Riyadh",
  "capacity": 10000,
  "isActive": true
}
```

### PUT `/api/v1/warehouses/:id`
Update warehouse

### DELETE `/api/v1/warehouses/:id`
Delete warehouse

### PUT `/api/v1/warehouses/:id/activate`
Activate warehouse

### PUT `/api/v1/warehouses/:id/deactivate`
Deactivate warehouse

### GET `/api/v1/warehouses/:id/stock`
Get warehouse stock

### GET `/api/v1/warehouses/statistics`
Get warehouse statistics

---

## 4. Product Management (12 Endpoints)

### GET `/api/v1/products?page=1&limit=20&search=paracetamol&categoryId=...&isActive=true`
List all products

### GET `/api/v1/products/:id`
Get product by ID

### GET `/api/v1/products/code/:code`
Get product by code

### POST `/api/v1/products`
Create new product

**Request Body:**
```json
{
  "code": "MED-001",
  "name": "Paracetamol 500mg",
  "nameAr": "باراسيتامول 500 ملغ",
  "categoryId": "...",
  "unitPrice": 15.50,
  "minStockLevel": 100,
  "reorderLevel": 200,
  "description": "Pain reliever and fever reducer",
  "isActive": true
}
```

### PUT `/api/v1/products/:id`
Update product

### DELETE `/api/v1/products/:id`
Delete product

### PUT `/api/v1/products/:id/activate`
Activate product

### PUT `/api/v1/products/:id/deactivate`
Deactivate product

### GET `/api/v1/products/:id/stock`
Get product stock across warehouses

### GET `/api/v1/products/:id/batches`
Get product batches

### GET `/api/v1/products/:id/movements`
Get product movement history

### GET `/api/v1/products/statistics`
Get product statistics

---

## 5. Batch Management (10 Endpoints)

### GET `/api/v1/batches?page=1&limit=20&productId=...`
List all batches

### GET `/api/v1/batches/:id`
Get batch by ID

### GET `/api/v1/batches/number/:batchNumber`
Get batch by number

### POST `/api/v1/batches`
Create new batch

**Request Body:**
```json
{
  "batchNumber": "BATCH-2025-001",
  "productId": "...",
  "manufacturerId": "...",
  "manufacturingDate": "2025-01-01",
  "expiryDate": "2027-01-01",
  "quantity": 1000,
  "costPrice": 10.00
}
```

### PUT `/api/v1/batches/:id`
Update batch

### DELETE `/api/v1/batches/:id`
Delete batch

### GET `/api/v1/batches/expiring?days=90`
Get batches expiring soon

### GET `/api/v1/batches/expired`
Get expired batches

### GET `/api/v1/batches/:id/stock`
Get batch stock

### GET `/api/v1/batches/statistics`
Get batch statistics

---

## 6. Stock Management (12 Endpoints)

### GET `/api/v1/stocks?page=1&limit=20&warehouseId=...&productId=...`
List all stock records

### GET `/api/v1/stocks/:id`
Get stock by ID

### GET `/api/v1/stocks/product/:productId`
Get stock by product

### GET `/api/v1/stocks/warehouse/:warehouseId`
Get stock by warehouse

### GET `/api/v1/stocks/low-stock`
Get low stock items

### GET `/api/v1/stocks/out-of-stock`
Get out of stock items

### POST `/api/v1/stocks/adjust`
Adjust stock levels

**Request Body:**
```json
{
  "productId": "...",
  "warehouseId": "...",
  "quantity": 50,
  "reason": "DAMAGED",
  "notes": "Damaged during inspection"
}
```

### POST `/api/v1/stocks/reserve`
Reserve stock

### POST `/api/v1/stocks/release`
Release reserved stock

### GET `/api/v1/stocks/statistics`
Get stock statistics

---

## 7. Stock Movement (13 Endpoints)

### GET `/api/v1/stock-movements?page=1&limit=20&warehouseId=...&type=RECEIPT`
List all stock movements

### GET `/api/v1/stock-movements/:id`
Get movement by ID

### GET `/api/v1/stock-movements/product/:productId?limit=50`
Get movements by product

### GET `/api/v1/stock-movements/warehouse/:warehouseId?dateFrom=2025-01-01`
Get movements by warehouse

### POST `/api/v1/stock-movements/receipt`
Create receipt movement

**Request Body:**
```json
{
  "productId": "...",
  "warehouseId": "...",
  "quantity": 100,
  "batchNumber": "BATCH-2025-001",
  "notes": "Purchase order PO-001 received"
}
```

### POST `/api/v1/stock-movements/issue`
Create issue movement

### POST `/api/v1/stock-movements/transfer-in`
Create transfer in movement

### POST `/api/v1/stock-movements/transfer-out`
Create transfer out movement

### POST `/api/v1/stock-movements/return`
Create return movement

### POST `/api/v1/stock-movements/damaged`
Create damaged movement

### GET `/api/v1/stock-movements/statistics?dateFrom=2025-01-01&dateTo=2025-12-31`
Get movement statistics

### GET `/api/v1/stock-movements/report`
Get movement report

---

## 8. Transfer Orders (11 Endpoints)

### GET `/api/v1/transfer-orders?page=1&limit=20&status=PENDING`
List all transfer orders

### GET `/api/v1/transfer-orders/:id`
Get transfer order by ID

### POST `/api/v1/transfer-orders`
Create new transfer order

**Request Body:**
```json
{
  "fromWarehouseId": "...",
  "toWarehouseId": "...",
  "requestedDate": "2025-10-30",
  "notes": "Monthly stock rebalancing",
  "items": [
    {
      "productId": "...",
      "quantity": 50,
      "batchId": "..."
    }
  ]
}
```

### PUT `/api/v1/transfer-orders/:id`
Update transfer order (draft only)

### DELETE `/api/v1/transfer-orders/:id`
Delete transfer order (draft only)

### POST `/api/v1/transfer-orders/:id/submit`
Submit for approval

### POST `/api/v1/transfer-orders/:id/approve`
Approve transfer order

### POST `/api/v1/transfer-orders/:id/reject`
Reject transfer order

### POST `/api/v1/transfer-orders/:id/ship`
Ship transfer order

### POST `/api/v1/transfer-orders/:id/receive`
Receive transfer order

**Request Body:**
```json
{
  "receivedQuantities": [
    {
      "itemId": "...",
      "receivedQuantity": 48
    }
  ]
}
```

### POST `/api/v1/transfer-orders/:id/cancel`
Cancel transfer order

---

## 9. Purchase Orders (10 Endpoints)

### GET `/api/v1/purchase-orders?page=1&limit=20&status=APPROVED&supplierId=...`
List all purchase orders

### GET `/api/v1/purchase-orders/:id`
Get purchase order by ID

### POST `/api/v1/purchase-orders`
Create new purchase order

**Request Body:**
```json
{
  "supplierId": "...",
  "warehouseId": "...",
  "orderDate": "2025-10-25",
  "expectedDeliveryDate": "2025-11-05",
  "notes": "Urgent order",
  "items": [
    {
      "productId": "...",
      "quantity": 500,
      "unitPrice": 12.50
    }
  ]
}
```

### PUT `/api/v1/purchase-orders/:id`
Update purchase order (draft only)

### DELETE `/api/v1/purchase-orders/:id`
Delete purchase order (draft only)

### POST `/api/v1/purchase-orders/:id/submit`
Submit for approval

### POST `/api/v1/purchase-orders/:id/approve`
Approve purchase order

### POST `/api/v1/purchase-orders/:id/order`
Place order with supplier

### POST `/api/v1/purchase-orders/:id/receive`
Receive purchase order

**Request Body:**
```json
{
  "receivedItems": [
    {
      "itemId": "...",
      "receivedQuantity": 500,
      "batchNumber": "BATCH-2025-050",
      "manufacturingDate": "2025-09-01",
      "expiryDate": "2027-09-01"
    }
  ]
}
```

### POST `/api/v1/purchase-orders/:id/cancel`
Cancel purchase order

---

## 10. Stock Count (12 Endpoints)

### GET `/api/v1/stock-counts?page=1&limit=20&status=COMPLETED`
List all stock counts

### GET `/api/v1/stock-counts/:id`
Get stock count by ID

### POST `/api/v1/stock-counts`
Create new stock count

**Request Body:**
```json
{
  "warehouseId": "...",
  "scheduledDate": "2025-11-01",
  "countType": "FULL",
  "notes": "Monthly physical count"
}
```

### PUT `/api/v1/stock-counts/:id`
Update stock count (planned only)

### DELETE `/api/v1/stock-counts/:id`
Delete stock count (planned only)

### POST `/api/v1/stock-counts/:id/start`
Start stock count

### POST `/api/v1/stock-counts/:id/record-counts`
Record physical counts

**Request Body:**
```json
{
  "countedItems": [
    {
      "itemId": "...",
      "countedQuantity": 95
    }
  ]
}
```

### POST `/api/v1/stock-counts/:id/complete`
Complete stock count

### POST `/api/v1/stock-counts/:id/approve`
Approve stock count

### POST `/api/v1/stock-counts/:id/cancel`
Cancel stock count

### GET `/api/v1/stock-counts/:id/variance`
Get variance report

---

## 11. Notifications (11 Endpoints)

### GET `/api/v1/notifications?page=1&limit=20&type=LOW_STOCK&status=UNREAD`
List all notifications

### GET `/api/v1/notifications/:id`
Get notification by ID

### GET `/api/v1/notifications/me?status=UNREAD&limit=50`
Get current user's notifications

### GET `/api/v1/notifications/me/unread-count`
Get unread notification count

### PUT `/api/v1/notifications/:id/read`
Mark notification as read

### PUT `/api/v1/notifications/me/read-all`
Mark all notifications as read

### PUT `/api/v1/notifications/:id/archive`
Archive notification

### DELETE `/api/v1/notifications/:id`
Delete notification

### DELETE `/api/v1/notifications/me/read`
Delete all read notifications

### GET `/api/v1/notifications/statistics`
Get notification statistics

---

## 12. Reports & Analytics (10 Endpoints)

### GET `/api/v1/reports/dashboard?warehouseId=...`
Get dashboard summary

**Response:**
```json
{
  "inventory": {
    "totalProducts": 150,
    "totalStockValue": 500000.00,
    "lowStockCount": 12,
    "outOfStockCount": 3
  },
  "operations": {
    "activeTransfers": 5,
    "pendingPurchases": 8,
    "recentMovements": 45
  }
}
```

### GET `/api/v1/reports/stock/levels?warehouseId=...&status=LOW`
Get stock levels report

### GET `/api/v1/reports/stock/low-stock?warehouseId=...`
Get low stock report

### GET `/api/v1/reports/stock/expiry?daysAhead=90&warehouseId=...`
Get expiry report

### GET `/api/v1/reports/stock/valuation?warehouseId=...`
Get stock valuation report

### GET `/api/v1/reports/movements?dateFrom=2025-01-01&dateTo=2025-12-31&warehouseId=...`
Get stock movement report

### GET `/api/v1/reports/transfers?dateFrom=2025-01-01&status=COMPLETED`
Get transfer order report

### GET `/api/v1/reports/purchases?dateFrom=2025-01-01&supplierId=...`
Get purchase order report

### GET `/api/v1/reports/analytics/products?dateFrom=2025-01-01&limit=20`
Get product analytics

**Response includes:**
- Top moving products
- Slow moving products
- High turnover products

---

## 13. Supplier Management (13 Endpoints)

### GET `/api/v1/suppliers?page=1&limit=20&search=pharma&rating=4`
List all suppliers

### GET `/api/v1/suppliers/:id`
Get supplier by ID

### GET `/api/v1/suppliers/code/:code`
Get supplier by code

### POST `/api/v1/suppliers`
Create new supplier

**Request Body:**
```json
{
  "code": "SUP-001",
  "name": "Pharma Supplies Co.",
  "nameAr": "شركة الإمدادات الطبية",
  "contactPerson": "Mohammed Ahmed",
  "email": "contact@pharmasupplies.com",
  "phone": "+966112345678",
  "address": "Industrial Area, Riyadh",
  "city": "Riyadh",
  "country": "Saudi Arabia",
  "taxId": "300000000000003",
  "paymentTerms": "Net 30",
  "creditLimit": 100000.00,
  "rating": 4.5
}
```

### PUT `/api/v1/suppliers/:id`
Update supplier

### DELETE `/api/v1/suppliers/:id`
Delete supplier

### PUT `/api/v1/suppliers/:id/activate`
Activate supplier

### PUT `/api/v1/suppliers/:id/deactivate`
Deactivate supplier

### PUT `/api/v1/suppliers/:id/rating`
Update supplier rating

### GET `/api/v1/suppliers/:id/purchase-history?dateFrom=2025-01-01`
Get supplier purchase history

### GET `/api/v1/suppliers/:id/performance`
Get supplier performance metrics

**Response:**
```json
{
  "totalOrders": 45,
  "completedOrders": 42,
  "completionRate": 93.33,
  "onTimeDeliveryRate": 88.89,
  "averageDeliveryDays": 5.2,
  "totalSpent": 450000.00
}
```

### GET `/api/v1/suppliers/statistics`
Get supplier statistics

---

## 14. Category Management (13 Endpoints)

### GET `/api/v1/categories?page=1&limit=20&parentId=null`
List all categories

### GET `/api/v1/categories/tree`
Get category tree structure

### GET `/api/v1/categories/:id`
Get category by ID

### GET `/api/v1/categories/code/:code`
Get category by code

### POST `/api/v1/categories`
Create new category

**Request Body:**
```json
{
  "code": "CAT-001",
  "name": "Medications",
  "nameAr": "الأدوية",
  "description": "All types of medications",
  "parentId": null
}
```

### PUT `/api/v1/categories/:id`
Update category

### DELETE `/api/v1/categories/:id`
Delete category

### PUT `/api/v1/categories/:id/activate`
Activate category

### PUT `/api/v1/categories/:id/deactivate`
Deactivate category

### GET `/api/v1/categories/:id/products?page=1&limit=20`
Get category products

### GET `/api/v1/categories/statistics`
Get category statistics

---

## 15. Financial Management (11 Endpoints)

### GET `/api/v1/financial/summary`
Get financial summary

**Response:**
```json
{
  "accountsPayable": {
    "total": 150000.00,
    "overdue": 25000.00
  },
  "recentActivity": {
    "last30DaysPayments": 75000.00,
    "last30DaysCount": 12
  },
  "totalPaidToDate": 500000.00
}
```

### GET `/api/v1/financial/reports/payments?dateFrom=2025-01-01&dateTo=2025-12-31`
Get payment report

### GET `/api/v1/financial/reports/cash-flow?dateFrom=2025-01-01`
Get cash flow report

### GET `/api/v1/financial/accounts-payable?supplierId=...&status=OVERDUE`
Get accounts payable

### GET `/api/v1/financial/suppliers/:supplierId/balance`
Get supplier balance

**Response:**
```json
{
  "supplierId": "...",
  "supplierName": "Pharma Supplies Co.",
  "totalPurchases": 250000.00,
  "totalPaid": 200000.00,
  "totalOwed": 50000.00,
  "creditLimit": 100000.00,
  "availableCredit": 50000.00
}
```

### GET `/api/v1/financial/payments?page=1&supplierId=...&paymentMethod=BANK_TRANSFER`
List all payments

### GET `/api/v1/financial/payments/:id`
Get payment by ID

### POST `/api/v1/financial/payments`
Record new payment

**Request Body:**
```json
{
  "purchaseOrderId": "...",
  "amount": 25000.00,
  "paymentMethod": "BANK_TRANSFER",
  "paymentDate": "2025-10-25",
  "referenceNumber": "TRX-123456",
  "notes": "Partial payment for PO-001"
}
```

### DELETE `/api/v1/financial/payments/:id`
Delete payment

### GET `/api/v1/financial/purchase-orders/:purchaseOrderId/payments`
Get purchase order payments

---

## 16. System Health

### GET `/health`
System health check

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-25T10:30:00.000Z",
  "environment": "development"
}
```

---

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

### Paginated Response
```json
{
  "success": true,
  "data": {
    "data": [ ... ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "ValidationError",
  "message": "Invalid input data"
}
```

---

## Error Codes

- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate data)
- `500` - Internal Server Error

---

## User Roles & Permissions

1. **SUPER_ADMIN** - Full system access
2. **ADMIN** - Administrative operations
3. **WAREHOUSE_MANAGER** - Warehouse operations, approvals
4. **PHARMACIST** - Pharmacy operations
5. **INVENTORY_CLERK** - Stock management
6. **AUDITOR** - Read-only audit access
7. **VIEWER** - Read-only viewing

---

## Rate Limiting

- **Default**: 100 requests per minute per IP
- **Authentication**: 5 login attempts per 15 minutes per IP

---

## Data Types

### Movement Types
- `RECEIPT` - Incoming stock
- `ISSUE` - Outgoing stock
- `TRANSFER_IN` - Transfer received
- `TRANSFER_OUT` - Transfer shipped
- `ADJUSTMENT` - Stock adjustment
- `RETURN` - Customer return
- `EXPIRED` - Expired items
- `DAMAGED` - Damaged items
- `LOST` - Lost items
- `FOUND` - Found items
- `STOCK_COUNT` - Stock count adjustment

### Payment Methods
- `CASH`
- `BANK_TRANSFER`
- `CHECK`
- `CREDIT_CARD`
- `DEBIT_CARD`
- `CREDIT_NOTE`

### Payment Status
- `PENDING` - Not yet paid
- `PARTIAL` - Partially paid
- `PAID` - Fully paid
- `OVERDUE` - Past due date
- `CANCELLED` - Cancelled

---

## Postman Collection

A Postman collection is available for testing all endpoints. Import the collection from `docs/postman/` directory.

---

**API Version**: 1.0.0
**Last Updated**: 2025-10-25
