const express = require('express');
const router = express.Router();
const { getMany, getOne, insert, update, deleteRecord, getPaginated } = require('../config/db');
const sessionManager = require('../config/session');
const auditLogger = require('../utils/auditLogger');
const { requireAuth, requirePermission, requireSuperAdmin } = require('../middlewares/auth.middleware');

// GET /api/users - List users with pagination
router.get('/', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const roleId = req.query.role_id;
    const status = req.query.status;

    let whereClause = '1=1';
    let whereParams = [];

    if (search) {
      whereClause += ' AND (u.username LIKE ? OR u.email LIKE ?)';
      whereParams.push(`%${search}%`, `%${search}%`);
    }

    if (roleId && roleId !== 'all') {
      whereClause += ' AND u.role_id = ?';
      whereParams.push(roleId);
    }

    if (status && status !== 'all') {
      whereClause += ' AND u.status = ?';
      whereParams.push(status);
    }

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

    const offset = (page - 1) * limit;
    const users = await getMany(query, [...whereParams, limit, offset]);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM users u 
      JOIN roles r ON u.role_id = r.role_id 
      WHERE ${whereClause}
    `;
    const countResult = await getOne(countQuery, whereParams);
    const total = countResult.total;

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
});

// POST /api/users - Create new user
router.post('/', requireAuth, requireSuperAdmin, async (req, res) => {
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

    // Log audit trail
    try {
      await auditLogger.log({
        user_id: req.user.user_id,
        action_type: 'CREATE',
        entity_type: 'user',
        entity_id: userId,
        entity_name: username,
        description: `Created user: ${username}`,
        new_values: { ...userData, password: '[HIDDEN]' },
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        session_id: req.session?.session_id
      });
    } catch (auditError) {
      console.warn('Audit logging failed:', auditError.message);
    }

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
});

// GET /api/users/:id - Get single user
router.get('/:id', requireAuth, requireSuperAdmin, async (req, res) => {
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
});

// PUT /api/users/:id - Update user
router.put('/:id', requireAuth, requireSuperAdmin, async (req, res) => {
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
    
    try {
      await auditLogger.log({
        user_id: req.user.user_id,
        action_type: 'UPDATE',
        entity_type: 'user',
        entity_id: userId,
        entity_name: user.username,
        description: `Updated user: ${user.username}`,
        old_values: oldValues,
        new_values: newValues,
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        session_id: req.session?.session_id
      });
    } catch (auditError) {
      console.warn('Audit logging failed:', auditError.message);
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user: { ...user, ...updateData, password: undefined } }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/users/:id - Delete user
router.delete('/:id', requireAuth, requireSuperAdmin, async (req, res) => {
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
    try {
      await auditLogger.log({
        user_id: req.user.user_id,
        action_type: 'DELETE',
        entity_type: 'user',
        entity_id: userId,
        entity_name: user.username,
        description: `Deleted user: ${user.username}`,
        old_values: { ...user, password: '[HIDDEN]' },
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        session_id: req.session?.session_id
      });
    } catch (auditError) {
      console.warn('Audit logging failed:', auditError.message);
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/roles - List roles
router.get('/roles/list', requireAuth, requireSuperAdmin, async (req, res) => {
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
});

// POST /api/users/roles - Create role
router.post('/roles', requireAuth, requireSuperAdmin, async (req, res) => {
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
    try {
      await auditLogger.log({
        user_id: req.user.user_id,
        action_type: 'CREATE',
        entity_type: 'role',
        entity_id: roleId,
        entity_name: role_name,
        description: `Created role: ${role_name}`,
        new_values: { ...roleData, permissions },
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        session_id: req.session?.session_id
      });
    } catch (auditError) {
      console.warn('Audit logging failed:', auditError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Role created successfully',
      data: { role: { role_id: roleId, ...roleData } }
    });
  } catch (error) {
    console.error('Create role error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/:id/sessions - Get user sessions
router.get('/:id/sessions', requireAuth, async (req, res) => {
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
});

// POST /api/users/:id/terminate-sessions - Terminate user sessions
router.post('/:id/terminate-sessions', requireAuth, async (req, res) => {
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
        await auditLogger.log({
          user_id: req.user.user_id,
          action_type: 'FORCE_LOGOUT',
          entity_type: 'user',
          entity_id: userId,
          description: 'Terminate User Sessions',
          ip_address: req.ip,
          user_agent: req.get('User-Agent'),
          session_id: req.session?.session_id
        });
      } catch (auditError) {
        console.warn('Audit logging failed:', auditError.message);
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
});

module.exports = router;