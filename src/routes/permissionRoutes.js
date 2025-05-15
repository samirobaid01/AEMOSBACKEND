const express = require('express');
const router = express.Router();

const permissionController = require('../controllers/permissionController');
const validate = require('../middlewares/validate');
const { authenticate } = require('../middlewares/auth');
const { checkPermission } = require('../middlewares/permission');
const {
  getUserPermissionsValidator,
  checkUserPermissionValidator,
  checkMyPermissionValidator
} = require('../validators/permissionValidators');

// Get all permissions
router.get('/', 
  authenticate, 
  checkPermission('permission.manage'), 
  permissionController.getAllPermissions
);

// Get a user's effective permissions
router.get('/user/:userId', 
  authenticate, 
  validate(getUserPermissionsValidator, { params: true }),
  checkPermission('role.view'), 
  permissionController.getUserPermissions
);

// Check if a user has a specific permission
router.get('/check', 
  authenticate, 
  validate(checkUserPermissionValidator, { query: true }),
  checkPermission('role.view'), 
  permissionController.checkUserPermission
);

// Check current user's permission
router.get('/my/check', 
  authenticate, 
  validate(checkMyPermissionValidator, { query: true }),
  permissionController.checkMyPermission
);

module.exports = router; 