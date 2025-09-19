const { getOne, update } = require('../config/db');

// Session-based authentication middleware
const requireAuth = async (req, res, next) => {
  try {
    // Check if user is logged in via session
    if (!req.session?.user_id) {
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required' 
      });
    }
    
    // Validate user still exists and is active
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

    // Attach user info to request
    req.user = {
      user_id: user.user_id,
      username: user.username,
      email: user.email,
      role_id: user.role_id,
      role_name: user.role_name,
      status: user.status
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
};

// Check if user has specific permission
const requirePermission = (moduleName, action) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          success: false,
          error: 'Authentication required' 
        });
      }

      // Super Admin has all permissions
      if (req.user.role_name === 'Super Admin') {
        return next();
      }

      // Check specific permission
      const permission = await getOne(`
        SELECT can_${action} as has_permission
        FROM role_permissions 
        WHERE role_id = ? AND module_name = ?
      `, [req.user.role_id, moduleName]);

      if (!permission || !permission.has_permission) {
        return res.status(403).json({ 
          success: false,
          error: 'Insufficient permissions' 
        });
      }

      next();
    } catch (error) {
      console.error('Permission middleware error:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Internal server error' 
      });
    }
  };
};

// Check if user has specific role
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required' 
      });
    }

    const userRole = req.user.role_name;
    if (!roles.includes(userRole)) {
      return res.status(403).json({ 
        success: false,
        error: 'Access denied' 
      });
    }

    next();
  };
};

// Super Admin only access
const requireSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false,
      error: 'Authentication required' 
    });
  }

  if (req.user.role_name !== 'Super Admin') {
    return res.status(403).json({ 
      success: false,
      error: 'Super Admin access required' 
    });
  }

  next();
};

module.exports = {
  requireAuth,
  requirePermission,
  requireRole,
  requireSuperAdmin
};