const { getMany, getOne, insert, update, deleteRecord } = require('../config/db');

class UsersController {
  async createUser(req, res) {
    try {
      const { username, email, password, role_id, status } = req.body;

      if (!username || !email || !password || !role_id) {
        return res.status(400).json({ error: 'Username, email, password, and role are required' });
      }

      // Check if user already exists
      const existingUser = await getOne(
        'SELECT * FROM users WHERE email = ? OR username = ?',
        [email, username]
      );

      if (existingUser) {
        return res.status(409).json({ error: 'User with this email or username already exists' });
      }

      // Validate role exists
      const role = await getOne('SELECT * FROM roles WHERE role_id = ?', [role_id]);
      if (!role) {
        return res.status(400).json({ error: 'Invalid role_id' });
      }

      // Create user (plain text password)
      const userData = {
        username,
        email,
        password_hash: password, // Store as plain text
        role_id: parseInt(role_id),
        status: status || 'active'
      };

      const userId = await insert('users', userData);

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: { user: { user_id: userId, ...userData, password_hash: undefined } }
      });
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async listUsers(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search || '';
      const roleId = req.query.role_id;
      const status = req.query.status;
      const offset = (page - 1) * limit;

      let whereClause = '1=1';
      let params = [];

      if (search) {
        whereClause += ' AND (u.username LIKE ? OR u.email LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }

      if (roleId) {
        whereClause += ' AND u.role_id = ?';
        params.push(roleId);
      }

      if (status) {
        whereClause += ' AND u.status = ?';
        params.push(status);
      }

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM users u 
        JOIN roles r ON u.role_id = r.role_id 
        WHERE ${whereClause}
      `;
      const countResult = await getOne(countQuery, params);
      const total = countResult.total;

      // Get users with role info
      const query = `
        SELECT u.user_id, u.username, u.email, u.status, u.last_login, u.created_at,
               r.role_id, r.role_name
        FROM users u
        JOIN roles r ON u.role_id = r.role_id
        WHERE ${whereClause}
        ORDER BY u.username ASC
        LIMIT ? OFFSET ?
      `;
      const users = await getMany(query, [...params, limit, offset]);

      res.json({
        success: true,
        data: users,
        pagination: {
          total,
          pages: Math.ceil(total / limit),
          current_page: page,
          per_page: limit
        }
      });
    } catch (error) {
      console.error('List users error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getUser(req, res) {
    try {
      const userId = parseInt(req.params.id);

      const user = await getOne(`
        SELECT u.user_id, u.username, u.email, u.status, u.last_login, u.created_at,
               r.role_id, r.role_name
        FROM users u
        JOIN roles r ON u.role_id = r.role_id
        WHERE u.user_id = ?
      `, [userId]);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        success: true,
        data: {
          user,
          assigned_clients: [] // Mock assigned clients
        }
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateUser(req, res) {
    try {
      const userId = parseInt(req.params.id);
      
      const user = await getOne('SELECT * FROM users WHERE user_id = ?', [userId]);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Validate email if changed
      if (req.body.email && req.body.email !== user.email) {
        const existingUser = await getOne(
          'SELECT * FROM users WHERE email = ? AND user_id != ?',
          [req.body.email, userId]
        );
        if (existingUser) {
          return res.status(409).json({ error: 'Email already exists' });
        }
      }

      // Validate role if changed
      if (req.body.role_id) {
        const role = await getOne('SELECT * FROM roles WHERE role_id = ?', [req.body.role_id]);
        if (!role) {
          return res.status(400).json({ error: 'Invalid role_id' });
        }
      }

      // Update password as plain text if provided
      if (req.body.password) {
        req.body.password_hash = req.body.password;
        delete req.body.password;
      }

      await update('users', req.body, 'user_id = ?', [userId]);

      res.json({
        success: true,
        message: 'User updated successfully',
        data: { user: { ...user, ...req.body, password_hash: undefined } }
      });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deleteUser(req, res) {
    try {
      const userId = parseInt(req.params.id);
      
      const user = await getOne('SELECT * FROM users WHERE user_id = ?', [userId]);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Deactivate instead of delete
      await update('users', { status: 'inactive' }, 'user_id = ?', [userId]);

      res.json({
        success: true,
        message: 'User deactivated successfully'
      });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async listRoles(req, res) {
    try {
      const roles = await getMany('SELECT * FROM roles ORDER BY role_name');

      res.json({
        success: true,
        data: { roles }
      });
    } catch (error) {
      console.error('List roles error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new UsersController();