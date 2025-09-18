const express = require('express');
const router = express.Router();
const { getMany, getOne } = require('../config/db');
const { requireAuth, requirePermission } = require('../middlewares/auth.middleware');

// GET /api/analytics/super-admin
router.get('/super-admin', requireAuth, requirePermission('analytics', 'view'), async (req, res) => {
  try {
    // Get basic counts
    const totalClients = await getOne('SELECT COUNT(*) as count FROM clients WHERE status = "active"');
    const totalUsers = await getOne('SELECT COUNT(*) as count FROM users WHERE status = "active"');
    const totalServices = await getOne('SELECT COUNT(*) as count FROM services WHERE status = "active"');
    const totalInvoices = await getOne('SELECT COUNT(*) as count FROM invoices WHERE status != "draft"');

    // Get revenue data
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 7);

    const currentMonthRevenue = await getOne(
      `SELECT COALESCE(SUM(total_amount), 0) as revenue
       FROM invoices
       WHERE DATE_FORMAT(invoice_date, '%Y-%m') = ?
       AND status IN ('sent', 'paid')`,
      [currentMonth]
    );

    const lastMonthRevenue = await getOne(
      `SELECT COALESCE(SUM(total_amount), 0) as revenue
       FROM invoices
       WHERE DATE_FORMAT(invoice_date, '%Y-%m') = ?
       AND status IN ('sent', 'paid')`,
      [lastMonth]
    );

    const revenueGrowth = lastMonthRevenue.revenue > 0
      ? ((currentMonthRevenue.revenue - lastMonthRevenue.revenue) / lastMonthRevenue.revenue * 100)
      : 0;

    // Get revenue trend (last 6 months)
    const revenueTrend = await getMany(`
      SELECT DATE_FORMAT(invoice_date, '%Y-%m') as month,
             COALESCE(SUM(total_amount), 0) as revenue,
             COUNT(*) as invoice_count
      FROM invoices
      WHERE invoice_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      AND status IN ('sent', 'paid')
      GROUP BY DATE_FORMAT(invoice_date, '%Y-%m')
      ORDER BY month
    `);

    // Get top clients
    const topClients = await getMany(`
      SELECT c.client_name,
             COALESCE(SUM(i.total_amount), 0) as revenue,
             COUNT(i.invoice_id) as invoice_count
      FROM clients c
      LEFT JOIN invoices i ON c.client_id = i.client_id AND i.status IN ('sent', 'paid')
      WHERE c.status = 'active'
      GROUP BY c.client_id, c.client_name
      ORDER BY revenue DESC
      LIMIT 5
    `);

    // Get service usage
    const serviceUsage = await getMany(`
      SELECT s.service_name,
             COALESCE(SUM(ili.quantity * ili.rate), 0) as revenue,
             COUNT(ili.line_item_id) as usage_count
      FROM services s
      LEFT JOIN pricing_components pc ON s.service_id = pc.service_id
      LEFT JOIN invoice_line_items ili ON pc.component_id = ili.component_id
      LEFT JOIN invoices i ON ili.invoice_id = i.invoice_id AND i.status IN ('sent', 'paid')
      WHERE s.status = 'active'
      GROUP BY s.service_id, s.service_name
      ORDER BY revenue DESC
      LIMIT 10
    `);

    // Get invoice status distribution
    const invoiceStatus = await getMany(`
      SELECT status, COUNT(*) as count, COALESCE(SUM(total_amount), 0) as amount
      FROM invoices
      GROUP BY status
    `);

    const analyticsData = {
      metrics: {
        total_clients: totalClients.count,
        total_users: totalUsers.count,
        total_services: totalServices.count,
        total_invoices: totalInvoices.count,
        revenue_this_month: currentMonthRevenue.revenue,
        revenue_last_month: lastMonthRevenue.revenue,
        revenue_growth: parseFloat(revenueGrowth.toFixed(2))
      },
      charts: {
        revenue_trend: revenueTrend,
        top_clients: topClients,
        service_usage: serviceUsage,
        invoice_status: invoiceStatus
      },
      generated_at: new Date().toISOString()
    };

    res.json({
      success: true,
      data: analyticsData
    });
  } catch (error) {
    console.error('Get super admin analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/analytics/client-manager
router.get('/client-manager', requireAuth, requirePermission('analytics', 'view'), async (req, res) => {
  try {
    // Get manager-specific data
    const assignedClients = await getOne(
      'SELECT COUNT(*) as count FROM clients WHERE status = "active"'
    );

    const managerInvoices = await getOne(
      'SELECT COUNT(*) as count FROM invoices WHERE created_by = ?',
      [req.user.user_id]
    );

    const managerRevenue = await getOne(
      `SELECT COALESCE(SUM(total_amount), 0) as revenue
       FROM invoices
       WHERE created_by = ? AND status IN ('sent', 'paid')`,
      [req.user.user_id]
    );

    const pendingInvoices = await getOne(
      'SELECT COUNT(*) as count FROM invoices WHERE status = "pending_approval"'
    );

    // Get monthly trend for manager
    const monthlyTrend = await getMany(`
      SELECT DATE_FORMAT(invoice_date, '%Y-%m') as month,
             COALESCE(SUM(total_amount), 0) as revenue
      FROM invoices
      WHERE created_by = ? 
      AND invoice_date >= DATE_SUB(CURDATE(), INTERVAL 5 MONTH)
      AND status IN ('sent', 'paid')
      GROUP BY DATE_FORMAT(invoice_date, '%Y-%m')
      ORDER BY month
    `, [req.user.user_id]);

    const analyticsData = {
      metrics: {
        assigned_clients: assignedClients.count,
        total_invoices: managerInvoices.count,
        revenue_this_month: managerRevenue.revenue,
        pending_invoices: pendingInvoices.count
      },
      charts: {
        monthly_trend: monthlyTrend
      },
      generated_at: new Date().toISOString()
    };

    res.json({
      success: true,
      data: analyticsData
    });
  } catch (error) {
    console.error('Get client manager analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/analytics/auditor
router.get('/auditor', requireAuth, requirePermission('analytics', 'view'), async (req, res) => {
  try {
    const totalClients = await getOne('SELECT COUNT(*) as count FROM clients');
    const totalInvoices = await getOne('SELECT COUNT(*) as count FROM invoices');
    
    const totalRevenue = await getOne(`
      SELECT COALESCE(SUM(total_amount), 0) as revenue
      FROM invoices
      WHERE status IN ('sent', 'paid')
    `);

    const gstInvoices = await getOne(`
      SELECT COUNT(*) as count
      FROM invoices
      WHERE gst_applicable = TRUE
    `);

    const overdueInvoices = await getOne(`
      SELECT COUNT(*) as count
      FROM invoices
      WHERE status = 'overdue'
    `);

    // Get revenue trend
    const revenueTrend = await getMany(`
      SELECT DATE_FORMAT(invoice_date, '%Y-%m') as month,
             COALESCE(SUM(total_amount), 0) as revenue
      FROM invoices
      WHERE invoice_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      AND status IN ('sent', 'paid')
      GROUP BY DATE_FORMAT(invoice_date, '%Y-%m')
      ORDER BY month
    `);

    // Get invoice status distribution
    const invoiceStatus = await getMany(`
      SELECT status, COUNT(*) as count
      FROM invoices
      GROUP BY status
    `);

    // Get client distribution
    const clientDistribution = await getMany(`
      SELECT c.client_name,
             COALESCE(SUM(i.total_amount), 0) as revenue
      FROM clients c
      LEFT JOIN invoices i ON c.client_id = i.client_id AND i.status IN ('sent', 'paid')
      GROUP BY c.client_id, c.client_name
      ORDER BY revenue DESC
      LIMIT 5
    `);

    const analyticsData = {
      metrics: {
        total_clients: totalClients.count,
        total_invoices: totalInvoices.count,
        total_revenue: totalRevenue.revenue,
        gst_invoices: gstInvoices.count,
        overdue_invoices: overdueInvoices.count
      },
      charts: {
        revenue_trend: revenueTrend,
        invoice_status: invoiceStatus,
        client_distribution: clientDistribution
      },
      generated_at: new Date().toISOString()
    };

    res.json({
      success: true,
      data: analyticsData
    });
  } catch (error) {
    console.error('Get auditor analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;