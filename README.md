# AWS Client Billing & Management System

A comprehensive billing and client management system specifically designed for AWS service providers, built with Next.js and Node.js.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MySQL 8.0+ (pre-configured database available)

### Installation

1. **Install Backend Dependencies**
```bash
cd backend
npm install
```

2. **Install Frontend Dependencies**
```bash
cd frontend
npm install
```

3. **Start the System**

**Terminal 1: Backend**
```bash
cd backend
npm run dev
```

**Terminal 2: Frontend**
```bash
cd frontend
npm run dev
```

### Access the Application

- **Frontend**: http://localhost:3002
- **Backend API**: http://localhost:5002

### Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@tejit.com | password |
| Client Manager | manager@tejit.com | password |
| Auditor | auditor@tejit.com | password |

## 🛠️ Tech Stack

### Frontend
- **Next.js 15+** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Modern UI component library
- **Recharts** - Data visualization

### Backend
- **Express.js** - Node.js web framework
- **MySQL** - Database with mysql2 driver
- **Simple Authentication** - Session-based auth

## 📁 Project Structure

```
aws-billing-system/
├── backend/                      # Express.js backend
│   ├── src/
│   │   ├── controllers/          # Route controllers
│   │   ├── routes/               # API routes
│   │   ├── config/               # Database config
│   │   └── middlewares/          # Auth middleware
│   └── package.json
├── frontend/                     # Next.js frontend
│   ├── app/                      # Next.js App Router
│   ├── components/               # React components
│   ├── lib/                      # Utilities
│   └── package.json
└── README.md
```

## 🔐 Authentication

Simple session-based authentication with hardcoded credentials for demo purposes.

## 💼 Features

- **Role-based User Management** - Super Admin, Client Manager, Auditor roles
- **Client Management** - AWS account mapping, GST compliance
- **Invoice Management** - PDF generation, email delivery
- **Analytics Dashboard** - Business insights and reporting
- **Document Management** - File uploads and organization
- **Usage Import** - AWS usage data processing

## 🔧 Configuration

The system is pre-configured to work with the existing MySQL database at `202.71.157.170:3308`.

## 📞 Support

For support: support@tejit.com

---

**Built with ❤️ for AWS Service Providers**
*AWS Client Billing & Management System v2.0*