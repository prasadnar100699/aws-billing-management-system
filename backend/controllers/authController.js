const { executeQuery } = require('../config/database');

/**
 * Authentication Controller
 * Handles user login without JWT tokens - enterprise simplified approach
 */
class AuthController {
  /**
   * User login endpoint
   * Validates credentials against database and checks user status
   */
  static async login(req, res, next) {
    try {
      const { username, password } = req.body;

      // Input validation
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username and password are required'
        });
      }

      // Query user from database
      const query = `
        SELECT 
          u.id,
          u.username,
          u.email,
          u.first_name,
          u.last_name,
          u.status,
          u.role_id,
          r.name as role_name,
          r.permissions
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.username = ? AND u.password = ? AND u.status = 'active'
      `;

      const users = await executeQuery(query, [username, password]);

      if (users.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Invalid Login ID or Password'
        });
      }

      const user = users[0];

      // Return user data for frontend
      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: {
              id: user.role_id,
              name: user.role_name,
              permissions: user.permissions ? JSON.parse(user.permissions) : []
            }
          }
        }
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current user profile
   */
  static async getProfile(req, res, next) {
    try {
      const { userId } = req.params;

      const query = `
        SELECT 
          u.id,
          u.username,
          u.email,
          u.first_name,
          u.last_name,
          u.status,
          u.created_at,
          r.name as role_name,
          r.permissions
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.id = ? AND u.status = 'active'
      `;

      const users = await executeQuery(query, [userId]);

      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const user = users[0];

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            status: user.status,
            createdAt: user.created_at,
            role: {
              name: user.role_name,
              permissions: user.permissions ? JSON.parse(user.permissions) : []
            }
          }
        }
      });

    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;