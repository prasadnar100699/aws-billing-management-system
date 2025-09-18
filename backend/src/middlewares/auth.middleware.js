const { getOne } = require('../config/db');

// Session-based authentication middleware
const requireAuth = async (req, res, next) => {
  try {
    const sessionId = req.headers['x-session-id'] || req.cookies?.session_id;
    
    if (!sessionId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Validate session in database
    const session = await getOne(`
      SELECT s.*, u.user_id, u.username, u.email, u.role_id, u.status,
             r.role_name
      FROM sessions s
      JOIN users u ON s.user_id = u.user_id
      JOIN roles r ON u.role_id = r.role_id
      WHERE s.session_id = ? 
      AND s.is_active = TRUE 
      AND s.expires_at > NOW()
      AND u.status = 'active'
    `, [sessionId]);

    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    // Update last activity
    await require('../config/db').update('sessions', 
      { last_activity: new Date() }, 
      'session_id = ?', 
      [sessionId]
    );

    // Attach user to request
    req.user = {
      user_id: session.user_id,
      username: session.username,
      email: session.email,
      role_id: session.role_id,
      role_name: session.role_name,
      status: session.status
    };
    req.session = {
      session_id: sessionId,
      expires_at: session.expires_at
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Internal server error' });
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
      const permission = await getOne(`
        SELECT can_${action} as has_permission
        FROM role_permissions 
        WHERE role_id = ? AND module_name = ?
      `, [req.user.role_id, moduleName]);

      if (!permission || !permission.has_permission) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      next();
    } catch (error) {
      console.error('Permission middleware error:', error);
      return res.status(500).json({ error: 'Internal server error' });
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

// Super Admin only access
const requireSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role_name !== 'Super Admin') {
    return res.status(403).json({ error: 'Super Admin access required' });
  }

  next();
};

// Optional authentication (for public endpoints that can benefit from user context)
const optionalAuth = async (req, res, next) => {
  try {
    const sessionId = req.headers['x-session-id'] || req.cookies?.session_id;
    
    if (sessionId) {
      const session = await getOne(`
        SELECT s.*, u.user_id, u.username, u.email, u.role_id, u.status,
               r.role_name
        FROM sessions s
        JOIN users u ON s.user_id = u.user_id
        JOIN roles r ON u.role_id = r.role_id
        WHERE s.session_id = ? 
        AND s.is_active = TRUE 
        AND s.expires_at > NOW()
        AND u.status = 'active'
      `, [sessionId]);

      if (session) {
        req.user = {
          user_id: session.user_id,
          username: session.username,
          email: session.email,
          role_id: session.role_id,
          role_name: session.role_name,
          status: session.status
        };
        req.session = {
          session_id: sessionId,
          expires_at: session.expires_at
        };
      }
    }
    
    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next(); // Continue without authentication
  }
};

module.exports = {
  requireAuth,
  requirePermission,
  requireRole,
  requireSuperAdmin,
  optionalAuth
};