const express = require('express');
const router = express.Router();
const { getMany, getOne } = require('../config/db');
const { requireAuth, requirePermission } = require('../middlewares/auth.middleware');

// GET /api/reports/revenue - Revenue report
router.get('/revenue', requireAuth, requirePermission('reports', 'view'), async (req, res) => {
  try {
    const startDate = req.query.start_date;
    const endDate = req.query.end_date;
    const clientId = req.query.client_id;

    let whereClause = "status IN ('sent', 'paid')";
    let params = [];

    if (startDate) {
      whereClause += ' AND invoice_date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      whereClause += ' AND invoice_date <= ?';
      params.push(endDate);
    }

    if (clientId && clientId !== 'all') {
      whereClause += ' AND client_id = ?';
      params.push(clientId);
    }

    // Get revenue summary
    const revenueSummary = await getOne(`
      SELECT 
        COUNT(*) as total_invoices,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(SUM(gst_amount), 0) as total_gst,
        COALESCE(AVG(total_amount), 0) as average_invoice_amount
      FROM invoices
      WHERE ${whereClause}
    `, params);

    // Get revenue by month
    const revenueByMonth = await getMany(`
      SELECT 
        DATE_FORMAT(invoice_date, '%Y-%m') as month,
        COUNT(*) as invoice_count,
        COALESCE(SUM(total_amount), 0) as revenue,
        COALESCE(SUM(gst_amount), 0) as gst_amount
      FROM invoices
      WHERE ${whereClause}
      GROUP BY DATE_FORMAT(invoice_date, '%Y-%m')
      ORDER BY month
    `, params);

    // Get revenue by client
    const revenueByClient = await getMany(`
      SELECT 
        c.client_name,
        COUNT(i.invoice_id) as invoice_count,
        COALESCE(SUM(i.total_amount), 0) as revenue,
        COALESCE(SUM(i.gst_amount), 0) as gst_amount
      FROM clients c
      LEFT JOIN invoices i ON c.client_id = i.client_id
      WHERE i.invoice_id IS NULL OR (${whereClause})
      GROUP BY c.client_id, c.client_name
      HAVING revenue > 0
      ORDER BY revenue DESC
    `, params);

    // Get revenue by currency
    const revenueByCurrency = await getMany(`
      SELECT 
        currency,
        COUNT(*) as invoice_count,
        COALESCE(SUM(total_amount), 0) as revenue
      FROM invoices
      WHERE ${whereClause}
      GROUP BY currency
      ORDER BY revenue DESC
    `, params);

    res.json({
      success: true,
      data: {
        summary: revenueSummary,
        revenue_by_month: revenueByMonth,
        revenue_by_client: revenueByClient,
        revenue_by_currency: revenueByCurrency
      }
    });
  } catch (error) {
    console.error('Get revenue report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/reports/gst - GST report
router.get('/gst', requireAuth, requirePermission('reports', 'view'), async (req, res) => {
  try {
    const startDate = req.query.start_date;
    const endDate = req.query.end_date;

    let whereClause = "gst_applicable = TRUE AND status IN ('sent', 'paid')";
    let params = [];

    if (startDate) {
      whereClause += ' AND invoice_date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      whereClause += ' AND invoice_date <= ?';
      params.push(endDate);
    }

    // Get GST summary
    const gstSummary = await getOne(`
      SELECT 
        COUNT(*) as gst_invoices,
        COALESCE(SUM(gst_amount), 0) as total_gst_collected,
        COALESCE(SUM(total_amount), 0) as total_taxable_amount,
        COALESCE(AVG(gst_amount), 0) as average_gst_per_invoice
      FROM invoices
      WHERE ${whereClause}
    `, params);

    // Get GST by month
    const gstByMonth = await getMany(`
      SELECT 
        DATE_FORMAT(invoice_date, '%Y-%m') as month,
        COUNT(*) as invoice_count,
        COALESCE(SUM(gst_amount), 0) as gst_amount,
        COALESCE(SUM(total_amount - gst_amount), 0) as taxable_amount
      FROM invoices
      WHERE ${whereClause}
      GROUP BY DATE_FORMAT(invoice_date, '%Y-%m')
      ORDER BY month
    `, params);

    // Get GST by client
    const gstByClient = await getMany(`
      SELECT 
        c.client_name,
        c.gst_number,
        COUNT(i.invoice_id) as invoice_count,
        COALESCE(SUM(i.gst_amount), 0) as gst_amount,
        COALESCE(SUM(i.total_amount - i.gst_amount), 0) as taxable_amount
      FROM clients c
      JOIN invoices i ON c.client_id = i.client_id
      WHERE ${whereClause}
      GROUP BY c.client_id, c.client_name, c.gst_number
      ORDER BY gst_amount DESC
    `, params);

    // Get client GST registration status
    const clientGstStatus = await getMany(`
      SELECT 
        CASE WHEN gst_registered = TRUE THEN 'GST Registered' ELSE 'Non-GST' END as registration_status,
        COUNT(*) as client_count
      FROM clients
      WHERE status = 'active'
      GROUP BY gst_registered
    `);

    res.json({
      success: true,
      data: {
        summary: gstSummary,
        gst_by_month: gstByMonth,
        gst_by_client: gstByClient,
        client_gst_status: clientGstStatus
      }
    });
  } catch (error) {
    console.error('Get GST report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/reports/client-summary - Client summary report
router.get('/client-summary', requireAuth, requirePermission('reports', 'view'), async (req, res) => {
  try {
    const clientId = req.query.client_id;

    let whereClause = '1=1';
    let params = [];

    if (clientId && clientId !== 'all') {
      whereClause += ' AND c.client_id = ?';
      params.push(clientId);
    }

    // Get client summary
    const clientSummary = await getMany(`
      SELECT 
        c.client_id,
        c.client_name,
        c.email,
        c.gst_registered,
        c.default_currency,
        c.status,
        COUNT(i.invoice_id) as total_invoices,
        COALESCE(SUM(CASE WHEN i.status IN ('sent', 'paid') THEN i.total_amount ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.total_amount ELSE 0 END), 0) as paid_amount,
        COALESCE(SUM(CASE WHEN i.status IN ('sent', 'approved') THEN i.total_amount ELSE 0 END), 0) as pending_amount,
        COALESCE(SUM(CASE WHEN i.status = 'overdue' THEN i.total_amount ELSE 0 END), 0) as overdue_amount,
        MAX(i.invoice_date) as last_invoice_date
      FROM clients c
      LEFT JOIN invoices i ON c.client_id = i.client_id
      WHERE ${whereClause}
      GROUP BY c.client_id, c.client_name, c.email, c.gst_registered, c.default_currency, c.status
      ORDER BY total_revenue DESC
    `, params);

    res.json({
      success: true,
      data: {
        client_summary: clientSummary
      }
    });
  } catch (error) {
    console.error('Get client summary report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/reports/service-usage - Service usage report
router.get('/service-usage', requireAuth, requirePermission('reports', 'view'), async (req, res) => {
  try {
    const startDate = req.query.start_date;
    const endDate = req.query.end_date;

    let whereClause = "i.status IN ('sent', 'paid')";
    let params = [];

    if (startDate) {
      whereClause += ' AND i.invoice_date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      whereClause += ' AND i.invoice_date <= ?';
      params.push(endDate);
    }

    // Get service usage summary
    const serviceUsage = await getMany(`
      SELECT 
        s.service_name,
        sc.category_name,
        pc.component_name,
        pc.metric_type,
        pc.unit,
        COUNT(ili.line_item_id) as usage_count,
        COALESCE(SUM(ili.quantity), 0) as total_quantity,
        COALESCE(SUM(ili.quantity * ili.rate), 0) as total_cost,
        COALESCE(AVG(ili.rate), 0) as average_rate
      FROM services s
      JOIN service_categories sc ON s.service_category_id = sc.category_id
      JOIN pricing_components pc ON s.service_id = pc.service_id
      JOIN invoice_line_items ili ON pc.component_id = ili.component_id
      JOIN invoices i ON ili.invoice_id = i.invoice_id
      WHERE ${whereClause}
      GROUP BY s.service_id, s.service_name, sc.category_name, pc.component_id, pc.component_name, pc.metric_type, pc.unit
      ORDER BY total_cost DESC
    `, params);

    // Get usage by category
    const usageByCategory = await getMany(`
      SELECT 
        sc.category_name,
        sc.aws_service_group,
        COUNT(DISTINCT s.service_id) as service_count,
        COUNT(ili.line_item_id) as usage_count,
        COALESCE(SUM(ili.quantity * ili.rate), 0) as total_cost
      FROM service_categories sc
      JOIN services s ON sc.category_id = s.service_category_id
      JOIN pricing_components pc ON s.service_id = pc.service_id
      JOIN invoice_line_items ili ON pc.component_id = ili.component_id
      JOIN invoices i ON ili.invoice_id = i.invoice_id
      WHERE ${whereClause}
      GROUP BY sc.category_id, sc.category_name, sc.aws_service_group
      ORDER BY total_cost DESC
    `, params);

    res.json({
      success: true,
      data: {
        service_usage: serviceUsage,
        usage_by_category: usageByCategory
      }
    });
  } catch (error) {
    console.error('Get service usage report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;