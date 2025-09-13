const express = require('express');
const router = express.Router();
const UsersController = require('../controllers/users.controller');
const { requireAuth, requirePermission } = require('../middlewares/auth.middleware');

// User management routes
router.post('/', requireAuth, requirePermission('Users', 'create'), UsersController.createUser);
router.get('/', requireAuth, requirePermission('Users', 'view'), UsersController.listUsers);
router.get('/roles', requireAuth, requirePermission('Users', 'view'), UsersController.listRoles);
router.get('/:id', requireAuth, requirePermission('Users', 'view'), UsersController.getUser);
router.put('/:id', requireAuth, requirePermission('Users', 'edit'), UsersController.updateUser);
router.delete('/:id', requireAuth, requirePermission('Users', 'delete'), UsersController.deleteUser);

module.exports = router;