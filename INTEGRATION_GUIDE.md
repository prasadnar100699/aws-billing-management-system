# AWS Billing Management System - Integration Guide

## 🔗 Frontend-Backend Integration

This guide explains how the frontend and backend are integrated to work as a complete end-to-end system.

## 🏗️ System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │    Database     │
│   (Next.js)     │◄──►│   (Flask)       │◄──►│    (MySQL)      │
│   Port: 3002    │    │   Port: 5002    │    │   Port: 3308    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         └──────────────►│     Redis       │◄─────────────┘
                        │   (Cache/Jobs)  │
                        │   Port: 6379    │
                        └─────────────────┘
```

## 🔐 Authentication Flow

### 1. Login Process
```typescript
// Frontend: app/page.tsx
const handleLogin = async (email, password) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  
  const data = await response.json();
  
  // Store JWT token and user data
  localStorage.setItem('auth_token', data.token);
  localStorage.setItem('user_data', JSON.stringify(data));
};
```

### 2. JWT Token Management
```typescript
// Frontend: lib/api.ts
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### 3. Backend Token Verification
```python
# Backend: app/utils/auth.py
def decode_jwt_token(token):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        return payload.get('user_id')
    except jwt.ExpiredSignatureError:
        return None
```

## 👥 Role-Based Access Control (RBAC)

### Frontend Route Protection
```typescript
// Frontend: middleware.ts
const roleBasedRoutes = {
  '/users': ['Super Admin'],
  '/roles': ['Super Admin'],
  '/services': ['Super Admin', 'Client Manager'],
  '/clients': ['Super Admin', 'Client Manager'],
  '/invoices': ['Super Admin', 'Client Manager', 'Auditor']
};
```

### Backend Permission Checking
```python
# Backend: app/utils/auth.py
def require_permission(module_name, action):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not current_user.has_permission(module_name, action):
                return jsonify({'error': 'Insufficient permissions'}), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator
```

## 🔄 API Integration

### 1. Client Management
```typescript
// Frontend: app/clients/page.tsx
const { execute: createClient } = useApi(clientsApi.create, {
  showSuccessToast: true,
  onSuccess: () => {
    setIsCreateDialogOpen(false);
    fetchClients();
  }
});
```

### 2. Real-time Updates
```typescript
// Frontend: lib/hooks/useApi.ts
export function useApi(apiFunction, options = {}) {
  const execute = useCallback(async (...args) => {
    const response = await apiFunction(...args);
    
    if (options.showSuccessToast) {
      toast.success(response.data?.message || 'Success');
    }
    
    return response.data;
  }, [apiFunction]);
}
```

## 🐳 Docker Integration

### 1. Multi-Container Setup
```yaml
# docker-compose.yml
services:
  frontend:
    build: ./frontend
    ports: ["3002:3002"]
    depends_on: [backend]
    
  backend:
    build: ./backend
    ports: ["5002:5002"]
    depends_on: [mysql, redis]
    
  mysql:
    image: mysql:8.0
    ports: ["3308:3306"]
    
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
```

### 2. Environment Configuration
```bash
# Frontend Environment
NEXT_PUBLIC_API_URL=http://localhost:5002/api
JWT_SECRET=your-super-secret-jwt-key

# Backend Environment
DB_HOST=mysql
DB_PORT=3306
REDIS_URL=redis://redis:6379/0
CORS_ORIGINS=http://localhost:3002
```

## 🚀 Startup Options

### Option 1: Docker Compose (Production-like)
```bash
# Start complete system
python start-system.py

# Or manually
docker-compose up --build -d
```

### Option 2: Development Mode
```bash
# Backend (Terminal 1)
cd backend
python run.py

# Frontend (Terminal 2)
cd frontend
npm run dev
```

## 🧪 Testing Integration

### Automated Testing
```bash
# Run integration tests
python test-integration.py
```

### Manual Testing Checklist

#### Authentication
- [ ] Login with valid credentials
- [ ] Login with invalid credentials (should fail)
- [ ] Token expiration handling
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

#### API Integration
- [ ] Frontend forms submit to backend
- [ ] Backend responses update frontend
- [ ] Error handling displays properly
- [ ] Success messages show correctly

## 🔧 Configuration

### Frontend Configuration
```typescript
// lib/api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api';
```

### Backend Configuration
```python
# config.py
CORS_ORIGINS = os.environ.get('CORS_ORIGINS') or 'http://localhost:3002'
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY')
```

## 🛡️ Security Features

### 1. JWT Token Security
- 24-hour token expiration
- Automatic token refresh
- Secure token storage
- Token validation on each request

### 2. CORS Configuration
```python
# Backend: app/__init__.py
CORS(app, origins=app.config['CORS_ORIGINS'].split(','))
```

### 3. Input Validation
```python
# Backend: app/utils/validation.py
def validate_email(email):
    try:
        email_validate(email)
        return True
    except EmailNotValidError:
        return False
```

## 📊 Data Flow

### 1. Client Creation Flow
```
Frontend Form → API Call → Backend Validation → Database Insert → Response → Frontend Update
```

### 2. Authentication Flow
```
Login Form → JWT Generation → Token Storage → API Requests → Token Verification → Access Control
```

### 3. File Upload Flow
```
File Selection → FormData → Backend Upload → File Storage → Database Record → Frontend Confirmation
```

## 🔍 Debugging

### Backend Logs
```bash
# View backend logs
docker-compose logs -f backend

# Or in development
tail -f backend/logs/aws_billing.log
```

### Frontend Debugging
```bash
# View frontend logs
docker-compose logs -f frontend

# Or check browser console for client-side errors
```

### Database Access
```bash
# Connect to MySQL container
docker-compose exec mysql mysql -u admin -p aws_billing_system

# Or direct connection
mysql -h localhost -P 3308 -u admin -p aws_billing_system
```

## 🚀 Deployment

### Production Deployment
1. Update environment variables for production
2. Configure SSL certificates
3. Set up proper database backups
4. Configure monitoring and logging
5. Deploy with `docker-compose -f docker-compose.prod.yml up -d`

### Environment Variables
```bash
# Production Frontend
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
JWT_SECRET=your-production-jwt-secret

# Production Backend
DB_HOST=your-production-db-host
REDIS_URL=redis://your-production-redis
CORS_ORIGINS=https://yourdomain.com
```

## 📞 Support

For integration issues:
1. Check service health: `python test-integration.py`
2. Verify environment variables
3. Check Docker container logs
4. Ensure all services are running
5. Validate JWT token configuration

The system is now fully integrated with end-to-end functionality, proper authentication, role-based access control, and Docker deployment support.