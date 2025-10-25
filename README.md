# نظام إدارة المستودعات التموينية الطبية
# Medical Warehouse Management System

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-18.x-green.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.x-blue.svg)
![React](https://img.shields.io/badge/react-18.x-blue.svg)

## نظرة عامة | Overview

نظام رقمي متكامل لإدارة جميع العمليات المتعلقة بالمخزون الطبي داخل المستودع الرئيسي والفروع.

A comprehensive digital system for managing all operations related to medical inventory in the main warehouse and branches.

## المميزات الرئيسية | Key Features

### 1. إدارة المخزون | Inventory Management
- تسجيل ومتابعة كميات الأدوية والمستلزمات الطبية
- تحديث مستمر لحالة المخزون
- دعم الباركود و QR Code
- إدارة المواقع (مستودعات، مناطق، أرفف)

### 2. المتابعة الزمنية | Expiry Tracking
- مراقبة صلاحية المنتجات الطبية
- تنبيهات تلقائية قبل انتهاء الصلاحية
- إدارة الدفعات (Batches)

### 3. توزيع الإمدادات | Distribution Management
- تنظيم عمليات التوزيع بين المستودعات
- توثيق كامل للحركات المخزنية
- تتبع طلبات النقل

### 4. الجرد والمراجعة | Stock Count & Audit
- جرد دوري منظم
- تسوية المخزون
- سجلات تدقيق شاملة

### 5. التقارير والتحليلات | Reports & Analytics
- تقارير شاملة عن الأداء
- تحديد الفائض والعجز
- لوحات معلومات تفاعلية
- دعم اتخاذ القرار الإداري

### 6. التكامل | Integration
- النظام الطبي
- منصة نوبكو (NUPCO)
- منصة اعتماد (Etimad)
- نظام ERP
- نظام رصد (Rasid)

### 7. الإدارة المالية | Financial Management
- الفواتير والمدفوعات
- التقارير المالية والضريبية
- متابعة التحصيل

### 8. إدارة الموردين | Supplier Management
- معلومات الموردين الكاملة
- نظام تقييم الموردين (0-5 نجوم)
- تتبع أداء الموردين
- حد الائتمان والرصيد المتاح

### 9. إدارة الفئات | Category Management
- تصنيف هرمي للمنتجات
- فئات رئيسية وفرعية
- منع المراجع الدائرية
- ربط المنتجات بالفئات

## التقنيات المستخدمة | Tech Stack

### Backend
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** PostgreSQL 15+
- **ORM:** Prisma
- **Authentication:** JWT + bcrypt
- **API Documentation:** Swagger/OpenAPI

### Frontend
- **Framework:** React 18+
- **Language:** TypeScript
- **Build Tool:** Vite
- **UI Library:** Material-UI (MUI)
- **State Management:** Redux Toolkit
- **HTTP Client:** Axios
- **Charts:** Recharts

### DevOps
- **Containerization:** Docker + Docker Compose
- **Database UI:** pgAdmin
- **Caching:** Redis

## الوحدات المكتملة | Completed Modules

### ✅ Backend API (100% Complete - 20/20 Modules)

1. **البنية التحتية وقاعدة البيانات** | Infrastructure & Database
   - مخطط Prisma مع 20+ نموذج
   - ترحيل قاعدة البيانات
   - دعم البيانات الأولية

2. **المصادقة والتفويض** | Authentication & Authorization (8 endpoints)
   - مصادقة JWT مع رموز التحديث
   - التحكم في الوصول المبني على الأدوار (7 أدوار)
   - تشفير كلمات المرور

3. **إدارة المستخدمين** | User Management (10 endpoints)
   - عمليات CRUD للمستخدمين
   - تعيين الأدوار
   - تفعيل/إلغاء تفعيل المستخدمين

4. **إدارة المستودعات** | Warehouse Management (9 endpoints)
   - دعم مستودعات متعددة
   - تسلسل هرمي للمستودعات
   - تتبع المواقع

5. **إدارة المنتجات** | Product Management (12 endpoints)
   - كتالوج المنتجات
   - التسعير ومستويات المخزون
   - ربط بالفئات

6. **إدارة الدفعات** | Batch Management (10 endpoints)
   - تتبع الدفعات مع تواريخ الانتهاء
   - معلومات الشركة المصنعة

7. **إدارة المخزون** | Stock Management (12 endpoints)
   - تتبع المخزون في الوقت الفعلي
   - حجوزات المخزون
   - كشف المخزون المنخفض

8. **حركات المخزون** | Stock Movement (13 endpoints)
   - 11 نوع من الحركات
   - تحديثات تلقائية للمخزون
   - سجل كامل للحركات

9. **أوامر النقل** | Transfer Orders (11 endpoints)
   - نقل بين المستودعات
   - سير عمل الموافقة
   - حجز المخزون

10. **أوامر الشراء** | Purchase Orders (10 endpoints)
    - طلب من الموردين
    - موافقة متعددة المراحل
    - إنشاء دفعات تلقائي
    - حساب ضريبة 15%

11. **جرد المخزون** | Stock Count (12 endpoints)
    - جرد المخزون الفعلي
    - تتبع الفروقات
    - تعديلات المخزون

12. **الإشعارات** | Notifications (11 endpoints)
    - تنبيهات تلقائية
    - تحذيرات الانتهاء
    - إشعارات المخزون المنخفض
    - دعم ثنائي اللغة

13. **التقارير والتحليلات** | Reports & Analytics (10 endpoints)
    - تقرير مستويات المخزون
    - تقرير المخزون المنخفض
    - تقرير المنتجات منتهية الصلاحية
    - تقرير تقييم المخزون
    - تقارير الحركات
    - تقارير أوامر النقل والشراء
    - تحليلات المنتجات
    - لوحة معلومات ملخصة

14. **إدارة الموردين** | Supplier Management (13 endpoints)
    - ملفات تعريف الموردين
    - تتبع الأداء
    - نظام التقييم
    - معدل التسليم في الوقت المحدد
    - حد الائتمان

15. **إدارة الفئات** | Category Management (13 endpoints)
    - فئات هرمية
    - منع المراجع الدائرية
    - ربط المنتجات

16. **الإدارة المالية** | Financial Management (11 endpoints)
    - تتبع المدفوعات
    - حسابات الدفع (Accounts Payable)
    - رصيد الموردين
    - تقارير الدفع
    - تقرير التدفق النقدي

17. **API الصحة والحالة** | Health & Status
    - فحص صحة النظام
    - معلومات الإصدار

### ✅ التوثيق والنشر | Documentation & Deployment (Complete)

18. **توثيق API الشامل** | Comprehensive API Documentation
    - 185+ نقطة نهاية موثقة بالكامل
    - أمثلة على الطلبات والاستجابات
    - أكواد الأخطاء ومعالجتها
    - أنواع البيانات والتعدادات

19. **دليل النشر الإنتاجي** | Production Deployment Guide
    - إرشادات خطوة بخطوة (عربي/إنجليزي)
    - تكوين الخادم والقاعدة
    - الأمان وشهادات SSL
    - النسخ الاحتياطي والمراقبة
    - استكشاف الأخطاء وإصلاحها

20. **البيانات الأولية** | Seed Data & Configuration
    - ملف seed شامل مع بيانات نموذجية
    - ملف متغيرات البيئة (.env.example)
    - حسابات مستخدمين افتراضية
    - منتجات وموردين نموذجيين

## البدء السريع | Quick Start

### المتطلبات الأساسية | Prerequisites

- Node.js 18 or higher
- npm 9 or higher
- Docker & Docker Compose (optional)

### التثبيت | Installation

#### 1. استنساخ المشروع | Clone the repository

```bash
git clone <repository-url>
cd medical-warehouse-system
```

#### 2. باستخدام Docker (موصى به) | Using Docker (Recommended)

```bash
# تشغيل جميع الخدمات
docker-compose up -d

# عرض السجلات
docker-compose logs -f

# إيقاف الخدمات
docker-compose down
```

#### 3. بدون Docker | Without Docker

**Backend:**
```bash
cd backend
cp .env.example .env
# قم بتحديث ملف .env بالقيم المناسبة
npm install
npx prisma migrate dev
npx prisma generate
npm run seed
npm run dev
```

**Frontend:**
```bash
cd frontend
cp .env.example .env
# قم بتحديث ملف .env بالقيم المناسبة
npm install
npm run dev
```

### الوصول للتطبيق | Access

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3000
- **API Documentation:** http://localhost:3000/api-docs
- **pgAdmin:** http://localhost:5050
  - Email: admin@medical-warehouse.com
  - Password: admin123

## الهيكل | Project Structure

```
medical-warehouse-system/
├── backend/               # Backend API
├── frontend/              # Frontend Web App
├── shared/                # Shared Types
├── docs/                  # Documentation
├── infrastructure/        # Infrastructure as Code
├── scripts/               # Utility Scripts
└── docker-compose.yml     # Docker Compose Configuration
```

للمزيد من التفاصيل، راجع [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)

## التطوير | Development

### الأوامر المتاحة | Available Scripts

**Backend:**
```bash
npm run dev          # تشغيل وضع التطوير
npm run build        # بناء المشروع
npm run start        # تشغيل النسخة الإنتاجية
npm run test         # تشغيل الاختبارات
npm run lint         # فحص الكود
npm run format       # تنسيق الكود
```

**Frontend:**
```bash
npm run dev          # تشغيل وضع التطوير
npm run build        # بناء المشروع
npm run preview      # معاينة النسخة الإنتاجية
npm run test         # تشغيل الاختبارات
npm run lint         # فحص الكود
```

### قواعد الكود | Code Style

- ESLint + Prettier للتنسيق
- Conventional Commits للرسائل
- الحد الأدنى لتغطية الاختبارات: 80%

## قاعدة البيانات | Database

### المخططات الرئيسية | Main Schemas

راجع [DATABASE_SCHEMA.md](./docs/technical/DATABASE_SCHEMA.md) للتفاصيل الكاملة.

### الهجرة | Migrations

```bash
# إنشاء هجرة جديدة
npx prisma migrate dev --name migration_name

# تطبيق الهجرات
npx prisma migrate deploy

# إعادة تعيين قاعدة البيانات
npx prisma migrate reset

# فتح Prisma Studio
npx prisma studio
```

## الاختبار | Testing

```bash
# تشغيل جميع الاختبارات
npm test

# تشغيل الاختبارات مع المراقبة
npm run test:watch

# تقرير التغطية
npm run test:coverage
```

## النشر | Deployment

راجع [DEPLOYMENT.md](./docs/deployment/DEPLOYMENT.md) لتعليمات النشر التفصيلية.

## التوثيق | Documentation

- [دليل المستخدم | User Guide](./docs/user-guides/)
- [التوثيق الفني | Technical Documentation](./docs/technical/)
- [توثيق API | API Documentation](./docs/api/)
- [دليل النشر | Deployment Guide](./docs/deployment/)

## الدعم والتدريب | Support & Training

### التدريب | Training
- دليل استخدام مكتوب ومرئي
- دورات تدريبية مسجلة
- تدريب المستخدمين النهائيين
- تدريب مديري النظام

### الدعم الفني | Technical Support
- دعم فني 24/7
- متخصصون بالموقع
- استجابة خلال 30 دقيقة كحد أقصى

## الأمان | Security

- HTTPS only
- JWT مع Refresh Tokens
- التحكم في الصلاحيات (RBAC)
- التحقق من المدخلات
- حماية من SQL Injection
- حماية من XSS
- حماية من CSRF
- تحديد معدل الطلبات (Rate Limiting)
- سجلات التدقيق (Audit Logs)

## الترخيص | License

MIT License - راجع ملف [LICENSE](./LICENSE) للتفاصيل.

## المساهمة | Contributing

نرحب بالمساهمات! يرجى قراءة إرشادات المساهمة قبل البدء.

## الفريق | Team

Medical Warehouse Development Team

## المدة الزمنية | Timeline

**مدة التنفيذ:** 4 أشهر

## الاتصال | Contact

للاستفسارات والدعم، يرجى التواصل مع فريق الدعم الفني.

---

**نسخة:** 1.0.0
**حالة التطوير:** ✅ 100% مكتمل - جاهز للإنتاج | ✅ 100% Complete - Production Ready
**عدد واجهات API:** 185+ نقطة نهاية | 185+ Endpoints
**التوثيق:** API Documentation, Deployment Guide, Seed Data
**آخر تحديث:** 2025-10-25