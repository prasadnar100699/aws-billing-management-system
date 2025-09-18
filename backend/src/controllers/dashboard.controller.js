const { getOne, getMany } = require('../config/db');
const DashboardService = require('../services/dashboard.service');

class DashboardController {
  async getDashboardData(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const userRole = req.user.role_name;
      let dashboardData;

      switch (userRole) {
        case 'Super Admin':
          dashboardData = await DashboardService.getSuperAdminDashboard();
          break;
        case 'Admin':
          dashboardData = await DashboardService.getAdminDashboard();
          break;
        case 'Manager':
          dashboardData = await DashboardService.getManagerDashboard(req.user.user_id);
          break;
        case 'Accountant':
          dashboardData = await DashboardService.getAccountantDashboard();
          break;
        case 'Auditor':
          dashboardData = await DashboardService.getAuditorDashboard();
          break;
        default:
          return res.status(403).json({ error: 'Invalid role' });
      }

      return res.json({ success: true, data: dashboardData });
    } catch (error) {
      console.error('Get dashboard data error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new DashboardController();