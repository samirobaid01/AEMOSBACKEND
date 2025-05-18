const express = require('express');
const dataStreamController = require('../controllers/dataStreamController');
const validate = require('../middlewares/validate');
const { authenticate } = require('../middlewares/auth');
const { dataStreamSchema } = require('../validators/dataStreamValidators');
const { deviceAuth } = require('../middlewares/deviceAuth');

const router = express.Router();

// DataStream routes
router
  .route('/')
  .get(authenticate, dataStreamController.getAllDataStreams)
  .post(authenticate, validate(dataStreamSchema.create), dataStreamController.createDataStream);

// Special endpoint for IoT devices to submit data using token auth
router.post(
  '/token',
  deviceAuth,
  validate(dataStreamSchema.create),
  dataStreamController.createDataStreamWithToken
);

// Batch endpoint for creating multiple datastreams at once
router
  .route('/batch')
  .post(deviceAuth, validate(dataStreamSchema.createBatch), dataStreamController.createBatchDataStreams);

// Get data streams for a telemetry data item - specific route comes before parameterized route
router.get('/telemetry/:telemetryDataId', authenticate, dataStreamController.getDataStreamsByTelemetryId);

// Parameterized route for individual data streams
router
  .route('/:id')
  .get(authenticate, dataStreamController.getDataStreamById)
  .patch(authenticate, validate(dataStreamSchema.update), dataStreamController.updateDataStream)
  .delete(authenticate, dataStreamController.deleteDataStream);

module.exports = router; 