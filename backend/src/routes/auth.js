// backend/src/routes/auth.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// Authentication routes
router.post('/login', authController.login.bind(authController));
router.post('/logout', authController.logout.bind(authController));
router.get('/current-user', authController.getCurrentUser.bind(authController));
router.post('/force-logout', authController.forceLogout.bind(authController));
router.get('/active-sessions', authController.getActiveSessions.bind(authController));

module.exports = router;