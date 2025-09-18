const { getMany, getOne, insert, update, deleteRecord } = require('../config/db');
const sessionManager = require('../config/session');
const auditLogger = require('../utils/auditLogger');

class UsersController {
  async createUser(req, res) {
    try {
      const { username, email, password, role_id, status } = req.body;

      if (!username || !email || !password || !role_id) {
        return res.status(400).json({ error: 'Username, email, password, and role are required' });
      }

      // Check if user already exists
      const existingUser = await getOne(
        'SELECT * FROM users WHERE email = ? OR username = ?',
        [email, username]
      );

      if (existingUser) {
        return res.status(409).json({ error: 'User with this email or username already exists' });
      }

      // Validate role exists
      const role = await getOne('SELECT * FROM roles WHERE role_id = ?', [role_id]);
      if (!role) {
        return res.status(400).json({ error: 'Invalid role_id' });
      }

      // Create user (plain text password)
      const userData = {
        username,
        email,
        password, // Store as plain text as requested
        role_id: parseInt(role_id),
        status: status || 'active',
        created_by: req.user.user_id
      };

      const userId = await insert('users', userData);


      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: { 
          user: { 
            user_id: userId, 
            ...userData, 
            password: undefined // Don't return password
          } 
        }
      });
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async listUsers(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search || '';
      const roleId = req.query.role_id;
      const status = req.query.status;
      const offset = (page - 1) * limit;

      let whereClause = '1=1';
      let params = [];

      if (search) {
        whereClause += ' AND (u.username LIKE ? OR u.email LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }

      if (roleId) {
        whereClause += ' AND u.role_id = ?';
        params.push(roleId);
      }

      if (status) {
        whereClause += ' AND u.status = ?';
        params.push(status);
      }

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM users u 
        JOIN roles r ON u.role_id = r.role_id 
        WHERE ${whereClause}
      `;
      const countResult = await getOne(countQuery, params);
      const total = countResult.total;

      // Get users with role info
      const query = `
        SELECT u.user_id, u.username, u.email, u.status, u.last_login, u.login_attempts, 
               u.locked_until, u.created_at, u.updated_at,
               r.role_id, r.role_name,
               creator.username as created_by_username
        FROM users u
        JOIN roles r ON u.role_id = r.role_id
        LEFT JOIN users creator ON u.created_by = creator.user_id
        WHERE ${whereClause}
        ORDER BY u.created_at DESC
        LIMIT ? OFFSET ?
      `;
      const users = await getMany(query, [...params, limit, offset]);

      res.json({
        success: true,
        data: users,
        pagination: {
          total,
          pages: Math.ceil(total / limit),
          current_page: page,
          per_page: limit
        }
      });
    } catch (error) {
      console.error('List users error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getUser(req, res) {
    try {
      const userId = parseInt(req.params.id);

      const user = await getOne(`
        SELECT u.user_id, u.username, u.email, u.status, u.last_login, u.login_attempts,
               u.locked_until, u.created_at, u.updated_at,
               r.role_id, r.role_name,
               creator.username as created_by_username
        FROM users u
        JOIN roles r ON u.role_id = r.role_id
        LEFT JOIN users creator ON u.created_by = creator.user_id
        WHERE u.user_id = ?
      `, [userId]);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Get user's active sessions
      const sessions = await sessionManager.getUserSessions(userId);

      res.json({
        success: true,
        data: {
          user,
          active_sessions: sessions
        }
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateUser(req, res) {
    try {
      const userId = parseInt(req.params.id);
      
      const user = await getOne('SELECT * FROM users WHERE user_id = ?', [userId]);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Store old values for audit
      const oldValues = { ...user };
      delete oldValues.password; // Don't log password

      // Validate email if changed
      if (req.body.email && req.body.email !== user.email) {
        const existingUser = await getOne(
          'SELECT * FROM users WHERE email = ? AND user_id != ?',
          [req.body.email, userId]
        );
        if (existingUser) {
          return res.status(409).json({ error: 'Email already exists' });
        }
      }

      // Validate username if changed
      if (req.body.username && req.body.username !== user.username) {
        const existingUser = await getOne(
          'SELECT * FROM users WHERE username = ? AND user_id != ?',
          [req.body.username, userId]
        );
        if (existingUser) {
          return res.status(409).json({ error: 'Username already exists' });
        }
      }

      // Validate role if changed
      if (req.body.role_id) {
        const role = await getOne('SELECT * FROM roles WHERE role_id = ?', [req.body.role_id]);
        if (!role) {
          return res.status(400).json({ error: 'Invalid role_id' });
        }
      }

      // Prepare update data
      const updateData = { ...req.body };
      if (updateData.password) {
        // Store password as plain text as requested
        updateData.password = req.body.password;
      }

      await update('users', updateData, 'user_id = ?', [userId]);

      // Log audit trail
      const newValues = { ...updateData };
      delete newValues.password; // Don't log password
      
      await auditLogger.logUserAction(
        req, 'UPDATE', 'user', userId, user.username, oldValues, newValues
      );

      res.json({
        success: true,
        message: 'User updated successfully',
        data: { user: { ...user, ...updateData, password: undefined } }
      });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deleteUser(req, res) {
    try {
      const userId = parseInt(req.params.id);
      
      const user = await getOne('SELECT * FROM users WHERE user_id = ?', [userId]);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Prevent deletion of Super Admin
      if (user.role_id === 1) {
        return res.status(400).json({ error: 'Cannot delete Super Admin user' });
      }

      // Prevent self-deletion
      if (userId === req.user.user_id) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
      }

      // Destroy all user sessions
      await sessionManager.destroyUserSessions(userId);

      // Soft delete by setting status to inactive
      await update('users', { status: 'inactive' }, 'user_id = ?', [userId]);

      // Log audit trail
      await auditLogger.logUserAction(
        req, 'DELETE', 'user', userId, user.username, user, null
      );

      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async listRoles(req, res) {
    try {
      const roles = await getMany(`
        SELECT r.*, 
               COUNT(u.user_id) as user_count
        FROM roles r
        LEFT JOIN users u ON r.role_id = u.role_id AND u.status = 'active'
        GROUP BY r.role_id
        ORDER BY r.role_name
      `);

      res.json({
        success: true,
        data: { roles }
      });
    } catch (error) {
      console.error('List roles error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async createRole(req, res) {
    try {
      const { role_name, description, permissions } = req.body;

      if (!role_name) {
        return res.status(400).json({ error: 'Role name is required' });
      }

      // Check if role already exists
      const existingRole = await getOne('SELECT * FROM roles WHERE role_name = ?', [role_name]);
      if (existingRole) {
        return res.status(409).json({ error: 'Role with this name already exists' });
      }

      // Create role
      const roleData = {
        role_name,
        description: description || null,
        is_system_role: false
      };

      const roleId = await insert('roles', roleData);

      // Insert permissions if provided
      if (permissions && typeof permissions === 'object') {
        for (const [moduleName, modulePerms] of Object.entries(permissions)) {
          await insert('role_permissions', {
            role_id: roleId,
            module_name: moduleName,
            can_view: modulePerms.can_view || false,
            can_create: modulePerms.can_create || false,
            can_edit: modulePerms.can_edit || false,
            can_delete: modulePerms.can_delete || false
          });
        }
      }

      // Log audit trail
      await auditLogger.logUserAction(
        req, 'CREATE', 'role', roleId, role_name, null, { ...roleData, permissions }
      );

      res.status(201).json({
        success: true,
        message: 'Role created successfully',
        data: { role: { role_id: roleId, ...roleData } }
      });
    } catch (error) {
      console.error('Create role error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateRole(req, res) {
    try {
      const roleId = parseInt(req.params.id);
      const { role_name, description, permissions } = req.body;

      const role = await getOne('SELECT * FROM roles WHERE role_id = ?', [roleId]);
      if (!role) {
        return res.status(404).json({ error: 'Role not found' });
      }

      // Prevent modification of system roles
      if (role.is_system_role) {
        return res.status(400).json({ error: 'Cannot modify system roles' });
      }

      const oldValues = { ...role };

      // Update role
      const updateData = {};
      if (role_name) updateData.role_name = role_name;
      if (description !== undefined) updateData.description = description;

      if (Object.keys(updateData).length > 0) {
        await update('roles', updateData, 'role_id = ?', [roleId]);
      }

      // Update permissions if provided
      if (permissions && typeof permissions === 'object') {
        // Delete existing permissions
        await deleteRecord('role_permissions', 'role_id = ?', [roleId]);

        // Insert new permissions
        for (const [moduleName, modulePerms] of Object.entries(permissions)) {
          await insert('role_permissions', {
            role_id: roleId,
            module_name: moduleName,
            can_view: modulePerms.can_view || false,
            can_create: modulePerms.can_create || false,
            can_edit: modulePerms.can_edit || false,
            can_delete: modulePerms.can_delete || false
          });
        }
      }

      // Log audit trail
      await auditLogger.logUserAction(
        req, 'UPDATE', 'role', roleId, role.role_name, oldValues, { ...updateData, permissions }
      );

      res.json({
        success: true,
        message: 'Role updated successfully',
        data: { role: { ...role, ...updateData } }
      });
    } catch (error) {
      console.error('Update role error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deleteRole(req, res) {
    try {
      const roleId = parseInt(req.params.id);
      
      const role = await getOne('SELECT * FROM roles WHERE role_id = ?', [roleId]);
      if (!role) {
        return res.status(404).json({ error: 'Role not found' });
      }

      // Prevent deletion of system roles
      if (role.is_system_role) {
        return res.status(400).json({ error: 'Cannot delete system roles' });
      }

      // Check if role has users
      const userCount = await getOne(
        'SELECT COUNT(*) as count FROM users WHERE role_id = ? AND status = "active"',
        [roleId]
      );
      
      if (userCount.count > 0) {
        return res.status(400).json({ error: 'Cannot delete role with active users' });
      }

      // Delete role and its permissions
      await deleteRecord('role_permissions', 'role_id = ?', [roleId]);
      await deleteRecord('roles', 'role_id = ?', [roleId]);

      // Log audit trail
      await auditLogger.logUserAction(
        req, 'DELETE', 'role', roleId, role.role_name, role, null
      );

      res.json({
        success: true,
        message: 'Role deleted successfully'
      });
    } catch (error) {
      console.error('Delete role error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getRolePermissions(req, res) {
    try {
      const roleId = parseInt(req.params.id);

      const role = await getOne('SELECT * FROM roles WHERE role_id = ?', [roleId]);
      if (!role) {
        return res.status(404).json({ error: 'Role not found' });
      }

      const permissions = await getMany(
        'SELECT * FROM role_permissions WHERE role_id = ? ORDER BY module_name',
        [roleId]
      );

      res.json({
        success: true,
        data: {
          role,
          permissions
        }
      });
    } catch (error) {
      console.error('Get role permissions error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getUserSessions(req, res) {
    try {
      const userId = parseInt(req.params.id);

      // Only Super Admin or the user themselves can view sessions
      if (req.user.role_name !== 'Super Admin' && req.user.user_id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const sessions = await sessionManager.getUserSessions(userId);

      res.json({
        success: true,
        data: { sessions }
      });
    } catch (error) {
      console.error('Get user sessions error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async terminateUserSessions(req, res) {
    try {
      const userId = parseInt(req.params.id);

      // Only Super Admin can terminate other user's sessions
      if (req.user.role_name !== 'Super Admin' && req.user.user_id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const success = await sessionManager.destroyUserSessions(userId);

      if (success) {
        // Log audit trail
        try {
          await auditLogger.logUserAction(
            req, 'FORCE_LOGOUT', 'user', userId, 'Terminate User Sessions'
          );
        } catch (error) {
          console.warn('Audit logging failed:', error.message);
        }

        res.json({
          success: true,
          message: 'User sessions terminated successfully'
        });
      } else {
        res.status(500).json({ error: 'Failed to terminate sessions' });
      }
    } catch (error) {
      console.error('Terminate user sessions error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new UsersController();