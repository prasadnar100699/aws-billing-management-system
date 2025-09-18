const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

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

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../Uploads')));

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
      session_store: 'none'
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
    authentication: 'none',
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
  
  // Log error to audit trail if user info is provided
  if (req.body.user_id) {
    require('./utils/auditLogger').log({
      user_id: req.body.user_id,
      action_type: 'ERROR',
      entity_type: 'system',
      entity_name: 'Application Error',
      description: err.message,
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    }).catch(console.error);
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found'
  });
});

module.exports = app;