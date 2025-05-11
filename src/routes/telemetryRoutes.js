const express = require('express');
const sensorController = require('../controllers/sensorController');
const validate = require('../middlewares/validate');
const { authenticate } = require('../middlewares/auth');
const { telemetryDataSchema } = require('../validators/sensorValidators');

const router = express.Router();

// Telemetry data routes
router
  .route('/')
  .get(authenticate, sensorController.getAllTelemetryData)
  .post(authenticate, validate(telemetryDataSchema.create), sensorController.createTelemetryData);

// Get telemetry data for a specific sensor - specific route comes before parameterized route
router.get('/sensor/:sensorId', authenticate, sensorController.getTelemetryDataBySensorId);

// Parameterized route for individual telemetry data items
router
  .route('/:id')
  .get(authenticate, sensorController.getTelemetryDataById)
  .patch(authenticate, validate(telemetryDataSchema.update), sensorController.updateTelemetryData)
  .delete(authenticate, sensorController.deleteTelemetryData);

module.exports = router; 