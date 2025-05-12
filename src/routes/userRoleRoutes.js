const express = require('express');
const router = express.Router();

const userRoleController = require('../controllers/userRoleController');
const validate = require('../middlewares/validate');
const { authenticate } = require('../middlewares/auth');
const { checkPermission } = require('../middlewares/permission');
const {
  getUserRolesValidator,
  assignRoleToUserValidator,
  removeUserRoleValidator
} = require('../validators/userRoleValidators');

// Get roles for a user
router.get('/:userId', 
  authenticate, 
  validate(getUserRolesValidator, { params: true }),
  checkPermission('role.view'), 
  userRoleController.getUserRoles
);

// Assign a role to a user
router.post('/:userId', 
  authenticate, 
  validate(assignRoleToUserValidator, { params: true }),
  checkPermission('role.assign'), 
  userRoleController.assignRoleToUser
);

// Remove a user's role for an organization
router.delete('/:userId/organization/:organizationId', 
  authenticate, 
  validate(removeUserRoleValidator, { params: true }),
  checkPermission('role.assign'), 
  userRoleController.removeUserRole
);

// Get current user's roles
router.get('/my/roles', 
  authenticate, 
  userRoleController.getMyRoles
);

module.exports = router; 