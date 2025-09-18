const { getOne, update, getMany } = require('../config/db');
const auditLogger = require('../utils/auditLogger');

class AuthController {
  /**
   * Constructor to bind methods to the instance
   * Ensures `this` context is preserved when methods are used as callbacks
   */
  constructor() {
    this.login = this.login.bind(this);
    this.getUserPermissions = this.getUserPermissions.bind(this);
    this.logout = this.logout.bind(this);
    this.verifyAuth = this.verifyAuth.bind(this);
  }

  /**
   * Handle user login with username/email and password
   * Checks user exists, is active, and validates plain text password
   * Updates last_login timestamp and returns user data with permissions
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({ 
          success: false,
          error: 'Email/username and password are required' 
        });
      }

      // Find user by email or username - only active users
      const user = await getOne(`
        SELECT u.*, r.role_name 
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

      // Check if account is locked due to failed attempts
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        return res.status(423).json({ 
          success: false,
          error: 'Account is temporarily locked due to multiple failed login attempts' 
        });
      }

      // Validate plain text password
      if (user.password !== password) {
        // Increment login attempts
        const newAttempts = (user.login_attempts || 0) + 1;
        const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
        
        let updateData = { login_attempts: newAttempts };
        
        // Lock account if max attempts reached
        if (newAttempts >= maxAttempts) {
          const lockoutDuration = parseInt(process.env.LOCKOUT_DURATION_MINUTES) || 30;
          updateData.locked_until = new Date(Date.now() + lockoutDuration * 60 * 1000);
        }
        
        await update('users', updateData, 'user_id = ?', [user.user_id]);
        
        return res.status(401).json({ 
          success: false,
          error: 'Invalid credentials' 
        });
      }

      // Get user permissions from role_permissions table
      const permissions = await this.getUserPermissions(user.role_id);

      // Update user login info on successful login
      await update('users', {
        last_login: new Date(),
        login_attempts: 0,
        locked_until: null
      }, 'user_id = ?', [user.user_id]);

      // Log successful login for audit trail
      try {
        await auditLogger.log({
          user_id: user.user_id,
          action_type: 'LOGIN',
          entity_type: 'user',
          entity_name: user.username,
          description: 'User logged in successfully',
          ip_address: req.ip || req.connection.remoteAddress,
          user_agent: req.get('User-Agent')
        });
      } catch (auditError) {
        console.warn('Audit logging failed:', auditError.message);
      }

      // Prepare user data for response (exclude sensitive information)
      const userData = {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        role_id: user.role_id,
        role_name: user.role_name,
        status: user.status,
        last_login: new Date().toISOString()
      };

      // Return success response with user data and permissions
      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: userData,
          permissions: permissions
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Internal server error during login' 
      });
    }
  }

  /**
   * Get user permissions based on role_id
   * Returns object with module permissions for easy frontend access
   */
  async getUserPermissions(roleId) {
    try {
      // Get all permissions for this role
      const rolePermissions = await getMany(`
        SELECT module_name, can_view, can_create, can_edit, can_delete
        FROM role_permissions 
        WHERE role_id = ?
      `, [roleId]);

      // Convert to object format for easy frontend access
      const permissions = {};
      rolePermissions.forEach(perm => {
        permissions[perm.module_name] = {
          can_view: Boolean(perm.can_view),
          can_create: Boolean(perm.can_create),
          can_edit: Boolean(perm.can_edit),
          can_delete: Boolean(perm.can_delete)
        };
      });

      return permissions;
    } catch (error) {
      console.error('Get user permissions error:', error);
      return {}; // Return empty permissions on error
    }
  }

  /**
   * Handle user logout
   * No session management, so just log the action
   */
  async logout(req, res) {
    try {
      // Log logout for audit trail if user info is provided
      if (req.body.user_id) {
        try {
          await auditLogger.log({
            user_id: req.body.user_id,
            action_type: 'LOGOUT',
            entity_type: 'user',
            description: 'User logged out',
            ip_address: req.ip || req.connection.remoteAddress,
            user_agent: req.get('User-Agent')
          });
        } catch (auditError) {
          console.warn('Audit logging failed:', auditError.message);
        }
      }

      res.json({ 
        success: true, 
        message: 'Logged out successfully' 
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Internal server error during logout' 
      });
    }
  }

  /**
   * Verify user authentication
   * No authentication state, so return a simple response
   */
  async verifyAuth(req, res) {
    try {
      res.json({
        success: true,
        message: 'No authentication state maintained'
      });
    } catch (error) {
      console.error('Auth verification error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Internal server error during auth verification' 
      });
    }
  }
}

module.exports = new AuthController();