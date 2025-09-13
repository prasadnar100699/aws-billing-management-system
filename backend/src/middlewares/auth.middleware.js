const { getOne } = require('../config/db');

// Hardcoded users for authentication
const USERS = [
  {
    user_id: 1,
    username: 'admin',
    email: 'admin@tejit.com',
    password: 'Admin@123',
    role_id: 1,
    role_name: 'Super Admin',
    status: 'active'
  },
  {
    user_id: 2,
    username: 'manager',
    email: 'manager@tejit.com',
    password: 'Manager@123',
    role_id: 2,
    role_name: 'Client Manager',
    status: 'active'
  },
  {
    user_id: 3,
    username: 'auditor',
    email: 'auditor@tejit.com',
    password: 'Auditor@123',
    role_id: 3,
    role_name: 'Auditor',
    status: 'active'
  }
];

// Simple session storage (in production, use proper session store)
const sessions = new Map();

// Check if user is authenticated
const requireAuth = async (req, res, next) => {
  try {
    const userEmail = req.headers['x-user-email'];
    
    if (!userEmail) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Find user by email
    const user = USERS.find(u => u.email === userEmail);
    
    if (!user || user.status !== 'active') {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    // Get user permissions from database
    const permissions = await getUserPermissions(user.role_id);
    
    req.user = { ...user, permissions };
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Check if user has specific permission
const requirePermission = (moduleName, action) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Super Admin has all permissions
      if (req.user.role_name === 'Super Admin') {
        return next();
      }

      // Check specific permission
      const hasPermission = req.user.permissions[moduleName]?.[`can_${action}`] || false;
      if (!hasPermission) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      next();
    } catch (error) {
      console.error('Permission middleware error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

// Check if user has specific role
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRole = req.user.role_name;
    if (!roles.includes(userRole)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    next();
  };
};

// Get user permissions from database
const getUserPermissions = async (roleId) => {
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
};

module.exports = {
  requireAuth,
  requirePermission,
  requireRole,
  USERS
};