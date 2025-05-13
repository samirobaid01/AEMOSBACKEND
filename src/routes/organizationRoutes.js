const express = require('express');
const organizationController = require('../controllers/organizationController');
const validate = require('../middlewares/validate');
const { authenticate } = require('../middlewares/auth');
const { checkPermission, checkResourceOwnership, checkOrgPermission } = require('../middlewares/permission');
const organizationSchema = require('../validators/organizationValidators');
const { getOrganizationForOwnershipCheck } = require('../services/organizationService');

const router = express.Router();

// Routes
router
  .route('/')
  .get(authenticate, checkPermission('organization.view'), organizationController.getAllOrganizations)
  .post(
    authenticate, 
    validate(organizationSchema.create), 
    checkPermission('organization.create'), 
    organizationController.createOrganization
  );

router
  .route('/:id')
  .get(
    authenticate, 
    validate(organizationSchema.query, { query: true }),
    checkPermission('organization.view'),
    checkResourceOwnership(getOrganizationForOwnershipCheck),
    organizationController.getOrganizationById
  )
  .patch(
    authenticate, 
    validate(organizationSchema.update), 
    checkPermission('organization.update'),
    checkResourceOwnership(getOrganizationForOwnershipCheck),
    organizationController.updateOrganization
  )
  .delete(
    authenticate, 
    validate(organizationSchema.query, { query: true }),
    checkPermission('organization.delete'),
    checkResourceOwnership(getOrganizationForOwnershipCheck),
    organizationController.deleteOrganization
  );

module.exports = router; 