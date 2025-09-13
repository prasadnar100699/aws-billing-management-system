# AWS Client Billing & Management System - Complete Project Guide

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Prerequisites](#prerequisites)
4. [Installation & Setup](#installation--setup)
5. [Database Configuration](#database-configuration)
6. [Running the Application](#running-the-application)
7. [User Roles & Permissions](#user-roles--permissions)
8. [Core Features](#core-features)
9. [API Documentation](#api-documentation)
10. [Frontend Structure](#frontend-structure)
11. [Backend Structure](#backend-structure)
12. [Deployment Guide](#deployment-guide)
13. [Troubleshooting](#troubleshooting)
14. [Contributing](#contributing)

## 🎯 Project Overview

The AWS Client Billing & Management System is a comprehensive full-stack application designed specifically for AWS service providers to manage their clients, track usage, generate invoices, and handle billing operations with GST compliance for Indian markets.

### Key Features
- **Multi-role User Management** - Super Admin, Client Manager, Auditor roles
- **AWS-specific Client Management** - Multi-account support, GST handling
- **Service Catalog** - AWS service alignment with multi-component pricing
- **Invoice Management** - Automated generation, PDF export, email notifications
- **AWS Usage Import** - CSV/API import with error handling and validation
- **Document Management** - File upload, association with clients/invoices
- **Analytics Dashboard** - Revenue trends, client insights, KPI tracking
- **Reports & Analytics** - Comprehensive business insights

### Technology Stack

#### Frontend
- **Next.js 15+** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Modern UI component library
- **Recharts** - Data visualization and analytics
- **React Hook Form** - Form handling and validation

#### Backend
- **Flask 2.3+** - Python web framework
- **SQLAlchemy** - Database ORM
- **MySQL 8.x** - Relational database
- **Flask-CORS** - Cross-origin resource sharing
- **WeasyPrint** - PDF generation
- **Pandas** - Data processing for usage imports

## 🏗️ System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │    Database     │
│   (Next.js)     │◄──►│   (Flask)       │◄──►│    (MySQL)      │
│   Port: 3002    │    │   Port: 5002    │    │   Port: 3308    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Authentication Flow
The system uses a simplified session-based authentication without JWT tokens:
1. User submits credentials
2. Backend validates against database
3. Frontend stores user data in localStorage
4. Subsequent requests include user email in headers
5. Backend validates user permissions for each request

## 📋 Prerequisites

Before starting, ensure you have:

- **Python 3.8+** - Backend runtime
- **Node.js 18+** - Frontend runtime
- **MySQL 8.0+** - Database server
- **npm or yarn** - Package manager
- **Git** - Version control (optional)

## 🚀 Installation & Setup

### Step 1: Clone the Repository

```bash
# Clone the repository
git clone <repository-url>
cd aws-billing-management

# Or if you have the files locally, navigate to the project directory
cd /path/to/aws-billing-management
```

### Step 2: Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env

# Update .env with your configuration
# DB_HOST=202.71.157.170
# DB_PORT=3308
# DB_NAME=aws_billing_system
# DB_USER=admin
# DB_PASSWORD=admin@9955
```

### Step 3: Frontend Setup

```bash
# Navigate to frontend directory (from project root)
cd frontend

# Install Node.js dependencies
npm install

# Create environment file
echo "NEXT_PUBLIC_API_URL=http://localhost:5002/api" > .env.local
```

## 🗄️ Database Configuration

The system is pre-configured to use a live MySQL database:

- **Host**: 202.71.157.170
- **Port**: 3308
- **Database**: aws_billing_system
- **Username**: admin
- **Password**: admin@9955

### Database Schema

The database includes the following main tables:
- `roles` - System roles (Super Admin, Client Manager, Auditor)
- `users` - User accounts with role assignments
- `clients` - Client information with AWS account mappings
- `services` - AWS service catalog
- `pricing_components` - Multi-component pricing for services
- `invoices` - Invoice management with GST support
- `invoice_line_items` - Detailed invoice line items
- `documents` - Document management system
- `notifications` - System notifications

### Initial Data

The system comes with pre-seeded data:
- 3 default roles with permissions
- 3 demo user accounts
- AWS service categories and sample services
- Sample pricing components

## 🏃‍♂️ Running the Application

### Option 1: Manual Startup (Development)

#### Terminal 1: Start Backend
```bash
cd backend
python run.py
```

#### Terminal 2: Start Frontend
```bash
cd frontend
npm run dev
```

### Option 2: Docker Compose (Recommended)

```bash
# Start all services
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Option 3: Automated Startup Script

```bash
# Make script executable
chmod +x start-system.py

# Run the startup script
python start-system.py
```

### Access URLs

- **Frontend Application**: http://localhost:3002
- **Backend API**: http://localhost:5002/api
- **Health Check**: http://localhost:5002/api/health

## 👥 User Roles & Permissions

### Default User Accounts

| Role | Email | Password | Permissions |
|------|-------|----------|-------------|
| Super Admin | admin@tejit.com | password | Full system access |
| Client Manager | manager@tejit.com | password | Client & invoice management |
| Auditor | auditor@tejit.com | password | Read-only access |

### Role-Based Access Control

#### Super Admin
- Full system access
- User and role management
- System configuration
- All client and invoice operations
- Service catalog management

#### Client Manager
- Assigned client management
- Invoice generation and management
- Usage data import
- Document management
- Limited reporting access

#### Auditor
- Read-only access to all data
- Advanced reporting capabilities
- Dashboard analytics access
- No modification permissions

## 🎯 Core Features

### 1. Client Management
- AWS account mapping and multi-account support
- GST compliance for Indian clients
- Client-manager assignments
- Billing preferences and currency support

### 2. Invoice Management
- Auto-generated invoice numbers (TejIT-{clientID}-{YYYYMM}-{sequence})
- Multi-currency support (USD/INR)
- GST calculation and compliance
- PDF generation with branded templates
- Email delivery capabilities

### 3. AWS Usage Import
- CSV import from AWS Cost and Usage Reports (CUR)
- Automatic invoice generation from usage data
- Error handling and retry mechanisms
- Support for multiple AWS accounts per client

### 4. Service Catalog
- AWS-aligned service categories
- Multi-component pricing (e.g., EC2 hours + EBS storage)
- Flexible pricing models
- Service code mapping for accurate billing

### 5. Document Management
- Secure file upload and storage
- Document categorization and associations
- Access control based on user roles
- Support for various file types

### 6. Reports & Analytics
- Revenue trend analysis
- Client performance metrics
- Service usage analytics
- GST compliance reports
- Export capabilities (CSV, Excel, PDF)

## 🔌 API Documentation

### Authentication Endpoints
```
POST /api/auth/login          # User login
POST /api/auth/logout         # User logout
GET  /api/auth/me             # Get current user
```

### Client Management
```
GET    /api/clients           # List all clients
POST   /api/clients           # Create new client
GET    /api/clients/:id       # Get client details
PUT    /api/clients/:id       # Update client
DELETE /api/clients/:id       # Delete client
GET    /api/clients/:id/aws   # Get AWS account mappings
```

### Invoice Management
```
GET    /api/invoices          # List invoices
POST   /api/invoices          # Create invoice
GET    /api/invoices/:id      # Get invoice details
PUT    /api/invoices/:id      # Update invoice
DELETE /api/invoices/:id      # Delete invoice
```

### User Management
```
GET    /api/users             # List users (Super Admin only)
POST   /api/users             # Create user (Super Admin only)
GET    /api/users/:id         # Get user details
PUT    /api/users/:id         # Update user
DELETE /api/users/:id         # Delete user
```

### Analytics
```
GET    /api/analytics/super-admin      # Super Admin dashboard data
GET    /api/analytics/client-manager   # Client Manager dashboard data
GET    /api/analytics/auditor          # Auditor dashboard data
```

## 📁 Frontend Structure

```
frontend/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes (proxy to backend)
│   │   ├── auth/                 # Authentication endpoints
│   │   ├── clients/              # Client management APIs
│   │   └── users/                # User management APIs
│   ├── dashboard/                # Dashboard page
│   ├── clients/                  # Client management pages
│   ├── invoices/                 # Invoice management pages
│   ├── users/                    # User management pages
│   ├── services/                 # Service catalog pages
│   ├── documents/                # Document management pages
│   ├── reports/                  # Reports and analytics pages
│   ├── notifications/            # Notifications page
│   ├── usage-import/             # Usage import pages
│   ├── roles/                    # Role management pages
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Login page
├── components/                   # React components
│   ├── ui/                       # shadcn/ui components
│   ├── layout/                   # Layout components (Sidebar, Header)
│   └── auth/                     # Authentication components
├── lib/                          # Utilities and configurations
│   ├── utils.ts                  # Utility functions
│   ├── api.ts                    # API client configuration
│   └── hooks/                    # Custom React hooks
├── hooks/                        # Additional hooks
└── middleware.ts                 # Next.js middleware for route protection
```

## 🏗️ Backend Structure

```
backend/
├── app/                          # Flask application
│   ├── __init__.py               # App factory and configuration
│   ├── models.py                 # SQLAlchemy models
│   ├── auth/                     # Authentication routes
│   ├── users/                    # User management routes
│   ├── clients/                  # Client management routes
│   ├── services/                 # Service catalog routes
│   ├── invoices/                 # Invoice management routes
│   ├── usage/                    # Usage import routes
│   ├── documents/                # Document management routes
│   ├── reports/                  # Reports and analytics routes
│   ├── notifications/            # Notifications routes
│   ├── analytics/                # Analytics dashboard routes
│   ├── health/                   # Health check routes
│   └── utils/                    # Utility functions
│       ├── auth.py               # Authentication utilities
│       ├── audit.py              # Audit logging
│       └── validation.py         # Input validation
├── database/                     # Database files
│   └── init_db.py                # Database initialization script
├── scripts/                      # Utility scripts
│   ├── setup.py                  # Setup script
│   ├── backup_db.sh              # Database backup
│   └── restore_db.sh             # Database restore
├── config.py                     # Application configuration
├── run.py                        # Application entry point
└── requirements.txt              # Python dependencies
```

## 🚀 Deployment Guide

### Development Deployment

1. **Local Development**
   ```bash
   # Start backend
   cd backend && python run.py
   
   # Start frontend (new terminal)
   cd frontend && npm run dev
   ```

2. **Docker Development**
   ```bash
   docker-compose up --build
   ```

### Production Deployment

#### Option 1: Cloud Deployment (AWS/GCP/Azure)

1. **Database Setup**
   - Use managed MySQL service (AWS RDS, Google Cloud SQL, etc.)
   - Import schema using provided SQL files
   - Configure connection strings

2. **Backend Deployment**
   - Deploy to container service (AWS ECS, Google Cloud Run, etc.)
   - Set environment variables for production
   - Configure auto-scaling and health checks

3. **Frontend Deployment**
   - Deploy to Vercel, Netlify, or similar platform
   - Configure environment variables
   - Set up custom domain and SSL

#### Option 2: Self-Hosted Deployment

1. **Server Setup**
   ```bash
   # Install dependencies
   sudo apt update
   sudo apt install python3-pip python3-venv nginx mysql-server nodejs npm
   
   # Setup application
   git clone <repository>
   cd aws-billing-management
   
   # Backend setup
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   
   # Frontend setup
   cd ../frontend
   npm install
   npm run build
   ```

2. **Configure Services**
   ```bash
   # Configure Nginx
   sudo cp nginx.conf /etc/nginx/sites-available/aws-billing
   sudo ln -s /etc/nginx/sites-available/aws-billing /etc/nginx/sites-enabled/
   
   # Configure systemd services
   sudo cp aws-billing-backend.service /etc/systemd/system/
   sudo cp aws-billing-frontend.service /etc/systemd/system/
   
   # Start services
   sudo systemctl enable aws-billing-backend aws-billing-frontend nginx
   sudo systemctl start aws-billing-backend aws-billing-frontend nginx
   ```

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```bash
# Database Configuration
DB_HOST=202.71.157.170
DB_PORT=3308
DB_NAME=aws_billing_system
DB_USER=admin
DB_PASSWORD=admin@9955

# Application Configuration
SECRET_KEY=your-secret-key-here
FLASK_ENV=development
CORS_ORIGINS=http://localhost:3002

# Upload Configuration
UPLOAD_DIR=./uploads
MAX_CONTENT_LENGTH=16777216  # 16MB

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# AWS Configuration (Optional)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
```

#### Frontend (.env.local)
```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:5002/api

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3002
```

## 💼 Core Workflows

### Client Onboarding
1. **Create Client Profile**
   - Navigate to Clients → Add Client
   - Enter client details (name, contact, email)
   - Configure AWS account IDs
   - Set GST registration status
   - Define billing preferences

2. **AWS Account Mapping**
   - Map multiple AWS accounts to single client
   - Configure billing tags for cost allocation
   - Set primary account for billing

3. **Service Configuration**
   - Review available AWS services
   - Configure custom pricing if needed
   - Set up recurring invoice templates

### Invoice Generation

#### Manual Invoice Creation
1. Navigate to Invoices → Create Invoice
2. Select client and billing period
3. Add service line items
4. Configure GST settings
5. Review and approve
6. Generate PDF and send

#### Usage-Based Invoice Generation
1. Navigate to Usage Import → New Import
2. Upload AWS Cost and Usage Report (CSV)
3. Map usage data to services
4. Review generated line items
5. Create draft invoice
6. Approve and send

### Document Management
1. **Upload Documents**
   - Navigate to Documents → Upload Document
   - Select file and document type
   - Associate with client or invoice
   - Set access permissions

2. **Document Organization**
   - Categorize by type (invoice, contract, usage report)
   - Associate with entities (client, invoice, import)
   - Control access based on user roles

## 📊 Analytics & Reporting

### Dashboard Metrics
- **Financial KPIs**: Revenue trends, monthly growth
- **Client Insights**: Top clients, service distribution
- **Operational Metrics**: Invoice status, import success rates
- **AWS Analytics**: Service usage patterns, account distribution

### Available Reports
- **Client Revenue Reports**: Monthly/quarterly breakdowns
- **Service Usage Analysis**: AWS service consumption patterns
- **GST Compliance Reports**: Tax calculation summaries
- **Invoice Status Reports**: Outstanding invoice tracking

### Export Options
- CSV format for data analysis
- Excel format with multiple sheets
- PDF format for presentations
- Scheduled report generation

## 🔍 Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check database connectivity
mysql -h 202.71.157.170 -P 3308 -u admin -p

# Verify database exists
SHOW DATABASES;
USE aws_billing_system;
SHOW TABLES;
```

#### Backend Not Starting
```bash
# Check Python version
python --version

# Verify dependencies
pip list

# Check for port conflicts
netstat -tulpn | grep :5002

# View backend logs
tail -f backend/logs/app.log
```

#### Frontend Build Issues
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check Node.js version
node --version
npm --version
```

#### Permission Errors
- Verify user role assignments in database
- Check role_module_access table for permissions
- Ensure user status is 'active'
- Clear browser localStorage and re-login

### Database Troubleshooting

#### Reset Database
```bash
# Connect to MySQL
mysql -h 202.71.157.170 -P 3308 -u admin -p

# Drop and recreate database
DROP DATABASE IF EXISTS aws_billing_system;
CREATE DATABASE aws_billing_system;

# Re-run migrations
cd backend
python database/init_db.py
```

#### Check Data Integrity
```sql
-- Verify roles exist
SELECT * FROM roles;

-- Check user accounts
SELECT u.username, u.email, r.role_name, u.status 
FROM users u 
JOIN roles r ON u.role_id = r.role_id;

-- Verify permissions
SELECT r.role_name, rma.module_name, rma.can_view, rma.can_create, rma.can_edit, rma.can_delete
FROM roles r
JOIN role_module_access rma ON r.role_id = rma.role_id
ORDER BY r.role_name, rma.module_name;
```

## 🧪 Testing

### Manual Testing Checklist

#### Authentication
- [ ] Login with valid credentials
- [ ] Login with invalid credentials (should fail)
- [ ] Access protected routes without authentication
- [ ] Logout functionality

#### Role-Based Access
- [ ] Super Admin can access all modules
- [ ] Client Manager has limited access
- [ ] Auditor has read-only access
- [ ] Unauthorized access is blocked

#### CRUD Operations
- [ ] Create new client (Client Manager+)
- [ ] Update client details
- [ ] Delete client (Super Admin only)
- [ ] View client list with proper filtering

#### Invoice Management
- [ ] Create manual invoice
- [ ] Import usage data and generate invoice
- [ ] Update invoice status
- [ ] Generate PDF invoice
- [ ] Send invoice via email

### API Testing

```bash
# Test health endpoint
curl http://localhost:5002/api/health

# Test authentication
curl -X POST http://localhost:5002/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@tejit.com","password":"password"}'

# Test protected endpoint
curl http://localhost:5002/auth/me \
  -H "X-User-Email: admin@tejit.com"
```

## 🔒 Security Considerations

### Authentication & Authorization
- Session-based authentication (simplified from JWT)
- Role-based access control (RBAC)
- Permission checking on all endpoints
- User status validation

### Data Protection
- Password hashing with bcrypt
- Input validation and sanitization
- SQL injection prevention via ORM
- File upload restrictions

### Production Security
- Use HTTPS in production
- Secure database connections
- Regular security updates
- Access logging and monitoring
- Backup encryption

## 📈 Performance Optimization

### Database Optimization
- Proper indexing on frequently queried columns
- Connection pooling
- Query optimization
- Regular maintenance

### Application Performance
- Efficient API design
- Pagination for large datasets
- Optimized frontend rendering
- Image and asset optimization

## 🤝 Contributing

### Development Guidelines
1. Follow TypeScript best practices
2. Write comprehensive tests
3. Document new features
4. Follow established code patterns
5. Update API documentation

### Code Style
- Use ESLint and Prettier for frontend
- Follow PEP 8 for Python backend
- Use meaningful variable names
- Add comments for complex logic

### Pull Request Process
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit pull request with description

## 📞 Support & Maintenance

### Regular Maintenance Tasks
- Database backup and cleanup
- Log rotation and archival
- Security updates and patches
- Performance monitoring and tuning
- User access review

### Backup Strategy
- Daily automated database backups
- Document storage backups
- Configuration backup
- Recovery testing procedures

### Monitoring
- Application health checks
- Database performance monitoring
- Error rate tracking
- User activity monitoring

## 🎉 Getting Started Quickly

### Quick Start (5 Minutes)

1. **Clone and Setup**
   ```bash
   git clone <repository>
   cd aws-billing-management
   ```

2. **Install Dependencies**
   ```bash
   # Backend
   cd backend && pip install -r requirements.txt
   
   # Frontend
   cd ../frontend && npm install
   ```

3. **Start Services**
   ```bash
   # Terminal 1: Backend
   cd backend && python run.py
   
   # Terminal 2: Frontend
   cd frontend && npm run dev
   ```

4. **Access Application**
   - Open http://localhost:3002
   - Login with: admin@tejit.com / password
   - Explore the dashboard and features

### Next Steps After Setup
1. **Explore the Dashboard** - Familiarize yourself with the analytics
2. **Create a Test Client** - Add a sample client with AWS accounts
3. **Generate an Invoice** - Create a manual invoice to test the flow
4. **Upload Documents** - Test the document management system
5. **Review Reports** - Check out the analytics and reporting features

## 🔄 System Updates

### Updating the Application
```bash
# Pull latest changes
git pull origin main

# Update backend dependencies
cd backend && pip install -r requirements.txt

# Update frontend dependencies
cd frontend && npm install

# Restart services
# (Use your preferred method from the running section)
```

### Database Migrations
```bash
# Run database migrations
cd backend
python database/migrate.py

# Or manually run SQL scripts
mysql -h 202.71.157.170 -P 3308 -u admin -p aws_billing_system < database/migration_xxx.sql
```

---

**Built with ❤️ for AWS Service Providers**

*AWS Client Billing & Management System v2.0*
*Tej IT Solutions - Comprehensive AWS Billing Platform*

For support: support@tejit.com
Documentation: This guide
Issues: Create GitHub issues for bugs
Feature Requests: Contact development team