import { PrismaClient, UserRole, UserStatus, WarehouseType, ProductCategory, ProductStatus, UnitOfMeasure } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clear existing data (in development only)
  if (process.env.NODE_ENV === 'development') {
    console.log('🗑️  Clearing existing data...');
    await prisma.stockMovement.deleteMany({});
    await prisma.stock.deleteMany({});
    await prisma.batch.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.shelf.deleteMany({});
    await prisma.zone.deleteMany({});
    await prisma.transferOrder.deleteMany({});
    await prisma.purchaseOrder.deleteMany({});
    await prisma.stockCount.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.auditLog.deleteMany({});
    await prisma.attendanceRecord.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.warehouse.deleteMany({});
    await prisma.systemSetting.deleteMany({});
  }

  // 1. Create System Settings
  console.log('⚙️  Creating system settings...');
  const settings = [
    { key: 'expiry_warning_days_30', value: '30', description: 'تحذير قبل 30 يوم من انتهاء الصلاحية', category: 'notifications' },
    { key: 'expiry_warning_days_60', value: '60', description: 'تحذير قبل 60 يوم من انتهاء الصلاحية', category: 'notifications' },
    { key: 'expiry_warning_days_90', value: '90', description: 'تحذير قبل 90 يوم من انتهاء الصلاحية', category: 'notifications' },
    { key: 'low_stock_threshold', value: '20', description: 'نسبة التحذير من انخفاض المخزون (%)', category: 'inventory' },
    { key: 'default_language', value: 'ar', description: 'اللغة الافتراضية', category: 'general' },
    { key: 'tax_rate', value: '15', description: 'نسبة ضريبة القيمة المضافة (%)', category: 'financial' },
    { key: 'currency', value: 'SAR', description: 'العملة', category: 'financial' },
    { key: 'barcode_prefix', value: 'MWH', description: 'بادئة الباركود', category: 'inventory' },
  ];

  for (const setting of settings) {
    await prisma.systemSetting.create({ data: setting });
  }

  // 2. Create Main Warehouse
  console.log('🏢 Creating warehouses...');
  const mainWarehouse = await prisma.warehouse.create({
    data: {
      code: 'WH-MAIN',
      name: 'Main Medical Warehouse',
      nameAr: 'المستودع الطبي الرئيسي',
      type: WarehouseType.MAIN,
      description: 'Central medical supplies warehouse',
      address: 'King Fahd Road',
      city: 'Riyadh',
      region: 'Riyadh',
      country: 'Saudi Arabia',
      postalCode: '11564',
      phone: '+966112345678',
      email: 'warehouse@hospital.sa',
      manager: 'Ahmed Al-Salem',
      isActive: true,
      capacity: 10000,
    },
  });

  const branchWarehouse = await prisma.warehouse.create({
    data: {
      code: 'WH-BR01',
      name: 'Branch Warehouse 1',
      nameAr: 'مستودع الفرع 1',
      type: WarehouseType.BRANCH,
      description: 'Branch warehouse for eastern region',
      address: 'Dhahran Street',
      city: 'Dammam',
      region: 'Eastern',
      country: 'Saudi Arabia',
      postalCode: '31952',
      phone: '+966138765432',
      email: 'branch1@hospital.sa',
      manager: 'Mohammed Al-Qahtani',
      isActive: true,
      capacity: 5000,
    },
  });

  // 3. Create Zones for Main Warehouse
  console.log('📍 Creating zones...');
  const zone1 = await prisma.zone.create({
    data: {
      code: 'Z01',
      name: 'Zone A - Medications',
      nameAr: 'المنطقة أ - الأدوية',
      description: 'Medications storage area',
      warehouseId: mainWarehouse.id,
      isActive: true,
    },
  });

  const zone2 = await prisma.zone.create({
    data: {
      code: 'Z02',
      name: 'Zone B - Medical Supplies',
      nameAr: 'المنطقة ب - المستلزمات الطبية',
      description: 'Medical supplies storage area',
      warehouseId: mainWarehouse.id,
      isActive: true,
    },
  });

  // 4. Create Shelves
  console.log('🗄️  Creating shelves...');
  for (let i = 1; i <= 5; i++) {
    await prisma.shelf.create({
      data: {
        code: `S${i.toString().padStart(2, '0')}`,
        name: `Shelf ${i}`,
        nameAr: `الرف ${i}`,
        zoneId: zone1.id,
        capacity: 500,
        isActive: true,
      },
    });
  }

  // 5. Create Users
  console.log('👥 Creating users...');
  const hashedPassword = await bcrypt.hash('Admin@123', 10);

  const superAdmin = await prisma.user.create({
    data: {
      email: 'admin@hospital.sa',
      username: 'admin',
      password: hashedPassword,
      firstName: 'System',
      lastName: 'Administrator',
      phone: '+966500000000',
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      employeeId: 'EMP001',
      department: 'IT',
      position: 'System Administrator',
      hireDate: new Date('2024-01-01'),
    },
  });

  const warehouseManager = await prisma.user.create({
    data: {
      email: 'manager@hospital.sa',
      username: 'warehouse_manager',
      password: hashedPassword,
      firstName: 'Ahmed',
      lastName: 'Al-Salem',
      phone: '+966500000001',
      role: UserRole.WAREHOUSE_MANAGER,
      status: UserStatus.ACTIVE,
      warehouseId: mainWarehouse.id,
      employeeId: 'EMP002',
      department: 'Warehouse',
      position: 'Warehouse Manager',
      hireDate: new Date('2024-01-15'),
    },
  });

  const pharmacist = await prisma.user.create({
    data: {
      email: 'pharmacist@hospital.sa',
      username: 'pharmacist',
      password: hashedPassword,
      firstName: 'Fatima',
      lastName: 'Al-Rashid',
      phone: '+966500000002',
      role: UserRole.PHARMACIST,
      status: UserStatus.ACTIVE,
      warehouseId: mainWarehouse.id,
      employeeId: 'EMP003',
      department: 'Pharmacy',
      position: 'Clinical Pharmacist',
      hireDate: new Date('2024-02-01'),
    },
  });

  // 6. Create Products
  console.log('💊 Creating products...');
  const products = [
    {
      code: 'MED-001',
      barcode: '8901234567890',
      name: 'Paracetamol 500mg',
      nameAr: 'باراسيتامول 500 ملجم',
      scientificName: 'Acetaminophen',
      category: ProductCategory.MEDICATION,
      status: ProductStatus.ACTIVE,
      description: 'Pain reliever and fever reducer',
      manufacturer: 'Pharma Co.',
      supplier: 'Medical Supplies Ltd.',
      unitOfMeasure: UnitOfMeasure.BOX,
      minStockLevel: 100,
      maxStockLevel: 1000,
      reorderPoint: 200,
      reorderQuantity: 500,
      unitPrice: 15.50,
      requiresPrescription: false,
      isDangerous: false,
    },
    {
      code: 'MED-002',
      barcode: '8901234567891',
      name: 'Amoxicillin 500mg',
      nameAr: 'أموكسيسيلين 500 ملجم',
      scientificName: 'Amoxicillin',
      category: ProductCategory.MEDICATION,
      status: ProductStatus.ACTIVE,
      description: 'Antibiotic for bacterial infections',
      manufacturer: 'Antibio Pharma',
      supplier: 'Medical Supplies Ltd.',
      unitOfMeasure: UnitOfMeasure.BOX,
      minStockLevel: 50,
      maxStockLevel: 500,
      reorderPoint: 100,
      reorderQuantity: 200,
      unitPrice: 45.00,
      requiresPrescription: true,
      isDangerous: false,
    },
    {
      code: 'SUP-001',
      barcode: '8901234567892',
      name: 'Surgical Gloves (Box of 100)',
      nameAr: 'قفازات جراحية (علبة 100)',
      category: ProductCategory.MEDICAL_SUPPLY,
      status: ProductStatus.ACTIVE,
      description: 'Latex surgical gloves, size M',
      manufacturer: 'MedGlove Inc.',
      supplier: 'Medical Supplies Ltd.',
      unitOfMeasure: UnitOfMeasure.BOX,
      minStockLevel: 200,
      maxStockLevel: 2000,
      reorderPoint: 300,
      reorderQuantity: 1000,
      unitPrice: 25.00,
      requiresPrescription: false,
      isDangerous: false,
    },
    {
      code: 'SUP-002',
      barcode: '8901234567893',
      name: 'Sterile Gauze Pads (Pack of 10)',
      nameAr: 'ضمادات شاش معقمة (عبوة 10)',
      category: ProductCategory.MEDICAL_SUPPLY,
      status: ProductStatus.ACTIVE,
      description: 'Sterile gauze pads 4x4 inch',
      manufacturer: 'SterileSupply Co.',
      supplier: 'Medical Supplies Ltd.',
      unitOfMeasure: UnitOfMeasure.PACK,
      minStockLevel: 150,
      maxStockLevel: 1500,
      reorderPoint: 250,
      reorderQuantity: 700,
      unitPrice: 12.50,
      requiresPrescription: false,
      isDangerous: false,
    },
    {
      code: 'SUP-003',
      barcode: '8901234567894',
      name: 'Syringes 5ml (Pack of 100)',
      nameAr: 'حقن 5 مل (عبوة 100)',
      category: ProductCategory.MEDICAL_SUPPLY,
      status: ProductStatus.ACTIVE,
      description: 'Disposable syringes 5ml with needle',
      manufacturer: 'Syringe Pro',
      supplier: 'Medical Supplies Ltd.',
      unitOfMeasure: UnitOfMeasure.PACK,
      minStockLevel: 100,
      maxStockLevel: 1000,
      reorderPoint: 150,
      reorderQuantity: 500,
      unitPrice: 35.00,
      requiresPrescription: false,
      isDangerous: true,
      storageConditions: 'Keep in dry place, room temperature',
    },
  ];

  const createdProducts = [];
  for (const product of products) {
    const p = await prisma.product.create({ data: product });
    createdProducts.push(p);
  }

  // 7. Create Batches
  console.log('📦 Creating batches...');
  const today = new Date();
  const batches = [];

  for (let i = 0; i < createdProducts.length; i++) {
    const product = createdProducts[i];

    // Create 2 batches per product
    for (let j = 1; j <= 2; j++) {
      const batch = await prisma.batch.create({
        data: {
          batchNumber: `BATCH-${product.code}-${j}`,
          productId: product.id,
          manufacturingDate: new Date(today.getTime() - 180 * 24 * 60 * 60 * 1000), // 6 months ago
          expiryDate: new Date(today.getTime() + (365 + j * 30) * 24 * 60 * 60 * 1000), // 1+ years from now
          receivedDate: new Date(today.getTime() - 150 * 24 * 60 * 60 * 1000), // 5 months ago
          initialQuantity: 1000,
          currentQuantity: 800 - (j * 100),
          costPrice: product.unitPrice * 0.7, // 70% of unit price
          isExpired: false,
          isRecalled: false,
        },
      });
      batches.push(batch);
    }
  }

  console.log('✅ Database seeding completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`   - System Settings: ${settings.length}`);
  console.log(`   - Warehouses: 2`);
  console.log(`   - Zones: 2`);
  console.log(`   - Shelves: 5`);
  console.log(`   - Users: 3`);
  console.log(`   - Products: ${createdProducts.length}`);
  console.log(`   - Batches: ${batches.length}`);
  console.log('\n👤 Default Users:');
  console.log(`   - Super Admin: admin@hospital.sa / Admin@123`);
  console.log(`   - Warehouse Manager: manager@hospital.sa / Admin@123`);
  console.log(`   - Pharmacist: pharmacist@hospital.sa / Admin@123`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
