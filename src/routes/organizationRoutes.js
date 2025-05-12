const express = require('express');
const organizationController = require('../controllers/organizationController');
const validate = require('../middlewares/validate');
const { authenticate } = require('../middlewares/auth');
const { checkPermission } = require('../middlewares/permission');
const organizationSchema = require('../validators/organizationValidators');

const router = express.Router();

// Routes
router
  .route('/')
  .get(authenticate, checkPermission('organization.view'), organizationController.getAllOrganizations)
  .post(authenticate, validate(organizationSchema.create), checkPermission('organization.update'), organizationController.createOrganization);

router
  .route('/:id')
  .get(authenticate, checkPermission('organization.view'), organizationController.getOrganizationById)
  .patch(authenticate, validate(organizationSchema.update), checkPermission('organization.update'), organizationController.updateOrganization)
  .delete(authenticate, checkPermission('organization.update'), organizationController.deleteOrganization);

module.exports = router; 