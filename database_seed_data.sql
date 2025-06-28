-- =====================================================
-- AEMOS Database Seed Data
-- Rule Engine and Scheduling Test Data
-- =====================================================

-- Start transaction
START TRANSACTION;

-- Clear existing data (in dependency order)
SET FOREIGN_KEY_CHECKS = 0;

DELETE FROM DeviceStateInstance WHERE id > 0;
DELETE FROM DeviceState WHERE id > 0;
DELETE FROM DataStream WHERE id > 0;
DELETE FROM TelemetryData WHERE id > 0;
DELETE FROM RuleChainNode WHERE id > 0;
DELETE FROM RuleChain WHERE id > 0;
DELETE FROM Device WHERE id > 0;
DELETE FROM Sensor WHERE id > 0;
DELETE FROM Area WHERE id > 0;
DELETE FROM UserRole WHERE userId > 0;
DELETE FROM RolePermission WHERE roleId > 0;
DELETE FROM User WHERE id > 0;
DELETE FROM Role WHERE id > 0;
DELETE FROM Permission WHERE id > 0;
DELETE FROM Organization WHERE id > 0;

-- Reset auto-increment counters
ALTER TABLE Organization AUTO_INCREMENT = 1;
ALTER TABLE Permission AUTO_INCREMENT = 1;
ALTER TABLE Role AUTO_INCREMENT = 1;
ALTER TABLE User AUTO_INCREMENT = 1;
ALTER TABLE UserRole AUTO_INCREMENT = 1;
ALTER TABLE RolePermission AUTO_INCREMENT = 1;
ALTER TABLE Area AUTO_INCREMENT = 1;
ALTER TABLE Sensor AUTO_INCREMENT = 1;
ALTER TABLE Device AUTO_INCREMENT = 1;
ALTER TABLE TelemetryData AUTO_INCREMENT = 1;
ALTER TABLE DataStream AUTO_INCREMENT = 1;
ALTER TABLE DeviceState AUTO_INCREMENT = 1;
ALTER TABLE DeviceStateInstance AUTO_INCREMENT = 1;
ALTER TABLE RuleChain AUTO_INCREMENT = 1;
ALTER TABLE RuleChainNode AUTO_INCREMENT = 1;

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================
-- ORGANIZATIONS
-- =====================================================
INSERT INTO Organization (id, name, parentId, status, detail, paymentMethods, image, address, zip, email, isParent, contactNumber, createdAt, updatedAt) VALUES
(1, 'AEMOS Corporation', NULL, 1, 'Main organization for AEMOS platform', 'Credit Card, Bank Transfer', 'https://example.com/logo1.png', '123 Tech Street, Silicon Valley, CA', '94000', 'admin@aemos.com', 1, '+1-555-0100', NOW(), NOW()),
(2, 'Smart Factory Solutions', 1, 1, 'Industrial IoT solutions provider', 'Credit Card, PayPal', 'https://example.com/logo2.png', '456 Industry Blvd, Detroit, MI', '48000', 'contact@smartfactory.com', 0, '+1-555-0200', NOW(), NOW()),
(3, 'Green Energy Systems', 1, 1, 'Renewable energy monitoring', 'Bank Transfer, Crypto', 'https://example.com/logo3.png', '789 Solar Way, Austin, TX', '73000', 'info@greenenergy.com', 0, '+1-555-0300', NOW(), NOW());

-- =====================================================
-- PERMISSIONS
-- =====================================================
INSERT INTO Permission (id, name, description, createdAt, updatedAt) VALUES
(1, 'organization.view', 'View organizations', NOW(), NOW()),
(2, 'organization.create', 'Create organizations', NOW(), NOW()),
(3, 'organization.update', 'Update organizations', NOW(), NOW()),
(4, 'organization.delete', 'Delete organizations', NOW(), NOW()),
(5, 'user.view', 'View users', NOW(), NOW()),
(6, 'user.create', 'Create users', NOW(), NOW()),
(7, 'user.update', 'Update users', NOW(), NOW()),
(8, 'user.delete', 'Delete users', NOW(), NOW()),
(9, 'area.view', 'View areas', NOW(), NOW()),
(10, 'area.create', 'Create areas', NOW(), NOW()),
(11, 'area.update', 'Update areas', NOW(), NOW()),
(12, 'area.delete', 'Delete areas', NOW(), NOW()),
(13, 'sensor.view', 'View sensors', NOW(), NOW()),
(14, 'sensor.create', 'Create sensors', NOW(), NOW()),
(15, 'sensor.update', 'Update sensors', NOW(), NOW()),
(16, 'sensor.delete', 'Delete sensors', NOW(), NOW()),
(17, 'device.view', 'View devices', NOW(), NOW()),
(18, 'device.create', 'Create devices', NOW(), NOW()),
(19, 'device.update', 'Update devices', NOW(), NOW()),
(20, 'device.delete', 'Delete devices', NOW(), NOW()),
(21, 'rule.view', 'View rule chains', NOW(), NOW()),
(22, 'rule.create', 'Create rule chains', NOW(), NOW()),
(23, 'rule.update', 'Update rule chains', NOW(), NOW()),
(24, 'rule.delete', 'Delete rule chains', NOW(), NOW()),
(25, 'permission.view', 'View permissions', NOW(), NOW()),
(26, 'permission.manage', 'Manage permissions', NOW(), NOW()),
(27, 'role.view', 'View roles', NOW(), NOW()),
(28, 'role.assign', 'Assign roles', NOW(), NOW()),
(29, 'report.view', 'View reports', NOW(), NOW()),
(30, 'report.generate', 'Generate reports', NOW(), NOW());

-- =====================================================
-- ROLES
-- =====================================================
INSERT INTO Role (id, name, description, organizationId, createdAt, updatedAt) VALUES
(1, 'System Admin', 'System administrator with full access', NULL, NOW(), NOW()),
(2, 'Org Admin', 'Organization administrator', 1, NOW(), NOW()),
(3, 'Supervisor', 'Supervisor with view and report access', 1, NOW(), NOW()),
(4, 'Viewer', 'Read-only viewer', 1, NOW(), NOW()),
(5, 'Factory Admin', 'Smart factory administrator', 2, NOW(), NOW()),
(6, 'Energy Admin', 'Green energy administrator', 3, NOW(), NOW());

-- =====================================================
-- ROLE PERMISSIONS (All permissions for all roles for testing)
-- =====================================================
INSERT INTO RolePermission (roleId, permissionId, createdAt, updatedAt) 
SELECT r.id, p.id, NOW(), NOW() 
FROM Role r 
CROSS JOIN Permission p;

-- =====================================================
-- USERS
-- =====================================================
INSERT INTO User (id, userName, email, password, phoneNumber, notifyByEmail, notifyBySMS, notifyByMessage, smsNumber, detail, termsAndConditions, notifyUser, organizationId, createdAt, updatedAt) VALUES
(1, 'System Administrator', 'samiradmin@yopmail.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '+1-555-1001', 1, 0, 1, '+1-555-1001', 'System administrator account', 1, 1, 1, NOW(), NOW()),
(2, 'AEMOS Admin', 'admin@aemos.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '+1-555-1002', 1, 1, 1, '+1-555-1002', 'AEMOS organization admin', 1, 1, 1, NOW(), NOW()),
(3, 'Factory Supervisor', 'supervisor@smartfactory.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '+1-555-1003', 1, 1, 0, '+1-555-1003', 'Factory operations supervisor', 1, 1, 2, NOW(), NOW()),
(4, 'Energy Monitor', 'monitor@greenenergy.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '+1-555-1004', 1, 0, 1, '+1-555-1004', 'Energy systems monitor', 1, 1, 3, NOW(), NOW()),
(5, 'Test Viewer', 'viewer@aemos.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '+1-555-1005', 1, 0, 0, '+1-555-1005', 'Test viewer account', 1, 1, 1, NOW(), NOW());

-- =====================================================
-- USER ROLES
-- =====================================================
INSERT INTO UserRole (userId, roleId, organizationId, createdAt, updatedAt) VALUES
(1, 1, 1, NOW(), NOW()),  -- System Admin
(2, 2, 1, NOW(), NOW()),  -- AEMOS Org Admin
(3, 5, 2, NOW(), NOW()),  -- Factory Admin
(4, 6, 3, NOW(), NOW()),  -- Energy Admin
(5, 4, 1, NOW(), NOW());  -- Viewer

-- =====================================================
-- AREAS
-- =====================================================
INSERT INTO Area (id, name, organizationId, parentArea, image, uuid, createdAt, updatedAt) VALUES
(1, 'Main Campus', 1, NULL, 'https://example.com/campus.jpg', '11111111-1111-1111-1111-111111111111', NOW(), NOW()),
(2, 'Building A', 1, 1, 'https://example.com/buildingA.jpg', '22222222-2222-2222-2222-222222222222', NOW(), NOW()),
(3, 'Building B', 1, 1, 'https://example.com/buildingB.jpg', '33333333-3333-3333-3333-333333333333', NOW(), NOW()),
(4, 'Factory Floor 1', 2, NULL, 'https://example.com/factory1.jpg', '44444444-4444-4444-4444-444444444444', NOW(), NOW()),
(5, 'Factory Floor 2', 2, NULL, 'https://example.com/factory2.jpg', '55555555-5555-5555-5555-555555555555', NOW(), NOW()),
(6, 'Solar Farm East', 3, NULL, 'https://example.com/solar1.jpg', '66666666-6666-6666-6666-666666666666', NOW(), NOW()),
(7, 'Solar Farm West', 3, NULL, 'https://example.com/solar2.jpg', '77777777-7777-7777-7777-777777777777', NOW(), NOW());

-- =====================================================
-- SENSORS
-- =====================================================
INSERT INTO Sensor (id, name, description, status, uuid, organizationId, createdAt, updatedAt) VALUES
(1, 'Temperature Sensor A1', 'Building A temperature monitoring', 1, 'temp-a1-550e8400-e29b-41d4-a716-446655440000', 1, NOW(), NOW()),
(2, 'Humidity Sensor A1', 'Building A humidity monitoring', 1, 'humi-a1-550e8400-e29b-41d4-a716-446655440001', 1, NOW(), NOW()),
(3, 'Motion Sensor B1', 'Building B motion detection', 1, 'moti-b1-550e8400-e29b-41d4-a716-446655440002', 1, NOW(), NOW()),
(4, 'Pressure Sensor F1', 'Factory floor 1 pressure monitoring', 1, 'pres-f1-550e8400-e29b-41d4-a716-446655440003', 2, NOW(), NOW()),
(5, 'Vibration Sensor F1', 'Factory floor 1 vibration monitoring', 1, 'vibr-f1-550e8400-e29b-41d4-a716-446655440004', 2, NOW(), NOW()),
(6, 'Power Sensor SF1', 'Solar farm east power monitoring', 1, 'powr-sf1-550e8400-e29b-41d4-a716-446655440005', 3, NOW(), NOW()),
(7, 'Irradiance Sensor SF1', 'Solar farm east irradiance monitoring', 1, 'irra-sf1-550e8400-e29b-41d4-a716-446655440006', 3, NOW(), NOW());

-- =====================================================
-- DEVICES
-- =====================================================
INSERT INTO Device (id, name, description, status, uuid, organizationId, deviceType, controlType, minValue, maxValue, defaultState, communicationProtocol, isCritical, metadata, capabilities, createdAt, updatedAt) VALUES
(1, 'HVAC Controller A1', 'Building A HVAC system controller', 'active', 'hvac-a1-660e8400-e29b-41d4-a716-446655440000', 1, 'actuator', 'analog', 16, 30, '22', 'mqtt', 1, '{"zone": "A1", "model": "HVAC-2000"}', '{"temperature_control": true, "scheduling": true}', NOW(), NOW()),
(2, 'Lighting Controller B1', 'Building B smart lighting', 'active', 'lght-b1-660e8400-e29b-41d4-a716-446655440001', 1, 'actuator', 'binary', 0, 100, 'Off', 'zigbee', 0, '{"zone": "B1", "bulb_count": 24}', '{"dimming": true, "color_control": false}', NOW(), NOW()),
(3, 'Security System B1', 'Building B security system', 'active', 'secu-b1-660e8400-e29b-41d4-a716-446655440002', 1, 'actuator', 'binary', 0, 1, 'Disarmed', 'wifi', 1, '{"zone": "B1", "cameras": 8}', '{"motion_detection": true, "recording": true}', NOW(), NOW()),
(4, 'Conveyor Belt F1', 'Factory floor 1 main conveyor', 'active', 'conv-f1-660e8400-e29b-41d4-a716-446655440003', 2, 'actuator', 'analog', 0, 100, 'Stopped', 'modbus', 1, '{"line": "production_1", "length_m": 50}', '{"speed_control": true, "direction_control": true}', NOW(), NOW()),
(5, 'Cooling Pump F1', 'Factory floor 1 cooling system', 'active', 'cool-f1-660e8400-e29b-41d4-a716-446655440004', 2, 'actuator', 'binary', 0, 1, 'Off', 'mqtt', 1, '{"system": "cooling", "flow_rate": "500L/min"}', '{"flow_control": true, "temperature_monitoring": true}', NOW(), NOW()),
(6, 'Inverter East SF1', 'Solar farm east power inverter', 'active', 'invr-sf1-660e8400-e29b-41d4-a716-446655440005', 3, 'actuator', 'analog', 0, 1000, 'Standby', 'tcp', 1, '{"capacity_kw": 500, "panels": 1000}', '{"mppt": true, "grid_tie": true}', NOW(), NOW()),
(7, 'Tracker System SF1', 'Solar farm east sun tracking system', 'active', 'trak-sf1-660e8400-e29b-41d4-a716-446655440006', 3, 'actuator', 'analog', -90, 90, '0', 'can', 0, '{"axis": "dual", "panels": 100}', '{"sun_tracking": true, "weather_protection": true}', NOW(), NOW());

-- =====================================================
-- TELEMETRY DATA
-- =====================================================
INSERT INTO TelemetryData (id, variableName, datatype, sensorId, createdAt, updatedAt) VALUES
(1, 'temperature', 'number', 1, NOW(), NOW()),
(2, 'humidity', 'number', 2, NOW(), NOW()),
(3, 'motion_detected', 'boolean', 3, NOW(), NOW()),
(4, 'pressure', 'number', 4, NOW(), NOW()),
(5, 'vibration_level', 'number', 5, NOW(), NOW()),
(6, 'power_output', 'number', 6, NOW(), NOW()),
(7, 'solar_irradiance', 'number', 7, NOW(), NOW());

-- =====================================================
-- DATA STREAMS (Sample sensor readings)
-- =====================================================
INSERT INTO DataStream (id, value, telemetryDataId, recievedAt) VALUES
-- Temperature readings (varying from 20-35°C)
(1, '22.5', 1, DATE_SUB(NOW(), INTERVAL 30 MINUTE)),
(2, '23.1', 1, DATE_SUB(NOW(), INTERVAL 25 MINUTE)),
(3, '24.8', 1, DATE_SUB(NOW(), INTERVAL 20 MINUTE)),
(4, '26.2', 1, DATE_SUB(NOW(), INTERVAL 15 MINUTE)),
(5, '28.5', 1, DATE_SUB(NOW(), INTERVAL 10 MINUTE)),
(6, '31.2', 1, DATE_SUB(NOW(), INTERVAL 5 MINUTE)),
(7, '33.8', 1, NOW()),

-- Humidity readings (45-75%)
(8, '62.3', 2, DATE_SUB(NOW(), INTERVAL 30 MINUTE)),
(9, '58.7', 2, DATE_SUB(NOW(), INTERVAL 20 MINUTE)),
(10, '67.1', 2, DATE_SUB(NOW(), INTERVAL 10 MINUTE)),
(11, '71.4', 2, NOW()),

-- Motion detection (true/false)
(12, 'false', 3, DATE_SUB(NOW(), INTERVAL 30 MINUTE)),
(13, 'true', 3, DATE_SUB(NOW(), INTERVAL 15 MINUTE)),
(14, 'false', 3, NOW()),

-- Pressure readings (1-5 bar)
(15, '2.3', 4, DATE_SUB(NOW(), INTERVAL 25 MINUTE)),
(16, '3.1', 4, DATE_SUB(NOW(), INTERVAL 15 MINUTE)),
(17, '4.7', 4, NOW()),

-- Vibration levels (0-10)
(18, '1.2', 5, DATE_SUB(NOW(), INTERVAL 20 MINUTE)),
(19, '2.8', 5, DATE_SUB(NOW(), INTERVAL 10 MINUTE)),
(20, '8.5', 5, NOW()),

-- Power output (0-1000 kW)
(21, '450.2', 6, DATE_SUB(NOW(), INTERVAL 30 MINUTE)),
(22, '523.7', 6, DATE_SUB(NOW(), INTERVAL 15 MINUTE)),
(23, '687.9', 6, NOW()),

-- Solar irradiance (0-1200 W/m²)
(24, '856.3', 7, DATE_SUB(NOW(), INTERVAL 30 MINUTE)),
(25, '923.1', 7, DATE_SUB(NOW(), INTERVAL 15 MINUTE)),
(26, '1034.5', 7, NOW());

-- =====================================================
-- DEVICE STATES
-- =====================================================
INSERT INTO DeviceState (id, stateName, dataType, defaultValue, allowedValues, deviceId, createdAt, updatedAt) VALUES
(1, 'temperature_setpoint', 'number', '22', NULL, 1, NOW(), NOW()),
(2, 'operating_mode', 'string', 'auto', '["auto", "heat", "cool", "off"]', 1, NOW(), NOW()),
(3, 'brightness', 'number', '0', NULL, 2, NOW(), NOW()),
(4, 'power_state', 'string', 'off', '["on", "off"]', 2, NOW(), NOW()),
(5, 'security_status', 'string', 'disarmed', '["armed", "disarmed", "alarm"]', 3, NOW(), NOW()),
(6, 'speed', 'number', '0', NULL, 4, NOW(), NOW()),
(7, 'direction', 'string', 'forward', '["forward", "reverse", "stop"]', 4, NOW(), NOW()),
(8, 'pump_status', 'string', 'off', '["on", "off", "maintenance"]', 5, NOW(), NOW()),
(9, 'output_power', 'number', '0', NULL, 6, NOW(), NOW()),
(10, 'grid_status', 'string', 'connected', '["connected", "disconnected", "fault"]', 6, NOW(), NOW()),
(11, 'azimuth_angle', 'number', '0', NULL, 7, NOW(), NOW()),
(12, 'elevation_angle', 'number', '0', NULL, 7, NOW(), NOW());

-- =====================================================
-- DEVICE STATE INSTANCES (Current device states)
-- =====================================================
INSERT INTO DeviceStateInstance (id, value, fromTimestamp, toTimestamp, deviceStateId, initiatedBy, metadata, createdAt, updatedAt) VALUES
(1, '24', DATE_SUB(NOW(), INTERVAL 2 HOUR), NULL, 1, 'system', '{"source": "thermostat", "user_id": 2}', NOW(), NOW()),
(2, 'cool', DATE_SUB(NOW(), INTERVAL 2 HOUR), NULL, 2, 'user', '{"user_id": 2, "reason": "temperature_high"}', NOW(), NOW()),
(3, '75', DATE_SUB(NOW(), INTERVAL 1 HOUR), NULL, 3, 'schedule', '{"schedule_id": 1, "trigger": "evening_mode"}', NOW(), NOW()),
(4, 'on', DATE_SUB(NOW(), INTERVAL 1 HOUR), NULL, 4, 'schedule', '{"schedule_id": 1, "trigger": "evening_mode"}', NOW(), NOW()),
(5, 'armed', DATE_SUB(NOW(), INTERVAL 30 MINUTE), NULL, 5, 'user', '{"user_id": 3, "location": "remote"}', NOW(), NOW()),
(6, '45', DATE_SUB(NOW(), INTERVAL 3 HOUR), NULL, 6, 'production', '{"shift": "day", "order_id": "ORD-001"}', NOW(), NOW()),
(7, 'forward', DATE_SUB(NOW(), INTERVAL 3 HOUR), NULL, 7, 'production', '{"shift": "day", "order_id": "ORD-001"}', NOW(), NOW()),
(8, 'on', DATE_SUB(NOW(), INTERVAL 4 HOUR), NULL, 8, 'system', '{"temperature_trigger": 85, "auto_start": true}', NOW(), NOW()),
(9, '687', DATE_SUB(NOW(), INTERVAL 15 MINUTE), NULL, 9, 'system', '{"solar_irradiance": 1034, "optimization": "mppt"}', NOW(), NOW()),
(10, 'connected', DATE_SUB(NOW(), INTERVAL 6 HOUR), NULL, 10, 'system', '{"grid_frequency": 60, "voltage": 480}', NOW(), NOW()),
(11, '45', DATE_SUB(NOW(), INTERVAL 20 MINUTE), NULL, 11, 'system', '{"sun_position": "calculated", "time": "14:40"}', NOW(), NOW()),
(12, '30', DATE_SUB(NOW(), INTERVAL 20 MINUTE), NULL, 12, 'system', '{"sun_position": "calculated", "time": "14:40"}', NOW(), NOW());

-- =====================================================
-- RULE CHAINS
-- =====================================================
INSERT INTO RuleChain (id, name, description, organizationId, scheduleEnabled, cronExpression, timezone, priority, maxRetries, retryDelay, scheduleMetadata, lastExecutedAt, lastErrorAt, executionCount, failureCount, createdAt, updatedAt) VALUES
(1, 'Temperature Alert System', 'Monitor temperature and trigger cooling when too high', 1, 1, '0 */5 * * * *', 'UTC', 8, 3, 1000, '{"alert_threshold": 30, "cooling_setpoint": 22, "notification": true}', DATE_SUB(NOW(), INTERVAL 3 MINUTE), NULL, 15, 0, NOW(), NOW()),
(2, 'Security Motion Detection', 'Detect motion and trigger security protocols', 1, 0, NULL, 'UTC', 5, 2, 500, NULL, NULL, NULL, 0, 0, NOW(), NOW()),
(3, 'Factory Safety Monitor', 'Monitor factory conditions and ensure safety', 2, 1, '0 */2 * * * *', 'UTC', 10, 5, 2000, '{"pressure_limit": 4.5, "vibration_limit": 7.0, "auto_shutdown": true}', DATE_SUB(NOW(), INTERVAL 1 MINUTE), NULL, 42, 1, NOW(), NOW()),
(4, 'Solar Power Optimization', 'Optimize solar panel positioning and power output', 3, 1, '0 */10 * * * *', 'UTC', 6, 3, 1500, '{"efficiency_target": 0.85, "weather_adjustment": true}', DATE_SUB(NOW(), INTERVAL 7 MINUTE), NULL, 8, 0, NOW(), NOW()),
(5, 'Building Energy Management', 'Manage building energy consumption', 1, 1, '0 0 */1 * * *', 'UTC', 4, 2, 1000, '{"energy_saving": true, "peak_hours": ["14:00", "18:00"]}', DATE_SUB(NOW(), INTERVAL 45 MINUTE), NULL, 3, 0, NOW(), NOW());

-- =====================================================
-- RULE CHAIN NODES
-- =====================================================
INSERT INTO RuleChainNode (id, name, type, config, nextNodeId, ruleChainId, createdAt, updatedAt) VALUES
-- Temperature Alert System (Rule Chain 1)
(1, 'Temperature Filter', 'filter', '{"sourceType": "sensor", "UUID": "temp-a1-550e8400-e29b-41d4-a716-446655440000", "key": "temperature", "operator": ">", "value": 30}', 2, 1, NOW(), NOW()),
(2, 'Temperature Transform', 'transform', '{"key": "temperature", "operation": "subtract", "operand": 8}', 3, 1, NOW(), NOW()),
(3, 'HVAC Action', 'action', '{"type": "device_control", "command": {"deviceUuid": "hvac-a1-660e8400-e29b-41d4-a716-446655440000", "stateName": "temperature_setpoint", "value": "22"}}', NULL, 1, NOW(), NOW()),

-- Security Motion Detection (Rule Chain 2)  
(4, 'Motion Detection Filter', 'filter', '{"sourceType": "sensor", "UUID": "moti-b1-550e8400-e29b-41d4-a716-446655440002", "key": "motion_detected", "operator": "==", "value": true}', 5, 2, NOW(), NOW()),
(5, 'Security Action', 'action', '{"type": "device_control", "command": {"deviceUuid": "secu-b1-660e8400-e29b-41d4-a716-446655440002", "stateName": "security_status", "value": "alarm"}}', NULL, 2, NOW(), NOW()),

-- Factory Safety Monitor (Rule Chain 3)
(6, 'Pressure Safety Filter', 'filter', '{"sourceType": "sensor", "UUID": "pres-f1-550e8400-e29b-41d4-a716-446655440003", "key": "pressure", "operator": ">", "value": 4.5}', 7, 3, NOW(), NOW()),
(7, 'Emergency Stop Action', 'action', '{"type": "device_control", "command": {"deviceUuid": "conv-f1-660e8400-e29b-41d4-a716-446655440003", "stateName": "speed", "value": "0"}}', 8, 3, NOW(), NOW()),
(8, 'Cooling Pump Action', 'action', '{"type": "device_control", "command": {"deviceUuid": "cool-f1-660e8400-e29b-41d4-a716-446655440004", "stateName": "pump_status", "value": "on"}}', NULL, 3, NOW(), NOW()),

-- Solar Power Optimization (Rule Chain 4)
(9, 'Solar Irradiance Filter', 'filter', '{"sourceType": "sensor", "UUID": "irra-sf1-550e8400-e29b-41d4-a716-446655440006", "key": "solar_irradiance", "operator": ">", "value": 500}', 10, 4, NOW(), NOW()),
(10, 'Sun Tracking Action', 'action', '{"type": "device_control", "command": {"deviceUuid": "trak-sf1-660e8400-e29b-41d4-a716-446655440006", "stateName": "azimuth_angle", "value": "45"}}', 11, 4, NOW(), NOW()),
(11, 'Inverter Action', 'action', '{"type": "device_control", "command": {"deviceUuid": "invr-sf1-660e8400-e29b-41d4-a716-446655440005", "stateName": "output_power", "value": "750"}}', NULL, 4, NOW(), NOW()),

-- Building Energy Management (Rule Chain 5)
(12, 'Time Filter', 'filter', '{"type": "time_based", "startTime": "14:00", "endTime": "18:00"}', 13, 5, NOW(), NOW()),
(13, 'Lighting Dimmer Action', 'action', '{"type": "device_control", "command": {"deviceUuid": "lght-b1-660e8400-e29b-41d4-a716-446655440001", "stateName": "brightness", "value": "60"}}', NULL, 5, NOW(), NOW());

-- Commit transaction
COMMIT;

-- =====================================================
-- SUMMARY REPORT
-- =====================================================
SELECT 'Seed data insertion completed successfully!' AS status;

SELECT 
    'Organizations' AS entity_type, 
    COUNT(*) AS count 
FROM Organization
UNION ALL
SELECT 'Users', COUNT(*) FROM User
UNION ALL
SELECT 'Sensors', COUNT(*) FROM Sensor  
UNION ALL
SELECT 'Devices', COUNT(*) FROM Device
UNION ALL
SELECT 'Telemetry Data', COUNT(*) FROM TelemetryData
UNION ALL
SELECT 'Data Streams', COUNT(*) FROM DataStream
UNION ALL
SELECT 'Device States', COUNT(*) FROM DeviceState
UNION ALL
SELECT 'Device State Instances', COUNT(*) FROM DeviceStateInstance
UNION ALL
SELECT 'Rule Chains', COUNT(*) FROM RuleChain
UNION ALL
SELECT 'Rule Chain Nodes', COUNT(*) FROM RuleChainNode
UNION ALL
SELECT 'Scheduled Rule Chains', COUNT(*) FROM RuleChain WHERE scheduleEnabled = 1;

-- Display login credentials
SELECT 
    'Login Credentials' AS info,
    userName,
    email,
    'password123' AS password,
    organizationId,
    'All users have the same password for testing' AS note
FROM User;

-- Display sensor UUIDs for testing
SELECT 
    'Sensor UUIDs for Rule Engine Testing' AS info,
    name,
    uuid,
    organizationId
FROM Sensor;

-- Display device UUIDs for testing  
SELECT 
    'Device UUIDs for Rule Engine Testing' AS info,
    name, 
    uuid,
    organizationId
FROM Device;

-- Display scheduled rule chains
SELECT 
    'Scheduled Rule Chains' AS info,
    name,
    cronExpression,
    priority,
    executionCount,
    scheduleMetadata
FROM RuleChain 
WHERE scheduleEnabled = 1; 