# Tej IT Solutions - Client Billing & Management System

A comprehensive, production-ready billing and invoice management system built with Python Flask for Tej IT Solutions India Pvt. Ltd.

## 🌟 Features

### 👥 User Management
- **Multi-role authentication**: Super Admin, Client Manager, Auditor
- **JWT-based authentication** with session timeout
- **Role-based access control** (RBAC) for all modules
- **Comprehensive audit logging** for all user actions
- **Temporary admin delegation** functionality

### 🏢 Client Management
- **Complete client profiles** with GST support
- **Document management** with secure file storage
- **Manager assignment** and access control
- **Currency preferences** (USD/INR)
- **Payment terms** configuration

### 📄 Invoice Management
- **Professional invoice generation** with PDF export
- **Multi-currency support** (USD/INR) with frozen exchange rates
- **GST calculation** and customizable tax rates
- **Invoice workflow**: Draft → Approved → Finalized → Sent → Paid
- **Email delivery** with tracking
- **Line item management** with service catalog integration

### 🛠️ Service Catalog
- **Reusable service definitions** (AWS, Development, Support)
- **Flexible pricing models** (hourly, fixed, monthly)
- **Multi-currency rates** with automatic conversion

### 💰 Billing & Payments
- **Payment tracking** and reconciliation
- **Outstanding balance** management
- **Overdue invoice** monitoring
- **Payment history** and receipts

### 📊 Analytics & Reports
- **Revenue dashboards** with USD/INR breakdown
- **Client analytics** with billing history
- **Service usage reports**
- **Overdue invoice tracking**
- **Export capabilities** (Excel/CSV)

### 🔐 Security Features
- **AES256 encryption** for sensitive data
- **JWT authentication** with secure sessions
- **Role-based permissions** system
- **Comprehensive audit trails**
- **Secure file storage** with access controls

## 🏗️ Architecture

### Tech Stack
- **Backend**: Python 3.11, Flask, SQLAlchemy
- **Database**: MySQL 8.0
- **Frontend**: Bootstrap 5, jQuery, HTML5/CSS3
- **PDF Generation**: ReportLab
- **Authentication**: Flask-JWT-Extended
- **Caching**: Redis
- **Web Server**: Nginx + Gunicorn

### Project Structure
```
tej-billing/
├── app/
│   ├── models/           # Database models
│   ├── routes/           # Flask blueprints
│   ├── templates/        # Jinja2 templates
│   ├── static/           # CSS, JS, uploads
│   └── utils/            # Helper functions
├── config.py             # Configuration settings
├── database_setup.py     # Database initialization
├── requirements.txt      # Python dependencies
├── gunicorn_config.py    # Production server config
├── nginx.conf            # Nginx configuration
├── docker-compose.yml    # Docker setup
└── deploy.sh             # Deployment script
```

## 🚀 Installation

### Prerequisites
- Python 3.11+
- MySQL 8.0+
- Redis 6.0+
- Nginx (for production)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd tej-billing
   ```

2. **Create virtual environment**
   ```bash
   python3.11 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up MySQL database**
   ```sql
   CREATE DATABASE tej_billing_db;
   CREATE USER 'billing_user'@'localhost' IDENTIFIED BY 'your_password';
   GRANT ALL PRIVILEGES ON tej_billing_db.* TO 'billing_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

5. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your database and email settings
   ```

6. **Initialize database**
   ```bash
   python database_setup.py
   ```

7. **Run development server**
   ```bash
   python app.py
   ```

Visit `http://localhost:5000` and login with:
- **Admin**: admin / admin123
- **Manager**: manager1 / manager123
- **Auditor**: auditor1 / auditor123

### Production Deployment

#### Option 1: Automated Deployment Script
```bash
chmod +x deploy.sh
./deploy.sh production
```

#### Option 2: Docker Deployment
```bash
docker-compose up -d
```

#### Option 3: Manual Deployment
1. Follow development setup steps 1-6 on production server
2. Configure Gunicorn and Nginx
3. Set up systemd service
4. Configure SSL certificates
5. Set up log rotation and backups

## 📖 Usage Guide

### Admin Tasks
1. **User Management**: Create users and assign roles
2. **Exchange Rates**: Update USD/INR conversion rates
3. **System Settings**: Configure backups and system maintenance
4. **Credentials**: Manage infrastructure access (encrypted storage)

### Client Manager Workflow
1. **Add Clients**: Create client profiles with billing preferences
2. **Upload Documents**: Store contracts and agreements securely
3. **Create Services**: Define reusable service catalog
4. **Generate Invoices**: Create professional invoices with line items
5. **Send Invoices**: Email invoices directly to clients
6. **Track Payments**: Record payments and monitor overdue accounts

### Auditor Functions
- View all financial data (read-only)
- Access comprehensive audit trails
- Generate compliance reports
- Monitor system usage patterns

## 🔧 Configuration

### Environment Variables
```bash
# Database
DATABASE_URL=mysql+pymysql://user:pass@localhost/db_name

# Security
JWT_SECRET_KEY=your-super-secret-jwt-key
ENCRYPTION_KEY=your-32-character-encryption-key

# Email
MAIL_USERNAME=billing@tejitsolutions.com
MAIL_PASSWORD=your-email-password
MAIL_SERVER=smtp.gmail.com

# Application
FLASK_ENV=production
COMPANY_NAME=Tej IT Solutions India Pvt. Ltd.
```

### Key Features Configuration

#### Invoice Settings
- **GST Rate**: Default 18%, configurable per invoice
- **Payment Terms**: Default 30 days, customizable per client
- **Currency**: Support for USD and INR with automatic conversion
- **Templates**: Professional invoice templates with company branding

#### Security Settings
- **Session Timeout**: 8 hours for access tokens
- **Password Policy**: Minimum 8 characters (enhance as needed)
- **File Uploads**: 16MB limit, validated file types
- **Encryption**: AES256 for sensitive credential storage

## 📊 API Documentation

### Authentication
```http
POST /auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

### Invoice Management
```http
GET /invoices/                    # List all invoices
POST /invoices/create            # Create new invoice
GET /invoices/{id}               # View invoice
PUT /invoices/{id}/edit          # Update invoice
POST /invoices/{id}/send         # Send invoice via email
```

### Client Management
```http
GET /clients/                    # List all clients
POST /clients/create            # Create new client
GET /clients/{id}               # View client details
PUT /clients/{id}/edit          # Update client
```

## 🛡️ Security Considerations

### Data Protection
- **Encryption**: AES256 for sensitive fields (credentials, passwords)
- **Access Control**: Role-based permissions for all operations
- **Audit Logging**: Complete trail of all user actions
- **Session Management**: Secure JWT tokens with expiration

### Network Security
- **HTTPS**: SSL/TLS encryption for all communications
- **CORS**: Configured for secure cross-origin requests
- **Headers**: Security headers (HSTS, CSP, X-Frame-Options)
- **Rate Limiting**: Protection against brute force attacks

### File Security
- **Upload Validation**: Strict file type and size limits
- **Secure Storage**: Files stored outside web root
- **Access Control**: Role-based file access permissions

## 🔄 Backup & Maintenance

### Automated Backups
- **Database**: Daily MySQL dumps with compression
- **Files**: Tar archives of uploaded documents
- **Retention**: 30-day backup retention policy
- **Schedule**: 2 AM daily via cron

### Log Management
- **Application Logs**: Detailed logging with rotation
- **Access Logs**: Nginx access and error logs
- **Audit Logs**: Complete user action tracking
- **Monitoring**: Health checks and alerting

### Maintenance Tasks
```bash
# Check service status
sudo systemctl status tej-billing

# View logs
sudo journalctl -u tej-billing -f

# Manual backup
sudo /usr/local/bin/backup-tej-billing.sh

# Update exchange rates
python -c "from app.routes.admin import fetch_latest_exchange_rate"
```

## 🐛 Troubleshooting

### Common Issues

#### Database Connection Errors
```bash
# Check MySQL service
sudo systemctl status mysql

# Verify connection
mysql -u billing_user -p tej_billing_db

# Check configuration
grep DATABASE_URL /etc/environment
```

#### Permission Issues
```bash
# Fix file permissions
sudo chown -R www-data:www-data /var/www/tej-billing
sudo chmod -R 755 /var/www/tej-billing
sudo chmod -R 777 /var/www/tej-billing/app/static/uploads
```

#### Service Won't Start
```bash
# Check service logs
sudo journalctl -u tej-billing -n 50

# Restart service
sudo systemctl restart tej-billing

# Check Nginx configuration
sudo nginx -t
```

## 📞 Support

For technical support and feature requests:
- **Email**: support@tejitsolutions.com
- **Documentation**: Internal wiki (link to be provided)
- **Issue Tracking**: Internal ticketing system

## 📝 License

Proprietary software © 2024 Tej IT Solutions India Pvt. Ltd.
All rights reserved.

## 🚀 Version History

### v1.0.0 (Current)
- Initial production release
- Complete billing and invoice management
- Multi-user role system
- PDF generation and email delivery
- Comprehensive reporting suite

### Planned Features (v1.1.0)
- Multi-factor authentication (MFA)
- Advanced reporting dashboards
- API rate limiting
- Webhook integrations
- Mobile-responsive improvements

---

**Built with ❤️ by Tej IT Solutions India Pvt. Ltd.**