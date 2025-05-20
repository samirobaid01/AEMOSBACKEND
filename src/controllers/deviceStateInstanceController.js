const deviceStateInstanceService = require('../services/deviceStateInstanceService');

const createStateInstance = async (req, res, next) => {
  try {
    const instance = await deviceStateInstanceService.createInstance(req.body, req.user.id);
    res.status(201).json({
      status: 'success',
      data: instance
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