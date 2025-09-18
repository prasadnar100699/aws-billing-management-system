# AWS Client Billing & Management System

A comprehensive full-stack billing and client management system specifically designed for AWS service providers, built with Next.js, TypeScript, Node.js, Express.js, and MySQL.

## 🚀 Features

### Core Modules
- **Role-based User Management** - Super Admin, Client Manager, Auditor roles with granular permissions
- **AWS-specific Client Management** - Multi-account support, GST handling, billing preferences
- **Service Catalog Management** - AWS service alignment with multi-component pricing structures
- **Invoice Management** - Manual and automated generation, approval workflows, PDF export, email notifications
- **AWS Usage Import** - CSV/API import with error handling, validation, and automatic invoice generation
- **Document Management** - File upload, categorization, association with clients/invoices
- **Analytics & Reporting** - Revenue trends, client insights, KPI tracking, compliance reports
- **System Configuration** - Centralized settings management for all system parameters
- **Notifications System** - Real-time alerts, email notifications, system reminders
- **Security & Audit** - Complete activity logging, session management, access control

### AWS Integration Features
- Multi-AWS account support per client
- Service categories aligned with AWS service groups (Compute, Storage, Database, etc.)
- AWS Cost and Usage Report (CUR) import capabilities
- Multi-component pricing (EC2 hours + EBS storage, Lambda requests + duration, etc.)
- AWS service code mapping for accurate billing and cost allocation
- Automated invoice generation from usage data

### Advanced Features
- **Multi-currency Support** - USD/INR with automatic exchange rate handling
- **GST Calculations** - Automatic tax computation for Indian clients with compliance reporting
- **Recurring Invoice Templates** - Automated monthly/quarterly billing cycles
- **Professional PDF Invoices** - Branded invoice generation with company branding
- **Email Notifications** - Automated invoice delivery, payment reminders, system alerts
- **Comprehensive Audit Trails** - Complete activity logging and user action tracking
- **Session-based Authentication** - Secure session management without external dependencies

## 🛠️ Tech Stack

### Backend
- **Node.js** (v18+) - Runtime environment
- **Express.js** - Web framework with middleware support
- **MySQL** - Primary database for all application data
- **Session-based Authentication** - No external dependencies (Redis/JWT)
- **PDFKit** - Professional PDF invoice generation
- **Nodemailer** - Email delivery system
- **Multer** - File upload handling

### Frontend
- **Next.js 15+** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Modern UI component library
- **Recharts** - Data visualization and analytics
- **React Hook Form** - Form management and validation

### Database
- **MySQL 8.0+** - Relational database with full ACID compliance
- **Structured Schema** - Normalized tables with proper relationships
- **Stored Procedures** - Automated calculations and data integrity
- **Views** - Optimized reporting queries
- **Triggers** - Automatic invoice total calculations

## 📋 Prerequisites

Before running the application, ensure you have:

- **Node.js** (v18 or higher)
- **npm** or **yarn** package manager
- **MySQL** (v8.0 or higher)
- **Git** (for cloning the repository)

## 🔧 Environment Configuration

### Backend Environment (`.env`)

Create `backend/.env` file based on `backend/.env.example`:

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=aws_billing_system
DB_USER=root
DB_PASSWORD=your_mysql_password

# Server Configuration
PORT=5002
NODE_ENV=development

# CORS Configuration
CORS_ORIGINS=http://10.10.50.93:3002,http://10.10.50.93:3000

# Session Configuration
SESSION_SECRET=your-super-secret-session-key
SESSION_TIMEOUT_HOURS=8

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# File Upload Configuration
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=50MB
```

### Frontend Environment (`.env.local`)

Create `frontend/.env.local` file based on `frontend/.env.local.example`:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://10.10.50.93:5002
NEXT_PUBLIC_BACKEND_URL=http://10.10.50.93:5002

# Application Configuration
NEXT_PUBLIC_APP_URL=http://10.10.50.93:3002
NEXT_PUBLIC_APP_NAME=AWS Billing Management
NEXT_PUBLIC_COMPANY_NAME=Tej IT Solutions
```

## 🗄️ Database Setup

### 1. Create MySQL Database

```bash
# Login to MySQL
mysql -u root -p

# Create database and user (optional)
CREATE DATABASE aws_billing_system;
CREATE USER 'aws_billing_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON aws_billing_system.* TO 'aws_billing_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 2. Import Database Schema

```bash
# Import the complete schema with seed data
mysql -u root -p aws_billing_system < database/schema.sql
```

The schema includes:
- **Complete table structure** with proper relationships and constraints
- **Default Super Admin user** with credentials: `admin@100699` / `admin@100699`
- **Role definitions** and permissions for all user types
- **AWS service catalog** with pricing components
- **System settings** with default configurations
- **Database views** for optimized reporting
- **Triggers** for automatic calculations

## 🚀 Local Development Setup

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd aws-billing-management

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment Variables

```bash
# Backend configuration
cp backend/.env.example backend/.env
# Edit backend/.env with your database credentials

# Frontend configuration
cp frontend/.env.local.example frontend/.env.local
# Edit frontend/.env.local if needed
```

### 3. Start Development Servers

```bash
# Terminal 1: Start Backend Server
cd backend
npm install
npm run dev
# Backend will start on http://10.10.50.93:5002

# Terminal 2: Start Frontend Server
cd frontend
npm run dev
# Frontend will start on http://10.10.50.93:3002
```

### 4. Access the Application

- **Application**: http://10.10.50.93:3002
- **Backend API**: http://10.10.50.93:5002
- **Health Check**: http://10.10.50.93:5002/api/health

## 🔐 Default Authentication

The system comes with a pre-configured Super Admin user:

| Role | Username | Password | Description |
|------|----------|----------|-------------|
| Super Admin | admin@100699 | admin@100699 | Full system access and configuration |

**Important**: Change the default password immediately after first login in production environments.

## 📖 Usage Guide

### 1. Initial Login
1. Navigate to http://10.10.50.93:3002
2. Click "Super Administrator" quick access card or manually enter:
   - Username: `admin@100699`
   - Password: `admin@100699`
3. Access the Super Admin dashboard with full system control

### 2. User & Role Management
- **Super Admin** can create additional users and define custom roles
- Configure granular permissions for each module (view, create, edit, delete)
- Manage user sessions and force logout capabilities
- Role-based access control across all system modules

### 3. Client Management
- Add AWS clients with multiple account ID support
- Configure GST settings for Indian clients
- Set billing preferences (monthly, quarterly, custom)
- Manage client status and billing addresses

### 4. Service Catalog
- Define AWS services aligned with official AWS service groups
- Multi-component pricing (e.g., EC2 hours + EBS storage)
- Support for different metric types (HOUR, GB, REQUEST, FIXED)
- Currency support (USD/INR) with rate management

### 5. Invoice Management
- **Manual Invoice Creation** - Create invoices with custom line items
- **Automated Generation** - Generate invoices from AWS usage imports
- **Approval Workflow** - Draft → Pending → Approved → Sent → Paid
- **PDF Generation** - Professional branded invoices
- **Email Delivery** - Automated sending with tracking
- **GST Compliance** - Automatic tax calculations for registered clients

### 6. AWS Usage Import
- **CSV Import** - Upload AWS Cost and Usage Report (CUR) files
- **Data Validation** - Comprehensive error checking and reporting
- **Automatic Processing** - Background processing of large files
- **Invoice Generation** - Auto-create invoices from usage data
- **Error Handling** - Detailed logs and retry mechanisms

### 7. Document Management
- **File Upload** - Support for invoices, contracts, certificates, reports
- **Categorization** - Organize documents by type and entity association
- **Access Control** - Public/private document settings
- **Version Control** - Track document changes and uploads

### 8. Analytics & Reports
- **Role-specific Dashboards** - Tailored views for each user role
- **Revenue Analytics** - Trends, growth metrics, client performance
- **Service Usage Reports** - AWS service utilization and costs
- **GST Compliance Reports** - Tax collection and filing support
- **Export Capabilities** - CSV, PDF, Excel format support

### 9. System Configuration
- **Company Settings** - Branding, contact information, GST details
- **Invoice Settings** - Number formats, payment terms, currencies
- **Security Settings** - Session timeouts, login attempt limits
- **Email Settings** - SMTP configuration and notification preferences
- **AWS Settings** - Service mappings, import configurations

## 🔍 API Endpoints

### Authentication
- `POST /auth/login` - User login with session creation
- `POST /auth/logout` - User logout and session destruction
- `GET /auth/me` - Get current user information
- `GET /auth/active-sessions` - List active sessions (Super Admin)

### User Management
- `GET /api/users` - List users with pagination and filtering
- `POST /api/users` - Create new user (Super Admin only)
- `GET /api/users/:id` - Get user details
- `PUT /api/users/:id` - Update user information
- `DELETE /api/users/:id` - Delete user (Super Admin only)

### Client Management
- `GET /api/clients` - List clients with search and filtering
- `POST /api/clients` - Create new client
- `GET /api/clients/:id` - Get client details with AWS mappings
- `PUT /api/clients/:id` - Update client information
- `DELETE /api/clients/:id` - Delete client

### Invoice Management
- `GET /api/invoices` - List invoices with filtering
- `POST /api/invoices` - Create new invoice
- `GET /api/invoices/:id` - Get invoice details with line items
- `PUT /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete draft invoice

### Analytics & Reports
- `GET /api/analytics/super-admin` - Super Admin analytics
- `GET /api/analytics/client-manager` - Client Manager analytics
- `GET /api/analytics/auditor` - Auditor analytics
- `GET /api/reports/revenue` - Revenue reports
- `GET /api/reports/gst` - GST compliance reports

## 🔧 Development Commands

### Backend Commands
```bash
cd backend

# Development with auto-reload
npm run dev

# Production mode
npm start

# Database migration (if needed)
npm run db:migrate

# Database seeding
npm run db:seed

# Run tests
npm test
```

### Frontend Commands
```bash
cd frontend

# Development server
npm run dev

# Production build
npm run build

# Start production server
npm start

# Type checking
npm run type-check

# Linting
npm run lint
```

## 🐳 Docker Deployment

### Using Docker Compose

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild services
docker-compose up --build -d
```

### Manual Docker Build

```bash
# Build backend
cd backend
docker build -t aws-billing-backend .

# Build frontend
cd ../frontend
docker build -t aws-billing-frontend .
```

## 📊 Database Schema Overview

The system uses a comprehensive MySQL database with the following key tables:

### Core Tables
- **users** - User authentication and profile information
- **roles** - Role definitions with system/custom role support
- **role_permissions** - Granular module-level permissions
- **sessions** - Session management for authentication
- **clients** - AWS client information with multi-account support

### Business Logic Tables
- **service_categories** - AWS service groupings (Compute, Storage, etc.)
- **services** - Individual AWS services with codes and descriptions
- **pricing_components** - Multi-component pricing for each service
- **invoices** - Invoice headers with status tracking
- **invoice_line_items** - Detailed billing items with automatic calculations

### Import & Processing Tables
- **aws_usage_imports** - Usage import tracking and status
- **aws_usage_records** - Detailed AWS usage data from imports
- **documents** - File management with entity associations
- **notifications** - System alerts and user notifications

### System Tables
- **audit_logs** - Complete activity tracking
- **system_settings** - Centralized configuration management

## 🚨 Troubleshooting

### Common Issues

1. **Backend Won't Start**
   ```bash
   # Check if MySQL is running
   sudo systemctl status mysql
   
   # Check database connection
   mysql -u root -p -e "SHOW DATABASES;"
   
   # Verify environment variables
   cat backend/.env
   ```

2. **Database Connection Failed**
   ```bash
   # Test MySQL connection
   mysql -h localhost -P 3306 -u your_user -p
   
   # Check if database exists
   mysql -u root -p -e "USE aws_billing_system; SHOW TABLES;"
   ```

3. **Frontend API Errors**
   ```bash
   # Check if backend is running
   curl http://10.10.50.93:5002/api/health
   
   # Verify CORS settings in backend/.env
   echo $CORS_ORIGINS
   ```

4. **Session Issues**
   ```bash
   # Clear browser cookies and localStorage
   # Check session timeout settings in database
   mysql -u root -p aws_billing_system -e "SELECT * FROM system_settings WHERE setting_key LIKE 'session%';"
   ```

### Log Locations
- **Backend Logs**: Console output and `backend/logs/` directory
- **Frontend Logs**: Browser console and Next.js terminal output
- **Database Logs**: MySQL error logs (location varies by OS)
- **Application Logs**: Stored in `audit_logs` table

## 🔒 Security Considerations

### Production Deployment Checklist
- [ ] Change default Super Admin password
- [ ] Use environment variables for all secrets
- [ ] Enable HTTPS with SSL certificates
- [ ] Configure firewall rules for database access
- [ ] Set up regular automated database backups
- [ ] Implement monitoring and alerting
- [ ] Review and configure session timeout settings
- [ ] Enable audit logging for compliance

### Data Protection
- All sensitive data is properly validated and sanitized
- Role-based access control enforced at API level
- Complete audit trails for all user actions
- Secure file upload with type and size validation
- SQL injection protection through parameterized queries
- Session-based authentication with automatic expiration

## 🧪 Testing

### Backend Testing
```bash
cd backend
npm test

# Test specific modules
npm test -- --grep "auth"
npm test -- --grep "clients"
```

### Frontend Testing
```bash
cd frontend
npm run test

# Run tests in watch mode
npm run test:watch
```

### API Testing
```bash
# Health check
curl http://10.10.50.93:5002/api/health

# Test authentication
curl -X POST http://10.10.50.93:5002/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@100699","password":"admin@100699"}'
```

## 📈 Performance Optimization

### Database Optimization
- Proper indexing on frequently queried columns
- Database views for complex reporting queries
- Stored procedures for calculations
- Connection pooling for efficient resource usage

### Frontend Optimization
- Code splitting with Next.js App Router
- Image optimization with Next.js Image component
- Lazy loading for large data sets
- Client-side caching for frequently accessed data

### Backend Optimization
- Compression middleware for response optimization
- Request rate limiting and security headers
- Efficient database queries with proper joins
- File upload optimization with streaming

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes following the coding standards
4. Test your changes thoroughly
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Coding Standards
- **TypeScript** - Use strict typing throughout
- **ESLint** - Follow the configured linting rules
- **Prettier** - Maintain consistent code formatting
- **Comments** - Document complex business logic
- **Testing** - Write tests for new features

### Database Changes
- Always create migration scripts for schema changes
- Test migrations on sample data before applying to production
- Document any breaking changes in the migration notes
- Backup database before applying major changes

## 📞 Support & Contact

For support, questions, or contributions:
- **Email**: support@tejit.com
- **Issues**: Create GitHub issues for bugs and feature requests
- **Documentation**: Check the `/docs` folder for detailed guides
- **Wiki**: Visit the project wiki for additional resources

## 📄 License

This project is proprietary software developed for Tej IT Solutions.
Unauthorized copying, distribution, or modification is prohibited.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (Next.js)     │◄──►│   (Express.js)  │◄──►│   (MySQL)       │
│   Port: 3002    │    │   Port: 5002    │    │   Port: 3306    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         └──────────────►│   File Storage  │◄─────────────┘
                        │   (Local/Cloud) │
                        └─────────────────┘
```

### Key Components
- **Authentication Layer** - Session-based auth with role permissions
- **API Layer** - RESTful APIs with comprehensive error handling
- **Business Logic** - Service classes for core functionality
- **Data Layer** - MySQL with optimized queries and relationships
- **File Management** - Secure upload and storage system
- **Notification System** - Real-time alerts and email notifications

---

**Built with ❤️ by Tej IT Solutions**

*AWS Client Billing & Management System v2.0*

**Last Updated**: December 2024