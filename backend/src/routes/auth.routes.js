const express = require('express');
const router = express.Router();
const { getOne, insert, update } = require('../config/db');
const auditLogger = require('../utils/auditLogger');

// POST /auth/login - User login with session creation
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Query user from database with role info
    const user = await getOne(`
      SELECT 
        u.user_id,
        u.username,
        u.email,
        u.password,
        u.status,
        u.role_id,
        u.login_attempts,
        u.locked_until,
        r.role_name
      FROM users u
      JOIN roles r ON u.role_id = r.role_id
      WHERE (u.email = ? OR u.username = ?) AND u.status = 'active'
    `, [email, email]);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials or account not active'
      });
    }

    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(423).json({
        success: false,
        error: 'Account is temporarily locked due to multiple failed login attempts'
      });
    }

    // Validate password (plain text comparison)
    if (user.password !== password) {
      // Increment login attempts
    // Get user permissions
    const permissions = await getUserPermissions(user.role_id);
      const newAttempts = (user.login_attempts || 0) + 1;
    // Create session
    req.session.user_id = user.user_id;
    req.session.username = user.username;
    req.session.email = user.email;
    req.session.role_id = user.role_id;
    req.session.role_name = user.role_name;
      const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
    // Update user login info on successful login
    await update('users', {
      last_login: new Date(),
      login_attempts: 0,
      locked_until: null
    }, 'user_id = ?', [user.user_id]);
      
    // Log successful login
    try {
      await auditLogger.log({
        user_id: user.user_id,
        action_type: 'LOGIN',
        entity_type: 'user',
        entity_name: user.username,
        description: 'User logged in successfully',
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        session_id: req.sessionID
      });
    } catch (auditError) {
      console.warn('Audit logging failed:', auditError.message);
    }
      let updateData = { login_attempts: newAttempts };
    // Return user data and permissions
    res.json({
      success: true,
      message: 'Login successful',
      session_id: req.sessionID,
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        role_name: user.role_name,
        role_id: user.role_id,
        status: user.status
      },
      permissions
    });
      
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during login'
    });
  }
});
      // Lock account if max attempts reached
// POST /auth/logout - User logout
router.post('/logout', async (req, res) => {
  try {
    // Log logout for audit trail
    if (req.session?.user_id) {
      try {
        await auditLogger.log({
          user_id: req.session.user_id,
          action_type: 'LOGOUT',
          entity_type: 'user',
          description: 'User logged out',
          ip_address: req.ip,
          user_agent: req.get('User-Agent'),
          session_id: req.sessionID
        });
      } catch (auditError) {
        console.warn('Audit logging failed:', auditError.message);
      }
    }
      if (newAttempts >= maxAttempts) {
    // Destroy session
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
      }
      res.clearCookie('session_id');
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    });
        const lockoutDuration = parseInt(process.env.LOCKOUT_DURATION_MINUTES) || 30;
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during logout'
    });
  }
});
        updateData.locked_until = new Date(Date.now() + lockoutDuration * 60 * 1000);
// GET /auth/me - Get current user info
router.get('/me', async (req, res) => {
  try {
    if (!req.session?.user_id) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
    }
      }
    // Get fresh user data
    const user = await getOne(`
      SELECT 
        u.user_id,
        u.username,
        u.email,
        u.status,
        u.role_id,
        r.role_name
      FROM users u
      JOIN roles r ON u.role_id = r.role_id
      WHERE u.user_id = ? AND u.status = 'active'
    `, [req.session.user_id]);
      
    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({
        success: false,
        error: 'User not found or inactive'
      });
    }
      await update('users', updateData, 'user_id = ?', [user.user_id]);
    // Get permissions
    const permissions = await getUserPermissions(user.role_id);
      
    res.json({
      success: true,
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        role_name: user.role_name,
        role_id: user.role_id,
        status: user.status
      },
      permissions
    });
      return res.status(401).json({
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});
        success: false,
// Helper function to get user permissions
async function getUserPermissions(roleId) {
  try {
    const { getMany } = require('../config/db');
    
    const rolePermissions = await getMany(`
      SELECT module_name, can_view, can_create, can_edit, can_delete
      FROM role_permissions 
      WHERE role_id = ?
    `, [roleId]);
        error: 'Invalid credentials'
    const permissions = {};
    rolePermissions.forEach(perm => {
      permissions[perm.module_name] = {
        can_view: Boolean(perm.can_view),
        can_create: Boolean(perm.can_create),
        can_edit: Boolean(perm.can_edit),
        can_delete: Boolean(perm.can_delete)
      };
    });
      });
    return permissions;
  } catch (error) {
    console.error('Get user permissions error:', error);
    return {};
  }
}
    }
module.exports = router;