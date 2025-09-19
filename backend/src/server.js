const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const session = require('express-session');
const MySQLStore = require('connect-mysql')(session);
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Import database connection
const { testConnection, pool } = require('./config/db');

// Import routes
const authRoutes = require('./routes/auth.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const usersRoutes = require('./routes/users.routes');
const clientsRoutes = require('./routes/clients.routes');
const invoicesRoutes = require('./routes/invoices.routes');
const servicesRoutes = require('./routes/services.routes');
const usageRoutes = require('./routes/usage.routes');
const documentsRoutes = require('./routes/documents.routes');
const reportsRoutes = require('./routes/reports.routes');
const analyticsRoutes = require('./routes/analytics.routes');

// Create Express app
const app = express();

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3002'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-ID']
};
app.use(cors(corsOptions));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration
const sessionStore = new MySQLStore({
  config: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  }
});

app.use(session({
  key: 'session_id',
  secret: process.env.SESSION_SECRET || 'fallback-secret',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: (parseInt(process.env.SESSION_TIMEOUT_HOURS) || 8) * 60 * 60 * 1000
  }
}));

// Create upload directories
const uploadDirs = [
  path.join(__dirname, '../uploads'),
  path.join(__dirname, '../uploads/invoices'),
  path.join(__dirname, '../uploads/documents'),
  path.join(__dirname, '../uploads/usage'),
  path.join(__dirname, '../logs')
];

uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API routes
app.use('/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/invoices', invoicesRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/usage', usageRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: 'healthy',
      server: 'healthy',
      session_store: 'healthy'
    },
    version: '2.0.0'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'AWS Billing Management System API v2.0',
    version: '2.0.0',
    status: 'running',
    authentication: 'session-based',
    endpoints: {
      health: '/api/health',
      auth: '/auth/*',
      dashboard: '/api/dashboard',
      users: '/api/users/*',
      clients: '/api/clients/*',
      invoices: '/api/invoices/*',
      services: '/api/services/*',
      usage: '/api/usage/*',
      documents: '/api/documents/*',
      reports: '/api/reports/*',
      analytics: '/api/analytics/*'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Log error to audit trail if user info is available
  if (req.session?.user_id) {
    require('./utils/auditLogger').log({
      user_id: req.session.user_id,
      action_type: 'ERROR',
      entity_type: 'system',
      entity_name: 'Application Error',
      description: err.message,
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      session_id: req.sessionID
    }).catch(console.error);
  }

  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Start server
const PORT = process.env.PORT || 5002;

const startServer = async () => {
  try {
    // Test database connection
    console.log('🔗 Testing database connection...');
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.error('❌ Database connection failed. Exiting...');
      process.exit(1);
    }

    // Start HTTP server
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log('🚀 AWS Billing Management System Backend');
      console.log(`   • Port: ${PORT}`);
      console.log(`   • Environment: ${process.env.NODE_ENV}`);
      console.log(`   • Database: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
      console.log(`   • CORS Origins: ${process.env.CORS_ORIGINS}`);
      console.log('');
      console.log('📡 API Endpoints:');
      console.log(`   • Health: http://localhost:${PORT}/api/health`);
      console.log(`   • Auth: http://localhost:${PORT}/auth/*`);
      console.log(`   • Dashboard: http://localhost:${PORT}/api/dashboard`);
      console.log('');
      console.log('🎯 Ready to accept connections!');
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('🛑 SIGTERM received. Shutting down gracefully...');
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('🛑 SIGINT received. Shutting down gracefully...');
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();