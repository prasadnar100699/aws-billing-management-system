const express = require('express');
const router = express.Router();
const AnalyticsController = require('../controllers/analytics.controller');
const { requireAuth, requirePermission } = require('../middlewares/auth.middleware');

// Analytics routes
router.get('/super-admin', requireAuth, requirePermission('Analytics', 'view'), AnalyticsController.getSuperAdminAnalytics);
router.get('/client-manager', requireAuth, requirePermission('Analytics', 'view'), AnalyticsController.getClientManagerAnalytics);
router.get('/auditor', requireAuth, requirePermission('Analytics', 'view'), AnalyticsController.getAuditorAnalytics);

module.exports = router;