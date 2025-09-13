# AWS Billing Management System - Node.js Backend

A comprehensive Node.js backend for AWS client billing and management, built with Express.js and MySQL.

## 🚀 Features

### Core Modules
- **Simple Authentication** - Plain-text login with hardcoded credentials
- **Role-based Access Control** - Super Admin, Client Manager, Auditor roles
- **Client Management** - AWS account mapping, GST compliance
- **Invoice Management** - PDF generation, email delivery
- **Analytics Dashboard** - Business insights and reporting

### Technology Stack
- **Express.js** - Web framework
- **MySQL** - Database with mysql2 driver
- **PDFKit** - PDF generation
- **Nodemailer** - Email delivery
- **Multer** - File uploads

## 📋 Prerequisites

- **Node.js** (v18 or higher)
- **MySQL** (v8.0 or higher) - Already configured at 10.10.50.93:3308
- **npm** package manager

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Environment Configuration

The `.env` file is already configured for the database:

```bash
# Database Configuration
DB_HOST=10.10.50.93
DB_PORT=3308
DB_NAME=aws_billing_system
DB_USER=admin
DB_PASSWORD=admin@9955

# Server Configuration
PORT=5002
NODE_ENV=development
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

## 🔐 Authentication

### Hardcoded Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@tejit.com | Admin@123 |
| Client Manager | manager@tejit.com | Manager@123 |
| Auditor | auditor@tejit.com | Auditor@123 |

### API Authentication
```javascript
// Login creates session
POST /auth/login
{
  "email": "admin@tejit.com",
  "password": "Admin@123"
}

// Use X-User-Email header for subsequent requests
GET /api/clients
Headers: { "X-User-Email": "admin@tejit.com" }
```

## 📊 API Endpoints

### Authentication
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `GET /auth/me` - Get current user info

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

### Analytics
- `GET /api/analytics/super-admin` - Super Admin dashboard
- `GET /api/analytics/client-manager` - Client Manager dashboard
- `GET /api/analytics/auditor` - Auditor dashboard

## 🔧 Configuration

### Database Connection
The system connects to the existing MySQL database:

```javascript
Host: 10.10.50.93
Port: 3308
Database: aws_billing_system
User: admin
Password: admin@9955
```

## 🚀 Development

### Start Development Server
```bash
npm run dev
```

### Check Health
```bash
curl http://localhost:5002/api/health
```

---

**Built with ❤️ for AWS Service Providers**
*Node.js Backend v1.0 - Tej IT Solutions*