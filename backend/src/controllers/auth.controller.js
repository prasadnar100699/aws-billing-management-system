const { getOne } = require('../config/db');

// Hardcoded user credentials (no hashing)
const USERS = [
  {
    user_id: 1,
    username: 'admin',
    email: 'admin@tejit.com',
    password: 'password',
    role_id: 1,
    role_name: 'Super Admin',
    status: 'active'
  },
  {
    user_id: 2,
    username: 'manager',
    email: 'manager@tejit.com',
    password: 'password',
    role_id: 2,
    role_name: 'Client Manager',
    status: 'active'
  },
  {
    user_id: 3,
    username: 'auditor',
    email: 'auditor@tejit.com',
    password: 'password',
    role_id: 3,
    role_name: 'Auditor',
    status: 'active'
  }
];

class AuthController {
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      // Find user in hardcoded list
      const user = USERS.find(u => u.email === email && u.password === password);

      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      if (user.status !== 'active') {
        return res.status(401).json({ error: 'Account is inactive' });
      }

      // Store user in session (simple approach)
      req.session = { user };

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user_id: user.user_id,
          username: user.username,
          email: user.email,
          role: user.role_name,
          role_id: user.role_id,
          status: user.status
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async logout(req, res) {
    try {
      req.session = null;
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getCurrentUser(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not found' });
      }

      // Get user permissions from database
      const permissions = await this.getUserPermissions(req.user.role_id);

      res.json({
        success: true,
        data: {
          user: req.user,
          permissions
        }
      });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getUserPermissions(roleId) {
    try {
      const query = `
        SELECT module_name, can_view, can_create, can_edit, can_delete
        FROM role_module_access 
        WHERE role_id = ?
      `;
      const permissions = await require('../config/db').getMany(query, [roleId]);
      
      const permissionsObj = {};
      permissions.forEach(perm => {
        permissionsObj[perm.module_name] = {
          can_view: perm.can_view,
          can_create: perm.can_create,
          can_edit: perm.can_edit,
          can_delete: perm.can_delete
        };
      });
      
      return permissionsObj;
    } catch (error) {
      console.error('Get permissions error:', error);
      return {};
    }
  }
}

module.exports = new AuthController();