const { getMany, getOne } = require('../config/db');

class AnalyticsController {
  async getSuperAdminAnalytics(req, res) {
    try {
      // Get basic counts
      const totalClients = await getOne('SELECT COUNT(*) as count FROM clients WHERE status = "active"');
      const totalUsers = await getOne('SELECT COUNT(*) as count FROM users WHERE status = "active"');
      const totalServices = await getOne('SELECT COUNT(*) as count FROM services WHERE status = "active"');
      const totalInvoices = await getOne('SELECT COUNT(*) as count FROM invoices WHERE status != "draft"');

      // Mock revenue data for demo
      const analyticsData = {
        total_clients: totalClients.count,
        total_users: totalUsers.count,
        total_services: totalServices.count,
        active_aws_accounts: 8,
        total_invoices: totalInvoices.count,
        revenue_this_month: 67000,
        revenue_last_month: 55000,
        revenue_growth: 21.8,
        revenue_trend: {
          labels: ['Jul 2024', 'Aug 2024', 'Sep 2024', 'Oct 2024', 'Nov 2024', 'Dec 2024'],
          data: [
            { month: 'Jul 2024', revenue: 45000 },
            { month: 'Aug 2024', revenue: 52000 },
            { month: 'Sep 2024', revenue: 48000 },
            { month: 'Oct 2024', revenue: 61000 },
            { month: 'Nov 2024', revenue: 55000 },
            { month: 'Dec 2024', revenue: 67000 }
          ]
        },
        top_clients: [
          { client_name: 'TechCorp Inc', revenue: 85000 },
          { client_name: 'CloudTech Solutions', revenue: 62000 },
          { client_name: 'DataFlow Ltd', revenue: 48000 }
        ],
        service_usage: [
          { service_name: 'Amazon EC2', revenue: 125000 },
          { service_name: 'Amazon S3', revenue: 45000 },
          { service_name: 'Amazon RDS', revenue: 38000 },
          { service_name: 'Amazon CloudFront', revenue: 22000 }
        ],
        invoice_status: [
          { status: 'paid', count: 8 },
          { status: 'sent', count: 2 },
          { status: 'approved', count: 1 },
          { status: 'draft', count: 1 }
        ],
        recent_activity: [
          {
            type: 'invoice',
            description: 'Invoice created for TechCorp Inc',
            status: 'completed',
            date: new Date().toISOString()
          }
        ],
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
  }

  async getClientManagerAnalytics(req, res) {
    try {
      const analyticsData = {
        assigned_clients: 2,
        total_invoices: 8,
        revenue_this_month: 45000,
        pending_invoices: 2,
        overdue_invoices: 1,
        client_revenue: [
          { client_name: 'TechCorp Inc', revenue: 28000 },
          { client_name: 'CloudTech Solutions', revenue: 17000 }
        ],
        monthly_trend: {
          labels: ['Aug 2024', 'Sep 2024', 'Oct 2024', 'Nov 2024', 'Dec 2024'],
          data: [32000, 28000, 41000, 35000, 45000]
        },
        recent_activity: [
          {
            type: 'invoice',
            description: 'Invoice created for TechCorp Inc',
            status: 'sent',
            date: new Date().toISOString()
          }
        ],
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
  }

  async getAuditorAnalytics(req, res) {
    try {
      const analyticsData = {
        total_clients: 3,
        total_invoices: 12,
        total_revenue: 244000,
        revenue_this_month: 67000,
        revenue_this_year: 244000,
        gst_invoices: 6,
        overdue_invoices: 1,
        revenue_trend: {
          labels: ['Jul 2024', 'Aug 2024', 'Sep 2024', 'Oct 2024', 'Nov 2024', 'Dec 2024'],
          data: [
            { month: 'Jul 2024', revenue: 45000 },
            { month: 'Aug 2024', revenue: 52000 },
            { month: 'Sep 2024', revenue: 48000 },
            { month: 'Oct 2024', revenue: 61000 },
            { month: 'Nov 2024', revenue: 55000 },
            { month: 'Dec 2024', revenue: 67000 }
          ]
        },
        invoice_status: [
          { status: 'paid', count: 8 },
          { status: 'sent', count: 2 },
          { status: 'approved', count: 1 },
          { status: 'overdue', count: 1 }
        ],
        client_distribution: [
          { client_name: 'TechCorp Inc', revenue: 85000 },
          { client_name: 'CloudTech Solutions', revenue: 62000 },
          { client_name: 'DataFlow Ltd', revenue: 48000 }
        ],
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
  }
}

module.exports = new AnalyticsController();