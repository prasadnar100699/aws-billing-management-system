const express = require('express');
const AuthController = require('../controllers/authController');

const router = express.Router();

/**
 * Authentication Routes
 * Simplified enterprise authentication without JWT tokens
 */

// POST /api/auth/login - User login
router.post('/login', AuthController.login);

// GET /api/auth/profile/:userId - Get user profile
router.get('/profile/:userId', AuthController.getProfile);

module.exports = router;