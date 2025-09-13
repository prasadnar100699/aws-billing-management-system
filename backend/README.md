# AWS Billing Management System - Node.js Backend

A comprehensive Node.js backend for AWS client billing and management, built with Express.js, Sequelize, and MySQL.

## 🚀 Features

### Core Modules
- **Session-based Authentication** - Secure login with express-session
- **Role-based Access Control** - Super Admin, Client Manager, Auditor roles
- **Client Management** - AWS account mapping, GST compliance
- **Invoice Management** - PDF generation, email delivery
- **Usage Import** - CSV processing, automated billing
- **Document Management** - File uploads, secure storage
- **Analytics Dashboard** - Business insights and reporting
- **Audit Logging** - Complete activity tracking

### Technology Stack
- **Express.js** - Web framework
- **Sequelize** - MySQL ORM
- **MySQL** - Database (existing schema)
- **express-session** - Session management
- **bcryptjs** - Password hashing
- **PDFKit** - PDF generation
- **Nodemailer** - Email delivery
- **Multer** - File uploads
- **node-cron** - Scheduled jobs

## 📋 Prerequisites

- **Node.js** (v18 or higher)
- **MySQL** (v8.0 or higher) - Already configured at 202.71.157.170:3308
- **npm** package manager

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Environment Configuration

The `.env` file is already configured for the live database:

```bash
# Database Configuration
DB_HOST=202.71.157.170
DB_PORT=3308
DB_NAME=aws_billing_system
DB_USER=admin
DB_PASSWORD=admin@9955

# Server Configuration
PORT=5002
NODE_ENV=development

# Session Configuration
SESSION_SECRET=your-super-secret-session-key-for-aws-billing-system-2024
```

### 3. Start the Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

### 4. Verify Installation

- **Health Check**: http://localhost:5002/api/health
- **API Root**: http://localhost:5002/

## 🏗️ Project Structure

```
backend/
├── src/
│   ├── app.js                    # Express app configuration
│   ├── server.js                 # HTTP server bootstrap
│   │
│   ├── config/                   # Configuration files
│   │   ├── db.js                 # Sequelize database connection
│   │   ├── session.js            # Session store configuration
│   │   └── env.js                # Environment variables
│   │
│   ├── routes/                   # Express routes
│   │   ├── auth.routes.js        # Authentication endpoints
│   │   ├── users.routes.js       # User management
│   │   ├── clients.routes.js     # Client management
│   │   ├── invoices.routes.js    # Invoice management
│   │   ├── analytics.routes.js   # Analytics dashboard
│   │   └── health.routes.js      # Health checks
│   │
│   ├── controllers/              # Route controllers
│   │   ├── auth.controller.js    # Authentication logic
│   │   ├── users.controller.js   # User management logic
│   │   ├── clients.controller.js # Client management logic
│   │   ├── invoices.controller.js# Invoice management logic
│   │   └── analytics.controller.js# Analytics logic
│   │
│   ├── models/                   # Sequelize models
│   │   ├── index.js              # Model definitions and associations
│   │   ├── User.js               # User model
│   │   ├── Client.js             # Client model
│   │   ├── Invoice.js            # Invoice model
│   │   └── ...                   # Other models
│   │
│   ├── middlewares/              # Express middlewares
│   │   ├── auth.middleware.js    # Authentication & authorization
│   │   └── error.middleware.js   # Error handling
│   │
│   ├── services/                 # Business logic services
│   │   ├── pdf.service.js        # PDF generation
│   │   ├── email.service.js      # Email delivery
│   │   ├── usage.service.js      # Usage import processing
│   │   └── audit.service.js      # Audit logging
│   │
│   ├── utils/                    # Utility functions
│   │   ├── password.js           # Password utilities
│   │   ├── file.js               # File handling
│   │   └── response.js           # API response helpers
│   │
│   └── jobs/                     # Scheduled jobs
│       ├── index.js              # Job scheduler
│       └── recurringInvoices.js  # Recurring invoice generation
│
├── uploads/                      # File uploads directory
├── .env                          # Environment variables
├── package.json                  # Dependencies and scripts
└── README.md                     # This file
```

## 🔐 Authentication & Authorization

### Session-based Authentication
- Uses `express-session` with MySQL session store
- Session cookies are automatically managed
- 24-hour session expiration with rolling renewal

### Role-based Access Control
- **Super Admin**: Full system access
- **Client Manager**: Assigned client management
- **Auditor**: Read-only access for reporting

### API Authentication
```javascript
// Login creates session
POST /auth/login
{
  "email": "admin@tejit.com",
  "password": "password"
}

// Session cookie is automatically sent with subsequent requests
GET /api/users (requires authentication)
```

## 📊 API Endpoints

### Authentication
- `POST /auth/login` - User login (creates session)
- `POST /auth/logout` - User logout (destroys session)
- `GET /auth/me` - Get current user info

### Users
- `GET /api/users` - List users (Super Admin only)
- `POST /api/users` - Create user (Super Admin only)
- `GET /api/users/:id` - Get user details
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Deactivate user

### Clients
- `GET /api/clients` - List clients
- `POST /api/clients` - Create client
- `GET /api/clients/:id` - Get client details
- `PUT /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete client
- `GET /api/clients/:id/aws` - Get AWS mappings

### Invoices
- `GET /api/invoices` - List invoices
- `POST /api/invoices` - Create invoice
- `GET /api/invoices/:id` - Get invoice details
- `PUT /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice
- `POST /api/invoices/:id/pdf` - Generate PDF
- `POST /api/invoices/:id/send` - Send via email

### Analytics
- `GET /api/analytics/super-admin` - Super Admin dashboard
- `GET /api/analytics/client-manager` - Client Manager dashboard
- `GET /api/analytics/auditor` - Auditor dashboard

## 🔧 Configuration

### Database Connection
The system connects to the existing MySQL database using Sequelize ORM:

```javascript
// Automatic connection to existing schema
Host: 202.71.157.170
Port: 3308
Database: aws_billing_system
User: admin
Password: admin@9955
```

### Session Management
Sessions are stored in MySQL using `express-mysql-session`:

```javascript
// Automatic session table creation
Table: sessions
Expiration: 24 hours
Rolling: true (resets on activity)
```

## 🎯 Key Features

### PDF Generation
- Professional invoice PDFs using PDFKit
- Company branding and formatting
- Automatic file storage and management

### Email Delivery
- Automated invoice delivery via Nodemailer
- HTML email templates
- PDF attachments

### Usage Import
- CSV file processing with fast-csv
- Automatic invoice generation from usage data
- Error handling and validation

### Scheduled Jobs
- Recurring invoice generation using node-cron
- Daily processing at 9:00 AM
- Automatic template-based billing

## 🔍 Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@tejit.com | password |
| Client Manager | manager@tejit.com | password |
| Auditor | auditor@tejit.com | password |

## 🚀 Development

### Start Development Server
```bash
npm run dev
```

### Run Tests
```bash
npm test
```

### Check Health
```bash
curl http://localhost:5002/api/health
```

## 📞 Support

For issues or questions:
- Check the logs for error messages
- Verify database connectivity
- Ensure all environment variables are set
- Contact: support@tejit.com

---

**Built with ❤️ for AWS Service Providers**
*Node.js Backend v1.0 - Tej IT Solutions*