# مخطط قاعدة البيانات | Database Schema

## نظرة عامة | Overview

يستخدم النظام قاعدة بيانات PostgreSQL مع Prisma ORM لإدارة البيانات.

---

## الجداول الرئيسية | Main Tables

### 1. إدارة المستخدمين | User Management

#### Users (المستخدمون)
إدارة جميع مستخدمي النظام مع الأدوار والصلاحيات.

**الحقول الرئيسية:**
- `id` - المعرف الفريد
- `email` - البريد الإلكتروني (فريد)
- `username` - اسم المستخدم (فريد)
- `role` - الدور (SUPER_ADMIN, ADMIN, WAREHOUSE_MANAGER, PHARMACIST, INVENTORY_CLERK, AUDITOR, VIEWER)
- `status` - الحالة (ACTIVE, INACTIVE, SUSPENDED)
- `warehouseId` - ربط بمستودع محدد

**العلاقات:**
- ينتمي لمستودع واحد (اختياري)
- له عدة حركات مخزون
- له عدة أوامر نقل
- له عدة أوامر شراء
- له عدة عمليات جرد

**الفهارس:**
- `email`, `username`, `role`, `warehouseId`

---

### 2. إدارة المستودعات | Warehouse Management

#### Warehouses (المستودعات)
جميع المستودعات الرئيسية والفروع.

**الحقول الرئيسية:**
- `id` - المعرف الفريد
- `code` - الكود (فريد)
- `name` - الاسم
- `type` - النوع (MAIN, BRANCH, PHARMACY, CLINIC)
- `address`, `city`, `region` - معلومات الموقع
- `isActive` - نشط/غير نشط

**العلاقات:**
- له عدة مناطق (Zones)
- له عدة مستخدمين
- له عدة مخزونات
- له أوامر نقل صادرة ووارده

#### Zones (المناطق)
تقسيم المستودع إلى مناطق.

**الحقول الرئيسية:**
- `id` - المعرف الفريد
- `code` - الكود (فريد ضمن المستودع)
- `name` - الاسم
- `warehouseId` - المستودع التابع له

**العلاقات:**
- ينتمي لمستودع واحد
- له عدة أرفف

#### Shelves (الأرفف)
تقسيم المناطق إلى أرفف.

**الحقول الرئيسية:**
- `id` - المعرف الفريد
- `code` - الكود (فريد ضمن المنطقة)
- `name` - الاسم
- `zoneId` - المنطقة التابع لها
- `capacity` - السعة

**العلاقات:**
- ينتمي لمنطقة واحدة
- له عدة مخزونات

---

### 3. إدارة المنتجات | Product Management

#### Products (المنتجات)
جميع المنتجات الطبية والمستلزمات.

**الحقول الرئيسية:**
- `id` - المعرف الفريد
- `code` - الكود (فريد)
- `barcode` - الباركود (فريد)
- `name` - الاسم
- `scientificName` - الاسم العلمي
- `category` - الفئة (MEDICATION, MEDICAL_SUPPLY, EQUIPMENT, CONSUMABLE, OTHER)
- `status` - الحالة (ACTIVE, INACTIVE, DISCONTINUED)
- `unitOfMeasure` - وحدة القياس
- `minStockLevel`, `maxStockLevel` - حدود المخزون
- `reorderPoint` - نقطة إعادة الطلب
- `unitPrice` - سعر الوحدة
- `requiresPrescription` - يتطلب وصفة طبية
- `isDangerous` - مادة خطرة

**العلاقات:**
- له عدة دفعات (Batches)
- له عدة مخزونات
- له عدة حركات مخزون

**الفهارس:**
- `code`, `barcode`, `category`, `status`

---

### 4. إدارة الدفعات والصلاحية | Batch & Expiry Management

#### Batches (الدفعات)
دفعات المنتجات مع تواريخ الصلاحية.

**الحقول الرئيسية:**
- `id` - المعرف الفريد
- `batchNumber` - رقم الدفعة (فريد)
- `productId` - المنتج
- `manufacturingDate` - تاريخ الإنتاج
- `expiryDate` - تاريخ انتهاء الصلاحية
- `receivedDate` - تاريخ الاستلام
- `initialQuantity` - الكمية الأولية
- `currentQuantity` - الكمية الحالية
- `costPrice` - سعر التكلفة
- `isExpired` - منتهي الصلاحية
- `isRecalled` - مسترجع

**العلاقات:**
- ينتمي لمنتج واحد
- له عدة مخزونات
- له عدة حركات مخزون

**الفهارس:**
- `productId`, `expiryDate`, `batchNumber`

**Jobs Automation:**
- جوب يومي لتحديث `isExpired` عند انتهاء الصلاحية
- جوب يومي لإرسال تنبيهات قبل 30، 60، 90 يوم من انتهاء الصلاحية

---

### 5. إدارة المخزون | Stock Management

#### Stocks (المخزونات)
المخزون الحالي لكل منتج في كل موقع.

**الحقول الرئيسية:**
- `id` - المعرف الفريد
- `productId` - المنتج
- `batchId` - الدفعة (اختياري)
- `warehouseId` - المستودع
- `zoneId` - المنطقة (اختياري)
- `shelfId` - الرف (اختياري)
- `quantity` - الكمية
- `reservedQty` - الكمية المحجوزة
- `availableQty` - الكمية المتاحة (quantity - reservedQty)
- `lastCountDate` - تاريخ آخر جرد
- `lastMovementDate` - تاريخ آخر حركة

**Unique Constraint:**
- (productId, batchId, warehouseId, zoneId, shelfId)

**الفهارس:**
- `productId`, `warehouseId`, `batchId`

**Business Rules:**
- يتم تحديث `availableQty` تلقائياً = quantity - reservedQty
- لا يمكن أن تكون `quantity` سالبة
- لا يمكن أن تكون `reservedQty` أكبر من `quantity`

---

### 6. حركات المخزون | Stock Movements

#### StockMovements (حركات المخزون)
تسجيل جميع حركات المخزون.

**الحقول الرئيسية:**
- `id` - المعرف الفريد
- `movementNumber` - رقم الحركة (فريد)
- `type` - النوع:
  - RECEIPT - استلام
  - ISSUE - صرف
  - TRANSFER_IN - تحويل وارد
  - TRANSFER_OUT - تحويل صادر
  - ADJUSTMENT - تسوية
  - RETURN - إرجاع
  - EXPIRED - منتهي الصلاحية
  - DAMAGED - تالف
  - LOST - فقدان
  - FOUND - إيجاد
  - STOCK_COUNT - جرد
- `productId` - المنتج
- `batchId` - الدفعة
- `warehouseId` - المستودع
- `quantity` - الكمية
- `unitPrice` - سعر الوحدة
- `totalValue` - القيمة الإجمالية
- `referenceType` - نوع المرجع (PO, TO, SC)
- `referenceId` - معرف المرجع
- `userId` - المستخدم
- `movementDate` - تاريخ الحركة

**الفهارس:**
- `productId`, `warehouseId`, `type`, `movementDate`

**Audit Trail:**
- جميع الحركات غير قابلة للحذف أو التعديل (Immutable)
- تسجيل كامل للمستخدم والتاريخ والوقت

---

### 7. أوامر النقل | Transfer Orders

#### TransferOrders (أوامر النقل)
نقل المخزون بين المستودعات.

**الحقول الرئيسية:**
- `id` - المعرف الفريد
- `orderNumber` - رقم الأمر (فريد)
- `status` - الحالة:
  - DRAFT - مسودة
  - PENDING - معلق
  - APPROVED - موافق عليه
  - IN_TRANSIT - في الطريق
  - RECEIVED - مستلم
  - CANCELLED - ملغى
  - REJECTED - مرفوض
- `fromWarehouseId` - من المستودع
- `toWarehouseId` - إلى المستودع
- `requestDate` - تاريخ الطلب
- `approvedDate` - تاريخ الموافقة
- `shippedDate` - تاريخ الشحن
- `receivedDate` - تاريخ الاستلام
- `createdById` - منشئ الأمر
- `approvedBy` - الموافق

**العلاقات:**
- له عدة بنود (TransferOrderItems)
- ينتمي لمستودع المصدر
- ينتمي لمستودع الوجهة
- منشأ من قبل مستخدم

#### TransferOrderItems (بنود أوامر النقل)
تفاصيل المنتجات في أمر النقل.

**الحقول الرئيسية:**
- `id` - المعرف الفريد
- `transferOrderId` - أمر النقل
- `productId` - المنتج
- `batchId` - الدفعة
- `requestedQty` - الكمية المطلوبة
- `approvedQty` - الكمية الموافق عليها
- `receivedQty` - الكمية المستلمة

**Business Rules:**
- عند الموافقة: يتم حجز الكمية في المستودع المصدر
- عند الشحن: يتم خصم الكمية من المستودع المصدر وإنشاء حركة TRANSFER_OUT
- عند الاستلام: يتم إضافة الكمية للمستودع الوجهة وإنشاء حركة TRANSFER_IN

---

### 8. أوامر الشراء | Purchase Orders

#### PurchaseOrders (أوامر الشراء)
طلبات شراء المنتجات من الموردين.

**الحقول الرئيسية:**
- `id` - المعرف الفريد
- `orderNumber` - رقم الأمر (فريد)
- `status` - الحالة (DRAFT, SUBMITTED, APPROVED, ORDERED, RECEIVED, CANCELLED)
- `supplier` - المورد
- `warehouseId` - المستودع
- `orderDate` - تاريخ الطلب
- `expectedDate` - تاريخ الاستلام المتوقع
- `receivedDate` - تاريخ الاستلام الفعلي
- `totalAmount` - المبلغ الإجمالي
- `taxAmount` - مبلغ الضريبة
- `grandTotal` - الإجمالي النهائي

**العلاقات:**
- له عدة بنود (PurchaseOrderItems)

#### PurchaseOrderItems (بنود أوامر الشراء)
تفاصيل المنتجات في أمر الشراء.

**الحقول الرئيسية:**
- `id` - المعرف الفريد
- `purchaseOrderId` - أمر الشراء
- `productId` - المنتج
- `orderedQty` - الكمية المطلوبة
- `receivedQty` - الكمية المستلمة
- `unitPrice` - سعر الوحدة
- `totalPrice` - السعر الإجمالي

---

### 9. الجرد | Stock Count

#### StockCounts (عمليات الجرد)
عمليات الجرد الدورية للمخزون.

**الحقول الرئيسية:**
- `id` - المعرف الفريد
- `countNumber` - رقم الجرد (فريد)
- `status` - الحالة (PLANNED, IN_PROGRESS, COMPLETED, APPROVED, CANCELLED)
- `warehouseId` - المستودع
- `scheduledDate` - تاريخ الجرد المجدول
- `startDate` - تاريخ البدء
- `endDate` - تاريخ الانتهاء
- `createdById` - منشئ الجرد
- `approvedBy` - الموافق

**العلاقات:**
- له عدة بنود (StockCountItems)

#### StockCountItems (بنود الجرد)
تفاصيل المنتجات في عملية الجرد.

**الحقول الرئيسية:**
- `id` - المعرف الفريد
- `stockCountId` - عملية الجرد
- `productId` - المنتج
- `batchId` - الدفعة
- `systemQty` - الكمية في النظام
- `countedQty` - الكمية المعدودة
- `variance` - الفرق (countedQty - systemQty)

**Business Rules:**
- عند الموافقة: إذا كان هناك فرق، يتم إنشاء حركة ADJUSTMENT

---

### 10. التنبيهات | Notifications

#### Notifications (التنبيهات)
نظام التنبيهات للمستخدمين.

**الأنواع:**
- EXPIRY_WARNING - تحذير صلاحية
- LOW_STOCK - مخزون منخفض
- OUT_OF_STOCK - نفاد المخزون
- TRANSFER_APPROVED - موافقة نقل
- TRANSFER_RECEIVED - استلام نقل
- STOCK_COUNT_DUE - موعد جرد
- SYSTEM_ALERT - تنبيه النظام

**الحالات:**
- UNREAD - غير مقروء
- READ - مقروء
- ARCHIVED - مؤرشف

---

### 11. السجلات المالية | Financial Records

#### FinancialTransactions (المعاملات المالية)
تسجيل جميع المعاملات المالية.

**الأنواع:**
- PURCHASE - شراء
- SALE - بيع
- RETURN - إرجاع
- ADJUSTMENT - تسوية

**الحالات:**
- PENDING - معلق
- PAID - مدفوع
- PARTIAL - جزئي
- CANCELLED - ملغى

---

### 12. الموارد البشرية | HR Integration

#### AttendanceRecords (سجلات الحضور)
تسجيل حضور وانصراف الموظفين.

**الحقول الرئيسية:**
- `userId` - المستخدم
- `date` - التاريخ
- `status` - الحالة (PRESENT, ABSENT, LATE, LEAVE, SICK)
- `checkIn` - وقت الدخول
- `checkOut` - وقت الخروج
- `workHours` - ساعات العمل
- `overtimeHours` - ساعات العمل الإضافية

---

### 13. سجلات التدقيق | Audit Logs

#### AuditLogs (سجلات التدقيق)
تسجيل جميع عمليات النظام.

**الإجراءات:**
- CREATE - إنشاء
- UPDATE - تحديث
- DELETE - حذف
- LOGIN - تسجيل دخول
- LOGOUT - تسجيل خروج
- APPROVE - موافقة
- REJECT - رفض
- EXPORT - تصدير
- IMPORT - استيراد

**الحقول الرئيسية:**
- `userId` - المستخدم
- `action` - الإجراء
- `entityType` - نوع الكيان
- `entityId` - معرف الكيان
- `oldValues` - القيم القديمة (JSON)
- `newValues` - القيم الجديدة (JSON)
- `ipAddress` - عنوان IP
- `userAgent` - متصفح المستخدم

---

### 14. إعدادات النظام | System Settings

#### SystemSettings (إعدادات النظام)
إعدادات النظام القابلة للتخصيص.

**الحقول الرئيسية:**
- `key` - المفتاح (فريد)
- `value` - القيمة
- `description` - الوصف
- `category` - الفئة

**أمثلة على الإعدادات:**
- `expiry_warning_days` - عدد الأيام للتحذير من انتهاء الصلاحية
- `low_stock_threshold` - نسبة التحذير من انخفاض المخزون
- `default_language` - اللغة الافتراضية
- `tax_rate` - نسبة الضريبة
- `currency` - العملة

---

## العلاقات الرئيسية | Main Relationships

```
User ──┬─── Warehouse (Many-to-One)
       ├─── StockMovement (One-to-Many)
       ├─── TransferOrder (One-to-Many)
       ├─── PurchaseOrder (One-to-Many)
       ├─── StockCount (One-to-Many)
       └─── AuditLog (One-to-Many)

Warehouse ──┬─── Zone (One-to-Many)
            ├─── Stock (One-to-Many)
            ├─── TransferOrder (One-to-Many as From/To)
            └─── StockCount (One-to-Many)

Zone ──┬─── Shelf (One-to-Many)
       └─── Stock (One-to-Many)

Product ──┬─── Batch (One-to-Many)
          ├─── Stock (One-to-Many)
          └─── StockMovement (One-to-Many)

Batch ──┬─── Stock (One-to-Many)
        └─── StockMovement (One-to-Many)
```

---

## الفهارس | Indexes

تم إنشاء فهارس على جميع الحقول المستخدمة بشكل متكرر في الاستعلامات:
- Foreign Keys
- Unique Fields
- Date Fields
- Status/Enum Fields
- Search Fields (code, barcode, name)

---

## الأمان | Security

### 1. Soft Delete
معظم الجداول تدعم الحذف الناعم (Soft Delete) عبر حقل `deletedAt`.

### 2. Audit Fields
جميع الجداول تحتوي على:
- `createdAt` - تاريخ الإنشاء
- `updatedAt` - تاريخ آخر تحديث
- `createdBy` - منشئ السجل (حيثما كان مناسباً)
- `updatedBy` - محدث السجل (حيثما كان مناسباً)

### 3. Data Integrity
- Foreign Key Constraints
- Unique Constraints
- Check Constraints
- Default Values

---

## الهجرة والبذر | Migration & Seeding

### Migration
```bash
npx prisma migrate dev --name init
```

### Seed Data
```bash
npm run seed
```

سيتم إنشاء:
- مستخدم Super Admin
- مستودع رئيسي
- منتجات تجريبية
- إعدادات النظام الافتراضية

---

## النسخ الاحتياطي | Backup

### Daily Backup
- نسخ احتياطي يومي تلقائي
- الاحتفاظ بـ 30 نسخة
- نسخة أسبوعية (الاحتفاظ بـ 12 أسبوع)
- نسخة شهرية (الاحتفاظ بـ 12 شهر)

### Disaster Recovery
- خطة استرجاع البيانات خلال 4 ساعات
- نسخة احتياطية في موقع منفصل

---

## الأداء | Performance

### Optimization
- استخدام Indexes بشكل فعال
- تجميع الاستعلامات (Batching)
- Caching (Redis)
- Connection Pooling
- Query Optimization

### Monitoring
- مراقبة أداء الاستعلامات
- تنبيهات الأداء
- تحليل الاستعلامات البطيئة

---

**إصدار المخطط:** 1.0.0
**آخر تحديث:** 2025-10-23
