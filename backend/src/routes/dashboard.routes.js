const express = require('express');
const router = express.Router();
const { getOne, getMany } = require('../config/db');
const { requireAuth } = require('../middlewares/auth.middleware');

// GET /api/dashboard - Get dashboard data based on user role
router.get('/', requireAuth, async (req, res) => {
  try {
    const userRole = req.user.role_name;
    let dashboardData;

    switch (userRole) {
      case 'Super Admin':
        dashboardData = await getSuperAdminDashboard();
        break;
      case 'Admin':
        dashboardData = await getAdminDashboard();
        break;
      case 'Manager':
        dashboardData = await getManagerDashboard(req.user.user_id);
        break;
      case 'Accountant':
        dashboardData = await getAccountantDashboard();
        break;
      case 'Auditor':
        dashboardData = await getAuditorDashboard();
        break;
      default:
        return res.status(403).json({ error: 'Invalid role' });
    }

    return res.json({ 
      success: true, 
      data: dashboardData 
    });
  } catch (error) {
    console.error('Get dashboard data error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Super Admin Dashboard
async function getSuperAdminDashboard() {
  try {
    // Get basic counts
    const totalUsers = await getOne('SELECT COUNT(*) as count FROM users WHERE status = "active"');
    const totalClients = await getOne('SELECT COUNT(*) as count FROM clients WHERE status = "active"');
    const totalInvoices = await getOne('SELECT COUNT(*) as count FROM invoices');
    const totalServices = await getOne('SELECT COUNT(*) as count FROM services WHERE status = "active"');

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

    const recentInvoices = await getMany(`
      SELECT i.invoice_number, i.total_amount, i.currency, i.status, i.created_at,
             c.client_name
      FROM invoices i
      JOIN clients c ON i.client_id = c.client_id
      ORDER BY i.created_at DESC
      LIMIT 5
    `);

    const topClients = await getMany(`
      SELECT c.client_name,
             COALESCE(SUM(i.total_amount), 0) as total_revenue,
             COUNT(i.invoice_id) as invoice_count
      FROM clients c
      LEFT JOIN invoices i ON c.client_id = i.client_id AND i.status IN ('sent', 'paid')
      WHERE c.status = 'active'
      GROUP BY c.client_id, c.client_name
      ORDER BY total_revenue DESC
      LIMIT 5
    `);

    const invoiceStatus = await getMany(`
      SELECT status, COUNT(*) as count, COALESCE(SUM(total_amount), 0) as amount
      FROM invoices
      GROUP BY status
    `);

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

    return {
      metrics: {
        total_users: totalUsers?.count || 0,
        total_clients: totalClients?.count || 0,
        total_invoices: totalInvoices?.count || 0,
        total_services: totalServices?.count || 0,
        current_month_revenue: currentMonthRevenue?.revenue || 0,
        last_month_revenue: lastMonthRevenue?.revenue || 0,
        revenue_growth: parseFloat(revenueGrowth.toFixed(2))
      },
      charts: {
        revenue_trend: revenueTrend,
        invoice_status: invoiceStatus,
        top_clients: topClients
      },
      recent_activity: recentInvoices,
      generated_at: new Date().toISOString()
    };
  } catch (error) {
    console.error('Get super admin dashboard error:', error);
    throw error;
  }
}

// Manager Dashboard
async function getManagerDashboard(userId) {
  try {
    const assignedClients = await getOne(
      `SELECT COUNT(*) as count FROM clients WHERE status = 'active'`
    );

    const managerInvoices = await getOne(
      `SELECT COUNT(*) as count FROM invoices WHERE created_by = ?`,
      [userId]
    );

    const managerRevenue = await getOne(
      `SELECT COALESCE(SUM(total_amount), 0) as revenue
       FROM invoices
       WHERE created_by = ? AND status IN ('sent', 'paid')`,
      [userId]
    );

    const pendingApprovals = await getOne(
      `SELECT COUNT(*) as count
       FROM invoices
       WHERE status = 'pending_review'`
    );

    return {
      metrics: {
        assigned_clients: assignedClients?.count || 0,
        total_invoices: managerInvoices?.count || 0,
        total_revenue: managerRevenue?.revenue || 0,
        pending_approvals: pendingApprovals?.count || 0
      },
      generated_at: new Date().toISOString()
    };
  } catch (error) {
    console.error('Get manager dashboard error:', error);
    throw error;
  }
}

// Accountant Dashboard
async function getAccountantDashboard() {
  try {
    const totalRevenue = await getOne(`
      SELECT COALESCE(SUM(total_amount), 0) as revenue
      FROM invoices
      WHERE status IN ('sent', 'paid')
    `);

    const pendingInvoices = await getOne(`
      SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as amount
      FROM invoices
      WHERE status IN ('approved', 'sent')
    `);

    const overdueInvoices = await getOne(`
      SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as amount
      FROM invoices
      WHERE status = 'overdue'
    `);

    const gstCollected = await getOne(`
      SELECT COALESCE(SUM(gst_amount), 0) as gst_amount
      FROM invoices
      WHERE gst_applicable = TRUE AND status IN ('sent', 'paid')
    `);

    return {
      metrics: {
        total_revenue: totalRevenue?.revenue || 0,
        pending_amount: pendingInvoices?.amount || 0,
        overdue_amount: overdueInvoices?.amount || 0,
        gst_collected: gstCollected?.gst_amount || 0,
        pending_invoices: pendingInvoices?.count || 0,
        overdue_invoices: overdueInvoices?.count || 0
      },
      generated_at: new Date().toISOString()
    };
  } catch (error) {
    console.error('Get accountant dashboard error:', error);
    throw error;
  }
}

// Auditor Dashboard
async function getAuditorDashboard() {
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

    return {
      metrics: {
        total_clients: totalClients?.count || 0,
        total_invoices: totalInvoices?.count || 0,
        total_revenue: totalRevenue?.revenue || 0,
        gst_invoices: gstInvoices?.count || 0
      },
      generated_at: new Date().toISOString()
    };
  } catch (error) {
    console.error('Get auditor dashboard error:', error);
    throw error;
  }
}

// Admin Dashboard
async function getAdminDashboard() {
  try {
    const totalUsers = await getOne('SELECT COUNT(*) as count FROM users WHERE status = "active"');
    const totalClients = await getOne('SELECT COUNT(*) as count FROM clients WHERE status = "active"');
    const totalInvoices = await getOne('SELECT COUNT(*) as count FROM invoices');

    const currentMonthRevenue = await getOne(`
      SELECT COALESCE(SUM(total_amount), 0) as revenue
      FROM invoices
      WHERE MONTH(invoice_date) = MONTH(CURDATE())
      AND YEAR(invoice_date) = YEAR(CURDATE())
      AND status IN ('sent', 'paid')
    `);

    return {
      metrics: {
        total_users: totalUsers?.count || 0,
        total_clients: totalClients?.count || 0,
        total_invoices: totalInvoices?.count || 0,
        current_month_revenue: currentMonthRevenue?.revenue || 0
      },
      generated_at: new Date().toISOString()
    };
  } catch (error) {
    console.error('Get admin dashboard error:', error);
    throw error;
  }
}

module.exports = router;