const express = require('express');
const sensorController = require('../controllers/sensorController');
const validate = require('../middlewares/validate');
const { authenticate } = require('../middlewares/auth');
const { checkPermission, checkResourceOwnership, checkOrgPermission } = require('../middlewares/permission');
const { sensorSchema } = require('../validators/sensorValidators');
const { getSensorForOwnershipCheck } = require('../services/sensorService');

const router = express.Router();

// Sensor routes
router
  .route('/')
  .get(
    authenticate, 
    validate(sensorSchema.query, { query: true }),
    checkPermission('sensor.view'), 
    sensorController.getAllSensors
  )
  .post(
    authenticate, 
    validate(sensorSchema.create), 
    checkPermission('sensor.create'), 
    sensorController.createSensor
  );

router
  .route('/:id')
  .get(
    authenticate, 
    validate(sensorSchema.query, { query: true }),
    checkPermission('sensor.view'),
    checkResourceOwnership(getSensorForOwnershipCheck),
    sensorController.getSensorById
  )
  .patch(
    authenticate, 
    validate(sensorSchema.update), 
    checkPermission('sensor.update'),
    checkResourceOwnership(getSensorForOwnershipCheck),
    sensorController.updateSensor
  )
  .delete(
    authenticate, 
    validate(sensorSchema.query, { query: true }),
    checkPermission('sensor.delete'),
    checkResourceOwnership(getSensorForOwnershipCheck),
    sensorController.deleteSensor
  );

  // Get sensors by organization
router.get(
  '/organization/:organizationId', 
  authenticate, 
  checkOrgPermission('sensor.view', true, 'organizationId'), 
  sensorController.getSensorsByOrganization
);
module.exports = router; 