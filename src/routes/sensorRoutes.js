const express = require('express');
const sensorController = require('../controllers/sensorController');
const validate = require('../middlewares/validate');
const { authenticate } = require('../middlewares/auth');
const { sensorSchema, telemetryDataSchema } = require('../validators/sensorValidators');

const router = express.Router();

// Sensor routes
router
  .route('/')
  .get(authenticate, sensorController.getAllSensors)
  .post(authenticate, validate(sensorSchema.create), sensorController.createSensor);

router
  .route('/:id')
  .get(authenticate, sensorController.getSensorById)
  .patch(authenticate, validate(sensorSchema.update), sensorController.updateSensor)
  .delete(authenticate, sensorController.deleteSensor);

// Telemetry data routes
router
  .route('/telemetry')
  .get(authenticate, sensorController.getAllTelemetryData)
  .post(authenticate, validate(telemetryDataSchema.create), sensorController.createTelemetryData);

router
  .route('/telemetry/:id')
  .get(authenticate, sensorController.getTelemetryDataById)
  .patch(authenticate, validate(telemetryDataSchema.update), sensorController.updateTelemetryData)
  .delete(authenticate, sensorController.deleteTelemetryData);

// Get telemetry data for a specific sensor
router.get('/:sensorId/telemetry', authenticate, sensorController.getTelemetryDataBySensorId);

module.exports = router; 