const { app, initializeApp } = require('./app');
const config = require('./config/env');

// Initialize and start server
const startServer = async () => {
  try {
    // Initialize application
    await initializeApp();

    // Start HTTP server
    const server = app.listen(config.PORT, '0.0.0.0', () => {
      console.log('🚀 AWS Billing Management System Backend');
      console.log(`   • Port: ${config.PORT}`);
      console.log(`   • Environment: ${config.NODE_ENV}`);
      console.log(`   • Database: ${config.DB_HOST}:${config.DB_PORT}/${config.DB_NAME}`);
      console.log(`   • CORS Origins: ${config.CORS_ORIGINS.join(', ')}`);
      console.log('');
      console.log('📡 API Endpoints:');
      console.log(`   • Health: http://localhost:${config.PORT}/api/health`);
      console.log(`   • Auth: http://localhost:${config.PORT}/auth/*`);
      console.log(`   • Users: http://localhost:${config.PORT}/api/users/*`);
      console.log(`   • Clients: http://localhost:${config.PORT}/api/clients/*`);
      console.log(`   • Invoices: http://localhost:${config.PORT}/api/invoices/*`);
      console.log(`   • Analytics: http://localhost:${config.PORT}/api/analytics/*`);
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