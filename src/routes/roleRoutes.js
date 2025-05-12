const express = require('express');
const router = express.Router();

const roleController = require('../controllers/roleController');
const validate = require('../middlewares/validate');
const { authenticate } = require('../middlewares/auth');
const { checkPermission } = require('../middlewares/permission');
const {
  createRoleValidator,
  updateRoleValidator,
  deleteRoleValidator,
  getRoleByIdValidator,
  getOrganizationRolesValidator,
  addPermissionToRoleValidator,
  removePermissionFromRoleValidator
} = require('../validators/roleValidators');

// Get all roles
router.get('/', 
  authenticate, 
  checkPermission('role.view'), 
  roleController.getAllRoles
);

// Get a role by ID
router.get('/:id', 
  authenticate, 
  validate(getRoleByIdValidator, { params: true }),
  checkPermission('role.view'), 
  roleController.getRoleById
);

// Get roles for an organization
router.get('/organization/:organizationId', 
  authenticate, 
  validate(getOrganizationRolesValidator, { params: true }),
  checkPermission('role.view'), 
  roleController.getOrganizationRoles
);

// Create a new role
router.post('/', 
  authenticate, 
  validate(createRoleValidator),
  checkPermission('role.assign'), 
  roleController.createRole
);

// Update a role
router.put('/:id', 
  authenticate, 
  validate(updateRoleValidator),
  checkPermission('role.assign'), 
  roleController.updateRole
);

// Delete a role
router.delete('/:id', 
  authenticate, 
  validate(deleteRoleValidator, { params: true }),
  checkPermission('role.assign'), 
  roleController.deleteRole
);

// Get permissions for a role
router.get('/:id/permissions', 
  authenticate, 
  validate(getRoleByIdValidator, { params: true }),
  checkPermission('role.view'), 
  roleController.getRolePermissions
);

// Add permission to a role
router.post('/:id/permissions', 
  authenticate, 
  validate(addPermissionToRoleValidator, { params: true }),
  checkPermission('permission.manage'), 
  roleController.addPermissionToRole
);

// Remove permission from a role
router.delete('/:id/permissions/:permissionId', 
  authenticate, 
  validate(removePermissionFromRoleValidator, { params: true }),
  checkPermission('permission.manage'), 
  roleController.removePermissionFromRole
);

module.exports = router; 