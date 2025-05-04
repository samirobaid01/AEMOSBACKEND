const express = require('express');
const organizationController = require('../controllers/organizationController');
const validate = require('../middlewares/validate');
const { authenticate } = require('../middlewares/auth');
const organizationSchema = require('../validators/organizationValidators');

const router = express.Router();

// Routes
router
  .route('/')
  .get(authenticate, organizationController.getAllOrganizations)
  .post(authenticate, validate(organizationSchema.create), organizationController.createOrganization);

router
  .route('/:id')
  .get(authenticate, organizationController.getOrganizationById)
  .patch(authenticate, validate(organizationSchema.update), organizationController.updateOrganization)
  .delete(authenticate, organizationController.deleteOrganization);

module.exports = router; 