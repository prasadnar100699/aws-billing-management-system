const crypto = require('crypto');
const { getOne, getMany, insert, update } = require('./db');

class SessionManager {
  constructor() {
    this.sessionTimeout = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
  }

  // Generate secure session ID
  generateSessionId() {
    return crypto.randomBytes(64).toString('hex');
  }

  // Create new session
  async createSession(userId, ipAddress, userAgent) {
    try {
      const sessionId = this.generateSessionId();
      const expiresAt = new Date(Date.now() + this.sessionTimeout);

      await insert('sessions', {
        session_id: sessionId,
        user_id: userId,
        ip_address: ipAddress,
        user_agent: userAgent,
        expires_at: expiresAt,
        is_active: true
      });

      return sessionId;
    } catch (error) {
      console.error('Create session error:', error);
      throw error;
    }
  }

  // Validate session
  async validateSession(sessionId) {
    try {
      if (!sessionId) return null;

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

      if (!session) return null;

      // Update last activity
      await update('sessions', 
        { last_activity: new Date() }, 
        'session_id = ?', 
        [sessionId]
      );

      return {
        session_id: session.session_id,
        user: {
          user_id: session.user_id,
          username: session.username,
          email: session.email,
          role_id: session.role_id,
          role_name: session.role_name,
          status: session.status
        }
      };
    } catch (error) {
      console.error('Validate session error:', error);
      return null;
    }
  }

  // Destroy session
  async destroySession(sessionId) {
    try {
      await update('sessions', 
        { is_active: false }, 
        'session_id = ?', 
        [sessionId]
      );
      return true;
    } catch (error) {
      console.error('Destroy session error:', error);
      return false;
    }
  }

  // Destroy all user sessions (force logout)
  async destroyUserSessions(userId) {
    try {
      await update('sessions', 
        { is_active: false }, 
        'user_id = ? AND is_active = TRUE', 
        [userId]
      );
      return true;
    } catch (error) {
      console.error('Destroy user sessions error:', error);
      return false;
    }
  }

  // Clean expired sessions
  async cleanExpiredSessions() {
    try {
      await update('sessions', 
        { is_active: false }, 
        'expires_at < NOW() AND is_active = TRUE', 
        []
      );
      return true;
    } catch (error) {
      console.error('Clean expired sessions error:', error);
      return false;
    }
  }

  // Get active sessions for user
  async getUserSessions(userId) {
    try {
      return await getMany(`
        SELECT session_id, ip_address, user_agent, created_at, last_activity, expires_at
        FROM sessions 
        WHERE user_id = ? AND is_active = TRUE
        ORDER BY last_activity DESC
      `, [userId]);
    } catch (error) {
      console.error('Get user sessions error:', error);
      return [];
    }
  }

  // Extend session
  async extendSession(sessionId) {
    try {
      const newExpiresAt = new Date(Date.now() + this.sessionTimeout);
      await update('sessions', 
        { expires_at: newExpiresAt, last_activity: new Date() }, 
        'session_id = ? AND is_active = TRUE', 
        [sessionId]
      );
      return true;
    } catch (error) {
      console.error('Extend session error:', error);
      return false;
    }
  }
}

module.exports = new SessionManager();