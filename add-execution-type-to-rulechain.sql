-- Migration: Add executionType field to RuleChain table
-- Description: Adds execution type differentiation for rule chains (event-triggered, schedule-only, hybrid)
-- Date: 2024-01-XX
-- Version: 1.2 (MySQL compatibility fix)

-- Check if the column already exists (MySQL/MariaDB)
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_NAME = 'RuleChain' 
   AND COLUMN_NAME = 'executionType') = 0,
  "ALTER TABLE RuleChain ADD COLUMN executionType ENUM('event-triggered', 'schedule-only', 'hybrid') NOT NULL DEFAULT 'hybrid' AFTER description",
  "SELECT 'Column executionType already exists'"
));

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add indexes for performance (with compatibility for older MySQL versions)
-- Check and create execution type index
SET @index_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
                     WHERE TABLE_NAME = 'RuleChain' 
                     AND INDEX_NAME = 'idx_rulechain_execution_type');

SET @sql = IF(@index_exists = 0,
  'CREATE INDEX idx_rulechain_execution_type ON RuleChain (executionType)',
  'SELECT "Index idx_rulechain_execution_type already exists"'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and create organization + execution type index
SET @index_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
                     WHERE TABLE_NAME = 'RuleChain' 
                     AND INDEX_NAME = 'idx_rulechain_org_execution_type');

SET @sql = IF(@index_exists = 0,
  'CREATE INDEX idx_rulechain_org_execution_type ON RuleChain (organizationId, executionType)',
  'SELECT "Index idx_rulechain_org_execution_type already exists"'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update existing rule chains with intelligent defaults
-- Rule chains with schedules enabled but no entity dependencies -> schedule-only
-- Rule chains with entity dependencies but no schedules -> event-triggered
-- Rule chains with both or unclear -> hybrid (safe default)

UPDATE RuleChain 
SET executionType = 'schedule-only'
WHERE scheduleEnabled = TRUE 
  AND executionType = 'hybrid'
  AND id NOT IN (
    -- Rule chains that have entity dependencies (sensor/device references in nodes)
    SELECT DISTINCT rc.id 
    FROM RuleChain rc
    JOIN RuleChainNode rcn ON rc.id = rcn.ruleChainId
    WHERE rcn.config IS NOT NULL 
      AND (
        rcn.config LIKE '%"sourceType":"sensor"%' OR
        rcn.config LIKE '%"sourceType":"device"%' OR
        rcn.config LIKE '%"deviceUuid"%'
      )
  );

UPDATE RuleChain 
SET executionType = 'event-triggered'
WHERE scheduleEnabled = FALSE 
  AND executionType = 'hybrid'
  AND id IN (
    -- Rule chains that have entity dependencies (sensor/device references in nodes)
    SELECT DISTINCT rc.id 
    FROM RuleChain rc
    JOIN RuleChainNode rcn ON rc.id = rcn.ruleChainId
    WHERE rcn.config IS NOT NULL 
      AND (
        rcn.config LIKE '%"sourceType":"sensor"%' OR
        rcn.config LIKE '%"sourceType":"device"%' OR
        rcn.config LIKE '%"deviceUuid"%'
      )
  );

-- Verify the migration
SELECT 
  executionType,
  COUNT(*) as count,
  CONCAT(ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM RuleChain), 1), '%') as percentage
FROM RuleChain 
GROUP BY executionType
ORDER BY count DESC;

-- Show some examples of the migration results
SELECT 
  id,
  name,
  executionType,
  scheduleEnabled,
  cronExpression,
  (SELECT COUNT(*) FROM RuleChainNode WHERE ruleChainId = RuleChain.id) as nodeCount
FROM RuleChain 
ORDER BY executionType, id
LIMIT 10;

-- Summary report
SELECT 
  '=== EXECUTION TYPE MIGRATION SUMMARY ===' as summary
UNION ALL
SELECT CONCAT('Total Rule Chains: ', COUNT(*)) FROM RuleChain
UNION ALL
SELECT CONCAT('Event-Triggered: ', COUNT(*)) FROM RuleChain WHERE executionType = 'event-triggered'
UNION ALL
SELECT CONCAT('Schedule-Only: ', COUNT(*)) FROM RuleChain WHERE executionType = 'schedule-only'
UNION ALL
SELECT CONCAT('Hybrid: ', COUNT(*)) FROM RuleChain WHERE executionType = 'hybrid'
UNION ALL
SELECT '========================================';

-- Add helpful comments (skip if not supported)
-- ALTER TABLE RuleChain COMMENT = 'Rule chains with execution type differentiation: event-triggered (only by events), schedule-only (only by schedules), hybrid (both)';

-- Create MigrationLog table if it doesn't exist (optional)
CREATE TABLE IF NOT EXISTS MigrationLog (
  id INT AUTO_INCREMENT PRIMARY KEY,
  migration_name VARCHAR(255) NOT NULL UNIQUE,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  description TEXT
);

-- Log the migration completion
INSERT INTO MigrationLog (migration_name, executed_at, description) 
VALUES (
  'add_execution_type_to_rulechain', 
  NOW(), 
  'Added executionType field to RuleChain table with intelligent defaults based on existing configurations'
) 
ON DUPLICATE KEY UPDATE 
  executed_at = NOW(),
  description = VALUES(description);

SELECT 'Migration completed successfully! Execute the summary query above to see results.' as result; 