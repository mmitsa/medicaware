# هيكل مشروع نظام إدارة المستودعات التموينية الطبية
# Medical Warehouse Management System - Project Structure

## نظرة عامة على البنية
```
medical-warehouse-system/
├── backend/                    # Backend API (Node.js + Express + TypeScript)
│   ├── src/
│   │   ├── api/               # API Layer (Controllers, Routes, Middleware)
│   │   ├── application/       # Application Layer (Use Cases, Services)
│   │   ├── domain/            # Domain Layer (Entities, Value Objects, Business Logic)
│   │   ├── infrastructure/    # Infrastructure Layer (Database, External Services)
│   │   ├── shared/            # Shared Utilities and Helpers
│   │   └── config/            # Configuration Files
│   ├── tests/                 # Unit & Integration Tests
│   ├── prisma/                # Database Schema & Migrations
│   └── package.json
│
├── frontend/                   # Frontend Web App (React + TypeScript + Vite)
│   ├── src/
│   │   ├── components/        # Reusable Components
│   │   ├── features/          # Feature-based Modules
│   │   ├── pages/             # Page Components
│   │   ├── hooks/             # Custom React Hooks
│   │   ├── services/          # API Services
│   │   ├── store/             # State Management (Redux/Zustand)
│   │   ├── utils/             # Utility Functions
│   │   ├── assets/            # Static Assets
│   │   └── styles/            # Global Styles
│   ├── public/                # Public Assets
│   └── package.json
│
├── mobile/                     # Mobile App (React Native - Optional)
│   └── [Mobile app structure]
│
├── shared/                     # Shared Types & Interfaces
│   └── types/
│
├── docs/                       # Documentation
│   ├── technical/             # Technical Documentation
│   ├── user-guides/           # User Guides
│   ├── api/                   # API Documentation
│   └── deployment/            # Deployment Guides
│
├── infrastructure/             # Infrastructure as Code
│   ├── docker/                # Docker Configurations
│   ├── kubernetes/            # Kubernetes Manifests
│   └── terraform/             # Terraform Scripts
│
├── scripts/                    # Utility Scripts
│   ├── setup.sh              # Initial Setup
│   ├── seed.sh               # Database Seeding
│   └── deploy.sh             # Deployment Script
│
└── README.md                  # Project Overview
```

## التقنيات المستخدمة

### Backend
- **Runtime:** Node.js v18+
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** PostgreSQL 14+
- **ORM:** Prisma
- **Authentication:** JWT + bcrypt
- **Validation:** Zod
- **API Documentation:** Swagger/OpenAPI
- **Testing:** Jest + Supertest

### Frontend
- **Framework:** React 18+
- **Language:** TypeScript
- **Build Tool:** Vite
- **UI Library:** Material-UI (MUI) / Ant Design
- **State Management:** Redux Toolkit / Zustand
- **Forms:** React Hook Form
- **HTTP Client:** Axios
- **Routing:** React Router v6
- **Charts:** Recharts / Chart.js
- **Barcode:** react-barcode / react-qr-code

### DevOps
- **Containerization:** Docker + Docker Compose
- **CI/CD:** GitHub Actions
- **Monitoring:** Prometheus + Grafana
- **Logging:** Winston + ELK Stack

## الوحدات الرئيسية

### 1. إدارة المخزون (Inventory Management)
- Products
- Stock Levels
- Locations (Warehouses, Zones, Shelves)
- Barcode Management

### 2. المتابعة الزمنية (Expiry Management)
- Expiry Tracking
- Alerts & Notifications
- Batch Management

### 3. توزيع الإمدادات (Distribution)
- Transfer Orders
- Distribution Requests
- Movement History

### 4. الجرد والمراجعة (Stock Count & Audit)
- Physical Inventory
- Stock Reconciliation
- Audit Trails

### 5. التقارير والتحليلات (Reports & Analytics)
- Inventory Reports
- Movement Reports
- Performance Dashboards
- Custom Reports

### 6. التكامل (Integration)
- Medical System Integration
- NUPCO Integration
- Etimad Integration
- ERP Integration
- Rasid Integration

### 7. الإدارة المالية (Financial Management)
- Invoicing
- Payment Tracking
- Financial Reports
- Tax Reports

### 8. الموارد البشرية (HR Integration)
- Attendance
- Contracts
- Payroll
- Leave Management

### 9. إدارة المستخدمين (User Management)
- Authentication
- Authorization (RBAC)
- User Profiles
- Audit Logs

## قواعد التطوير

### Naming Conventions
- **Files:** kebab-case (e.g., `user-service.ts`)
- **Classes:** PascalCase (e.g., `UserService`)
- **Functions:** camelCase (e.g., `getUserById`)
- **Constants:** UPPER_SNAKE_CASE (e.g., `MAX_RETRY_COUNT`)
- **Interfaces:** PascalCase with 'I' prefix (e.g., `IUserRepository`)

### Git Workflow
- **Branches:** feature/*, bugfix/*, hotfix/*
- **Commits:** Conventional Commits (feat:, fix:, docs:, etc.)
- **Pull Requests:** Required for all changes

### Code Quality
- ESLint + Prettier
- Pre-commit hooks (Husky)
- Minimum 80% test coverage
- Code reviews required

## البيئات

### Development
- Local development with Docker Compose
- Hot reload enabled
- Debug mode

### Staging
- Mirror of production
- Testing environment
- Sample data

### Production
- High availability setup
- Load balancing
- Backup & disaster recovery

## الأمان

- HTTPS only
- JWT with refresh tokens
- Role-based access control (RBAC)
- Input validation & sanitization
- SQL injection prevention
- XSS protection
- CSRF protection
- Rate limiting
- Audit logging
