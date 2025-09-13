# AWS Client Billing & Management System

A comprehensive billing and client management system specifically designed for AWS service providers, built with Next.js, Node.js, and MySQL.

## 🚀 Features

### Core Modules
- **Role-based User Management** - Super Admin, Client Manager, Auditor roles
- **AWS-specific Client Management** - Multi-account support, GST handling
- **Service Catalog** - AWS service alignment with multi-component pricing
- **Invoice Management** - Automated generation, PDF export, email notifications
- **AWS Usage Import** - CSV/API import with error handling and validation
- **Document Management** - File upload, association with clients/invoices
- **Analytics Dashboard** - Revenue trends, client insights, KPI tracking
- **Background Jobs** - Async PDF generation, email sending, data imports

### AWS Integration Features
- Multi-AWS account support per client
- Service categories aligned with AWS service groups
- AWS Cost and Usage Report (CUR) import capabilities
- Multi-component pricing (EC2 hours + EBS storage, etc.)
- AWS service code mapping for accurate billing

### Advanced Features
- **Multi-currency Support** - USD/INR with exchange rates
- **GST Calculations** - Automatic tax computation for Indian clients
- **Recurring Invoice Templates** - Automated monthly/quarterly billing
- **Professional PDF Invoices** - Branded invoice generation
- **Email Notifications** - Automated invoice delivery and reminders
- **Audit Trails** - Complete activity logging and tracking

## 🛠️ Tech Stack

### Frontend
- **Next.js 13+** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Modern UI component library
- **Recharts** - Data visualization and analytics
- **React Hook Form** - Form handling and validation

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **MySQL 8.x** - Relational database
- **Sequelize ORM** - Database object-relational mapping
- **JWT** - JSON Web Token authentication
- **BullMQ** - Redis-based job queue for background tasks

### Infrastructure
- **Redis** - Job queue and caching
- **AWS SDK** - AWS service integration
- **Docker** - Containerization (optional)
- **AWS S3** - Document storage (optional)

## 📋 Prerequisites

Before running the application, ensure you have:

- **Node.js** (v18 or higher)
- **MySQL** (v8.0 or higher)
- **Redis** (v6.0 or higher)
- **npm** or **yarn** package manager

## 🚀 Quick Start

### Option 1: Docker Compose (Recommended)

```bash
# Start the complete system with Docker
python start-system.py

# Or manually with docker-compose
docker-compose up --build -d
```

### Option 2: Development Mode

```bash
# Install backend dependencies
cd backend
pip install -r requirements.txt

# Install frontend dependencies
cd ../frontend
npm install

# Start both servers
cd ..
python start-system.py
```

### Access the Application

- **Frontend Application**: http://localhost:3002
- **Backend API**: http://localhost:5002/api
- **Default Credentials**:
  - Super Admin: `admin@tejit.com` / `password`
  - Client Manager: `manager@tejit.com` / `password`
  - Auditor: `auditor@tejit.com` / `password`

## 📁 Project Structure

```
aws-billing-system/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── auth/                 # Authentication endpoints
│   │   ├── clients/              # Client management APIs
│   │   ├── invoices/             # Invoice management APIs
│   │   └── users/                # User management APIs
│   ├── dashboard/                # Dashboard pages
│   ├── clients/                  # Client management pages
│   ├── invoices/                 # Invoice management pages
│   ├── users/                    # User management pages
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Login page
├── components/                   # React components
│   ├── ui/                       # shadcn/ui components
│   ├── layout/                   # Layout components
│   ├── forms/                    # Form components
│   └── charts/                   # Chart components
├── lib/                          # Utilities and configurations
│   ├── utils.ts                  # Utility functions
│   ├── db.ts                     # Database configuration
│   └── auth.ts                   # Authentication utilities
├── database/                     # Database files
│   ├── schema.sql                # Complete database schema
│   ├── migrations/               # Database migrations
│   └── seeds/                    # Sample data
├── jobs/                         # Background job processors
│   ├── pdf-generator.js          # PDF generation jobs
│   ├── email-sender.js           # Email notification jobs
│   └── usage-importer.js         # AWS usage import jobs
├── uploads/                      # File uploads directory
├── docs/                         # Documentation
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

### Session Management
- JWT-based authentication
- 24-hour token expiration
- Secure password hashing
- Role-based route protection

## 💼 Core Workflows

### Client Onboarding
1. Create client with AWS account details
2. Configure GST settings and billing preferences
3. Map multiple AWS accounts if required
4. Set up recurring invoice templates

### Invoice Generation
1. **Manual Creation**: Select client, add services, calculate totals
2. **Usage Import**: Upload AWS CUR CSV, auto-generate line items
3. **Recurring**: Automated generation based on templates
4. **Approval Workflow**: Draft → Review → Approve → Send

### AWS Usage Import
1. Upload AWS Cost and Usage Report (CUR) CSV
2. Validate data format and AWS account mapping
3. Process records and map to service catalog
4. Generate draft invoices automatically
5. Handle errors and provide detailed logs

### Document Management
1. Upload supporting documents (usage reports, contracts)
2. Associate with clients or invoices
3. Secure access control based on user roles
4. Version tracking and audit trails

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
- **Aging Reports**: Outstanding invoice tracking

### Export Options
- CSV and Excel formats
- PDF reports with charts
- Scheduled report generation
- Email delivery of reports

## 🔧 Configuration Options

### Invoice Customization
- Company branding and logo
- Invoice number format configuration
- GST rate settings
- Payment terms and conditions
- Multi-language support (English/Hindi)

### AWS Integration Settings
- Service code mapping
- Pricing component configuration
- Currency conversion settings
- Usage aggregation rules

### Notification Preferences
- Email templates customization
- Notification frequency settings
- Alert thresholds configuration
- Automated reminder scheduling

## 🚀 Deployment Guide

### Production Deployment

#### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build individual containers
docker build -t aws-billing-frontend .
docker build -t aws-billing-backend ./backend
```

#### AWS Deployment
1. **Frontend**: Deploy to AWS Amplify or Vercel
2. **Backend**: Deploy to AWS ECS or EC2
3. **Database**: Use AWS RDS for MySQL
4. **Storage**: Use AWS S3 for document storage
5. **Cache**: Use AWS ElastiCache for Redis

#### Environment Variables (Production)
```bash
NODE_ENV=production
DATABASE_URL=your-production-db-url
REDIS_URL=your-production-redis-url
JWT_SECRET=your-production-jwt-secret
AWS_S3_BUCKET=your-production-s3-bucket
SMTP_HOST=your-production-smtp
```

### Security Considerations
- Enable HTTPS with SSL certificates
- Configure firewall rules for database access
- Set up regular automated backups
- Implement monitoring and alerting
- Use AWS IAM roles for service access
- Enable audit logging for compliance

### Performance Optimization
- Configure Redis caching for frequently accessed data
- Set up database indexing for large datasets
- Implement CDN for static assets
- Use connection pooling for database connections
- Enable compression for API responses

## 🔍 API Documentation

### Authentication Endpoints
```
POST /api/auth/login          # User login
POST /api/auth/logout         # User logout
GET  /api/auth/me             # Get current user
POST /api/auth/refresh        # Refresh JWT token
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
POST   /api/invoices/:id/pdf  # Generate PDF
POST   /api/invoices/:id/send # Send email
```

### Usage Import
```
POST   /api/usage/import      # Upload and import usage data
GET    /api/usage/imports     # List import history
GET    /api/usage/imports/:id # Get import details
POST   /api/usage/process     # Process pending imports
```

## 📈 Monitoring & Maintenance

### Health Checks
- Database connectivity monitoring
- Redis connection status
- Background job queue health
- API response time tracking
- Error rate monitoring

### Backup Strategy
- Daily automated database backups
- Document storage backups
- Configuration backup
- Recovery testing procedures

### Maintenance Tasks
- Database cleanup and optimization
- Log rotation and archival
- Security updates and patches
- Performance monitoring and tuning

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write comprehensive tests
- Document new features
- Follow established code patterns
- Update API documentation

## 📞 Support & Contact

For support, questions, or contributions:
- **Email**: support@tejit.com
- **Documentation**: [Internal Wiki]
- **Issues**: Create GitHub issues for bugs
- **Feature Requests**: Use GitHub discussions

## 📄 License

This project is proprietary software developed for Prasad Narkhede.
Unauthorized copying or distribution is prohibited.

---

**Built with ❤️ by Prasad Narkhede**
*AWS Client Billing & Management System v1.0*