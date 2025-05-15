const { sequelize } = require('../models/initModels');
const { ApiError } = require('../middlewares/errorHandler');
const roleService = require('../services/roleService');

/**
 * Get device status report by organization
 * @param {Number} organizationId - The ID of the organization to filter by
 * @param {Object} user - The user requesting the report
 * @returns {Promise<Array>} Array of organization device status data
 */
const getDeviceStatusReport = async (organizationId, user) => {
  try {
    // Check if user is a System Admin
    const isSystemAdmin = await roleService.userIsSystemAdmin(user.id);
    
    // If not system admin, verify user has access to this organization
    if (!isSystemAdmin) {
      const userOrgs = await roleService.getUserOrganizations(user.id);
      const orgIds = userOrgs.map(org => org.id);
      
      if (!orgIds.includes(Number(organizationId))) {
        throw new ApiError(403, 'Forbidden: You do not have access to this organization');
      }
    }
    
    const query = `
      SELECT 
        o.name AS organization,
        COUNT(d.id) AS total_devices,
        SUM(d.status = 1) AS active_devices,
        SUM(d.status = 0) AS inactive_devices,
        ROUND(SUM(d.status = 1) / COUNT(d.id) * 100, 2) AS active_percentage
      FROM Device d
      JOIN AreaDevice ad ON d.id = ad.deviceId
      JOIN Area a ON ad.areaId = a.id
      JOIN Organization o ON a.organizationId = o.id
      WHERE o.id = :organizationId
      GROUP BY o.name
      ORDER BY active_percentage DESC
    `;
    
    const results = await sequelize.query(query, {
      replacements: { organizationId },
      type: sequelize.QueryTypes.SELECT
    });
    
    return results;
  } catch (error) {
    console.error('Error in getDeviceStatusReport:', error.message);
    throw error instanceof ApiError ? error : new ApiError(500, 'Failed to generate device status report');
  }
};

/**
 * Get sensor telemetry data summary for the last 24 hours
 * @param {Number} organizationId - The ID of the organization to filter by
 * @param {Object} user - The user requesting the report
 * @returns {Promise<Array>} Array of sensor telemetry summary data
 */
const getSensorTelemetryReport = async (organizationId, user) => {
  try {
    // Check if user is a System Admin
    const isSystemAdmin = await roleService.userIsSystemAdmin(user.id);
    
    // If not system admin, verify user has access to this organization
    if (!isSystemAdmin) {
      const userOrgs = await roleService.getUserOrganizations(user.id);
      const orgIds = userOrgs.map(org => org.id);
      
      if (!orgIds.includes(Number(organizationId))) {
        throw new ApiError(403, 'Forbidden: You do not have access to this organization');
      }
    }
    
    const query = `
      SELECT 
        s.name AS sensor_name,
        td.variableName,
        COUNT(ds.id) AS readings_count,
        MIN(CAST(ds.value AS DECIMAL(10,2))) AS min_value,
        MAX(CAST(ds.value AS DECIMAL(10,2))) AS max_value,
        AVG(CAST(ds.value AS DECIMAL(10,2))) AS avg_value
      FROM DataStream ds
      JOIN TelemetryData td ON ds.telemetryDataId = td.id
      JOIN Sensor s ON td.sensorId = s.id
      JOIN AreaSensor asen ON s.id = asen.sensorId
      JOIN Area a ON asen.areaId = a.id
      WHERE a.organizationId = :organizationId
        AND ds.recievedAt >= DATE_SUB(NOW(), INTERVAL 1 DAY)
      GROUP BY s.name, td.variableName
      ORDER BY s.name, td.variableName
    `;
    
    const results = await sequelize.query(query, {
      replacements: { organizationId },
      type: sequelize.QueryTypes.SELECT
    });
    
    return results;
  } catch (error) {
    console.error('Error in getSensorTelemetryReport:', error.message);
    throw error instanceof ApiError ? error : new ApiError(500, 'Failed to generate sensor telemetry report');
  }
};

/**
 * Get organization hierarchy report
 * @param {Number} organizationId - The ID of the organization to filter by
 * @param {Object} user - The user requesting the report
 * @returns {Promise<Array>} Array of organization hierarchy data
 */
const getOrganizationHierarchyReport = async (organizationId, user) => {
  try {
    // Check if user is a System Admin
    const isSystemAdmin = await roleService.userIsSystemAdmin(user.id);
    
    // If not system admin, verify user has access to this organization
    if (!isSystemAdmin) {
      const userOrgs = await roleService.getUserOrganizations(user.id);
      const orgIds = userOrgs.map(org => org.id);
      
      if (!orgIds.includes(Number(organizationId))) {
        throw new ApiError(403, 'Forbidden: You do not have access to this organization');
      }
    }
    
    // For system admin, show all organizations in hierarchy
    // For other roles, show only the specified organization and its children
    const whereClause = isSystemAdmin ? '' : 
      `WHERE o.id = :organizationId OR o.parentId = :organizationId OR o.id IN (
        WITH RECURSIVE child_orgs AS (
          SELECT id FROM Organization WHERE parentId = :organizationId
          UNION ALL
          SELECT o.id FROM Organization o JOIN child_orgs co ON o.parentId = co.id
        )
        SELECT id FROM child_orgs
      )`;
    
    const query = `
      WITH RECURSIVE org_hierarchy AS (
        SELECT id, name, parentId, 0 AS level
        FROM Organization
        WHERE parentId IS NULL
        
        UNION ALL
        
        SELECT o.id, o.name, o.parentId, h.level + 1
        FROM Organization o
        JOIN org_hierarchy h ON o.parentId = h.id
      )
      SELECT 
        id,
        CONCAT(REPEAT('    ', level), name) AS organization,
        level AS depth_level
      FROM org_hierarchy
      ${whereClause}
      ORDER BY level, name
    `;
    
    const results = await sequelize.query(query, {
      replacements: { organizationId },
      type: sequelize.QueryTypes.SELECT
    });
    
    return results;
  } catch (error) {
    console.error('Error in getOrganizationHierarchyReport:', error.message);
    throw error instanceof ApiError ? error : new ApiError(500, 'Failed to generate organization hierarchy report');
  }
};

/**
 * Get user activity report by notification status
 * @param {Number} organizationId - The ID of the organization to filter by
 * @param {Object} user - The user requesting the report
 * @returns {Promise<Array>} Array of user activity data
 */
const getUserActivityReport = async (organizationId, user) => {
  try {
    // Check if user is a System Admin
    const isSystemAdmin = await roleService.userIsSystemAdmin(user.id);
    
    // If not system admin, verify user has access to this organization
    if (!isSystemAdmin) {
      const userOrgs = await roleService.getUserOrganizations(user.id);
      const orgIds = userOrgs.map(org => org.id);
      
      if (!orgIds.includes(Number(organizationId))) {
        throw new ApiError(403, 'Forbidden: You do not have access to this organization');
      }
    }
    
    const query = `
      SELECT 
        u.id,
        u.userName,
        u.email,
        COUNT(n.id) AS total_notifications,
        SUM(CASE WHEN t.acknowledgedAt IS NOT NULL THEN 1 ELSE 0 END) AS acknowledged,
        SUM(CASE WHEN t.acknowledgedAt IS NULL AND t.assignedTo IS NOT NULL THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN t.assignedTo IS NULL THEN 1 ELSE 0 END) AS unassigned
      FROM Notification n
      LEFT JOIN Ticket t ON n.id = t.notificationId
      LEFT JOIN User u ON t.assignedTo = u.id OR n.id IN (
        SELECT notificationId FROM Ticket WHERE assignedTo = u.id
      )
      JOIN OrganizationUser ou ON u.id = ou.userId AND ou.organizationId = :organizationId
      GROUP BY u.id, u.userName, u.email
      ORDER BY total_notifications DESC
    `;
    
    const results = await sequelize.query(query, {
      replacements: { organizationId },
      type: sequelize.QueryTypes.SELECT
    });
    
    return results;
  } catch (error) {
    console.error('Error in getUserActivityReport:', error.message);
    throw error instanceof ApiError ? error : new ApiError(500, 'Failed to generate user activity report');
  }
};

/**
 * Get area utilization report
 * @param {Number} organizationId - The ID of the organization to filter by
 * @param {Object} user - The user requesting the report
 * @returns {Promise<Array>} Array of area utilization data
 */
const getAreaUtilizationReport = async (organizationId, user) => {
  try {
    // Check if user is a System Admin
    const isSystemAdmin = await roleService.userIsSystemAdmin(user.id);
    
    // If not system admin, verify user has access to this organization
    if (!isSystemAdmin) {
      const userOrgs = await roleService.getUserOrganizations(user.id);
      const orgIds = userOrgs.map(org => org.id);
      
      if (!orgIds.includes(Number(organizationId))) {
        throw new ApiError(403, 'Forbidden: You do not have access to this organization');
      }
    }
    
    const query = `
      SELECT 
        a.id,
        a.name AS area,
        o.name AS organization,
        COUNT(DISTINCT ad.deviceId) AS device_count,
        COUNT(DISTINCT asen.sensorId) AS sensor_count,
        CONCAT(ROUND(COUNT(DISTINCT ad.deviceId) / 
              (SELECT COUNT(*) FROM Device) * 100, 2), '%') AS device_percentage,
        CONCAT(ROUND(COUNT(DISTINCT asen.sensorId) / 
              (SELECT COUNT(*) FROM Sensor) * 100, 2), '%') AS sensor_percentage
      FROM Area a
      JOIN Organization o ON a.organizationId = o.id
      LEFT JOIN AreaDevice ad ON a.id = ad.areaId
      LEFT JOIN AreaSensor asen ON a.id = asen.areaId
      WHERE a.organizationId = :organizationId
      GROUP BY a.id, a.name, o.name
      ORDER BY device_count DESC, sensor_count DESC
    `;
    
    const results = await sequelize.query(query, {
      replacements: { organizationId },
      type: sequelize.QueryTypes.SELECT
    });
    
    return results;
  } catch (error) {
    console.error('Error in getAreaUtilizationReport:', error.message);
    throw error instanceof ApiError ? error : new ApiError(500, 'Failed to generate area utilization report');
  }
};

/**
 * Get payment method analysis report
 * @param {Number} organizationId - The ID of the organization to filter by
 * @param {Object} user - The user requesting the report
 * @returns {Promise<Array>} Array of payment method data
 */
const getPaymentMethodReport = async (organizationId, user) => {
  try {
    // Check if user is a System Admin
    const isSystemAdmin = await roleService.userIsSystemAdmin(user.id);
    
    // If not system admin, verify user has access to this organization
    if (!isSystemAdmin) {
      const userOrgs = await roleService.getUserOrganizations(user.id);
      const orgIds = userOrgs.map(org => org.id);
      
      if (!orgIds.includes(Number(organizationId))) {
        throw new ApiError(403, 'Forbidden: You do not have access to this organization');
      }
    }
    
    // For system admin or if viewing the parent organization, show all child organizations' payment cards
    // For other roles and child organizations, show only the specified organization
    const whereClause = isSystemAdmin ? '' : 'WHERE o.id = :organizationId';
    
    const query = `
      SELECT 
        o.id,
        o.name AS organization,
        COUNT(pc.id) AS payment_cards,
        GROUP_CONCAT(DISTINCT 
          CASE 
            WHEN pc.cardNumber LIKE '4%' THEN 'Visa'
            WHEN pc.cardNumber LIKE '5%' THEN 'Mastercard'
            WHEN pc.cardNumber LIKE '3%' THEN 'Amex'
            ELSE 'Other'
          END SEPARATOR ', ') AS card_types,
        SUM(CASE WHEN pc.expiry < DATE_ADD(CURDATE(), INTERVAL 3 MONTH) THEN 1 ELSE 0 END) AS expiring_soon
      FROM PaymentCard pc
      JOIN Organization o ON pc.organizationId = o.id
      ${whereClause}
      GROUP BY o.id, o.name
      ORDER BY payment_cards DESC
    `;
    
    const results = await sequelize.query(query, {
      replacements: { organizationId },
      type: sequelize.QueryTypes.SELECT
    });
    
    return results;
  } catch (error) {
    console.error('Error in getPaymentMethodReport:', error.message);
    throw error instanceof ApiError ? error : new ApiError(500, 'Failed to generate payment method report');
  }
};

/**
 * Get rule chain execution report
 * @param {Number} organizationId - The ID of the organization to filter by
 * @param {Object} user - The user requesting the report
 * @returns {Promise<Array>} Array of rule chain execution data
 */
const getRuleChainExecutionReport = async (organizationId, user) => {
  try {
    // Check if user is a System Admin
    const isSystemAdmin = await roleService.userIsSystemAdmin(user.id);
    
    // If not system admin, verify user has access to this organization
    if (!isSystemAdmin) {
      const userOrgs = await roleService.getUserOrganizations(user.id);
      const orgIds = userOrgs.map(org => org.id);
      
      if (!orgIds.includes(Number(organizationId))) {
        throw new ApiError(403, 'Forbidden: You do not have access to this organization');
      }
    }
    
    const query = `
      SELECT 
        rc.id,
        rc.name AS rule_chain,
        o.name AS organization,
        rc.executionInterval,
        rc.lastExecution,
        DATEDIFF(NOW(), rc.lastExecution) AS days_since_last_exec,
        CASE 
          WHEN rc.status = 1 AND DATEDIFF(NOW(), rc.lastExecution) > 7 THEN 'Warning - Not recently executed'
          WHEN rc.status = 0 THEN 'Disabled'
          ELSE 'Active'
        END AS status
      FROM RuleChain rc
      JOIN Organization o ON rc.organizationId = o.id
      WHERE rc.organizationId = :organizationId
      ORDER BY days_since_last_exec DESC
    `;
    
    const results = await sequelize.query(query, {
      replacements: { organizationId },
      type: sequelize.QueryTypes.SELECT
    });
    
    return results;
  } catch (error) {
    console.error('Error in getRuleChainExecutionReport:', error.message);
    throw error instanceof ApiError ? error : new ApiError(500, 'Failed to generate rule chain execution report');
  }
};

/**
 * Get sensor data anomaly detection report
 * @param {Number} organizationId - The ID of the organization to filter by
 * @param {Object} user - The user requesting the report
 * @returns {Promise<Array>} Array of sensor anomaly data
 */
const getSensorAnomalyReport = async (organizationId, user) => {
  try {
    // Check if user is a System Admin
    const isSystemAdmin = await roleService.userIsSystemAdmin(user.id);
    
    // If not system admin, verify user has access to this organization
    if (!isSystemAdmin) {
      const userOrgs = await roleService.getUserOrganizations(user.id);
      const orgIds = userOrgs.map(org => org.id);
      
      if (!orgIds.includes(Number(organizationId))) {
        throw new ApiError(403, 'Forbidden: You do not have access to this organization');
      }
    }
    
    const query = `
      SELECT 
        s.id,
        s.name AS sensor,
        td.variableName,
        ds.value,
        ds.recievedAt,
        CASE
          WHEN td.variableName = 'temperature' AND ABS(ds.value - 25) > 5 THEN 'Temperature anomaly'
          WHEN td.variableName = 'humidity' AND ds.value > 80 THEN 'High humidity'
          WHEN td.variableName = 'soil_moisture' AND ds.value < 30 THEN 'Low moisture'
          ELSE 'Normal'
        END AS anomaly_status
      FROM DataStream ds
      JOIN TelemetryData td ON ds.telemetryDataId = td.id
      JOIN Sensor s ON td.sensorId = s.id
      JOIN AreaSensor asen ON s.id = asen.sensorId
      JOIN Area a ON asen.areaId = a.id
      WHERE a.organizationId = :organizationId
        AND ds.recievedAt >= DATE_SUB(NOW(), INTERVAL 1 DAY)
      HAVING anomaly_status != 'Normal'
      ORDER BY ds.recievedAt DESC
    `;
    
    const results = await sequelize.query(query, {
      replacements: { organizationId },
      type: sequelize.QueryTypes.SELECT
    });
    
    return results;
  } catch (error) {
    console.error('Error in getSensorAnomalyReport:', error.message);
    throw error instanceof ApiError ? error : new ApiError(500, 'Failed to generate sensor anomaly report');
  }
};

/**
 * Get user role distribution report
 * @param {Number} organizationId - The ID of the organization to filter by
 * @param {Object} user - The user requesting the report
 * @returns {Promise<Array>} Array of user role distribution data
 */
const getUserRoleDistributionReport = async (organizationId, user) => {
  try {
    // Check if user is a System Admin
    const isSystemAdmin = await roleService.userIsSystemAdmin(user.id);
    
    // If not system admin, verify user has access to this organization
    if (!isSystemAdmin) {
      const userOrgs = await roleService.getUserOrganizations(user.id);
      const orgIds = userOrgs.map(org => org.id);
      
      if (!orgIds.includes(Number(organizationId))) {
        throw new ApiError(403, 'Forbidden: You do not have access to this organization');
      }
    }
    
    const query = `
      SELECT 
        r.id,
        r.name AS role,
        COUNT(ou.id) AS user_count,
        GROUP_CONCAT(DISTINCT o.name SEPARATOR ', ') AS organizations,
        CONCAT(ROUND(COUNT(ou.id) / 
              (SELECT COUNT(*) FROM OrganizationUser WHERE organizationId = :organizationId) * 100, 2), '%') AS percentage
      FROM OrganizationUser ou
      JOIN Role r ON ou.role = r.id
      JOIN Organization o ON ou.organizationId = o.id
      WHERE ou.organizationId = :organizationId
      GROUP BY r.id, r.name
      ORDER BY user_count DESC
    `;
    
    const results = await sequelize.query(query, {
      replacements: { organizationId },
      type: sequelize.QueryTypes.SELECT
    });
    
    return results;
  } catch (error) {
    console.error('Error in getUserRoleDistributionReport:', error.message);
    throw error instanceof ApiError ? error : new ApiError(500, 'Failed to generate user role distribution report');
  }
};

/**
 * Get ticket resolution performance report
 * @param {Number} organizationId - The ID of the organization to filter by
 * @param {Object} user - The user requesting the report
 * @returns {Promise<Array>} Array of ticket resolution data
 */
const getTicketResolutionReport = async (organizationId, user) => {
  try {
    // Check if user is a System Admin
    const isSystemAdmin = await roleService.userIsSystemAdmin(user.id);
    
    // If not system admin, verify user has access to this organization
    if (!isSystemAdmin) {
      const userOrgs = await roleService.getUserOrganizations(user.id);
      const orgIds = userOrgs.map(org => org.id);
      
      if (!orgIds.includes(Number(organizationId))) {
        throw new ApiError(403, 'Forbidden: You do not have access to this organization');
      }
    }
    
    const query = `
      SELECT 
        u.id,
        u.userName AS assigned_to,
        COUNT(t.id) AS total_tickets,
        AVG(TIMESTAMPDIFF(HOUR, t.createdAt, t.acknowledgedAt)) AS avg_resolution_hours,
        SUM(CASE WHEN t.acknowledgedAt IS NULL THEN 1 ELSE 0 END) AS pending_tickets,
        CONCAT(ROUND(SUM(CASE WHEN t.acknowledgedAt IS NOT NULL THEN 1 ELSE 0 END) / 
              COUNT(t.id) * 100,2), '%') AS completion_rate
      FROM Ticket t
      JOIN User u ON t.assignedTo = u.id
      JOIN OrganizationUser ou ON u.id = ou.userId AND ou.organizationId = :organizationId
      GROUP BY u.id, u.userName
      HAVING total_tickets > 0
      ORDER BY avg_resolution_hours
    `;
    
    const results = await sequelize.query(query, {
      replacements: { organizationId },
      type: sequelize.QueryTypes.SELECT
    });
    
    return results;
  } catch (error) {
    console.error('Error in getTicketResolutionReport:', error.message);
    throw error instanceof ApiError ? error : new ApiError(500, 'Failed to generate ticket resolution report');
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