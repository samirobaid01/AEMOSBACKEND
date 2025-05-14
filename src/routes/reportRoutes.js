const express = require('express');
const reportController = require('../controllers/reportController');
const { authenticateToken, checkRoleAccess } = require('../middlewares/authMiddleware');
const router = express.Router();

// Apply authentication middleware to all report routes
router.use(authenticateToken);

// Apply role-based access control middleware to all report routes - allowing all appropriate roles
router.use(checkRoleAccess(['admin', 'system admin', 'org admin', 'supervisor', 'viewer']));

// Device Status Report - requires organizationId
router.get('/device-status', reportController.getDeviceStatusReport);

// Sensor Telemetry Data Summary
router.get('/sensor-telemetry', reportController.getSensorTelemetryReport);

// Organization Hierarchy Report
router.get('/organization-hierarchy', reportController.getOrganizationHierarchyReport);

// User Activity Report
router.get('/user-activity', reportController.getUserActivityReport);

// Area Utilization Report
router.get('/area-utilization', reportController.getAreaUtilizationReport);

// Payment Method Analysis
router.get('/payment-method', reportController.getPaymentMethodReport);

// Rule Chain Execution Report
router.get('/rule-chain-execution', reportController.getRuleChainExecutionReport);

// Sensor Data Anomaly Detection
router.get('/sensor-anomaly', reportController.getSensorAnomalyReport);

// User Role Distribution Report
router.get('/user-role-distribution', reportController.getUserRoleDistributionReport);

// Ticket Resolution Performance
router.get('/ticket-resolution', reportController.getTicketResolutionReport);

module.exports = router; 