/**
 * Enterprise-level error handling middleware
 * Provides consistent error responses across the application
 */

const errorHandler = (err, req, res, next) => {
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Default error response
  let error = {
    success: false,
    message: 'Internal server error occurred',
    timestamp: new Date().toISOString()
  };

  // Database connection errors
  if (err.code === 'ECONNREFUSED' || err.code === 'ER_ACCESS_DENIED_ERROR') {
    error.message = 'Database connection failed';
    return res.status(503).json(error);
  }

  // Database query errors
  if (err.code && err.code.startsWith('ER_')) {
    error.message = 'Database operation failed';
    return res.status(400).json(error);
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    error.message = err.message;
    return res.status(400).json(error);
  }

  // Authentication errors
  if (err.message.includes('Invalid credentials') || err.message.includes('Unauthorized')) {
    error.message = 'Authentication failed';
    return res.status(401).json(error);
  }

  // Not found errors
  if (err.message.includes('not found')) {
    error.message = err.message;
    return res.status(404).json(error);
  }

  // Default server error
  res.status(500).json(error);
};

module.exports = errorHandler;