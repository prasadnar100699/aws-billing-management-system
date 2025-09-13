const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/db');
const { success, error } = require('../utils/response');

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    // Check database connection
    await sequelize.authenticate();
    
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'healthy',
        server: 'healthy'
      },
      version: '1.0.0'
    };

    success(res, healthData);
  } catch (err) {
    console.error('Health check error:', err);
    
    const healthData = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'unhealthy',
        server: 'healthy'
      },
      version: '1.0.0',
      error: err.message
    };

    res.status(503).json(healthData);
  }
});

module.exports = router;