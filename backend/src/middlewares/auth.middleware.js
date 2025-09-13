const { User, Role, RoleModuleAccess } = require('../models');

// Check if user is authenticated
const requireAuth = async (req, res, next) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get user with role and permissions
    const user = await User.findByPk(req.session.userId, {
      include: [{
        model: Role,
        as: 'role',
        include: [{
          model: RoleModuleAccess,
          as: 'moduleAccess'
        }]
      }]
    });

    if (!user || user.status !== 'active') {
      req.session.destroy();
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    req.user = user;
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
      if (req.user.role.role_name === 'Super Admin') {
        return next();
      }

      // Check specific permission
      const hasPermission = req.user.hasPermission(moduleName, action);
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

    const userRole = req.user.role.role_name;
    if (!roles.includes(userRole)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    next();
  };
};

module.exports = {
  requireAuth,
  requirePermission,
  requireRole
};