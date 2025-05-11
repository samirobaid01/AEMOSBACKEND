const express = require('express');
const sensorController = require('../controllers/sensorController');
const validate = require('../middlewares/validate');
const { authenticate } = require('../middlewares/auth');
const { sensorSchema } = require('../validators/sensorValidators');

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

module.exports = router; 