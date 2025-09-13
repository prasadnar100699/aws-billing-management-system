const express = require('express');
const router = express.Router();
const ClientsController = require('../controllers/clients.controller');
const { requireAuth, requirePermission } = require('../middlewares/auth.middleware');

// Client management routes
router.post('/', requireAuth, requirePermission('Clients', 'create'), ClientsController.createClient);
router.get('/', requireAuth, requirePermission('Clients', 'view'), ClientsController.listClients);
router.get('/:id', requireAuth, requirePermission('Clients', 'view'), ClientsController.getClient);
router.put('/:id', requireAuth, requirePermission('Clients', 'edit'), ClientsController.updateClient);
router.delete('/:id', requireAuth, requirePermission('Clients', 'delete'), ClientsController.deleteClient);
router.get('/:id/aws', requireAuth, requirePermission('Clients', 'view'), ClientsController.getClientAwsMappings);

module.exports = router;