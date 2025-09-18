const { insert } = require('../config/db');

class AuditLogger {
  async log(logData) {
    try {
      const auditEntry = {
        user_id: logData.user_id || null,
        action_type: logData.action_type,
        entity_type: logData.entity_type || null,
        entity_id: logData.entity_id || null,
        entity_name: logData.entity_name || null,
        description: logData.description || null,
        old_values: logData.old_values ? JSON.stringify(logData.old_values) : null,
        new_values: logData.new_values ? JSON.stringify(logData.new_values) : null,
        ip_address: logData.ip_address || null,
        user_agent: logData.user_agent || null,
        session_id: logData.session_id || null,
        created_at: new Date()
      };

      await insert('audit_logs', auditEntry);
      return true;
    } catch (error) {
      console.error('Audit log error:', error);
      return false;
    }
  }

  async logUserAction(req, action, entityType, entityId, entityName, oldValues = null, newValues = null) {
    return this.log({
      user_id: req.user?.user_id,
      action_type: action,
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName,
      description: `${action} ${entityType}: ${entityName}`,
      old_values: oldValues,
      new_values: newValues,
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      session_id: req.session?.session_id
    });
  }
}

module.exports = new AuditLogger();