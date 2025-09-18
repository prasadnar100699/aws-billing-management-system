const app = require('./app');
const { testConnection } = require('./config/db');

const PORT = process.env.PORT || 5002;

// Initialize and start server
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
      console.log(`   • Clients: http://localhost:${PORT}/api/clients/*`);
      console.log(`   • Invoices: http://localhost:${PORT}/api/invoices/*`);
      console.log(`   • Analytics: http://localhost:${PORT}/api/analytics/*`);
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