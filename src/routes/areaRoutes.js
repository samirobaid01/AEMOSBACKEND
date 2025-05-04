const express = require('express');
const areaController = require('../controllers/areaController');
const validate = require('../middlewares/validate');
const { authenticate } = require('../middlewares/auth');
const areaSchema = require('../validators/areaValidators');

const router = express.Router();

// Routes
router
  .route('/')
  .get(authenticate, areaController.getAllAreas)
  .post(authenticate, validate(areaSchema.create), areaController.createArea);

router
  .route('/:id')
  .get(authenticate, areaController.getAreaById)
  .patch(authenticate, validate(areaSchema.update), areaController.updateArea)
  .delete(authenticate, areaController.deleteArea);

// Get areas by organization
router.get('/organization/:organizationId', authenticate, areaController.getAreasByOrganization);

module.exports = router; 