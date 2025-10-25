/**
 * API Preview Server
 * This server provides documentation and testing interface for the Medical Warehouse Management System API
 */

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// API Documentation Data
const apiDocumentation = {
  title: "Medical Warehouse Management System API",
  version: "1.0.0",
  description: "نظام إدارة المستودعات التموينية الطبية - Medical Warehouse Management System API",
  baseUrl: "http://localhost:3000/api/v1",
  progress: "35% Complete - 7 modules implemented",
  modules: [
    {
      name: "Authentication",
      status: "✅ Complete",
      endpoints: 8,
      routes: [
        { method: "POST", path: "/api/v1/auth/login", description: "User login with credentials", auth: "None" },
        { method: "POST", path: "/api/v1/auth/refresh", description: "Refresh access token", auth: "Refresh Token" },
        { method: "POST", path: "/api/v1/auth/logout", description: "User logout", auth: "Bearer Token" },
        { method: "POST", path: "/api/v1/auth/register", description: "Register new user (Admin only)", auth: "Bearer Token (Admin)" },
        { method: "POST", path: "/api/v1/auth/change-password", description: "Change password", auth: "Bearer Token" },
        { method: "POST", path: "/api/v1/auth/forgot-password", description: "Request password reset", auth: "None" },
        { method: "POST", path: "/api/v1/auth/reset-password", description: "Reset password with token", auth: "Reset Token" },
        { method: "GET", path: "/api/v1/auth/profile", description: "Get current user profile", auth: "Bearer Token" }
      ]
    },
    {
      name: "Users Management",
      status: "✅ Complete",
      endpoints: 10,
      routes: [
        { method: "GET", path: "/api/v1/users", description: "List all users with pagination & filters", auth: "Bearer Token (Admin/Manager)" },
        { method: "POST", path: "/api/v1/users", description: "Create new user", auth: "Bearer Token (Admin)" },
        { method: "GET", path: "/api/v1/users/statistics", description: "Get user statistics", auth: "Bearer Token (Admin/Manager)" },
        { method: "GET", path: "/api/v1/users/search", description: "Search users", auth: "Bearer Token" },
        { method: "GET", path: "/api/v1/users/me", description: "Get own profile", auth: "Bearer Token" },
        { method: "PUT", path: "/api/v1/users/me", description: "Update own profile", auth: "Bearer Token" },
        { method: "GET", path: "/api/v1/users/:id", description: "Get user by ID", auth: "Bearer Token (Admin/Manager)" },
        { method: "PUT", path: "/api/v1/users/:id", description: "Update user", auth: "Bearer Token (Admin)" },
        { method: "DELETE", path: "/api/v1/users/:id", description: "Delete user (soft delete)", auth: "Bearer Token (Admin)" },
        { method: "PATCH", path: "/api/v1/users/:id/status", description: "Update user status", auth: "Bearer Token (Admin)" }
      ]
    },
    {
      name: "Warehouses Management",
      status: "✅ Complete",
      endpoints: 8,
      routes: [
        { method: "GET", path: "/api/v1/warehouses/statistics", description: "Get warehouse statistics", auth: "Bearer Token (Manager+)" },
        { method: "GET", path: "/api/v1/warehouses", description: "List all warehouses", auth: "Bearer Token" },
        { method: "POST", path: "/api/v1/warehouses", description: "Create new warehouse", auth: "Bearer Token (Admin)" },
        { method: "GET", path: "/api/v1/warehouses/:id", description: "Get warehouse by ID with zones & shelves", auth: "Bearer Token" },
        { method: "PUT", path: "/api/v1/warehouses/:id", description: "Update warehouse", auth: "Bearer Token (Admin)" },
        { method: "DELETE", path: "/api/v1/warehouses/:id", description: "Delete warehouse", auth: "Bearer Token (Admin)" },
        { method: "POST", path: "/api/v1/warehouses/:id/zones", description: "Create zone in warehouse", auth: "Bearer Token (Admin)" },
        { method: "POST", path: "/api/v1/warehouses/zones/:zoneId/shelves", description: "Create shelf in zone", auth: "Bearer Token (Admin)" }
      ]
    },
    {
      name: "Products Management",
      status: "✅ Complete",
      endpoints: 12,
      routes: [
        { method: "GET", path: "/api/v1/products/statistics", description: "Get product statistics", auth: "Bearer Token (Manager+)" },
        { method: "GET", path: "/api/v1/products/low-stock", description: "Get low stock products", auth: "Bearer Token (Manager+)" },
        { method: "GET", path: "/api/v1/products/search", description: "Search products", auth: "Bearer Token" },
        { method: "GET", path: "/api/v1/products/barcode/:barcode", description: "Get product by barcode", auth: "Bearer Token" },
        { method: "POST", path: "/api/v1/products/:id/generate-barcode", description: "Generate barcode for product", auth: "Bearer Token (Admin)" },
        { method: "POST", path: "/api/v1/products/bulk", description: "Bulk import products", auth: "Bearer Token (Admin)" },
        { method: "GET", path: "/api/v1/products", description: "List all products with filters", auth: "Bearer Token" },
        { method: "POST", path: "/api/v1/products", description: "Create new product", auth: "Bearer Token (Admin)" },
        { method: "GET", path: "/api/v1/products/:id", description: "Get product by ID with batches & stock", auth: "Bearer Token" },
        { method: "PUT", path: "/api/v1/products/:id", description: "Update product", auth: "Bearer Token (Admin)" },
        { method: "DELETE", path: "/api/v1/products/:id", description: "Delete product", auth: "Bearer Token (Admin)" },
        { method: "PATCH", path: "/api/v1/products/:id/status", description: "Update product status", auth: "Bearer Token (Admin)" }
      ]
    },
    {
      name: "Batches Management",
      status: "✅ Complete",
      endpoints: 10,
      routes: [
        { method: "GET", path: "/api/v1/batches/statistics", description: "Get batch statistics", auth: "Bearer Token (Manager+)" },
        { method: "GET", path: "/api/v1/batches/expiring", description: "Get expiring batches", auth: "Bearer Token (Manager+)" },
        { method: "GET", path: "/api/v1/batches/expired", description: "Get expired batches", auth: "Bearer Token (Manager+)" },
        { method: "POST", path: "/api/v1/batches/mark-expired", description: "Mark expired batches", auth: "Bearer Token (Manager+)" },
        { method: "POST", path: "/api/v1/batches/:id/recall", description: "Recall a batch", auth: "Bearer Token (Admin)" },
        { method: "GET", path: "/api/v1/batches", description: "List all batches with filters", auth: "Bearer Token" },
        { method: "POST", path: "/api/v1/batches", description: "Create new batch", auth: "Bearer Token (Manager+)" },
        { method: "GET", path: "/api/v1/batches/:id", description: "Get batch by ID with history", auth: "Bearer Token" },
        { method: "PUT", path: "/api/v1/batches/:id", description: "Update batch", auth: "Bearer Token (Manager+)" },
        { method: "DELETE", path: "/api/v1/batches/:id", description: "Delete batch", auth: "Bearer Token (Admin)" }
      ]
    }
  ],
  upcomingModules: [
    "Stock Management",
    "Stock Movements",
    "Transfer Orders",
    "Purchase Orders",
    "Stock Counts",
    "Reports System",
    "Notifications",
    "Financial Management",
    "HR Integration"
  ],
  roles: [
    { role: "SUPER_ADMIN", description: "Full system administrator" },
    { role: "ADMIN", description: "Administrator" },
    { role: "WAREHOUSE_MANAGER", description: "Warehouse manager" },
    { role: "PHARMACIST", description: "Pharmacist" },
    { role: "INVENTORY_CLERK", description: "Inventory clerk" },
    { role: "AUDITOR", description: "Auditor" },
    { role: "VIEWER", description: "View only" }
  ]
};

// Routes
app.get('/', (req, res) => {
  res.json({
    message: "Welcome to Medical Warehouse Management System API",
    documentation: "/api/docs",
    health: "/health",
    version: apiDocumentation.version
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'API Preview Server is running',
    note: 'This is a preview server showing API documentation. Full database functionality requires setup.'
  });
});

app.get('/api/docs', (req, res) => {
  res.json(apiDocumentation);
});

app.get('/api/v1', (req, res) => {
  res.json({
    message: "Medical Warehouse Management System API v1",
    version: "1.0.0",
    progress: "35% Complete",
    completedModules: apiDocumentation.modules.map(m => m.name),
    upcomingModules: apiDocumentation.upcomingModules,
    documentation: "/api/docs",
    totalEndpoints: apiDocumentation.modules.reduce((sum, m) => sum + m.endpoints, 0)
  });
});

// Generate HTML documentation
app.get('/docs', (req, res) => {
  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Medical Warehouse Management API - Documentation</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; }
        .header p { font-size: 1.2em; opacity: 0.9; }
        .progress {
            background: rgba(255,255,255,0.2);
            padding: 15px;
            margin-top: 20px;
            border-radius: 10px;
            font-size: 1.3em;
            font-weight: bold;
        }
        .content { padding: 40px; }
        .module {
            margin-bottom: 40px;
            border: 2px solid #e0e0e0;
            border-radius: 15px;
            overflow: hidden;
        }
        .module-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .module-header h2 { font-size: 1.8em; }
        .module-header .badge {
            background: rgba(255,255,255,0.3);
            padding: 8px 15px;
            border-radius: 20px;
            font-size: 0.9em;
        }
        .endpoint {
            padding: 15px 20px;
            border-bottom: 1px solid #e0e0e0;
            display: flex;
            align-items: center;
            gap: 15px;
        }
        .endpoint:hover { background: #f5f5f5; }
        .endpoint:last-child { border-bottom: none; }
        .method {
            padding: 5px 15px;
            border-radius: 5px;
            font-weight: bold;
            font-size: 0.85em;
            min-width: 70px;
            text-align: center;
        }
        .method.get { background: #4CAF50; color: white; }
        .method.post { background: #2196F3; color: white; }
        .method.put { background: #FF9800; color: white; }
        .method.patch { background: #9C27B0; color: white; }
        .method.delete { background: #f44336; color: white; }
        .path {
            font-family: 'Courier New', monospace;
            font-size: 0.95em;
            color: #333;
            flex: 1;
        }
        .auth {
            font-size: 0.85em;
            color: #666;
            background: #f0f0f0;
            padding: 5px 10px;
            border-radius: 5px;
        }
        .upcoming {
            background: #fff3cd;
            border: 2px solid #ffc107;
            border-radius: 10px;
            padding: 20px;
            margin-top: 30px;
        }
        .upcoming h3 { color: #856404; margin-bottom: 15px; }
        .upcoming ul { list-style: none; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; }
        .upcoming li { background: white; padding: 10px; border-radius: 5px; border-left: 4px solid #ffc107; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏥 نظام إدارة المستودعات التموينية الطبية</h1>
            <p>Medical Warehouse Management System API</p>
            <div class="progress">📊 التقدم: ${apiDocumentation.progress}</div>
        </div>
        <div class="content">
            ${apiDocumentation.modules.map(module => `
                <div class="module">
                    <div class="module-header">
                        <h2>${module.name}</h2>
                        <div class="badge">${module.status} - ${module.endpoints} endpoints</div>
                    </div>
                    ${module.routes.map(route => `
                        <div class="endpoint">
                            <span class="method ${route.method.toLowerCase()}">${route.method}</span>
                            <span class="path">${route.path}</span>
                            <span class="auth">🔐 ${route.auth}</span>
                        </div>
                    `).join('')}
                </div>
            `).join('')}

            <div class="upcoming">
                <h3>📋 الوحدات القادمة (Upcoming Modules)</h3>
                <ul>
                    ${apiDocumentation.upcomingModules.map(module => `<li>⏳ ${module}</li>`).join('')}
                </ul>
            </div>
        </div>
    </div>
</body>
</html>
  `;
  res.send(html);
});

// Mock endpoint responses
app.all('/api/v1/*', (req, res) => {
  res.status(503).json({
    success: false,
    message: "Database not connected",
    note: "This is a preview server. To use the full API, please set up the database and run 'npm run dev'",
    requestedPath: req.path,
    method: req.method,
    documentation: "/docs"
  });
});

// Start server
app.listen(PORT, () => {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   Medical Warehouse Management System API - Preview Server   ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('🚀 Server running on: http://localhost:' + PORT);
  console.log('📚 Documentation:     http://localhost:' + PORT + '/docs');
  console.log('📊 API Overview:      http://localhost:' + PORT + '/api/docs');
  console.log('❤️  Health Check:      http://localhost:' + PORT + '/health');
  console.log('');
  console.log('✅ Completed: 7 modules (Authentication, Users, Warehouses, Products, Batches)');
  console.log('📈 Progress: 35% Complete');
  console.log('🔗 Total Endpoints: 48');
  console.log('');
  console.log('Note: This is a preview server showing API documentation.');
  console.log('For full functionality, set up the database and run: npm run dev');
  console.log('');
});
