const { User, Role, RoleModuleAccess } = require('../models');
const AuditService = require('../services/audit.service');
const { hashPassword, validatePassword } = require('../utils/password');
const { success, error, paginated } = require('../utils/response');
const { Op } = require('sequelize');
const Joi = require('joi');

// Validation schemas
const createUserSchema = Joi.object({
  username: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  role_id: Joi.number().required(),
  status: Joi.string().valid('active', 'inactive').default('active')
});

class UsersController {
  async createUser(req, res) {
    try {
      const { error: validationError, value } = createUserSchema.validate(req.body);
      if (validationError) {
        return error(res, validationError.details[0].message, 400);
      }

      // Validate password strength
      const passwordError = validatePassword(value.password);
      if (passwordError) {
        return error(res, passwordError, 400);
      }

      // Check if user already exists
      const existingUser = await User.findOne({
        where: {
          [Op.or]: [
            { email: value.email },
            { username: value.username }
          ]
        }
      });

      if (existingUser) {
        return error(res, 'User with this email or username already exists', 409);
      }

      // Validate role exists
      const role = await Role.findByPk(value.role_id);
      if (!role) {
        return error(res, 'Invalid role_id', 400);
      }

      // Create user
      const user = await User.create({
        ...value,
        password_hash: value.password // Will be hashed by model hook
      });

      await AuditService.logUserAction(req.user.user_id, 'create_user', `Created user: ${user.username}`, req);

      success(res, { user: user.toJSON() }, 'User created successfully', 201);
    } catch (err) {
      console.error('Create user error:', err);
      error(res, 'Internal server error', 500);
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

      // Build where clause
      const whereClause = {};
      
      if (search) {
        whereClause[Op.or] = [
          { username: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } }
        ];
      }

      if (roleId) {
        whereClause.role_id = roleId;
      }

      if (status) {
        whereClause.status = status;
      }

      // For Client Managers, only show themselves
      if (req.user.role.role_name === 'Client Manager') {
        whereClause.user_id = req.user.user_id;
      }

      const { count, rows } = await User.findAndCountAll({
        where: whereClause,
        include: [{ model: Role, as: 'role', attributes: ['role_id', 'role_name'] }],
        attributes: { exclude: ['password_hash'] },
        limit,
        offset,
        order: [['username', 'ASC']]
      });

      paginated(res, rows, {
        total: count,
        pages: Math.ceil(count / limit),
        current_page: page,
        per_page: limit
      });
    } catch (err) {
      console.error('List users error:', err);
      error(res, 'Internal server error', 500);
    }
  }

  async getUser(req, res) {
    try {
      const userId = parseInt(req.params.id);

      // Client Managers can only view themselves
      if (req.user.role.role_name === 'Client Manager' && userId !== req.user.user_id) {
        return error(res, 'Access denied', 403);
      }

      const user = await User.findByPk(userId, {
        include: [
          { model: Role, as: 'role' },
          { model: require('../models').Client, as: 'assignedClients', attributes: ['client_id', 'client_name'] }
        ],
        attributes: { exclude: ['password_hash'] }
      });

      if (!user) {
        return error(res, 'User not found', 404);
      }

      success(res, {
        user,
        assigned_clients: user.assignedClients || []
      });
    } catch (err) {
      console.error('Get user error:', err);
      error(res, 'Internal server error', 500);
    }
  }

  async updateUser(req, res) {
    try {
      const userId = parseInt(req.params.id);
      
      const user = await User.findByPk(userId);
      if (!user) {
        return error(res, 'User not found', 404);
      }

      // Validate email if changed
      if (req.body.email && req.body.email !== user.email) {
        const existingUser = await User.findOne({
          where: { 
            email: req.body.email,
            user_id: { [Op.ne]: userId }
          }
        });
        if (existingUser) {
          return error(res, 'Email already exists', 409);
        }
      }

      // Validate username if changed
      if (req.body.username && req.body.username !== user.username) {
        const existingUser = await User.findOne({
          where: { 
            username: req.body.username,
            user_id: { [Op.ne]: userId }
          }
        });
        if (existingUser) {
          return error(res, 'Username already exists', 409);
        }
      }

      // Validate role if changed
      if (req.body.role_id) {
        const role = await Role.findByPk(req.body.role_id);
        if (!role) {
          return error(res, 'Invalid role_id', 400);
        }
      }

      // Validate password if provided
      if (req.body.password) {
        const passwordError = validatePassword(req.body.password);
        if (passwordError) {
          return error(res, passwordError, 400);
        }
        req.body.password_hash = req.body.password;
        delete req.body.password;
      }

      // Update user
      await user.update(req.body);

      await AuditService.logUserAction(req.user.user_id, 'update_user', `Updated user: ${user.username}`, req);

      success(res, { user: user.toJSON() }, 'User updated successfully');
    } catch (err) {
      console.error('Update user error:', err);
      error(res, 'Internal server error', 500);
    }
  }

  async deleteUser(req, res) {
    try {
      const userId = parseInt(req.params.id);
      
      // Prevent self-deletion
      if (userId === req.user.user_id) {
        return error(res, 'Cannot delete your own account', 400);
      }

      const user = await User.findByPk(userId);
      if (!user) {
        return error(res, 'User not found', 404);
      }

      // Deactivate instead of delete
      await user.update({ status: 'inactive' });

      await AuditService.logUserAction(req.user.user_id, 'deactivate_user', `Deactivated user: ${user.username}`, req);

      success(res, null, 'User deactivated successfully');
    } catch (err) {
      console.error('Delete user error:', err);
      error(res, 'Internal server error', 500);
    }
  }

  async listRoles(req, res) {
    try {
      const roles = await Role.findAll({
        include: [{
          model: RoleModuleAccess,
          as: 'moduleAccess'
        }]
      });

      success(res, { roles });
    } catch (err) {
      console.error('List roles error:', err);
      error(res, 'Internal server error', 500);
    }
  }
}

module.exports = new UsersController();