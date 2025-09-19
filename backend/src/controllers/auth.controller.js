const { getOne, update, getMany } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
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
   * Checks user exists, is active, and validates hashed password
   * Returns JWT token and user data with permissions
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({ 
          success: false,
          error: 'Email and password are required' 
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

      // Validate password (check if it's hashed or plain text)
      let isValidPassword = false;
      
      if (user.password.startsWith('$2')) {
        // Password is hashed with bcrypt
        isValidPassword = await bcrypt.compare(password, user.password);
      } else {
        // Plain text password (for backward compatibility)
        isValidPassword = user.password === password;
        
        // Hash the password for future use
        const hashedPassword = await bcrypt.hash(password, 12);
        await update('users', { password: hashedPassword }, 'user_id = ?', [user.user_id]);
      }

      if (!isValidPassword) {
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

      // Generate JWT token
      const token = jwt.sign(
        { 
          user_id: user.user_id,
          email: user.email,
          role_id: user.role_id,
          role_name: user.role_name
        },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

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

      // Return success response with user data, permissions, and token
      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: userData,
          permissions: permissions,
          token: token
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
   * Log the action for audit trail
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
   * Verify JWT token and return user data
   */
  async verifyAuth(req, res) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({
          success: false,
          error: 'No token provided'
        });
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
      
      // Get fresh user data
      const user = await getOne(`
        SELECT u.*, r.role_name 
        FROM users u
        JOIN roles r ON u.role_id = r.role_id
        WHERE u.user_id = ? AND u.status = 'active'
      `, [decoded.user_id]);

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'User not found or inactive'
        });
      }

      // Get permissions
      const permissions = await this.getUserPermissions(user.role_id);

      res.json({
        success: true,
        data: {
          user: {
            user_id: user.user_id,
            username: user.username,
            email: user.email,
            role_id: user.role_id,
            role_name: user.role_name,
            status: user.status
          },
          permissions
        }
      });

    } catch (error) {
      console.error('Auth verification error:', error);
      res.status(401).json({ 
        success: false,
        error: 'Invalid or expired token' 
      });
    }
  }
}

module.exports = new AuthController();