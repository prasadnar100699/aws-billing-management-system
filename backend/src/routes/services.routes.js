const express = require('express');
const router = express.Router();
const { getMany, getOne, insert, update, deleteRecord } = require('../config/db');
const auditLogger = require('../utils/auditLogger');
const { requireAuth, requirePermission } = require('../middlewares/auth.middleware');

// GET /api/services - List services with pagination
router.get('/', requireAuth, requirePermission('services', 'view'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const categoryId = req.query.category_id;
    const status = req.query.status;
    const offset = (page - 1) * limit;

    let whereClause = '1=1';
    let params = [];

    if (search) {
      whereClause += ' AND (s.service_name LIKE ? OR s.aws_service_code LIKE ? OR s.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (categoryId && categoryId !== 'all') {
      whereClause += ' AND s.service_category_id = ?';
      params.push(categoryId);
    }

    if (status && status !== 'all') {
      whereClause += ' AND s.status = ?';
      params.push(status);
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM services s 
      JOIN service_categories sc ON s.service_category_id = sc.category_id 
      WHERE ${whereClause}
    `;
    const countResult = await getOne(countQuery, params);
    const total = countResult.total;

    // Get services with category info
    const query = `
      SELECT s.*, sc.category_name, sc.aws_service_group
      FROM services s
      JOIN service_categories sc ON s.service_category_id = sc.category_id
      WHERE ${whereClause}
      ORDER BY s.service_name ASC
      LIMIT ? OFFSET ?
    `;
    const services = await getMany(query, [...params, limit, offset]);

    // Get pricing components for each service
    for (const service of services) {
      const pricingComponents = await getMany(
        'SELECT * FROM pricing_components WHERE service_id = ? ORDER BY component_name',
        [service.service_id]
      );
      service.pricing_components = pricingComponents;
    }

    res.json({
      success: true,
      data: services,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        current_page: page,
        per_page: limit
      }
    });
  } catch (error) {
    console.error('List services error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/services - Create new service
router.post('/', requireAuth, requirePermission('services', 'create'), async (req, res) => {
  try {
    const {
      service_name,
      service_category_id,
      aws_service_code,
      description,
      status,
      pricing_components
    } = req.body;

    if (!service_name || !service_category_id || !aws_service_code) {
      return res.status(400).json({ error: 'Service name, category, and AWS service code are required' });
    }

    // Check if service already exists
    const existingService = await getOne(
      'SELECT * FROM services WHERE service_name = ? OR aws_service_code = ?',
      [service_name, aws_service_code]
    );
    if (existingService) {
      return res.status(409).json({ error: 'Service with this name or AWS code already exists' });
    }

    // Validate category exists
    const category = await getOne('SELECT * FROM service_categories WHERE category_id = ?', [service_category_id]);
    if (!category) {
      return res.status(400).json({ error: 'Invalid service_category_id' });
    }

    // Create service
    const serviceData = {
      service_name,
      service_category_id: parseInt(service_category_id),
      aws_service_code,
      description: description || null,
      status: status || 'active'
    };

    const serviceId = await insert('services', serviceData);

    // Add pricing components if provided
    if (pricing_components && Array.isArray(pricing_components)) {
      for (const component of pricing_components) {
        await insert('pricing_components', {
          service_id: serviceId,
          component_name: component.component_name,
          metric_type: component.metric_type,
          unit: component.unit,
          rate: component.rate,
          currency: component.currency || 'USD',
          effective_from: component.effective_from || new Date()
        });
      }
    }

    // Log audit trail
    try {
      await auditLogger.log({
        user_id: req.user.user_id,
        action_type: 'CREATE',
        entity_type: 'service',
        entity_id: serviceId,
        entity_name: service_name,
        description: `Created service: ${service_name}`,
        new_values: { ...serviceData, pricing_components },
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        session_id: req.session?.session_id
      });
    } catch (auditError) {
      console.warn('Audit logging failed:', auditError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Service created successfully',
      data: { service: { service_id: serviceId, ...serviceData } }
    });
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/services/:id - Get single service
router.get('/:id', requireAuth, requirePermission('services', 'view'), async (req, res) => {
  try {
    const serviceId = parseInt(req.params.id);
    
    const service = await getOne(`
      SELECT s.*, sc.category_name, sc.aws_service_group
      FROM services s
      JOIN service_categories sc ON s.service_category_id = sc.category_id
      WHERE s.service_id = ?
    `, [serviceId]);

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Get pricing components
    const pricingComponents = await getMany(
      'SELECT * FROM pricing_components WHERE service_id = ? ORDER BY component_name',
      [serviceId]
    );

    res.json({
      success: true,
      data: {
        service,
        pricing_components: pricingComponents
      }
    });
  } catch (error) {
    console.error('Get service error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/services/:id - Update service
router.put('/:id', requireAuth, requirePermission('services', 'edit'), async (req, res) => {
  try {
    const serviceId = parseInt(req.params.id);
    
    const service = await getOne('SELECT * FROM services WHERE service_id = ?', [serviceId]);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Store old values for audit
    const oldValues = { ...service };

    // Check if service name is being changed and if it already exists
    if (req.body.service_name && req.body.service_name !== service.service_name) {
      const existingService = await getOne(
        'SELECT * FROM services WHERE service_name = ? AND service_id != ?',
        [req.body.service_name, serviceId]
      );
      if (existingService) {
        return res.status(409).json({ error: 'Service name already exists' });
      }
    }

    // Validate category if changed
    if (req.body.service_category_id) {
      const category = await getOne('SELECT * FROM service_categories WHERE category_id = ?', [req.body.service_category_id]);
      if (!category) {
        return res.status(400).json({ error: 'Invalid service_category_id' });
      }
    }

    await update('services', req.body, 'service_id = ?', [serviceId]);

    // Log audit trail
    try {
      await auditLogger.log({
        user_id: req.user.user_id,
        action_type: 'UPDATE',
        entity_type: 'service',
        entity_id: serviceId,
        entity_name: service.service_name,
        description: `Updated service: ${service.service_name}`,
        old_values: oldValues,
        new_values: req.body,
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        session_id: req.session?.session_id
      });
    } catch (auditError) {
      console.warn('Audit logging failed:', auditError.message);
    }

    res.json({
      success: true,
      message: 'Service updated successfully',
      data: { service: { ...service, ...req.body } }
    });
  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/services/:id - Delete service
router.delete('/:id', requireAuth, requirePermission('services', 'delete'), async (req, res) => {
  try {
    const serviceId = parseInt(req.params.id);
    
    const service = await getOne('SELECT * FROM services WHERE service_id = ?', [serviceId]);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Check if service is used in any invoices
    const usageCount = await getOne(
      `SELECT COUNT(*) as count 
       FROM invoice_line_items ili 
       JOIN pricing_components pc ON ili.component_id = pc.component_id 
       WHERE pc.service_id = ?`,
      [serviceId]
    );
    
    if (usageCount.count > 0) {
      return res.status(400).json({ error: 'Cannot delete service that is used in invoices' });
    }

    // Delete pricing components first
    await deleteRecord('pricing_components', 'service_id = ?', [serviceId]);
    
    // Delete service
    await deleteRecord('services', 'service_id = ?', [serviceId]);

    // Log audit trail
    try {
      await auditLogger.log({
        user_id: req.user.user_id,
        action_type: 'DELETE',
        entity_type: 'service',
        entity_id: serviceId,
        entity_name: service.service_name,
        description: `Deleted service: ${service.service_name}`,
        old_values: service,
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        session_id: req.session?.session_id
      });
    } catch (auditError) {
      console.warn('Audit logging failed:', auditError.message);
    }

    res.json({
      success: true,
      message: 'Service deleted successfully'
    });
  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/services/categories - List service categories
router.get('/categories/list', requireAuth, requirePermission('services', 'view'), async (req, res) => {
  try {
    const categories = await getMany(`
      SELECT sc.*, COUNT(s.service_id) as service_count
      FROM service_categories sc
      LEFT JOIN services s ON sc.category_id = s.service_category_id AND s.status = 'active'
      GROUP BY sc.category_id
      ORDER BY sc.category_name
    `);

    res.json({
      success: true,
      data: { categories }
    });
  } catch (error) {
    console.error('List service categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;