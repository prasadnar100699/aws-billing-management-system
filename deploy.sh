#!/bin/bash

# Deployment script for Tej IT Solutions Billing System
# Usage: ./deploy.sh [environment]

set -e

ENVIRONMENT=${1:-production}
PROJECT_NAME="tej-billing"
DEPLOY_PATH="/var/www/${PROJECT_NAME}"
SERVICE_NAME="${PROJECT_NAME}.service"

echo "🚀 Deploying Tej IT Solutions Billing System to ${ENVIRONMENT}"

# Backup current deployment
if [ -d "$DEPLOY_PATH" ]; then
    echo "📦 Creating backup..."
    sudo cp -r "$DEPLOY_PATH" "/backup/${PROJECT_NAME}-$(date +%Y%m%d_%H%M%S)"
fi

# Update system packages
echo "🔄 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install required packages
echo "📦 Installing dependencies..."
sudo apt install -y python3.11 python3.11-venv python3-pip nginx mysql-server redis-server supervisor

# Create deployment directory
sudo mkdir -p "$DEPLOY_PATH"
sudo chown -R $USER:www-data "$DEPLOY_PATH"
sudo chmod -R 755 "$DEPLOY_PATH"

# Copy application files
echo "📁 Copying application files..."
rsync -av --exclude='.git' --exclude='__pycache__' --exclude='*.pyc' . "$DEPLOY_PATH/"

# Set up Python virtual environment
echo "🐍 Setting up Python environment..."
cd "$DEPLOY_PATH"
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Set up database
echo "🗄️ Setting up database..."
sudo mysql -e "CREATE DATABASE IF NOT EXISTS tej_billing_db;"
sudo mysql -e "CREATE USER IF NOT EXISTS 'billing_user'@'localhost' IDENTIFIED BY 'secure_password_here';"
sudo mysql -e "GRANT ALL PRIVILEGES ON tej_billing_db.* TO 'billing_user'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"

# Run database migrations
python database_setup.py

# Set up environment variables
echo "⚙️ Setting up environment..."
sudo tee /etc/environment > /dev/null << EOL
DATABASE_URL=mysql+pymysql://billing_user:secure_password_here@localhost/tej_billing_db
JWT_SECRET_KEY=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)
FLASK_ENV=${ENVIRONMENT}
EOL

# Set up systemd service
echo "🔧 Setting up systemd service..."
sudo tee "/etc/systemd/system/${SERVICE_NAME}" > /dev/null << EOL
[Unit]
Description=Tej IT Solutions Billing System
After=network.target mysql.service redis.service

[Service]
Type=exec
User=www-data
Group=www-data
WorkingDirectory=${DEPLOY_PATH}
Environment=PATH=${DEPLOY_PATH}/venv/bin
ExecStart=${DEPLOY_PATH}/venv/bin/gunicorn --config gunicorn_config.py app:app
ExecReload=/bin/kill -s HUP \$MAINPID
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOL

# Set up Nginx
echo "🌐 Configuring Nginx..."
sudo cp nginx.conf /etc/nginx/sites-available/${PROJECT_NAME}
sudo ln -sf /etc/nginx/sites-available/${PROJECT_NAME} /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Set up log directories
sudo mkdir -p /var/log/${PROJECT_NAME}
sudo chown -R www-data:www-data /var/log/${PROJECT_NAME}

# Set up file permissions
sudo chown -R www-data:www-data "$DEPLOY_PATH"
sudo chmod -R 755 "$DEPLOY_PATH"
sudo chmod -R 777 "$DEPLOY_PATH/app/static/uploads"

# Start services
echo "🚀 Starting services..."
sudo systemctl daemon-reload
sudo systemctl enable ${SERVICE_NAME}
sudo systemctl start ${SERVICE_NAME}
sudo systemctl enable nginx
sudo systemctl enable mysql
sudo systemctl enable redis-server

# Set up log rotation
sudo tee "/etc/logrotate.d/${PROJECT_NAME}" > /dev/null << EOL
/var/log/${PROJECT_NAME}/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        systemctl reload ${SERVICE_NAME}
    endscript
}
EOL

# Set up backup cron job
echo "⏰ Setting up backup cron job..."
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-${PROJECT_NAME}.sh") | crontab -

# Create backup script
sudo tee "/usr/local/bin/backup-${PROJECT_NAME}.sh" > /dev/null << EOL
#!/bin/bash
BACKUP_DIR="/backup/${PROJECT_NAME}/\$(date +%Y%m%d)"
mkdir -p "\$BACKUP_DIR"

# Database backup
mysqldump -u billing_user -p'secure_password_here' tej_billing_db > "\$BACKUP_DIR/database.sql"

# File backup
tar -czf "\$BACKUP_DIR/files.tar.gz" -C "${DEPLOY_PATH}" app/static/uploads

# Keep only last 30 days of backups
find /backup/${PROJECT_NAME} -type d -mtime +30 -exec rm -rf {} +

echo "Backup completed: \$BACKUP_DIR"
EOL

sudo chmod +x "/usr/local/bin/backup-${PROJECT_NAME}.sh"

# Check service status
echo "✅ Checking service status..."
sudo systemctl status ${SERVICE_NAME} --no-pager
sudo systemctl status nginx --no-pager

# Display deployment summary
echo ""
echo "🎉 Deployment completed successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📍 Application URL: http://$(hostname -I | awk '{print $1}')"
echo "📁 Deployment Path: ${DEPLOY_PATH}"
echo "🔐 Default Admin: admin / admin123"
echo "📊 Service Status: sudo systemctl status ${SERVICE_NAME}"
echo "📋 Logs: sudo journalctl -u ${SERVICE_NAME} -f"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔧 Next Steps:"
echo "1. Change default admin password"
echo "2. Configure SSL certificates"
echo "3. Update email settings in config.py"
echo "4. Test all functionality"
echo ""