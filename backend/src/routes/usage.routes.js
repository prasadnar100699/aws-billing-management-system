const express = require('express');
const router = express.Router();
const { requireAuth, requirePermission } = require('../middlewares/auth.middleware');

// Usage import routes (placeholder)
router.get('/', requireAuth, requirePermission('Usage', 'view'), (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'Usage import endpoints - coming soon'
  });
});

router.post('/import', requireAuth, requirePermission('Usage', 'create'), (req, res) => {
  res.json({
    success: true,
    message: 'Usage import started',
    data: { import_id: 1 }
  });
});

module.exports = router;