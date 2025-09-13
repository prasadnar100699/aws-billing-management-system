const { getMany, getOne, insert, update, deleteRecord } = require('../config/db');

class InvoicesController {
  async createInvoice(req, res) {
    try {
      const { client_id, invoice_date, due_date, line_items, ...invoiceData } = req.body;

      if (!client_id) {
        return res.status(400).json({ error: 'client_id is required' });
      }

      // Validate client exists
      const client = await getOne('SELECT * FROM clients WHERE client_id = ?', [client_id]);
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }

      // Generate invoice number
      const invoiceNumber = await this.generateInvoiceNumber(client_id);

      // Create invoice
      const invoiceDataToInsert = {
        client_id,
        invoice_number: invoiceNumber,
        invoice_date: invoice_date ? new Date(invoice_date) : new Date(),
        due_date: due_date ? new Date(due_date) : null,
        gst_applicable: invoiceData.gst_applicable !== undefined ? invoiceData.gst_applicable : client.gst_registered,
        invoice_notes: invoiceData.invoice_notes || null,
        status: 'draft'
      };

      const invoiceId = await insert('invoices', invoiceDataToInsert);

      // Add line items if provided
      if (line_items && Array.isArray(line_items)) {
        for (const itemData of line_items) {
          await insert('invoice_line_items', {
            invoice_id: invoiceId,
            component_id: itemData.component_id || null,
            description: itemData.description,
            quantity: itemData.quantity,
            rate: itemData.rate,
            discount: itemData.discount || 0,
            currency: itemData.currency || client.default_currency
          });
        }
      }

      res.status(201).json({
        success: true,
        message: 'Invoice created successfully',
        data: { invoice: { invoice_id: invoiceId, ...invoiceDataToInsert } }
      });
    } catch (error) {
      console.error('Create invoice error:', error);
      res.status(500).json({ error: 'Internal server error' });
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

      let whereClause = '1=1';
      let params = [];

      if (search) {
        whereClause += ' AND (i.invoice_number LIKE ? OR i.invoice_notes LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }

      if (status) {
        whereClause += ' AND i.status = ?';
        params.push(status);
      }

      if (clientId) {
        whereClause += ' AND i.client_id = ?';
        params.push(clientId);
      }

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM invoices i 
        JOIN clients c ON i.client_id = c.client_id 
        WHERE ${whereClause}
      `;
      const countResult = await getOne(countQuery, params);
      const total = countResult.total;

      // Get invoices with client info
      const query = `
        SELECT i.*, c.client_name, c.email as client_email
        FROM invoices i
        JOIN clients c ON i.client_id = c.client_id
        WHERE ${whereClause}
        ORDER BY i.invoice_date DESC
        LIMIT ? OFFSET ?
      `;
      const invoices = await getMany(query, [...params, limit, offset]);

      res.json({
        success: true,
        data: invoices,
        pagination: {
          total,
          pages: Math.ceil(total / limit),
          current_page: page,
          per_page: limit
        }
      });
    } catch (error) {
      console.error('List invoices error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getInvoice(req, res) {
    try {
      const invoiceId = parseInt(req.params.id);
      
      const invoice = await getOne(`
        SELECT i.*, c.client_name, c.email as client_email, c.gst_registered
        FROM invoices i
        JOIN clients c ON i.client_id = c.client_id
        WHERE i.invoice_id = ?
      `, [invoiceId]);

      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      // Get line items
      const lineItems = await getMany(`
        SELECT ili.*, pc.component_name, s.service_name
        FROM invoice_line_items ili
        LEFT JOIN pricing_components pc ON ili.component_id = pc.component_id
        LEFT JOIN services s ON pc.service_id = s.service_id
        WHERE ili.invoice_id = ?
      `, [invoiceId]);

      // Calculate totals
      const totals = this.calculateTotals(lineItems, invoice.gst_applicable);

      res.json({
        success: true,
        data: {
          invoice: {
            ...invoice,
            totals
          },
          line_items: lineItems
        }
      });
    } catch (error) {
      console.error('Get invoice error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateInvoice(req, res) {
    try {
      const invoiceId = parseInt(req.params.id);
      
      const invoice = await getOne('SELECT * FROM invoices WHERE invoice_id = ?', [invoiceId]);
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      // Check if invoice can be edited
      if (['finalized', 'sent'].includes(invoice.status)) {
        return res.status(400).json({ error: 'Cannot edit finalized or sent invoice' });
      }

      await update('invoices', req.body, 'invoice_id = ?', [invoiceId]);

      res.json({
        success: true,
        message: 'Invoice updated successfully',
        data: { invoice: { ...invoice, ...req.body } }
      });
    } catch (error) {
      console.error('Update invoice error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deleteInvoice(req, res) {
    try {
      const invoiceId = parseInt(req.params.id);
      
      const invoice = await getOne('SELECT * FROM invoices WHERE invoice_id = ?', [invoiceId]);
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      // Only allow deletion of draft invoices
      if (invoice.status !== 'draft') {
        return res.status(400).json({ error: 'Can only delete draft invoices' });
      }

      await deleteRecord('invoices', 'invoice_id = ?', [invoiceId]);

      res.json({
        success: true,
        message: 'Invoice deleted successfully'
      });
    } catch (error) {
      console.error('Delete invoice error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async generateInvoiceNumber(clientId) {
    const date = new Date();
    const yearMonth = date.getFullYear().toString() + (date.getMonth() + 1).toString().padStart(2, '0');
    
    // Get the next sequence number for this client and month
    const lastInvoice = await getOne(`
      SELECT invoice_number 
      FROM invoices 
      WHERE client_id = ? AND invoice_number LIKE ?
      ORDER BY invoice_number DESC 
      LIMIT 1
    `, [clientId, `TejIT-${clientId.toString().padStart(3, '0')}-${yearMonth}-%`]);

    let sequence = 1;
    if (lastInvoice) {
      const parts = lastInvoice.invoice_number.split('-');
      sequence = parseInt(parts[parts.length - 1]) + 1;
    }

    return `TejIT-${clientId.toString().padStart(3, '0')}-${yearMonth}-${sequence.toString().padStart(3, '0')}`;
  }

  calculateTotals(lineItems, gstApplicable) {
    const subtotal = lineItems.reduce((sum, item) => {
      return sum + (parseFloat(item.quantity) * parseFloat(item.rate) * (1 - parseFloat(item.discount || 0) / 100));
    }, 0);
    
    const gstAmount = gstApplicable ? subtotal * 0.18 : 0;
    const total = subtotal + gstAmount;

    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      gst_amount: parseFloat(gstAmount.toFixed(2)),
      total: parseFloat(total.toFixed(2))
    };
  }
}

module.exports = new InvoicesController();