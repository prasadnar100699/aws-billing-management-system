const { getOne, getMany, update } = require('../config/db');
const sessionManager = require('../config/session');
const auditLogger = require('../utils/auditLogger');

class AuthController {
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      // Find user by email or username
      const user = await getOne(`
        SELECT u.*, r.role_name 
        FROM users u
        JOIN roles r ON u.role_id = r.role_id
        WHERE (u.email = ? OR u.username = ?) AND u.status = 'active'
      `, [email, email]);

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Simple plaintext password comparison (as requested)
      if (user.password !== password) {
        // Increment login attempts
        await update('users',
          { login_attempts: (user.login_attempts || 0) + 1 },
          'user_id = ?',
          [user.user_id]
        );
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check if account is locked
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        return res.status(423).json({ error: 'Account is temporarily locked' });
      }

      // Create session
      const sessionId = await sessionManager.createSession(
        user.user_id,
        req.ip || req.connection.remoteAddress,
        req.get('User-Agent') || ''
      );

      // Update user login info
      await update('users', {
        last_login: new Date(),
        login_attempts: 0,
        locked_until: null
      }, 'user_id = ?', [user.user_id]);

      // Log successful login
      await auditLogger.log({
        user_id: user.user_id,
        action_type: 'LOGIN',
        entity_type: 'user',
        entity_name: user.username,
        description: 'User logged in successfully',
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        session_id: sessionId
      });

      // Set session cookie
      res.cookie('session_id', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 8 * 60 * 60 * 1000 // 8 hours
      });

      res.json({
        success: true,
        message: 'Login successful',
        session_id: sessionId,
        user: {
          user_id: user.user_id,
          username: user.username,
          email: user.email,
          role_name: user.role_name,
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
      const sessionId = req.cookies?.session_id || req.headers['x-session-id'];

      if (sessionId) {
        await sessionManager.destroySession(sessionId);

        if (req.user) {
          await auditLogger.log({
            user_id: req.user.user_id,
            action_type: 'LOGOUT',
            entity_type: 'user',
            entity_name: req.user.username,
            description: 'User logged out',
            ip_address: req.ip,
            user_agent: req.get('User-Agent'),
            session_id: sessionId
          });
        }
      }

      res.clearCookie('session_id');
      res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getCurrentUser(req, res) {
    try {
      const sessionId = req.cookies?.session_id || req.headers['x-session-id'];

      if (!sessionId) {
        return res.status(401).json({ error: 'No session found' });
      }

      const sessionData = await sessionManager.validateSession(sessionId);

      if (!sessionData) {
        res.clearCookie('session_id');
        return res.status(401).json({ error: 'Invalid or expired session' });
      }

      // 🔥 No permissions lookup — just return session user
      res.json({
        success: true,
        user: sessionData.user,
        session: {
          session_id: sessionData.session_id,
          expires_at: sessionData.expires_at
        }
      });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async forceLogout(req, res) {
    try {
      const { user_id } = req.body;

      if (!user_id) {
        return res.status(400).json({ error: 'user_id is required' });
      }

      if (req.user.role_name !== 'Super Admin') {
        return res.status(403).json({ error: 'Access denied' });
      }

      const success = await sessionManager.destroyUserSessions(user_id);

      if (success) {
        await auditLogger.log({
          user_id: req.user.user_id,
          action_type: 'FORCE_LOGOUT',
          entity_type: 'user',
          entity_id: user_id,
          description: 'Force logout initiated by Super Admin',
          ip_address: req.ip,
          user_agent: req.get('User-Agent'),
          session_id: req.session?.session_id
        });

        res.json({ success: true, message: 'User sessions terminated successfully' });
      } else {
        res.status(500).json({ error: 'Failed to terminate sessions' });
      }
    } catch (error) {
      console.error('Force logout error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getActiveSessions(req, res) {
    try {
      if (req.user.role_name !== 'Super Admin') {
        return res.status(403).json({ error: 'Access denied' });
      }

      const sessions = await getMany(`
        SELECT s.session_id, s.user_id, s.ip_address, s.user_agent,
               s.created_at, s.last_activity, s.expires_at,
               u.username, u.email, r.role_name
        FROM sessions s
        JOIN users u ON s.user_id = u.user_id
        JOIN roles r ON u.role_id = r.role_id
        WHERE s.is_active = TRUE AND s.expires_at > NOW()
        ORDER BY s.last_activity DESC
      `);

      res.json({ success: true, data: { sessions } });
    } catch (error) {
      console.error('Get active sessions error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new AuthController();
