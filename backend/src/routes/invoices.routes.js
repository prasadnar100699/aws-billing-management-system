const express = require('express');
const router = express.Router();
const InvoicesController = require('../controllers/invoices.controller');
const { requireAuth, requirePermission } = require('../middlewares/auth.middleware');

// Invoice management routes
router.post('/', requireAuth, requirePermission('Invoices', 'create'), InvoicesController.createInvoice);
router.get('/', requireAuth, requirePermission('Invoices', 'view'), InvoicesController.listInvoices);
router.get('/:id', requireAuth, requirePermission('Invoices', 'view'), InvoicesController.getInvoice);
router.put('/:id', requireAuth, requirePermission('Invoices', 'edit'), InvoicesController.updateInvoice);
router.delete('/:id', requireAuth, requirePermission('Invoices', 'delete'), InvoicesController.deleteInvoice);
router.post('/:id/pdf', requireAuth, requirePermission('Invoices', 'edit'), InvoicesController.generatePDF);
router.post('/:id/send', requireAuth, requirePermission('Invoices', 'edit'), InvoicesController.sendInvoice);

module.exports = router;