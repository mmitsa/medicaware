# توثيق واجهة برمجة التطبيقات | API Documentation
## Medical Warehouse Management System API v1

**Base URL:** `http://localhost:3000/api/v1`

**Authentication:** Bearer Token (JWT)

---

## جدول المحتويات | Table of Contents

1. [Authentication](#authentication)
2. [Users](#users)
3. [Warehouses](#warehouses)
4. [Products](#products)
5. [Batches](#batches)
6. [Stocks](#stocks)
7. [Stock Movements](#stock-movements)
8. [Transfer Orders](#transfer-orders)
9. [Purchase Orders](#purchase-orders)
10. [Stock Counts](#stock-counts)
11. [Notifications](#notifications)
12. [Reports](#reports)
13. [Financial](#financial)
14. [HR](#hr)

---

## Authentication

### Login
```http
POST /api/v1/auth/login
```

**Request Body:**
```json
{
  "email": "admin@hospital.sa",
  "password": "Admin@123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "admin@hospital.sa",
      "username": "admin",
      "firstName": "System",
      "lastName": "Administrator",
      "role": "SUPER_ADMIN"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 3600
    }
  }
}
```

### Refresh Token
```http
POST /api/v1/auth/refresh
```

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Logout
```http
POST /api/v1/auth/logout
Authorization: Bearer {accessToken}
```

---

## Users

### Get All Users
```http
GET /api/v1/users?page=1&limit=20&role=PHARMACIST
Authorization: Bearer {accessToken}
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `role` (optional): Filter by role
- `status` (optional): Filter by status
- `search` (optional): Search in name, email, username

**Response:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "uuid",
        "email": "pharmacist@hospital.sa",
        "username": "pharmacist",
        "firstName": "Fatima",
        "lastName": "Al-Rashid",
        "role": "PHARMACIST",
        "status": "ACTIVE",
        "warehouseId": "uuid",
        "warehouse": {
          "id": "uuid",
          "name": "Main Medical Warehouse"
        },
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### Get User by ID
```http
GET /api/v1/users/:id
Authorization: Bearer {accessToken}
```

### Create User
```http
POST /api/v1/users
Authorization: Bearer {accessToken}
```

**Request Body:**
```json
{
  "email": "user@hospital.sa",
  "username": "username",
  "password": "Password@123",
  "firstName": "First",
  "lastName": "Last",
  "phone": "+966500000000",
  "role": "INVENTORY_CLERK",
  "warehouseId": "uuid",
  "employeeId": "EMP001",
  "department": "Warehouse",
  "position": "Clerk"
}
```

### Update User
```http
PUT /api/v1/users/:id
Authorization: Bearer {accessToken}
```

### Delete User (Soft Delete)
```http
DELETE /api/v1/users/:id
Authorization: Bearer {accessToken}
```

---

## Warehouses

### Get All Warehouses
```http
GET /api/v1/warehouses?page=1&limit=20&type=MAIN
Authorization: Bearer {accessToken}
```

### Get Warehouse by ID
```http
GET /api/v1/warehouses/:id
Authorization: Bearer {accessToken}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "code": "WH-MAIN",
    "name": "Main Medical Warehouse",
    "nameAr": "المستودع الطبي الرئيسي",
    "type": "MAIN",
    "address": "King Fahd Road",
    "city": "Riyadh",
    "region": "Riyadh",
    "isActive": true,
    "zones": [
      {
        "id": "uuid",
        "code": "Z01",
        "name": "Zone A - Medications",
        "shelves": [
          {
            "id": "uuid",
            "code": "S01",
            "name": "Shelf 1"
          }
        ]
      }
    ]
  }
}
```

### Create Warehouse
```http
POST /api/v1/warehouses
Authorization: Bearer {accessToken}
```

### Create Zone
```http
POST /api/v1/warehouses/:id/zones
Authorization: Bearer {accessToken}
```

**Request Body:**
```json
{
  "code": "Z03",
  "name": "Zone C - Equipment",
  "nameAr": "المنطقة ج - المعدات",
  "description": "Medical equipment storage area"
}
```

### Create Shelf
```http
POST /api/v1/zones/:id/shelves
Authorization: Bearer {accessToken}
```

---

## Products

### Get All Products
```http
GET /api/v1/products?page=1&limit=20&category=MEDICATION&search=paracetamol
Authorization: Bearer {accessToken}
```

**Query Parameters:**
- `page`, `limit`: Pagination
- `category`: Filter by category
- `status`: Filter by status
- `search`: Search in name, code, barcode
- `requiresPrescription`: Filter by prescription requirement

**Response:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "uuid",
        "code": "MED-001",
        "barcode": "8901234567890",
        "name": "Paracetamol 500mg",
        "nameAr": "باراسيتامول 500 ملجم",
        "category": "MEDICATION",
        "status": "ACTIVE",
        "unitOfMeasure": "BOX",
        "unitPrice": 15.50,
        "minStockLevel": 100,
        "requiresPrescription": false,
        "currentStock": 850
      }
    ],
    "pagination": {...}
  }
}
```

### Get Product by ID
```http
GET /api/v1/products/:id
Authorization: Bearer {accessToken}
```

### Create Product
```http
POST /api/v1/products
Authorization: Bearer {accessToken}
```

**Request Body:**
```json
{
  "code": "MED-003",
  "barcode": "8901234567895",
  "name": "Aspirin 100mg",
  "nameAr": "أسبرين 100 ملجم",
  "scientificName": "Acetylsalicylic Acid",
  "category": "MEDICATION",
  "unitOfMeasure": "BOX",
  "unitPrice": 12.00,
  "minStockLevel": 50,
  "maxStockLevel": 500,
  "reorderPoint": 100,
  "requiresPrescription": false,
  "manufacturer": "Pharma Co.",
  "supplier": "Medical Supplies Ltd."
}
```

### Search by Barcode
```http
GET /api/v1/products/barcode/:barcode
Authorization: Bearer {accessToken}
```

---

## Stock Movements

### Get All Stock Movements
```http
GET /api/v1/stock-movements?type=RECEIPT&from=2024-01-01&to=2024-12-31
Authorization: Bearer {accessToken}
```

**Query Parameters:**
- `type`: Movement type (RECEIPT, ISSUE, TRANSFER_IN, etc.)
- `productId`: Filter by product
- `warehouseId`: Filter by warehouse
- `from`, `to`: Date range

### Create Stock Movement
```http
POST /api/v1/stock-movements
Authorization: Bearer {accessToken}
```

**Request Body:**
```json
{
  "type": "RECEIPT",
  "productId": "uuid",
  "batchId": "uuid",
  "warehouseId": "uuid",
  "quantity": 100,
  "unitPrice": 15.50,
  "referenceType": "PO",
  "referenceId": "uuid",
  "notes": "Received from purchase order #PO-001"
}
```

---

## Transfer Orders

### Get All Transfer Orders
```http
GET /api/v1/transfer-orders?status=PENDING&fromWarehouseId=uuid
Authorization: Bearer {accessToken}
```

### Create Transfer Order
```http
POST /api/v1/transfer-orders
Authorization: Bearer {accessToken}
```

**Request Body:**
```json
{
  "fromWarehouseId": "uuid",
  "toWarehouseId": "uuid",
  "items": [
    {
      "productId": "uuid",
      "batchId": "uuid",
      "requestedQty": 50
    }
  ],
  "notes": "Transfer for branch restocking"
}
```

### Approve Transfer Order
```http
POST /api/v1/transfer-orders/:id/approve
Authorization: Bearer {accessToken}
```

**Request Body:**
```json
{
  "items": [
    {
      "id": "uuid",
      "approvedQty": 45
    }
  ]
}
```

### Ship Transfer Order
```http
POST /api/v1/transfer-orders/:id/ship
Authorization: Bearer {accessToken}
```

### Receive Transfer Order
```http
POST /api/v1/transfer-orders/:id/receive
Authorization: Bearer {accessToken}
```

**Request Body:**
```json
{
  "items": [
    {
      "id": "uuid",
      "receivedQty": 45
    }
  ]
}
```

---

## Purchase Orders

Similar structure to Transfer Orders.

```http
GET /api/v1/purchase-orders
POST /api/v1/purchase-orders
POST /api/v1/purchase-orders/:id/approve
POST /api/v1/purchase-orders/:id/receive
```

---

## Stock Counts

### Create Stock Count
```http
POST /api/v1/stock-counts
Authorization: Bearer {accessToken}
```

**Request Body:**
```json
{
  "warehouseId": "uuid",
  "scheduledDate": "2024-12-31",
  "items": [
    {
      "productId": "uuid",
      "batchId": "uuid",
      "systemQty": 100
    }
  ]
}
```

### Update Count
```http
PUT /api/v1/stock-counts/:id
Authorization: Bearer {accessToken}
```

**Request Body:**
```json
{
  "items": [
    {
      "id": "uuid",
      "countedQty": 98
    }
  ]
}
```

### Approve and Adjust
```http
POST /api/v1/stock-counts/:id/approve
Authorization: Bearer {accessToken}
```

---

## Notifications

### Get User Notifications
```http
GET /api/v1/notifications?status=UNREAD
Authorization: Bearer {accessToken}
```

### Mark as Read
```http
PUT /api/v1/notifications/:id/read
Authorization: Bearer {accessToken}
```

---

## Reports

### Stock by Location
```http
GET /api/v1/reports/stock-by-location?warehouseId=uuid
Authorization: Bearer {accessToken}
```

### Expiring Products
```http
GET /api/v1/reports/expiring-products?days=30
Authorization: Bearer {accessToken}
```

### Low Stock Report
```http
GET /api/v1/reports/low-stock
Authorization: Bearer {accessToken}
```

### Stock Movements Report
```http
GET /api/v1/reports/stock-movements?from=2024-01-01&to=2024-12-31
Authorization: Bearer {accessToken}
```

### Export Report
```http
POST /api/v1/reports/export
Authorization: Bearer {accessToken}
```

**Request Body:**
```json
{
  "reportType": "stock-by-location",
  "format": "xlsx",
  "params": {
    "warehouseId": "uuid"
  }
}
```

**Response:** File download

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Validation Error",
  "message": "Invalid input data",
  "details": {
    "field": "email",
    "message": "Invalid email format"
  }
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "Forbidden",
  "message": "Access denied"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Not Found",
  "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
```

---

## Rate Limiting

- **Limit:** 100 requests per 15 minutes per IP
- **Headers:**
  - `X-RateLimit-Limit`: 100
  - `X-RateLimit-Remaining`: 95
  - `X-RateLimit-Reset`: 1234567890

---

## Versioning

All endpoints are versioned using URL path versioning:
- Current version: `/api/v1`
- Future versions: `/api/v2`, `/api/v3`, etc.

---

## Pagination

All list endpoints support pagination:

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

**Response includes pagination metadata:**
```json
{
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## Filtering & Sorting

**Filtering:**
```
GET /api/v1/products?category=MEDICATION&status=ACTIVE
```

**Sorting:**
```
GET /api/v1/products?sortBy=name&sortOrder=asc
```

**Search:**
```
GET /api/v1/products?search=paracetamol
```

---

**Version:** 1.0.0
**Last Updated:** 2025-10-23
