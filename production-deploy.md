# AWS Billing Management System - Production Deployment Guide

## 🚀 Production Deployment Steps

### 1. Environment Setup

#### Backend Production Environment
```bash
# Create production .env file
cp backend/.env.example backend/.env.prod

# Update with production values:
FLASK_ENV=production
SECRET_KEY=your-production-secret-key-here
DB_HOST=your-production-db-host
DB_PORT=3306
DB_NAME=aws_billing_system
DB_USER=your-production-db-user
DB_PASSWORD=your-production-db-password
REDIS_URL=redis://your-production-redis:6379/0
JWT_SECRET_KEY=your-production-jwt-secret
CORS_ORIGINS=https://yourdomain.com
```

#### Frontend Production Environment
```bash
# Create production .env file
cp frontend/.env.local frontend/.env.production

# Update with production values:
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
JWT_SECRET=your-production-jwt-secret
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### 2. Database Setup (Production)

#### Option A: AWS RDS MySQL
```bash
# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier aws-billing-prod \
  --db-instance-class db.t3.micro \
  --engine mysql \
  --master-username admin \
  --master-user-password your-secure-password \
  --allocated-storage 20 \
  --vpc-security-group-ids sg-xxxxxxxxx

# Import schema
mysql -h your-rds-endpoint -u admin -p aws_billing_system < backend/database/schema.sql
mysql -h your-rds-endpoint -u admin -p aws_billing_system < backend/database/seed_data.sql
```

#### Option B: Self-hosted MySQL
```bash
# Install MySQL 8.0
sudo apt update
sudo apt install mysql-server-8.0

# Secure installation
sudo mysql_secure_installation

# Create database and user
mysql -u root -p
CREATE DATABASE aws_billing_system;
CREATE USER 'aws_billing'@'%' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON aws_billing_system.* TO 'aws_billing'@'%';
FLUSH PRIVILEGES;

# Import schema
mysql -u aws_billing -p aws_billing_system < backend/database/schema.sql
mysql -u aws_billing -p aws_billing_system < backend/database/seed_data.sql
```

### 3. Backend Deployment

#### Option A: AWS EC2 with Gunicorn
```bash
# Install dependencies
sudo apt update
sudo apt install python3-pip python3-venv nginx

# Create virtual environment
python3 -m venv /opt/aws-billing/venv
source /opt/aws-billing/venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt
pip install gunicorn

# Create Gunicorn service
sudo tee /etc/systemd/system/aws-billing-backend.service > /dev/null <<EOF
[Unit]
Description=AWS Billing Backend
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/opt/aws-billing/backend
Environment=PATH=/opt/aws-billing/venv/bin
EnvironmentFile=/opt/aws-billing/backend/.env.prod
ExecStart=/opt/aws-billing/venv/bin/gunicorn --workers 3 --bind 0.0.0.0:5002 run:app
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Start service
sudo systemctl enable aws-billing-backend
sudo systemctl start aws-billing-backend
```

#### Option B: Docker Deployment
```bash
# Build backend image
docker build -t aws-billing-backend ./backend

# Run with Docker Compose
docker-compose -f docker-compose.prod.yml up -d
```

### 4. Frontend Deployment

#### Option A: Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd frontend
vercel --prod
```

#### Option B: AWS Amplify
```bash
# Connect GitHub repository to AWS Amplify
# Configure build settings:
# Build command: npm run build
# Output directory: .next
```

#### Option C: Self-hosted with Nginx
```bash
# Build frontend
cd frontend
npm run build

# Configure Nginx
sudo tee /etc/nginx/sites-available/aws-billing-frontend > /dev/null <<EOF
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
    
    location /api/ {
        proxy_pass http://localhost:5002/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/aws-billing-frontend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Start frontend with PM2
npm install -g pm2
pm2 start npm --name "aws-billing-frontend" -- start
pm2 save
pm2 startup
```

### 5. SSL/HTTPS Setup

#### Using Certbot (Let's Encrypt)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 6. Monitoring & Logging

#### Application Monitoring
```bash
# Install monitoring tools
pip install prometheus-flask-exporter
npm install @vercel/analytics

# Configure log rotation
sudo tee /etc/logrotate.d/aws-billing > /dev/null <<EOF
/opt/aws-billing/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
}
EOF
```

#### Health Checks
```bash
# Create health check script
tee /opt/aws-billing/health-check.sh > /dev/null <<EOF
#!/bin/bash
curl -f http://localhost:5002/api/health || exit 1
curl -f http://localhost:3002 || exit 1
EOF

chmod +x /opt/aws-billing/health-check.sh

# Add to crontab for monitoring
echo "*/5 * * * * /opt/aws-billing/health-check.sh" | crontab -
```

### 7. Backup Strategy

#### Database Backups
```bash
# Create backup script
tee /opt/aws-billing/backup-db.sh > /dev/null <<EOF
#!/bin/bash
DATE=\$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/aws-billing/backups"
mkdir -p \$BACKUP_DIR

mysqldump -h 202.71.157.170 -P 3308 -u admin -p'admin@9955' aws_billing_system > \$BACKUP_DIR/aws_billing_\$DATE.sql
gzip \$BACKUP_DIR/aws_billing_\$DATE.sql

# Keep only last 30 days
find \$BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
EOF

chmod +x /opt/aws-billing/backup-db.sh

# Schedule daily backups
echo "0 2 * * * /opt/aws-billing/backup-db.sh" | crontab -
```

### 8. Security Hardening

#### Firewall Configuration
```bash
# Configure UFW
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 5002  # Backend API
sudo ufw enable
```

#### Application Security
```bash
# Set secure file permissions
sudo chown -R www-data:www-data /opt/aws-billing
sudo chmod -R 755 /opt/aws-billing
sudo chmod 600 /opt/aws-billing/backend/.env.prod

# Configure fail2ban for SSH protection
sudo apt install fail2ban
```

### 9. Performance Optimization

#### Redis Caching
```bash
# Install Redis
sudo apt install redis-server

# Configure Redis
sudo tee -a /etc/redis/redis.conf > /dev/null <<EOF
maxmemory 256mb
maxmemory-policy allkeys-lru
EOF

sudo systemctl restart redis-server
```

#### Database Optimization
```sql
-- Add indexes for performance
CREATE INDEX idx_invoice_client_date ON invoices(client_id, invoice_date);
CREATE INDEX idx_line_items_invoice ON invoice_line_items(invoice_id);
CREATE INDEX idx_documents_entity ON documents(entity_type, entity_id);

-- Configure MySQL for production
SET GLOBAL innodb_buffer_pool_size = 1073741824;  -- 1GB
SET GLOBAL query_cache_size = 67108864;           -- 64MB
```

### 10. Deployment Verification

#### Production Health Check
```bash
# Run verification script
python3 verify-system.py

# Check all services
systemctl status aws-billing-backend
systemctl status nginx
systemctl status mysql
systemctl status redis-server

# Check logs
tail -f /var/log/nginx/access.log
tail -f /opt/aws-billing/logs/app.log
```

## 🔧 Production Configuration Files

### Docker Compose (Production)
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  backend:
    build: ./backend
    environment:
      - FLASK_ENV=production
    ports:
      - "5002:5002"
    depends_on:
      - redis
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports:
      - "3002:3002"
    depends_on:
      - backend
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend
    restart: unless-stopped
```

### Nginx Configuration
```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:5002;
    }
    
    upstream frontend {
        server frontend:3002;
    }
    
    server {
        listen 80;
        server_name yourdomain.com;
        return 301 https://$server_name$request_uri;
    }
    
    server {
        listen 443 ssl http2;
        server_name yourdomain.com;
        
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        
        location /api/ {
            proxy_pass http://backend/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

## 📊 Production Monitoring

### Application Metrics
- Response time monitoring
- Error rate tracking
- Database connection pool monitoring
- Redis cache hit rates
- File upload success rates

### Business Metrics
- Daily/Monthly revenue tracking
- Invoice generation rates
- Client onboarding metrics
- Usage import success rates
- User activity patterns

### Alerts Configuration
- Database connection failures
- High error rates (>5%)
- Disk space usage (>80%)
- Memory usage (>90%)
- Failed backup notifications

## 🔐 Security Checklist

- [ ] SSL/TLS certificates configured
- [ ] Database connections encrypted
- [ ] JWT secrets rotated
- [ ] File upload restrictions enforced
- [ ] Rate limiting implemented
- [ ] CORS properly configured
- [ ] Security headers added
- [ ] Regular security updates scheduled
- [ ] Backup encryption enabled
- [ ] Access logs monitored

## 📈 Scaling Considerations

### Horizontal Scaling
- Load balancer configuration
- Multiple backend instances
- Database read replicas
- Redis clustering
- CDN for static assets

### Vertical Scaling
- Increase server resources
- Database optimization
- Connection pool tuning
- Cache size optimization
- Background job workers

This production deployment guide ensures a secure, scalable, and maintainable AWS billing management system.