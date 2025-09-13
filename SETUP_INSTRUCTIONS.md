# AWS Billing Management System - Quick Setup Instructions

## 🚀 Quick Start Guide (5 Minutes)

### Prerequisites Check
```bash
# Check Python version (3.8+ required)
python --version

# Check Node.js version (18+ required)
node --version

# Check MySQL connectivity
mysql -h 202.71.157.170 -P 3308 -u admin -p
# Password: admin@9955
```

### Step 1: Install Dependencies

#### Backend Dependencies
```bash
cd backend
pip install -r requirements.txt
```

#### Frontend Dependencies
```bash
cd frontend
npm install
```

### Step 2: Environment Configuration

#### Backend Environment
```bash
cd backend
cp .env.example .env
# The .env file is already configured for the live database
```

#### Frontend Environment
```bash
cd frontend
echo "NEXT_PUBLIC_API_URL=http://localhost:5002/api" > .env.local
```

### Step 3: Start the Application

#### Option A: Manual Start (2 Terminals)
```bash
# Terminal 1: Backend
cd backend
python run.py

# Terminal 2: Frontend
cd frontend
npm run dev
```

#### Option B: Docker (Single Command)
```bash
docker-compose up --build
```

#### Option C: Automated Script
```bash
python start-system.py
```

### Step 4: Access the Application

- **Frontend**: http://localhost:3002
- **Backend API**: http://localhost:5002/api
- **Health Check**: http://localhost:5002/api/health

### Step 5: Login with Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@tejit.com | password |
| Client Manager | manager@tejit.com | password |
| Auditor | auditor@tejit.com | password |

## 🔧 Troubleshooting

### Common Issues

#### "Module not found" Error
```bash
# Backend
cd backend
pip install -r requirements.txt

# Frontend
cd frontend
rm -rf node_modules package-lock.json
npm install
```

#### Database Connection Error
```bash
# Test database connection
mysql -h 202.71.157.170 -P 3308 -u admin -p
# If this fails, check your internet connection
```

#### Port Already in Use
```bash
# Check what's using the ports
netstat -tulpn | grep :3002
netstat -tulpn | grep :5002

# Kill processes if needed
sudo kill -9 <PID>
```

#### Permission Denied
```bash
# Make scripts executable
chmod +x start-system.py
chmod +x backend/scripts/*.sh
```

### Reset Everything
```bash
# Stop all processes
docker-compose down
pkill -f "python run.py"
pkill -f "npm run dev"

# Clear caches
cd frontend && npm cache clean --force
cd backend && pip cache purge

# Restart
python start-system.py
```

## ✅ Verification Checklist

After setup, verify these work:

- [ ] Frontend loads at http://localhost:3002
- [ ] Backend health check: http://localhost:5002/api/health
- [ ] Login with admin@tejit.com / password
- [ ] Dashboard displays analytics data
- [ ] Can navigate to different modules
- [ ] Role-based access works (try different user roles)

## 🎯 Next Steps

1. **Explore the Dashboard** - Check analytics and metrics
2. **Create a Test Client** - Add a sample AWS client
3. **Generate an Invoice** - Test the invoice creation flow
4. **Upload Documents** - Try the document management
5. **Review Reports** - Check the reporting features

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify all prerequisites are met
3. Check the logs for error messages
4. Ensure database connectivity
5. Contact support: support@tejit.com

---

**System Ready! 🎉**

The AWS Billing Management System is now running and ready for use.