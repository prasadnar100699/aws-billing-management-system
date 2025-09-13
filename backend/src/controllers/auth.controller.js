const { User, Role, RoleModuleAccess } = require('../models');
const AuditService = require('../services/audit.service');
const { success, error } = require('../utils/response');

class AuthController {
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return error(res, 'Email and password are required', 400);
      }

      // Find user with role and permissions
      const user = await User.findOne({
        where: { email },
        include: [{
          model: Role,
          as: 'role',
          include: [{
            model: RoleModuleAccess,
            as: 'moduleAccess'
          }]
        }]
      });

      if (!user || !(await user.checkPassword(password))) {
        await AuditService.logUserAction(null, 'login_failed', `Failed login attempt for ${email}`, req);
        return error(res, 'Invalid email or password', 401);
      }

      if (user.status !== 'active') {
        return error(res, 'Account is inactive', 401);
      }

      // Update last login
      await user.update({ last_login: new Date() });

      // Create session
      req.session.userId = user.user_id;
      req.session.userEmail = user.email;
      req.session.userRole = user.role.role_name;

      await AuditService.logUserAction(user.user_id, 'login_success', 'User logged in successfully', req);

      success(res, {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        role: user.role.role_name,
        role_id: user.role_id,
        status: user.status
      }, 'Login successful');
    } catch (err) {
      console.error('Login error:', err);
      error(res, 'Internal server error', 500);
    }
  }

  async logout(req, res) {
    try {
      if (req.session) {
        await AuditService.logUserAction(req.session.userId, 'logout', 'User logged out', req);
        
        req.session.destroy((err) => {
          if (err) {
            console.error('Session destroy error:', err);
            return error(res, 'Logout failed', 500);
          }
          res.clearCookie('aws_billing_session');
          success(res, null, 'Logged out successfully');
        });
      } else {
        success(res, null, 'Logged out successfully');
      }
    } catch (err) {
      console.error('Logout error:', err);
      error(res, 'Internal server error', 500);
    }
  }

  async getCurrentUser(req, res) {
    try {
      if (!req.user) {
        return error(res, 'User not found', 404);
      }

      // Build permissions object
      const permissions = {};
      if (req.user.role && req.user.role.moduleAccess) {
        req.user.role.moduleAccess.forEach(access => {
          permissions[access.module_name] = {
            can_view: access.can_view,
            can_create: access.can_create,
            can_edit: access.can_edit,
            can_delete: access.can_delete
          };
        });
      }

      success(res, {
        user: req.user.toJSON(),
        permissions
      });
    } catch (err) {
      console.error('Get current user error:', err);
      error(res, 'Internal server error', 500);
    }
  }
}

module.exports = new AuthController();