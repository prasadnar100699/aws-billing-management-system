const express = require('express');
const router = express.Router();
const AnalyticsController = require('../controllers/analytics.controller');
const { requireAuth, requirePermission } = require('../middlewares/auth.middleware');

// Analytics routes
router.get('/super-admin', requireAuth, requirePermission('analytics', 'view'), AnalyticsController.getSuperAdminAnalytics);
router.get('/client-manager', requireAuth, requirePermission('analytics', 'view'), AnalyticsController.getClientManagerAnalytics);
router.get('/auditor', requireAuth, requirePermission('analytics', 'view'), AnalyticsController.getAuditorAnalytics);

module.exports = router;