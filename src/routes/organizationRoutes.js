const express = require('express');
const organizationController = require('../controllers/organizationController');
const validate = require('../middlewares/validate');
const { authenticate } = require('../middlewares/auth');
const { checkPermission, checkResourceOwnership } = require('../middlewares/permission');
const { checkUserBelongsToOrganization, attachUserOrganizations } = require('../middlewares/organizationCheck');
const organizationSchema = require('../validators/organizationValidators');
const { getOrganizationForOwnershipCheck } = require('../services/organizationService');

const router = express.Router();

// Routes
router
  .route('/')
  .get(
    authenticate, 
    checkPermission('organization.view'), 
    attachUserOrganizations,
    organizationController.getAllOrganizations
  )
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
    checkUserBelongsToOrganization,
    organizationController.getOrganizationById
  )
  .patch(
    authenticate, 
    validate(organizationSchema.update), 
    checkPermission('organization.update'),
    checkUserBelongsToOrganization,
    organizationController.updateOrganization
  )
  .delete(
    authenticate, 
    validate(organizationSchema.query, { query: true }),
    checkPermission('organization.delete'),
    checkUserBelongsToOrganization,
    organizationController.deleteOrganization
  );

module.exports = router; 