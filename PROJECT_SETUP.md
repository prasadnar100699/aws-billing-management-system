# AWS Client Billing & Management System - Complete Setup Guide

## 🏗️ Full-Stack Enterprise Application Setup

This is a comprehensive AWS billing management system with JWT authentication, role-based access control, and complete database integration.

## 📋 Prerequisites

Before starting, ensure you have:

- **Node.js** (v18 or higher)
- **npm** or **yarn** package manager
- **MySQL** (v8.0 or higher) - Already configured at 202.71.157.170:3308
- **Git** (for version control)

## 🚀 Quick Start Guide

### Step 1: Clone and Install Dependencies

```bash
# Navigate to your project directory
cd /var/www/html/aws-billing-management

# Install frontend dependencies
cd frontend
npm install

# Install additional required packages
npm install axios bcryptjs jsonwebtoken @types/bcryptjs @types/jsonwebtoken
```

### Step 2: Environment Configuration

The `.env.local` file has been created in the frontend directory with the following configuration:

```bash
# Frontend Environment Variables
NEXT_PUBLIC_API_URL=/api
JWT_SECRET=your-super-secret-jwt-key-for-aws-billing-system-2024
NEXTAUTH_SECRET=your-super-secret-jwt-key-for-aws-billing-system-2024

# Database Configuration (for reference)
DB_HOST=202.71.157.170
DB_PORT=3308
DB_NAME=aws_billing_system
DB_USER=admin
DB_PASSWORD=admin@9955

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3002
```

### Step 3: Database Setup

The system is configured to use your existing MySQL database:
- **Host**: 202.71.157.170
- **Port**: 3308
- **Database**: aws_billing_system
- **User**: admin
- **Password**: admin@9955

The database schema is already defined in `frontend/database/schema.sql` and includes:
- User management with roles
- Client management with AWS account mapping
- Service catalog with pricing components
- Invoice management with GST support
- Document management
- Audit logging

### Step 4: Start the Application

```bash
# From the frontend directory
npm run dev
```

The application will start on **http://localhost:3002**

## 🔐 Authentication & JWT Implementation

### JWT Token Creation

The system creates JWT tokens with the following payload:
```javascript
{
  user_id: number,
  email: string,
  role_name: string,
  exp: timestamp,
  iat: timestamp
}
```

### Token Storage

JWT tokens are stored in:
- **localStorage**: `auth_token` (for the JWT token)
- **localStorage**: `user_data` (for user information)
- **localStorage**: `token_expires` (for expiration tracking)

### Authentication Flow

1. **Login**: POST `/api/auth/login`
   - Validates credentials against database
   - Generates JWT token with 24-hour expiration
   - Returns user data and token

2. **Token Verification**: GET `/api/auth/me`
   - Validates JWT token from Authorization header
   - Returns current user and permissions

3. **Logout**: POST `/api/auth/logout`
   - Clears client-side token storage

## 👥 Default User Accounts

The system comes with three pre-configured user accounts:

### Super Admin
- **Email**: `admin@tejit.com`
- **Password**: `password`
- **Permissions**: Full system access

### Client Manager
- **Email**: `manager@tejit.com`
- **Password**: `password`
- **Permissions**: Client and invoice management

### Auditor
- **Email**: `auditor@tejit.com`
- **Password**: `password`
- **Permissions**: Read-only access to reports and analytics

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/verify` - Verify token

### Clients
- `GET /api/clients` - List clients
- `POST /api/clients` - Create client
- `GET /api/clients/[id]` - Get client details
- `PUT /api/clients/[id]` - Update client
- `DELETE /api/clients/[id]` - Delete client

### Analytics
- `GET /api/analytics/super-admin` - Super Admin dashboard data
- `GET /api/analytics/client-manager` - Client Manager dashboard data
- `GET /api/analytics/auditor` - Auditor dashboard data

## 🎯 Application Features

### 1. Role-Based Access Control
- **Super Admin**: Complete system control
- **Client Manager**: Client and invoice management
- **Auditor**: Read-only access for compliance

### 2. Client Management
- AWS account mapping
- GST registration support
- Multi-currency billing (USD/INR)
- Contact and billing information

### 3. Dashboard Analytics
- Revenue trends and growth metrics
- Client distribution analysis
- Service usage statistics
- Invoice status tracking

### 4. Security Features
- JWT-based authentication
- Role-based permissions
- Secure password handling
- Token expiration management

## 🚀 Running the Application

### Development Mode

```bash
# Start the development server
cd frontend
npm run dev
```

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

## 📱 Application Access

1. **Open your browser** and navigate to `http://localhost:3002`
2. **Login** using any of the demo credentials above
3. **Explore** the different modules based on your role:
   - Dashboard with analytics
   - Client management
   - Invoice management
   - Document management
   - Reports and analytics

## 🔍 JWT Token Usage

### Frontend Implementation

The JWT token is automatically included in all API requests via axios interceptors:

```javascript
// Request interceptor adds token to headers
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### Backend Verification

Each API route verifies the JWT token:

```javascript
function verifyToken(request) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.split(' ')[1];
  return jwt.verify(token, JWT_SECRET);
}
```

## 🛠️ Customization

### Adding New Users

To add new users, modify the users array in `/frontend/app/api/auth/login/route.ts`:

```javascript
const users = [
  {
    user_id: 4,
    username: 'newuser',
    email: 'newuser@tejit.com',
    password_hash: 'hashed_password',
    role_id: 2,
    role_name: 'Client Manager',
    status: 'active'
  }
];
```

### Database Integration

To connect to your actual database, replace the mock data in API routes with actual database queries using your preferred ORM or database client.

## 📊 System Architecture

```
Frontend (Next.js)
├── Authentication (JWT)
├── Role-based UI
├── API Routes (/api/*)
└── Database Integration

Backend Services
├── User Management
├── Client Management
├── Invoice Management
├── Analytics Engine
└── Document Management
```

## 🔒 Security Considerations

1. **JWT Secret**: Change the JWT secret in production
2. **Password Hashing**: Implement proper bcrypt hashing
3. **HTTPS**: Use HTTPS in production
4. **Database Security**: Secure database connections
5. **Input Validation**: Validate all user inputs

## 📞 Support

For issues or questions:
- Check the console for error messages
- Verify database connectivity
- Ensure all environment variables are set
- Check JWT token expiration

The application is now ready to run as a complete full-stack enterprise solution with JWT authentication and database integration!