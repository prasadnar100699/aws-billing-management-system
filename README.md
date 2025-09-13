# AWS Client Billing & Management System

A comprehensive billing and client management system specifically designed for AWS service providers, built with Next.js, Flask, and MySQL.

## 🚀 Features

### Core Modules
- **Role-based User Management** - Super Admin, Client Manager, Auditor roles
- **AWS-specific Client Management** - Multi-account support, GST handling
- **Service Catalog** - AWS service alignment with multi-component pricing
- **Invoice Management** - Automated generation, PDF export, email notifications
- **AWS Usage Import** - CSV/API import with error handling and validation
- **Document Management** - File upload, association with clients/invoices
- **Analytics Dashboard** - Revenue trends, client insights, KPI tracking

### AWS Integration Features
- Multi-AWS account support per client
- Service categories aligned with AWS service groups
- AWS Cost and Usage Report (CUR) import capabilities
- Multi-component pricing (EC2 hours + EBS storage, etc.)
- AWS service code mapping for accurate billing

### Advanced Features
- **Multi-currency Support** - USD/INR with exchange rates
- **GST Calculations** - Automatic tax computation for Indian clients
- **Professional PDF Invoices** - Branded invoice generation
- **Email Notifications** - Automated invoice delivery and reminders
- **Audit Trails** - Complete activity logging and tracking

## 🛠️ Tech Stack

### Frontend
- **Next.js 15+** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Modern UI component library
- **Recharts** - Data visualization and analytics
- **React Hook Form** - Form handling and validation

### Backend
- **Flask 2.3+** - Python web framework
- **SQLAlchemy** - Database ORM
- **MySQL 8.x** - Relational database
- **Flask-CORS** - Cross-origin resource sharing
- **WeasyPrint** - PDF generation
- **Pandas** - Data processing for usage imports

## 📋 Prerequisites

Before running the application, ensure you have:

- **Python 3.8+** - Backend runtime
- **Node.js 18+** - Frontend runtime
- **MySQL 8.0+** - Database server
- **npm or yarn** - Package manager

## 🚀 Quick Start

### Step 1: Clone and Setup

```bash
# Clone the repository
git clone <repository-url>
cd aws-billing-management

# Or if you have the files locally, navigate to the project directory
cd /path/to/aws-billing-management
```

### Step 2: Database Setup

The system is pre-configured to use a live MySQL database:

- **Host**: 202.71.157.170
- **Port**: 3308
- **Database**: aws_billing_system
- **Username**: admin
- **Password**: admin@9955

The database schema will be automatically created when you first run the backend.

### Step 3: Backend Setup

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
# The .env file is already configured for the live database
```

### Step 4: Frontend Setup

```bash
# Navigate to frontend directory (from project root)
cd frontend

# Install Node.js dependencies
npm install

# Create environment file
echo "NEXT_PUBLIC_API_URL=http://localhost:5002/api" > .env.local
```

### Step 5: Start the Application

#### Option 1: Manual Startup (Development)

**Terminal 1: Start Backend**
```bash
cd backend
python run.py
```

**Terminal 2: Start Frontend**
```bash
cd frontend
npm run dev
```

#### Option 2: Docker Compose

```bash
# Start all services
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Step 6: Access the Application

- **Frontend Application**: http://localhost:3002
- **Backend API**: http://localhost:5002/api
- **Health Check**: http://localhost:5002/api/health

## 👥 Default User Accounts

| Role | Email | Password | Permissions |
|------|-------|----------|-------------|
| Super Admin | admin@tejit.com | password | Full system access |
| Client Manager | manager@tejit.com | password | Client & invoice management |
| Auditor | auditor@tejit.com | password | Read-only access |

## 🏗️ Project Structure

```
aws-billing-system/
├── backend/                      # Flask backend
│   ├── app/                      # Application modules
│   │   ├── auth/                 # Authentication routes
│   │   ├── clients/              # Client management
│   │   ├── invoices/             # Invoice management
│   │   ├── services/             # Service catalog
│   │   ├── users/                # User management
│   │   ├── documents/            # Document management
│   │   ├── reports/              # Reports & analytics
│   │   ├── notifications/        # Notifications
│   │   ├── analytics/            # Analytics dashboard
│   │   ├── usage/                # Usage import
│   │   ├── health/               # Health checks
│   │   ├── models.py             # Database models
│   │   └── utils/                # Utilities
│   ├── config.py                 # Configuration
│   ├── run.py                    # Application entry point
│   └── requirements.txt          # Python dependencies
├── frontend/                     # Next.js frontend
│   ├── app/                      # Next.js App Router
│   │   ├── api/                  # API routes (proxy to backend)
│   │   ├── dashboard/            # Dashboard page
│   │   ├── clients/              # Client management pages
│   │   ├── invoices/             # Invoice management pages
│   │   ├── users/                # User management pages
│   │   ├── services/             # Service catalog pages
│   │   ├── documents/            # Document management pages
│   │   ├── reports/              # Reports and analytics pages
│   │   ├── notifications/        # Notifications page
│   │   ├── usage-import/         # Usage import pages
│   │   ├── roles/                # Role management pages
│   │   └── page.tsx              # Login page
│   ├── components/               # React components
│   │   ├── ui/                   # shadcn/ui components
│   │   ├── layout/               # Layout components
│   │   └── auth/                 # Authentication components
│   ├── lib/                      # Utilities and configurations
│   └── package.json              # Node.js dependencies
├── database/                     # Database files
│   └── schema.sql                # Database schema
├── docker-compose.yml            # Docker orchestration
└── README.md                     # This file
```

## 🔐 Authentication & Authorization

### Role-based Access Control

The system implements a comprehensive role-based access control (RBAC) system:

#### Super Admin
- Full system access
- User and role management
- System configuration
- All client and invoice operations

#### Client Manager
- Assigned client management
- Invoice generation and management
- Usage data import
- Limited reporting access

#### Auditor
- Read-only access to all data
- Advanced reporting capabilities
- Dashboard analytics access
- No modification permissions

## 💼 Core Workflows

### Client Onboarding
1. Create client with AWS account details
2. Configure GST settings and billing preferences
3. Map multiple AWS accounts if required
4. Set up recurring invoice templates

### Invoice Generation
1. **Manual Creation**: Select client, add services, calculate totals
2. **Usage Import**: Upload AWS CUR CSV, auto-generate line items
3. **Approval Workflow**: Draft → Review → Approve → Send

### Document Management
1. Upload supporting documents (usage reports, contracts)
2. Associate with clients or invoices
3. Secure access control based on user roles
4. Version tracking and audit trails

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

## 🚀 Deployment

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

## 📞 Support

For support, questions, or contributions:
- **Email**: support@tejit.com
- **Documentation**: Check the docs/ directory
- **Issues**: Create GitHub issues for bugs

## 📄 License

This project is proprietary software developed for AWS service providers.
Unauthorized copying or distribution is prohibited.

---

**Built with ❤️ for AWS Service Providers**

*AWS Client Billing & Management System v2.0*
*Tej IT Solutions - Comprehensive AWS Billing Platform*