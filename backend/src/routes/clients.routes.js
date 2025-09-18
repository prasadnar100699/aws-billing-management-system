const express = require('express');
const router = express.Router();
const { getMany, getOne, insert, update, deleteRecord } = require('../config/db');
const auditLogger = require('../utils/auditLogger');
const { requireAuth, requirePermission } = require('../middlewares/auth.middleware');

// GET /api/clients - List clients with pagination
router.get('/', requireAuth, requirePermission('clients', 'view'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const status = req.query.status;
    const offset = (page - 1) * limit;

    let whereClause = '1=1';
    let params = [];

    if (search) {
      whereClause += ' AND (client_name LIKE ? OR email LIKE ? OR contact_person LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (status && status !== 'all') {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM clients WHERE ${whereClause}`;
    const countResult = await getOne(countQuery, params);
    const total = countResult.total;

    // Get clients with pagination
    const query = `
      SELECT * FROM clients 
      WHERE ${whereClause}
      ORDER BY client_name ASC
      LIMIT ? OFFSET ?
    `;
    const clients = await getMany(query, [...params, limit, offset]);

    // Parse aws_account_ids JSON
    const processedClients = clients.map(client => ({
      ...client,
      aws_account_ids: client.aws_account_ids ? JSON.parse(client.aws_account_ids || '[]') : []
    }));

    res.json({
      success: true,
      data: processedClients,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        current_page: page,
        per_page: limit
      }
    });
  } catch (error) {
    console.error('List clients error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/clients - Create new client
router.post('/', requireAuth, requirePermission('clients', 'create'), async (req, res) => {
  try {
    const {
      client_name,
      contact_person,
      email,
      phone,
      aws_account_ids,
      gst_registered,
      gst_number,
      billing_address,
      invoice_preferences,
      default_currency,
      status
    } = req.body;

    if (!client_name || !email) {
      return res.status(400).json({ error: 'Client name and email are required' });
    }

    // Check if client already exists
    const existingClient = await getOne('SELECT * FROM clients WHERE email = ?', [email]);
    if (existingClient) {
      return res.status(409).json({ error: 'Client with this email already exists' });
    }

    // Prepare client data
    const clientData = {
      client_name,
      contact_person: contact_person || null,
      email,
      phone: phone || null,
      aws_account_ids: Array.isArray(aws_account_ids) ? JSON.stringify(aws_account_ids) : '[]',
      gst_registered: gst_registered || false,
      gst_number: gst_number || null,
      billing_address: billing_address || null,
      invoice_preferences: invoice_preferences || 'monthly',
      default_currency: default_currency || 'USD',
      status: status || 'active'
    };

    const clientId = await insert('clients', clientData);

    // Log audit trail
    try {
      await auditLogger.log({
        user_id: req.user.user_id,
        action_type: 'CREATE',
        entity_type: 'client',
        entity_id: clientId,
        entity_name: client_name,
        description: `Created client: ${client_name}`,
        new_values: clientData,
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        session_id: req.session?.session_id
      });
    } catch (auditError) {
      console.warn('Audit logging failed:', auditError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Client created successfully',
      data: { client: { client_id: clientId, ...clientData } }
    });
  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/clients/:id - Get single client
router.get('/:id', requireAuth, requirePermission('clients', 'view'), async (req, res) => {
  try {
    const clientId = parseInt(req.params.id);
    
    const client = await getOne('SELECT * FROM clients WHERE client_id = ?', [clientId]);

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Parse aws_account_ids JSON
    client.aws_account_ids = client.aws_account_ids ? JSON.parse(client.aws_account_ids) : [];

    // Get AWS mappings if they exist
    const awsMappings = await getMany(
      'SELECT * FROM client_aws_accounts WHERE client_id = ?',
      [clientId]
    );

    res.json({
      success: true,
      data: {
        client,
        aws_accounts: awsMappings
      }
    });
  } catch (error) {
    console.error('Get client error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/clients/:id - Update client
router.put('/:id', requireAuth, requirePermission('clients', 'edit'), async (req, res) => {
  try {
    const clientId = parseInt(req.params.id);
    
    const client = await getOne('SELECT * FROM clients WHERE client_id = ?', [clientId]);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Store old values for audit
    const oldValues = { ...client };

    // Check if email is being changed and if it already exists
    if (req.body.email && req.body.email !== client.email) {
      const existingClient = await getOne(
        'SELECT * FROM clients WHERE email = ? AND client_id != ?',
        [req.body.email, clientId]
      );
      if (existingClient) {
        return res.status(409).json({ error: 'Email already exists' });
      }
    }

    // Prepare update data
    const updateData = { ...req.body };
    if (updateData.aws_account_ids && Array.isArray(updateData.aws_account_ids)) {
      updateData.aws_account_ids = JSON.stringify(updateData.aws_account_ids);
    }

    await update('clients', updateData, 'client_id = ?', [clientId]);

    // Log audit trail
    try {
      await auditLogger.log({
        user_id: req.user.user_id,
        action_type: 'UPDATE',
        entity_type: 'client',
        entity_id: clientId,
        entity_name: client.client_name,
        description: `Updated client: ${client.client_name}`,
        old_values: oldValues,
        new_values: updateData,
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        session_id: req.session?.session_id
      });
    } catch (auditError) {
      console.warn('Audit logging failed:', auditError.message);
    }

    res.json({
      success: true,
      message: 'Client updated successfully',
      data: { client: { ...client, ...updateData } }
    });
  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/clients/:id - Delete client
router.delete('/:id', requireAuth, requirePermission('clients', 'delete'), async (req, res) => {
  try {
    const clientId = parseInt(req.params.id);
    
    const client = await getOne('SELECT * FROM clients WHERE client_id = ?', [clientId]);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Check if client has invoices
    const invoices = await getOne(
      'SELECT COUNT(*) as count FROM invoices WHERE client_id = ?',
      [clientId]
    );
    
    if (invoices.count > 0) {
      return res.status(400).json({ error: 'Cannot delete client with existing invoices' });
    }

    await deleteRecord('clients', 'client_id = ?', [clientId]);

    // Log audit trail
    try {
      await auditLogger.log({
        user_id: req.user.user_id,
        action_type: 'DELETE',
        entity_type: 'client',
        entity_id: clientId,
        entity_name: client.client_name,
        description: `Deleted client: ${client.client_name}`,
        old_values: client,
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        session_id: req.session?.session_id
      });
    } catch (auditError) {
      console.warn('Audit logging failed:', auditError.message);
    }

    res.json({
      success: true,
      message: 'Client deleted successfully'
    });
  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/clients/:id/aws - Get client AWS mappings
router.get('/:id/aws', requireAuth, requirePermission('clients', 'view'), async (req, res) => {
  try {
    const clientId = parseInt(req.params.id);
    
    const client = await getOne('SELECT * FROM clients WHERE client_id = ?', [clientId]);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const awsAccounts = await getMany(
      'SELECT * FROM client_aws_accounts WHERE client_id = ?',
      [clientId]
    );

    res.json({
      success: true,
      data: {
        aws_account_ids: client.aws_account_ids ? JSON.parse(client.aws_account_ids || '[]') : [],
        aws_accounts: awsAccounts
      }
    });
  } catch (error) {
    console.error('Get client AWS accounts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;