const { AuditLog } = require('../models');

class AuditService {
  static async logUserAction(userId, action, details = null, req = null) {
    try {
      const auditData = {
        user_id: userId,
        action,
        details: typeof details === 'object' ? JSON.stringify(details) : details,
        timestamp: new Date()
      };

      if (req) {
        auditData.ip_address = req.ip || req.connection.remoteAddress;
        auditData.user_agent = req.get('User-Agent');
      }

      await AuditLog.create(auditData);
    } catch (error) {
      // Don't let audit logging break the main functionality
      console.error('Audit logging error:', error);
    }
  }

  static async getAuditLogs(filters = {}) {
    try {
      const { page = 1, limit = 50, userId, action, startDate, endDate } = filters;
      const offset = (page - 1) * limit;

      const whereClause = {};
      if (userId) whereClause.user_id = userId;
      if (action) whereClause.action = action;
      if (startDate && endDate) {
        whereClause.timestamp = {
          [require('sequelize').Op.between]: [startDate, endDate]
        };
      }

      const { count, rows } = await AuditLog.findAndCountAll({
        where: whereClause,
        include: [{
          model: require('../models').User,
          as: 'user',
          attributes: ['username', 'email']
        }],
        order: [['timestamp', 'DESC']],
        limit,
        offset
      });

      return {
        logs: rows,
        total: count,
        pages: Math.ceil(count / limit),
        currentPage: page
      };
    } catch (error) {
      throw new Error(`Failed to fetch audit logs: ${error.message}`);
    }
  }
}

module.exports = AuditService;