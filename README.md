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

### 8. الموارد البشرية | HR Integration
- الحضور والانصراف
- إدارة العقود والرواتب
- الإجازات والترقيات

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
**آخر تحديث:** 2025-10-23