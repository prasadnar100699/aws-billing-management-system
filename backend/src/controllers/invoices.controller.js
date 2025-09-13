const { Invoice, InvoiceLineItem, Client, PricingComponent } = require('../models');
const AuditService = require('../services/audit.service');
const PDFService = require('../services/pdf.service');
const EmailService = require('../services/email.service');
const { success, error, paginated } = require('../utils/response');
const { Op } = require('sequelize');

class InvoicesController {
  async createInvoice(req, res) {
    try {
      const { client_id, invoice_date, due_date, line_items, ...invoiceData } = req.body;

      if (!client_id) {
        return error(res, 'client_id is required', 400);
      }

      // Validate client exists and user has access
      const client = await Client.findByPk(client_id, {
        include: [{ model: require('../models').User, as: 'assignedManagers' }]
      });

      if (!client) {
        return error(res, 'Client not found', 404);
      }

      // Check if Client Manager has access to this client
      if (req.user.role.role_name === 'Client Manager') {
        const hasAccess = client.assignedManagers.some(manager => manager.user_id === req.user.user_id);
        if (!hasAccess) {
          return error(res, 'Access denied', 403);
        }
      }

      // Create invoice
      const invoice = await Invoice.create({
        client_id,
        invoice_date: invoice_date ? new Date(invoice_date) : new Date(),
        due_date: due_date ? new Date(due_date) : null,
        gst_applicable: invoiceData.gst_applicable !== undefined ? invoiceData.gst_applicable : client.gst_registered,
        ...invoiceData
      });

      // Generate invoice number
      await invoice.generateInvoiceNumber();
      await invoice.save();

      // Add line items
      if (line_items && Array.isArray(line_items)) {
        for (const itemData of line_items) {
          await InvoiceLineItem.create({
            invoice_id: invoice.invoice_id,
            component_id: itemData.component_id,
            description: itemData.description,
            quantity: itemData.quantity,
            rate: itemData.rate,
            discount: itemData.discount || 0,
            currency: itemData.currency || client.default_currency
          });
        }
      }

      await AuditService.logUserAction(req.user.user_id, 'create_invoice', `Created invoice: ${invoice.invoice_number}`, req);

      // Fetch complete invoice with line items
      const completeInvoice = await Invoice.findByPk(invoice.invoice_id, {
        include: [
          { model: Client, as: 'client' },
          { model: InvoiceLineItem, as: 'lineItems' }
        ]
      });

      success(res, { invoice: completeInvoice }, 'Invoice created successfully', 201);
    } catch (err) {
      console.error('Create invoice error:', err);
      error(res, 'Internal server error', 500);
    }
  }

  async listInvoices(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search || '';
      const status = req.query.status;
      const clientId = req.query.client_id;
      const offset = (page - 1) * limit;

      // Build where clause
      const whereClause = {};
      
      if (status) {
        whereClause.status = status;
      }

      if (clientId) {
        whereClause.client_id = clientId;
      }

      // Build include clause
      const include = [{
        model: Client,
        as: 'client',
        attributes: ['client_id', 'client_name', 'email']
      }];

      // For Client Managers, only show invoices for assigned clients
      if (req.user.role.role_name === 'Client Manager') {
        include[0].include = [{
          model: User,
          as: 'assignedManagers',
          where: { user_id: req.user.user_id },
          required: true,
          attributes: []
        }];
      }

      // Add search filter
      if (search) {
        whereClause[Op.or] = [
          { invoice_number: { [Op.like]: `%${search}%` } },
          { invoice_notes: { [Op.like]: `%${search}%` } }
        ];
      }

      const { count, rows } = await Invoice.findAndCountAll({
        where: whereClause,
        include,
        limit,
        offset,
        order: [['invoice_date', 'DESC']]
      });

      paginated(res, rows, {
        total: count,
        pages: Math.ceil(count / limit),
        current_page: page,
        per_page: limit
      });
    } catch (err) {
      console.error('List invoices error:', err);
      error(res, 'Internal server error', 500);
    }
  }

  async getInvoice(req, res) {
    try {
      const invoiceId = parseInt(req.params.id);
      
      const invoice = await Invoice.findByPk(invoiceId, {
        include: [
          { 
            model: Client, 
            as: 'client',
            include: [{ model: User, as: 'assignedManagers' }]
          },
          { 
            model: InvoiceLineItem, 
            as: 'lineItems',
            include: [{ model: PricingComponent, as: 'pricingComponent' }]
          }
        ]
      });

      if (!invoice) {
        return error(res, 'Invoice not found', 404);
      }

      // Check if Client Manager has access to this invoice
      if (req.user.role.role_name === 'Client Manager') {
        const hasAccess = invoice.client.assignedManagers.some(manager => manager.user_id === req.user.user_id);
        if (!hasAccess) {
          return error(res, 'Access denied', 403);
        }
      }

      // Calculate totals
      const totals = await invoice.calculateTotals();

      success(res, {
        invoice: {
          ...invoice.toJSON(),
          totals
        }
      });
    } catch (err) {
      console.error('Get invoice error:', err);
      error(res, 'Internal server error', 500);
    }
  }

  async updateInvoice(req, res) {
    try {
      const invoiceId = parseInt(req.params.id);
      
      const invoice = await Invoice.findByPk(invoiceId, {
        include: [
          { 
            model: Client, 
            as: 'client',
            include: [{ model: User, as: 'assignedManagers' }]
          }
        ]
      });

      if (!invoice) {
        return error(res, 'Invoice not found', 404);
      }

      // Check if Client Manager has access to this invoice
      if (req.user.role.role_name === 'Client Manager') {
        const hasAccess = invoice.client.assignedManagers.some(manager => manager.user_id === req.user.user_id);
        if (!hasAccess) {
          return error(res, 'Access denied', 403);
        }
      }

      // Check if invoice can be edited
      if (['finalized', 'sent'].includes(invoice.status)) {
        return error(res, 'Cannot edit finalized or sent invoice', 400);
      }

      // Update invoice
      await invoice.update(req.body);

      // Update line items if provided
      if (req.body.line_items) {
        await InvoiceLineItem.destroy({ where: { invoice_id: invoiceId } });
        
        for (const itemData of req.body.line_items) {
          await InvoiceLineItem.create({
            invoice_id: invoiceId,
            component_id: itemData.component_id,
            description: itemData.description,
            quantity: itemData.quantity,
            rate: itemData.rate,
            discount: itemData.discount || 0,
            currency: itemData.currency || 'USD'
          });
        }
      }

      await AuditService.logUserAction(req.user.user_id, 'update_invoice', `Updated invoice: ${invoice.invoice_number}`, req);

      success(res, { invoice }, 'Invoice updated successfully');
    } catch (err) {
      console.error('Update invoice error:', err);
      error(res, 'Internal server error', 500);
    }
  }

  async deleteInvoice(req, res) {
    try {
      const invoiceId = parseInt(req.params.id);
      
      const invoice = await Invoice.findByPk(invoiceId, {
        include: [
          { 
            model: Client, 
            as: 'client',
            include: [{ model: User, as: 'assignedManagers' }]
          }
        ]
      });

      if (!invoice) {
        return error(res, 'Invoice not found', 404);
      }

      // Check if Client Manager has access to this invoice
      if (req.user.role.role_name === 'Client Manager') {
        const hasAccess = invoice.client.assignedManagers.some(manager => manager.user_id === req.user.user_id);
        if (!hasAccess) {
          return error(res, 'Access denied', 403);
        }
      }

      // Only allow deletion of draft invoices
      if (invoice.status !== 'draft') {
        return error(res, 'Can only delete draft invoices', 400);
      }

      await invoice.destroy();

      await AuditService.logUserAction(req.user.user_id, 'delete_invoice', `Deleted invoice: ${invoice.invoice_number}`, req);

      success(res, null, 'Invoice deleted successfully');
    } catch (err) {
      console.error('Delete invoice error:', err);
      error(res, 'Internal server error', 500);
    }
  }

  async generatePDF(req, res) {
    try {
      const invoiceId = parseInt(req.params.id);
      
      const invoice = await Invoice.findByPk(invoiceId, {
        include: [
          { model: Client, as: 'client' },
          { model: InvoiceLineItem, as: 'lineItems' }
        ]
      });

      if (!invoice) {
        return error(res, 'Invoice not found', 404);
      }

      // Generate PDF
      const pdfPath = await PDFService.generateInvoicePDF(invoice, invoice.client, invoice.lineItems);
      
      // Update invoice with PDF path
      await invoice.update({ pdf_path: pdfPath });

      await AuditService.logUserAction(req.user.user_id, 'generate_pdf', `Generated PDF for invoice: ${invoice.invoice_number}`, req);

      success(res, { pdf_path: pdfPath }, 'PDF generated successfully');
    } catch (err) {
      console.error('Generate PDF error:', err);
      error(res, 'Internal server error', 500);
    }
  }

  async sendInvoice(req, res) {
    try {
      const invoiceId = parseInt(req.params.id);
      const { email_to, email_subject, email_body } = req.body;
      
      const invoice = await Invoice.findByPk(invoiceId, {
        include: [
          { model: Client, as: 'client' },
          { model: InvoiceLineItem, as: 'lineItems' }
        ]
      });

      if (!invoice) {
        return error(res, 'Invoice not found', 404);
      }

      // Invoice must be finalized to send
      if (!['finalized', 'sent'].includes(invoice.status)) {
        return error(res, 'Invoice must be finalized before sending', 400);
      }

      // Generate PDF if not exists
      let pdfPath = invoice.pdf_path;
      if (!pdfPath) {
        pdfPath = await PDFService.generateInvoicePDF(invoice, invoice.client, invoice.lineItems);
        await invoice.update({ pdf_path: pdfPath });
      }

      // Send email
      const emailResult = await EmailService.sendInvoiceEmail(
        invoice,
        invoice.client,
        pdfPath
      );

      if (emailResult.success) {
        await invoice.update({ 
          status: 'sent',
          email_sent: true,
          email_sent_at: new Date()
        });

        await AuditService.logUserAction(req.user.user_id, 'send_invoice', `Sent invoice: ${invoice.invoice_number}`, req);

        success(res, { email_result: emailResult }, 'Invoice sent successfully');
      } else {
        error(res, `Failed to send invoice: ${emailResult.error}`, 500);
      }
    } catch (err) {
      console.error('Send invoice error:', err);
      error(res, 'Internal server error', 500);
    }
  }
}

module.exports = new InvoicesController();