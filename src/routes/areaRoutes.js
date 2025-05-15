const express = require('express');
const areaController = require('../controllers/areaController');
const validate = require('../middlewares/validate');
const { authenticate } = require('../middlewares/auth');
const { checkPermission, checkResourceOwnership, checkOrgPermission } = require('../middlewares/permission');
const { getAreaForOwnershipCheck } = require('../services/areaService');
const { attachUserOrganizationsForAreas } = require('../middlewares/areaCheck');
const areaSchema = require('../validators/areaValidators');

const router = express.Router();

// Routes
router
  .route('/')
  .get(
    authenticate, 
    validate(areaSchema.query, { query: true }),
    checkPermission('area.view'), 
    attachUserOrganizationsForAreas,
    areaController.getAllAreas
  )
  .post(
    authenticate, 
    validate(areaSchema.create), 
    checkPermission('area.create'), 
    areaController.createArea
  );

router
  .route('/:id')
  .get(
    authenticate, 
    validate(areaSchema.query, { query: true }),
    checkPermission('area.view'),
    checkResourceOwnership(getAreaForOwnershipCheck),
    areaController.getAreaById
  )
  .patch(
    authenticate, 
    validate(areaSchema.update), 
    checkPermission('area.update'),
    checkResourceOwnership(getAreaForOwnershipCheck),
    areaController.updateArea
  )
  .delete(
    authenticate, 
    validate(areaSchema.query, { query: true }),
    checkPermission('area.delete'),
    checkResourceOwnership(getAreaForOwnershipCheck),
    areaController.deleteArea
  );

// Get areas by organization
router.get(
  '/organization/:organizationId', 
  authenticate, 
  checkOrgPermission('area.view', true, 'organizationId'), 
  areaController.getAreasByOrganization
);

module.exports = router; 