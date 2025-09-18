const { executeQuery } = require('../config/database');

/**
 * Role Management Controller
 * Handles all role-related operations with live database data
 */
class RoleController {
  /**
   * Get all roles
   */
  static async getAllRoles(req, res, next) {
    try {
      const query = `
        SELECT 
          r.id,
          r.name,
          r.description,
          r.permissions,
          r.status,
          r.created_at,
          r.updated_at,
          COUNT(u.id) as user_count
        FROM roles r
        LEFT JOIN users u ON r.id = u.role_id AND u.status = 'active'
        GROUP BY r.id, r.name, r.description, r.permissions, r.status, r.created_at, r.updated_at
        ORDER BY r.created_at DESC
      `;

      const roles = await executeQuery(query);

      const formattedRoles = roles.map(role => ({
        id: role.id,
        name: role.name,
        description: role.description,
        permissions: role.permissions ? JSON.parse(role.permissions) : [],
        status: role.status,
        userCount: role.user_count,
        createdAt: role.created_at,
        updatedAt: role.updated_at
      }));

      res.json({
        success: true,
        data: {
          roles: formattedRoles,
          total: formattedRoles.length
        }
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Get role by ID
   */
  static async getRoleById(req, res, next) {
    try {
      const { id } = req.params;

      const query = `
        SELECT 
          r.id,
          r.name,
          r.description,
          r.permissions,
          r.status,
          r.created_at,
          r.updated_at
        FROM roles r
        WHERE r.id = ?
      `;

      const roles = await executeQuery(query, [id]);

      if (roles.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Role not found'
        });
      }

      const role = roles[0];

      res.json({
        success: true,
        data: {
          role: {
            id: role.id,
            name: role.name,
            description: role.description,
            permissions: role.permissions ? JSON.parse(role.permissions) : [],
            status: role.status,
            createdAt: role.created_at,
            updatedAt: role.updated_at
          }
        }
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new role
   */
  static async createRole(req, res, next) {
    try {
      const { name, description, permissions, status = 'active' } = req.body;

      // Input validation
      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Role name is required'
        });
      }

      // Check if role name already exists
      const checkQuery = 'SELECT id FROM roles WHERE name = ?';
      const existingRoles = await executeQuery(checkQuery, [name]);

      if (existingRoles.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Role name already exists'
        });
      }

      // Insert new role
      const insertQuery = `
        INSERT INTO roles (name, description, permissions, status, created_at)
        VALUES (?, ?, ?, ?, NOW())
      `;

      const permissionsJson = permissions ? JSON.stringify(permissions) : null;
      const result = await executeQuery(insertQuery, [name, description, permissionsJson, status]);

      res.status(201).json({
        success: true,
        message: 'Role created successfully',
        data: {
          roleId: result.insertId
        }
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Update role
   */
  static async updateRole(req, res, next) {
    try {
      const { id } = req.params;
      const { name, description, permissions, status } = req.body;

      // Check if role exists
      const checkQuery = 'SELECT id FROM roles WHERE id = ?';
      const existingRoles = await executeQuery(checkQuery, [id]);

      if (existingRoles.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Role not found'
        });
      }

      // Update role
      const updateQuery = `
        UPDATE roles 
        SET name = ?, description = ?, permissions = ?, status = ?, updated_at = NOW()
        WHERE id = ?
      `;

      const permissionsJson = permissions ? JSON.stringify(permissions) : null;
      await executeQuery(updateQuery, [name, description, permissionsJson, status, id]);

      res.json({
        success: true,
        message: 'Role updated successfully'
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete role
   */
  static async deleteRole(req, res, next) {
    try {
      const { id } = req.params;

      // Check if role exists
      const checkQuery = 'SELECT id FROM roles WHERE id = ?';
      const existingRoles = await executeQuery(checkQuery, [id]);

      if (existingRoles.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Role not found'
        });
      }

      // Check if role is being used by any users
      const usersQuery = 'SELECT COUNT(*) as count FROM users WHERE role_id = ? AND status = "active"';
      const userCount = await executeQuery(usersQuery, [id]);

      if (userCount[0].count > 0) {
        return res.status(409).json({
          success: false,
          message: 'Cannot delete role that is assigned to active users'
        });
      }

      // Delete role
      const deleteQuery = 'DELETE FROM roles WHERE id = ?';
      await executeQuery(deleteQuery, [id]);

      res.json({
        success: true,
        message: 'Role deleted successfully'
      });

    } catch (error) {
      next(error);
    }
  }
}

module.exports = RoleController;