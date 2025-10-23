# دليل النشر | Deployment Guide
## Medical Warehouse Management System

---

## المتطلبات | Requirements

### الأجهزة | Hardware
- **CPU:** 4 cores or more
- **RAM:** 8 GB minimum (16 GB recommended)
- **Storage:** 100 GB SSD
- **Network:** 100 Mbps

### البرامج | Software
- **OS:** Ubuntu 22.04 LTS or CentOS 8+
- **Docker:** 24.0+
- **Docker Compose:** 2.20+
- **PostgreSQL:** 15+ (if not using Docker)
- **Node.js:** 18+ (if not using Docker)
- **Nginx:** 1.24+ (for reverse proxy)
- **SSL Certificate:** Let's Encrypt or commercial

---

## طرق النشر | Deployment Methods

### 1. النشر باستخدام Docker (موصى به)

#### الخطوة 1: تحضير الخادم

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

#### الخطوة 2: استنساخ المشروع

```bash
# Clone repository
git clone <repository-url> /opt/medical-warehouse
cd /opt/medical-warehouse

# Checkout production branch
git checkout main
```

#### الخطوة 3: إعداد المتغيرات البيئية

```bash
# Backend environment
cp backend/.env.example backend/.env
nano backend/.env
```

**تحديث القيم التالية:**
```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://postgres:SECURE_PASSWORD@postgres:5432/medical_warehouse

JWT_SECRET=GENERATE_STRONG_SECRET_HERE
JWT_REFRESH_SECRET=GENERATE_STRONG_SECRET_HERE

CORS_ORIGIN=https://warehouse.hospital.sa

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=notifications@hospital.sa
SMTP_PASSWORD=APP_PASSWORD_HERE
```

```bash
# Frontend environment
cp frontend/.env.example frontend/.env
nano frontend/.env
```

**تحديث القيم التالية:**
```env
VITE_API_URL=https://api.warehouse.hospital.sa/api/v1
```

#### الخطوة 4: تحديث Docker Compose للإنتاج

```bash
nano docker-compose.prod.yml
```

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: medical-warehouse-db
    restart: always
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: medical_warehouse
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    networks:
      - medical-warehouse-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
      target: production
    container_name: medical-warehouse-backend
    restart: always
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - medical-warehouse-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      target: production
    container_name: medical-warehouse-frontend
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - backend
    networks:
      - medical-warehouse-network

  redis:
    image: redis:7-alpine
    container_name: medical-warehouse-redis
    restart: always
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - medical-warehouse-network

volumes:
  postgres_data:
  redis_data:

networks:
  medical-warehouse-network:
    driver: bridge
```

#### الخطوة 5: النشر

```bash
# Build and start services
docker-compose -f docker-compose.prod.yml up -d --build

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Check status
docker-compose -f docker-compose.prod.yml ps
```

#### الخطوة 6: تطبيق Migrations وبذر البيانات

```bash
# Run migrations
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy

# Seed database (first time only)
docker-compose -f docker-compose.prod.yml exec backend npm run seed
```

---

### 2. إعداد Nginx كـ Reverse Proxy

#### تثبيت Nginx

```bash
sudo apt install nginx -y
```

#### إعداد SSL مع Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain SSL certificate
sudo certbot --nginx -d warehouse.hospital.sa -d api.warehouse.hospital.sa
```

#### إعداد Nginx Config

```bash
sudo nano /etc/nginx/sites-available/medical-warehouse
```

```nginx
# API Server
upstream backend {
    server localhost:3000;
}

# Frontend Server
upstream frontend {
    server localhost:80;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name warehouse.hospital.sa api.warehouse.hospital.sa;
    return 301 https://$server_name$request_uri;
}

# API Server (api.warehouse.hospital.sa)
server {
    listen 443 ssl http2;
    server_name api.warehouse.hospital.sa;

    ssl_certificate /etc/letsencrypt/live/api.warehouse.hospital.sa/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.warehouse.hospital.sa/privkey.pem;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logging
    access_log /var/log/nginx/api.access.log;
    error_log /var/log/nginx/api.error.log;

    # Proxy settings
    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}

# Frontend Server (warehouse.hospital.sa)
server {
    listen 443 ssl http2;
    server_name warehouse.hospital.sa;

    ssl_certificate /etc/letsencrypt/live/warehouse.hospital.sa/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/warehouse.hospital.sa/privkey.pem;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logging
    access_log /var/log/nginx/frontend.access.log;
    error_log /var/log/nginx/frontend.error.log;

    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/medical-warehouse /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

---

## النسخ الاحتياطي | Backup

### النسخ الاحتياطي التلقائي للقاعدة

```bash
# Create backup script
sudo nano /opt/medical-warehouse/scripts/backup.sh
```

```bash
#!/bin/bash

BACKUP_DIR="/opt/medical-warehouse/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_NAME="medical_warehouse"
DB_USER="postgres"
DB_CONTAINER="medical-warehouse-db"

# Create backup directory if not exists
mkdir -p $BACKUP_DIR

# Backup database
docker exec $DB_CONTAINER pg_dump -U $DB_USER $DB_NAME | gzip > "$BACKUP_DIR/backup_$TIMESTAMP.sql.gz"

# Delete backups older than 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

echo "Backup completed: backup_$TIMESTAMP.sql.gz"
```

```bash
# Make executable
chmod +x /opt/medical-warehouse/scripts/backup.sh

# Add to crontab (daily at 2 AM)
crontab -e
```

```cron
0 2 * * * /opt/medical-warehouse/scripts/backup.sh >> /var/log/medical-warehouse-backup.log 2>&1
```

### استعادة النسخة الاحتياطية

```bash
# List backups
ls -lh /opt/medical-warehouse/backups/

# Restore from backup
gunzip < /opt/medical-warehouse/backups/backup_20241023_020000.sql.gz | \
docker exec -i medical-warehouse-db psql -U postgres -d medical_warehouse
```

---

## المراقبة | Monitoring

### إعداد Health Checks

```bash
# Create monitoring script
sudo nano /opt/medical-warehouse/scripts/health-check.sh
```

```bash
#!/bin/bash

API_URL="https://api.warehouse.hospital.sa/health"
FRONTEND_URL="https://warehouse.hospital.sa"

# Check API
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $API_URL)
if [ $API_STATUS -eq 200 ]; then
    echo "API: OK"
else
    echo "API: FAIL (Status: $API_STATUS)"
    # Send alert
fi

# Check Frontend
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $FRONTEND_URL)
if [ $FRONTEND_STATUS -eq 200 ]; then
    echo "Frontend: OK"
else
    echo "Frontend: FAIL (Status: $FRONTEND_STATUS)"
    # Send alert
fi
```

---

## الصيانة | Maintenance

### تحديث النظام

```bash
cd /opt/medical-warehouse

# Pull latest changes
git pull origin main

# Rebuild and restart services
docker-compose -f docker-compose.prod.yml up -d --build

# Run new migrations
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy

# Check logs
docker-compose -f docker-compose.prod.yml logs -f
```

### تنظيف Docker

```bash
# Remove unused images
docker image prune -a -f

# Remove unused volumes
docker volume prune -f

# Check disk usage
docker system df
```

---

## الأمان | Security

### Firewall Setup

```bash
# Install UFW
sudo apt install ufw -y

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### Security Updates

```bash
# Enable automatic security updates
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## استكشاف الأخطاء | Troubleshooting

### عرض السجلات

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f backend

# Nginx logs
sudo tail -f /var/log/nginx/error.log
```

### إعادة تشغيل الخدمات

```bash
# Restart all
docker-compose -f docker-compose.prod.yml restart

# Restart specific service
docker-compose -f docker-compose.prod.yml restart backend
```

### فحص الاتصال بقاعدة البيانات

```bash
docker-compose -f docker-compose.prod.yml exec backend npx prisma db pull
```

---

## الأداء | Performance

### تحسين PostgreSQL

```bash
# Edit PostgreSQL config
docker-compose -f docker-compose.prod.yml exec postgres bash

# Inside container
nano /var/lib/postgresql/data/postgresql.conf
```

**Recommended settings for 8GB RAM:**
```
shared_buffers = 2GB
effective_cache_size = 6GB
maintenance_work_mem = 512MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 10MB
min_wal_size = 1GB
max_wal_size = 4GB
```

---

**Version:** 1.0.0
**Last Updated:** 2025-10-23
