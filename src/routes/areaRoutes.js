const express = require('express');
const areaController = require('../controllers/areaController');
const validate = require('../middlewares/validate');
const { authenticate } = require('../middlewares/auth');
const { checkPermission, checkResourceOwnership } = require('../middlewares/permission');
const { getAreaForOwnershipCheck } = require('../services/areaService');
const areaSchema = require('../validators/areaValidators');

const router = express.Router();

// Routes
router
  .route('/')
  .get(authenticate, checkPermission('area.view'), areaController.getAllAreas)
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
    checkPermission('area.delete'),
    checkResourceOwnership(getAreaForOwnershipCheck),
    areaController.deleteArea
  );

// Get areas by organization
router.get(
  '/organization/:organizationId', 
  authenticate, 
  checkPermission('area.view'), 
  areaController.getAreasByOrganization
);

module.exports = router; 