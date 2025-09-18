const express = require('express');
const RoleController = require('../controllers/roleController');

const router = express.Router();

/**
 * Role Management Routes
 * All routes serve live data from MySQL database
 */

// GET /api/roles - Get all roles
router.get('/', RoleController.getAllRoles);

// GET /api/roles/:id - Get role by ID
router.get('/:id', RoleController.getRoleById);

// POST /api/roles - Create new role
router.post('/', RoleController.createRole);

// PUT /api/roles/:id - Update role
router.put('/:id', RoleController.updateRole);

// DELETE /api/roles/:id - Delete role
router.delete('/:id', RoleController.deleteRole);

module.exports = router;