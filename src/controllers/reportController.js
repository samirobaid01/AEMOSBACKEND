const reportService = require('../services/reportService');
const { paginate } = require('../utils/paginationUtil');
const { ApiError } = require('../middlewares/errorHandler');

/**
 * Get device status report with pagination
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getDeviceStatusReport = async (req, res, next) => {
  try {
    // Check if organizationId is provided
    const { organizationId } = req.query;
    
    if (!organizationId) {
      return next(new ApiError(400, 'Organization ID is required'));
    }
    
    const data = await reportService.getDeviceStatusReport(organizationId, req.user);
    
    // Apply pagination
    const paginatedResults = paginate(data, {
      page: req.query.page,
      limit: req.query.limit
    });
    
    res.status(200).json({
      status: 'success',
      ...paginatedResults
    });
  } catch (error) {
    console.error('Error in getDeviceStatusReport controller:', error.message);
    next(error);
  }
};

/**
 * Get sensor telemetry data summary with pagination
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getSensorTelemetryReport = async (req, res, next) => {
  try {
    // Check if organizationId is provided
    const { organizationId } = req.query;
    
    if (!organizationId) {
      return next(new ApiError(400, 'Organization ID is required'));
    }
    
    const data = await reportService.getSensorTelemetryReport(organizationId, req.user);
    
    // Apply pagination
    const paginatedResults = paginate(data, {
      page: req.query.page,
      limit: req.query.limit
    });
    
    res.status(200).json({
      status: 'success',
      ...paginatedResults
    });
  } catch (error) {
    console.error('Error in getSensorTelemetryReport controller:', error.message);
    next(error);
  }
};

/**
 * Get organization hierarchy report with pagination
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getOrganizationHierarchyReport = async (req, res, next) => {
  try {
    // Check if organizationId is provided
    const { organizationId } = req.query;
    
    if (!organizationId) {
      return next(new ApiError(400, 'Organization ID is required'));
    }
    
    const data = await reportService.getOrganizationHierarchyReport(organizationId, req.user);
    
    // Apply pagination
    const paginatedResults = paginate(data, {
      page: req.query.page,
      limit: req.query.limit
    });
    
    res.status(200).json({
      status: 'success',
      ...paginatedResults
    });
  } catch (error) {
    console.error('Error in getOrganizationHierarchyReport controller:', error.message);
    next(error);
  }
};

/**
 * Get user activity report with pagination
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getUserActivityReport = async (req, res, next) => {
  try {
    // Check if organizationId is provided
    const { organizationId } = req.query;
    
    if (!organizationId) {
      return next(new ApiError(400, 'Organization ID is required'));
    }
    
    const data = await reportService.getUserActivityReport(organizationId, req.user);
    
    // Apply pagination
    const paginatedResults = paginate(data, {
      page: req.query.page,
      limit: req.query.limit
    });
    
    res.status(200).json({
      status: 'success',
      ...paginatedResults
    });
  } catch (error) {
    console.error('Error in getUserActivityReport controller:', error.message);
    next(error);
  }
};

/**
 * Get area utilization report with pagination
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getAreaUtilizationReport = async (req, res, next) => {
  try {
    // Check if organizationId is provided
    const { organizationId } = req.query;
    
    if (!organizationId) {
      return next(new ApiError(400, 'Organization ID is required'));
    }
    
    const data = await reportService.getAreaUtilizationReport(organizationId, req.user);
    
    // Apply pagination
    const paginatedResults = paginate(data, {
      page: req.query.page,
      limit: req.query.limit
    });
    
    res.status(200).json({
      status: 'success',
      ...paginatedResults
    });
  } catch (error) {
    console.error('Error in getAreaUtilizationReport controller:', error.message);
    next(error);
  }
};

/**
 * Get payment method analysis report with pagination
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getPaymentMethodReport = async (req, res, next) => {
  try {
    // Check if organizationId is provided
    const { organizationId } = req.query;
    
    if (!organizationId) {
      return next(new ApiError(400, 'Organization ID is required'));
    }
    
    const data = await reportService.getPaymentMethodReport(organizationId, req.user);
    
    // Apply pagination
    const paginatedResults = paginate(data, {
      page: req.query.page,
      limit: req.query.limit
    });
    
    res.status(200).json({
      status: 'success',
      ...paginatedResults
    });
  } catch (error) {
    console.error('Error in getPaymentMethodReport controller:', error.message);
    next(error);
  }
};

/**
 * Get rule chain execution report with pagination
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getRuleChainExecutionReport = async (req, res, next) => {
  try {
    // Check if organizationId is provided
    const { organizationId } = req.query;
    
    if (!organizationId) {
      return next(new ApiError(400, 'Organization ID is required'));
    }
    
    const data = await reportService.getRuleChainExecutionReport(organizationId, req.user);
    
    // Apply pagination
    const paginatedResults = paginate(data, {
      page: req.query.page,
      limit: req.query.limit
    });
    
    res.status(200).json({
      status: 'success',
      ...paginatedResults
    });
  } catch (error) {
    console.error('Error in getRuleChainExecutionReport controller:', error.message);
    next(error);
  }
};

/**
 * Get sensor data anomaly detection report with pagination
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getSensorAnomalyReport = async (req, res, next) => {
  try {
    // Check if organizationId is provided
    const { organizationId } = req.query;
    
    if (!organizationId) {
      return next(new ApiError(400, 'Organization ID is required'));
    }
    
    const data = await reportService.getSensorAnomalyReport(organizationId, req.user);
    
    // Apply pagination
    const paginatedResults = paginate(data, {
      page: req.query.page,
      limit: req.query.limit
    });
    
    res.status(200).json({
      status: 'success',
      ...paginatedResults
    });
  } catch (error) {
    console.error('Error in getSensorAnomalyReport controller:', error.message);
    next(error);
  }
};

/**
 * Get user role distribution report with pagination
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getUserRoleDistributionReport = async (req, res, next) => {
  try {
    // Check if organizationId is provided
    const { organizationId } = req.query;
    
    if (!organizationId) {
      return next(new ApiError(400, 'Organization ID is required'));
    }
    
    const data = await reportService.getUserRoleDistributionReport(organizationId, req.user);
    
    // Apply pagination
    const paginatedResults = paginate(data, {
      page: req.query.page,
      limit: req.query.limit
    });
    
    res.status(200).json({
      status: 'success',
      ...paginatedResults
    });
  } catch (error) {
    console.error('Error in getUserRoleDistributionReport controller:', error.message);
    next(error);
  }
};

/**
 * Get ticket resolution performance report with pagination
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getTicketResolutionReport = async (req, res, next) => {
  try {
    // Check if organizationId is provided
    const { organizationId } = req.query;
    
    if (!organizationId) {
      return next(new ApiError(400, 'Organization ID is required'));
    }
    
    const data = await reportService.getTicketResolutionReport(organizationId, req.user);
    
    // Apply pagination
    const paginatedResults = paginate(data, {
      page: req.query.page,
      limit: req.query.limit
    });
    
    res.status(200).json({
      status: 'success',
      ...paginatedResults
    });
  } catch (error) {
    console.error('Error in getTicketResolutionReport controller:', error.message);
    next(error);
  }
};

module.exports = {
  getDeviceStatusReport,
  getSensorTelemetryReport,
  getOrganizationHierarchyReport,
  getUserActivityReport,
  getAreaUtilizationReport,
  getPaymentMethodReport,
  getRuleChainExecutionReport,
  getSensorAnomalyReport,
  getUserRoleDistributionReport,
  getTicketResolutionReport
}; 