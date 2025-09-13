const { Client, ClientAwsMapping, User } = require('../models');
const AuditService = require('../services/audit.service');
const { success, error, paginated } = require('../utils/response');
const { Op } = require('sequelize');
const Joi = require('joi');

// Validation schemas
const createClientSchema = Joi.object({
  client_name: Joi.string().required(),
  contact_person: Joi.string().allow(''),
  email: Joi.string().email().required(),
  phone: Joi.string().allow(''),
  aws_account_ids: Joi.array().items(Joi.string()),
  gst_registered: Joi.boolean().default(false),
  gst_number: Joi.string().allow(''),
  billing_address: Joi.string().allow(''),
  invoice_preferences: Joi.string().valid('monthly', 'quarterly', 'annually').default('monthly'),
  default_currency: Joi.string().valid('USD', 'INR').default('USD'),
  status: Joi.string().valid('active', 'inactive').default('active')
});

class ClientsController {
  async createClient(req, res) {
    try {
      const { error: validationError, value } = createClientSchema.validate(req.body);
      if (validationError) {
        return error(res, validationError.details[0].message, 400);
      }

      // Check if client already exists
      const existingClient = await Client.findOne({ where: { email: value.email } });
      if (existingClient) {
        return error(res, 'Client with this email already exists', 409);
      }

      // Create client
      const client = await Client.create(value);

      // Create AWS mappings if provided
      if (value.aws_mappings && Array.isArray(value.aws_mappings)) {
        for (const mapping of value.aws_mappings) {
          await ClientAwsMapping.create({
            client_id: client.client_id,
            aws_account_id: mapping.aws_account_id,
            billing_tag_key: mapping.billing_tag_key,
            billing_tag_value: mapping.billing_tag_value
          });
        }
      }

      // Assign client to current user if they're a Client Manager
      if (req.user.role.role_name === 'Client Manager') {
        await client.addAssignedManager(req.user);
      }

      await AuditService.logUserAction(req.user.user_id, 'create_client', `Created client: ${client.client_name}`, req);

      success(res, { client }, 'Client created successfully', 201);
    } catch (err) {
      console.error('Create client error:', err);
      error(res, 'Internal server error', 500);
    }
  }

  async listClients(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search || '';
      const status = req.query.status;
      const offset = (page - 1) * limit;

      // Build where clause
      const whereClause = {};
      
      if (search) {
        whereClause[Op.or] = [
          { client_name: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { contact_person: { [Op.like]: `%${search}%` } }
        ];
      }

      if (status) {
        whereClause.status = status;
      }

      // For Client Managers, only show assigned clients
      let include = [];
      if (req.user.role.role_name === 'Client Manager') {
        include.push({
          model: User,
          as: 'assignedManagers',
          where: { user_id: req.user.user_id },
          required: true,
          attributes: []
        });
      }

      const { count, rows } = await Client.findAndCountAll({
        where: whereClause,
        include,
        limit,
        offset,
        order: [['client_name', 'ASC']]
      });

      paginated(res, rows, {
        total: count,
        pages: Math.ceil(count / limit),
        current_page: page,
        per_page: limit
      });
    } catch (err) {
      console.error('List clients error:', err);
      error(res, 'Internal server error', 500);
    }
  }

  async getClient(req, res) {
    try {
      const clientId = parseInt(req.params.id);
      
      const client = await Client.findByPk(clientId, {
        include: [
          { model: ClientAwsMapping, as: 'awsMappings' },
          { model: User, as: 'assignedManagers', attributes: ['user_id', 'username', 'email'] }
        ]
      });

      if (!client) {
        return error(res, 'Client not found', 404);
      }

      // Check if Client Manager has access to this client
      if (req.user.role.role_name === 'Client Manager') {
        const hasAccess = client.assignedManagers.some(manager => manager.user_id === req.user.user_id);
        if (!hasAccess) {
          return error(res, 'Access denied', 403);
        }
      }

      success(res, {
        client,
        aws_mappings: client.awsMappings,
        assigned_managers: client.assignedManagers
      });
    } catch (err) {
      console.error('Get client error:', err);
      error(res, 'Internal server error', 500);
    }
  }

  async updateClient(req, res) {
    try {
      const clientId = parseInt(req.params.id);
      
      const client = await Client.findByPk(clientId, {
        include: [{ model: User, as: 'assignedManagers' }]
      });

      if (!client) {
        return error(res, 'Client not found', 404);
      }

      // Check if Client Manager has access to this client
      if (req.user.role.role_name === 'Client Manager') {
        const hasAccess = client.assignedManagers.some(manager => manager.user_id === req.user.user_id);
        if (!hasAccess) {
          return error(res, 'Access denied', 403);
        }
      }

      // Validate email if changed
      if (req.body.email && req.body.email !== client.email) {
        const existingClient = await Client.findOne({
          where: { 
            email: req.body.email,
            client_id: { [Op.ne]: clientId }
          }
        });
        if (existingClient) {
          return error(res, 'Email already exists', 409);
        }
      }

      // Update client
      await client.update(req.body);

      // Update AWS mappings if provided
      if (req.body.aws_mappings) {
        await ClientAwsMapping.destroy({ where: { client_id: clientId } });
        
        for (const mapping of req.body.aws_mappings) {
          await ClientAwsMapping.create({
            client_id: clientId,
            aws_account_id: mapping.aws_account_id,
            billing_tag_key: mapping.billing_tag_key,
            billing_tag_value: mapping.billing_tag_value
          });
        }
      }

      await AuditService.logUserAction(req.user.user_id, 'update_client', `Updated client: ${client.client_name}`, req);

      success(res, { client }, 'Client updated successfully');
    } catch (err) {
      console.error('Update client error:', err);
      error(res, 'Internal server error', 500);
    }
  }

  async deleteClient(req, res) {
    try {
      const clientId = parseInt(req.params.id);
      
      const client = await Client.findByPk(clientId, {
        include: [{ model: require('../models').Invoice, as: 'invoices' }]
      });

      if (!client) {
        return error(res, 'Client not found', 404);
      }

      // Check if client has invoices
      if (client.invoices && client.invoices.length > 0) {
        return error(res, 'Cannot delete client with existing invoices', 400);
      }

      await client.destroy();

      await AuditService.logUserAction(req.user.user_id, 'delete_client', `Deleted client: ${client.client_name}`, req);

      success(res, null, 'Client deleted successfully');
    } catch (err) {
      console.error('Delete client error:', err);
      error(res, 'Internal server error', 500);
    }
  }

  async getClientAwsMappings(req, res) {
    try {
      const clientId = parseInt(req.params.id);
      
      const client = await Client.findByPk(clientId, {
        include: [
          { model: ClientAwsMapping, as: 'awsMappings' },
          { model: User, as: 'assignedManagers' }
        ]
      });

      if (!client) {
        return error(res, 'Client not found', 404);
      }

      // Check if Client Manager has access to this client
      if (req.user.role.role_name === 'Client Manager') {
        const hasAccess = client.assignedManagers.some(manager => manager.user_id === req.user.user_id);
        if (!hasAccess) {
          return error(res, 'Access denied', 403);
        }
      }

      success(res, {
        aws_account_ids: client.aws_account_ids,
        aws_mappings: client.awsMappings
      });
    } catch (err) {
      console.error('Get client AWS mappings error:', err);
      error(res, 'Internal server error', 500);
    }
  }
}

module.exports = new ClientsController();