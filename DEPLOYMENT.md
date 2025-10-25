# دليل النشر | Deployment Guide

# Medical Warehouse Management System - Production Deployment

## نظرة عامة | Overview

This guide covers deploying the Medical Warehouse Management System to production environments.

---

## المتطلبات | Prerequisites

### الخادم | Server Requirements

**الحد الأدنى | Minimum:**
- CPU: 2 cores
- RAM: 4 GB
- Storage: 50 GB SSD
- OS: Ubuntu 20.04 LTS or higher

**موصى به | Recommended:**
- CPU: 4 cores
- RAM: 8 GB
- Storage: 100 GB SSD
- OS: Ubuntu 22.04 LTS

### البرمجيات | Software Requirements

- Node.js 18+ LTS
- PostgreSQL 15+
- Nginx (web server/reverse proxy)
- PM2 (process manager)
- SSL Certificate (Let's Encrypt recommended)

---

## الخطوة 1 | Step 1: تجهيز الخادم | Server Setup

### تحديث النظام | Update System

```bash
sudo apt update
sudo apt upgrade -y
```

### تثبيت Node.js | Install Node.js

```bash
# Install Node.js 18 LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

### تثبيت PostgreSQL | Install PostgreSQL

```bash
# Install PostgreSQL 15
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt update
sudo apt install -y postgresql-15 postgresql-contrib-15

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify installation
sudo -u postgres psql --version
```

### إنشاء قاعدة البيانات | Create Database

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL shell:
CREATE DATABASE medicaware;
CREATE USER medicaware_user WITH ENCRYPTED PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE medicaware TO medicaware_user;
\q
```

### تثبيت Nginx | Install Nginx

```bash
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### تثبيت PM2 | Install PM2

```bash
sudo npm install -g pm2

# Setup PM2 to start on boot
pm2 startup
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp /home/$USER
```

---

## الخطوة 2 | Step 2: نشر التطبيق | Deploy Application

### استنساخ المشروع | Clone Repository

```bash
# Create application directory
sudo mkdir -p /var/www/medicaware
sudo chown $USER:$USER /var/www/medicaware

# Clone repository
cd /var/www/medicaware
git clone https://github.com/mmitsa/medicaware.git .

# Or upload via SCP/SFTP
```

### إعداد Backend

```bash
cd /var/www/medicaware/backend

# Install dependencies
npm install --production

# Create environment file
cp .env.example .env
nano .env
```

### تكوين متغيرات البيئة | Configure Environment Variables

```env
# Database
DATABASE_URL="postgresql://medicaware_user:your-secure-password@localhost:5432/medicaware"

# JWT Secrets (Generate strong secrets!)
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-characters

# Server
NODE_ENV=production
PORT=3000

# CORS (Your frontend domain)
CORS_ORIGIN=https://your-domain.com

# Optional: Redis for caching
# REDIS_URL=redis://localhost:6379
```

### توليد أسرار قوية | Generate Strong Secrets

```bash
# Generate random secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Use output for JWT_SECRET

node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Use output for JWT_REFRESH_SECRET
```

### تحديث مخطط Prisma | Update Prisma Schema

```bash
# Edit schema.prisma to use PostgreSQL
nano prisma/schema.prisma
```

Ensure the datasource is set to PostgreSQL:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### تشغيل الترحيلات | Run Migrations

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed database (optional)
npm run seed
```

### بناء التطبيق | Build Application

```bash
npm run build
```

---

## الخطوة 3 | Step 3: تكوين PM2 | Configure PM2

### إنشاء ملف تكوين PM2 | Create PM2 Configuration

```bash
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'medicaware-api',
    script: './dist/index.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    autorestart: true,
    watch: false
  }]
};
```

### تشغيل التطبيق | Start Application

```bash
# Create logs directory
mkdir -p logs

# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# View logs
pm2 logs medicaware-api

# Monitor
pm2 monit
```

---

## الخطوة 4 | Step 4: تكوين Nginx | Configure Nginx

### إنشاء ملف تكوين Nginx | Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/medicaware
```

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL Configuration (will be set up by Certbot)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # API Backend
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:3000;
        access_log off;
    }

    # Rate limiting for API
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req zone=api_limit burst=20 nodelay;

    # Max request size
    client_max_body_size 10M;

    # Logging
    access_log /var/log/nginx/medicaware_access.log;
    error_log /var/log/nginx/medicaware_error.log;
}
```

### تفعيل الموقع | Enable Site

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/medicaware /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## الخطوة 5 | Step 5: تكوين SSL | Configure SSL

### تثبيت Certbot | Install Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### الحصول على شهادة SSL | Obtain SSL Certificate

```bash
# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Follow prompts:
# - Enter email address
# - Agree to terms
# - Choose whether to redirect HTTP to HTTPS (recommended: yes)

# Test automatic renewal
sudo certbot renew --dry-run
```

SSL certificates will auto-renew via cron job.

---

## الخطوة 6 | Step 6: إعداد جدار الحماية | Setup Firewall

```bash
# Enable UFW
sudo ufw enable

# Allow SSH (IMPORTANT: Do this first!)
sudo ufw allow ssh
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 'Nginx Full'
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Check status
sudo ufw status
```

---

## الخطوة 7 | Step 7: النسخ الاحتياطي | Backup Configuration

### إعداد النسخ الاحتياطي للقاعدة | Database Backup Script

```bash
sudo nano /usr/local/bin/backup-medicaware-db.sh
```

```bash
#!/bin/bash

# Configuration
BACKUP_DIR="/var/backups/medicaware"
DB_NAME="medicaware"
DB_USER="medicaware_user"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="medicaware_backup_$DATE.sql"

# Create backup directory if not exists
mkdir -p $BACKUP_DIR

# Perform backup
pg_dump -U $DB_USER -d $DB_NAME > $BACKUP_DIR/$FILENAME

# Compress backup
gzip $BACKUP_DIR/$FILENAME

# Delete backups older than 30 days
find $BACKUP_DIR -name "medicaware_backup_*.sql.gz" -mtime +30 -delete

echo "Backup completed: $FILENAME.gz"
```

```bash
# Make executable
sudo chmod +x /usr/local/bin/backup-medicaware-db.sh

# Add to crontab (daily at 2 AM)
sudo crontab -e
```

Add line:
```
0 2 * * * /usr/local/bin/backup-medicaware-db.sh
```

### نسخ احتياطي للملفات | Application Files Backup

```bash
# Manual backup
sudo tar -czf /var/backups/medicaware/app_backup_$(date +%Y%m%d).tar.gz /var/www/medicaware
```

---

## الخطوة 8 | Step 8: المراقبة والسجلات | Monitoring & Logs

### عرض السجلات | View Logs

```bash
# PM2 logs
pm2 logs medicaware-api

# Nginx logs
sudo tail -f /var/log/nginx/medicaware_access.log
sudo tail -f /var/log/nginx/medicaware_error.log

# PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

### إعداد المراقبة | Setup Monitoring

```bash
# Install PM2 monitoring (optional)
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

---

## الخطوة 9 | Step 9: التحديثات | Updates

### تحديث التطبيق | Update Application

```bash
cd /var/www/medicaware/backend

# Pull latest code
git pull origin main

# Install dependencies
npm install --production

# Run migrations
npx prisma migrate deploy
npx prisma generate

# Rebuild
npm run build

# Restart application
pm2 restart medicaware-api

# Check status
pm2 status
```

---

## الخطوة 10 | Step 10: التحقق من النشر | Verify Deployment

### فحص الصحة | Health Check

```bash
# Test health endpoint
curl https://your-domain.com/health

# Test API
curl https://your-domain.com/api/v1

# Check logs for errors
pm2 logs medicaware-api --lines 100
```

### اختبار API | Test API

```bash
# Login test
curl -X POST https://your-domain.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'
```

---

## استكشاف الأخطاء | Troubleshooting

### التطبيق لا يعمل | Application Not Running

```bash
# Check PM2 status
pm2 status

# View errors
pm2 logs medicaware-api --err

# Restart
pm2 restart medicaware-api
```

### خطأ في قاعدة البيانات | Database Connection Error

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
psql -U medicaware_user -d medicaware -h localhost

# Check DATABASE_URL in .env
cat /var/www/medicaware/backend/.env | grep DATABASE_URL
```

### خطأ Nginx | Nginx Error

```bash
# Check Nginx status
sudo systemctl status nginx

# Test configuration
sudo nginx -t

# View error log
sudo tail -f /var/log/nginx/medicaware_error.log
```

### مشاكل SSL | SSL Issues

```bash
# Test SSL certificate
sudo certbot certificates

# Renew manually
sudo certbot renew

# Check Nginx SSL configuration
sudo nginx -t
```

---

## الأمان | Security Checklist

- [ ] استخدام أسرار JWT قوية (64+ حرف)
- [ ] تفعيل HTTPS فقط
- [ ] تكوين جدار الحماية
- [ ] تحديث النظام بانتظام
- [ ] تغيير كلمات مرور قاعدة البيانات
- [ ] تفعيل النسخ الاحتياطي التلقائي
- [ ] تكوين حد المعدل (Rate Limiting)
- [ ] مراقبة السجلات
- [ ] تعطيل حسابات المستخدمين غير النشطة
- [ ] استخدام متغيرات بيئة آمنة

---

## الأوامر المفيدة | Useful Commands

```bash
# PM2 Commands
pm2 start medicaware-api    # Start application
pm2 stop medicaware-api     # Stop application
pm2 restart medicaware-api  # Restart application
pm2 reload medicaware-api   # Zero-downtime reload
pm2 delete medicaware-api   # Delete from PM2
pm2 logs medicaware-api     # View logs
pm2 monit                   # Monitor

# Nginx Commands
sudo systemctl start nginx   # Start Nginx
sudo systemctl stop nginx    # Stop Nginx
sudo systemctl restart nginx # Restart Nginx
sudo systemctl reload nginx  # Reload configuration
sudo nginx -t                # Test configuration

# PostgreSQL Commands
sudo systemctl start postgresql
sudo systemctl stop postgresql
sudo systemctl restart postgresql
sudo -u postgres psql        # Access PostgreSQL shell

# Database Operations
npm run migrate:deploy       # Run migrations
npm run migrate:reset        # Reset database (CAREFUL!)
npx prisma studio            # Open Prisma Studio
```

---

## الأداء | Performance Optimization

### تكوين PostgreSQL | PostgreSQL Configuration

Edit `/etc/postgresql/15/main/postgresql.conf`:

```conf
# Memory settings (adjust based on available RAM)
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
work_mem = 8MB

# Connection settings
max_connections = 100

# Query optimization
random_page_cost = 1.1  # For SSD
effective_io_concurrency = 200  # For SSD
```

Restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

### تكوين PM2 للأداء | PM2 Performance

Update `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'medicaware-api',
    script: './dist/index.js',
    instances: 'max',  // Use all CPU cores
    exec_mode: 'cluster',
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=2048'
  }]
};
```

---

## دعم | Support

للمساعدة في النشر، يرجى التواصل مع فريق الدعم الفني.

For deployment support, contact the technical support team.

---

**تاريخ آخر تحديث | Last Updated**: 2025-10-25
**الإصدار | Version**: 1.0.0
