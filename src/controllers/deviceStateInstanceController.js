const deviceStateInstanceService = require('../services/deviceStateInstanceService');
const notificationManager = require('../utils/notificationManager');
const config = require('../config');

const createStateInstance = async (req, res, next) => {
  try {
    const result = await deviceStateInstanceService.createInstance(req.body, req.user.id);
    
    // Send immediate response
    res.status(201).json({
      status: 'success',
      data: result.instance
    });

    // Queue notification asynchronously
    process.nextTick(() => {
      notificationManager.queueStateChangeNotification(
        result.metadata,
        null, // Let notification manager determine priority
        config.broadcastAll || false
      );
    });
  } catch (error) {
    next(error);
  }
};

const getCurrentInstance = async (req, res, next) => {
  try {
    const { deviceStateId } = req.params;
    const instance = await deviceStateInstanceService.getCurrentInstance(deviceStateId);
    res.status(200).json({
      status: 'success',
      data: instance
    });
  } catch (error) {
    next(error);
  }
};

const getInstanceHistory = async (req, res, next) => {
  try {
    const { deviceStateId } = req.params;
    const { limit } = req.query;
    const instances = await deviceStateInstanceService.getInstanceHistory(deviceStateId, limit);
    res.status(200).json({
      status: 'success',
      data: instances
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createStateInstance,
  getCurrentInstance,
  getInstanceHistory
}; 