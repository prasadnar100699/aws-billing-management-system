const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth.controller');

// Instantiate AuthController to ensure bound methods are used
const authController = new AuthController();

/**
 * Authentication Routes
 * Handles login, logout, and auth verification
 */

// POST /auth/login - User login
router.post('/login', authController.login.bind(authController));

// POST /auth/logout - User logout
router.post('/logout', authController.logout.bind(authController));

// GET /auth/verify - Verify authentication (for protected routes)
router.get('/verify', authController.verifyAuth.bind(authController));

module.exports = router;