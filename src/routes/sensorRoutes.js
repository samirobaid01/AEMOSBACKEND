const express = require('express');
const sensorController = require('../controllers/sensorController');
const validate = require('../middlewares/validate');
const { authenticate } = require('../middlewares/auth');
const { checkPermission } = require('../middlewares/permission');
const { sensorSchema } = require('../validators/sensorValidators');

const router = express.Router();

// Sensor routes
router
  .route('/')
  .get(authenticate, checkPermission('sensor.view'), sensorController.getAllSensors)
  .post(authenticate, validate(sensorSchema.create), checkPermission('sensor.create'), sensorController.createSensor);

router
  .route('/:id')
  .get(authenticate, checkPermission('sensor.view'), sensorController.getSensorById)
  .patch(authenticate, validate(sensorSchema.update), checkPermission('sensor.update'), sensorController.updateSensor)
  .delete(authenticate, checkPermission('sensor.delete'), sensorController.deleteSensor);

module.exports = router; 