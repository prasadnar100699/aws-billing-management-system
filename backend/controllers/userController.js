const { executeQuery } = require('../config/database');

/**
 * User Management Controller
 * Handles all user-related operations with live database data
 */
class UserController {
  /**
   * Get all users with their roles
   */
  static async getAllUsers(req, res, next) {
    try {
      const query = `
        SELECT 
          u.id,
          u.username,
          u.email,
          u.first_name,
          u.last_name,
          u.status,
          u.created_at,
          u.updated_at,
          r.name as role_name,
          r.id as role_id
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        ORDER BY u.created_at DESC
      `;

      const users = await executeQuery(query);

      const formattedUsers = users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        fullName: `${user.first_name} ${user.last_name}`,
        status: user.status,
        role: {
          id: user.role_id,
          name: user.role_name
        },
        createdAt: user.created_at,
        updatedAt: user.updated_at
      }));

      res.json({
        success: true,
        data: {
          users: formattedUsers,
          total: formattedUsers.length
        }
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(req, res, next) {
    try {
      const { id } = req.params;

      const query = `
        SELECT 
          u.id,
          u.username,
          u.email,
          u.first_name,
          u.last_name,
          u.status,
          u.created_at,
          u.updated_at,
          r.name as role_name,
          r.id as role_id,
          r.permissions
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.id = ?
      `;

      const users = await executeQuery(query, [id]);

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
            role: {
              id: user.role_id,
              name: user.role_name,
              permissions: user.permissions ? JSON.parse(user.permissions) : []
            },
            createdAt: user.created_at,
            updatedAt: user.updated_at
          }
        }
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new user
   */
  static async createUser(req, res, next) {
    try {
      const { username, email, firstName, lastName, password, roleId, status = 'active' } = req.body;

      // Input validation
      if (!username || !email || !firstName || !lastName || !password) {
        return res.status(400).json({
          success: false,
          message: 'All required fields must be provided'
        });
      }

      // Check if username or email already exists
      const checkQuery = 'SELECT id FROM users WHERE username = ? OR email = ?';
      const existingUsers = await executeQuery(checkQuery, [username, email]);

      if (existingUsers.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Username or email already exists'
        });
      }

      // Insert new user
      const insertQuery = `
        INSERT INTO users (username, email, first_name, last_name, password, role_id, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
      `;

      const result = await executeQuery(insertQuery, [
        username, email, firstName, lastName, password, roleId, status
      ]);

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: {
          userId: result.insertId
        }
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user
   */
  static async updateUser(req, res, next) {
    try {
      const { id } = req.params;
      const { username, email, firstName, lastName, roleId, status } = req.body;

      // Check if user exists
      const checkQuery = 'SELECT id FROM users WHERE id = ?';
      const existingUsers = await executeQuery(checkQuery, [id]);

      if (existingUsers.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Update user
      const updateQuery = `
        UPDATE users 
        SET username = ?, email = ?, first_name = ?, last_name = ?, 
            role_id = ?, status = ?, updated_at = NOW()
        WHERE id = ?
      `;

      await executeQuery(updateQuery, [
        username, email, firstName, lastName, roleId, status, id
      ]);

      res.json({
        success: true,
        message: 'User updated successfully'
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete user (soft delete by setting status to inactive)
   */
  static async deleteUser(req, res, next) {
    try {
      const { id } = req.params;

      // Check if user exists
      const checkQuery = 'SELECT id FROM users WHERE id = ?';
      const existingUsers = await executeQuery(checkQuery, [id]);

      if (existingUsers.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Soft delete by updating status
      const deleteQuery = 'UPDATE users SET status = ?, updated_at = NOW() WHERE id = ?';
      await executeQuery(deleteQuery, ['inactive', id]);

      res.json({
        success: true,
        message: 'User deleted successfully'
      });

    } catch (error) {
      next(error);
    }
  }
}

module.exports = UserController;