-- Migration: Add schedule fields to RuleChain table
-- Description: Adds database-backed scheduling support for rule chains
-- Date: 2024-01-XX
-- Version: 1.0

-- Add schedule fields to RuleChain table
ALTER TABLE RuleChain ADD COLUMN (
  scheduleEnabled BOOLEAN DEFAULT FALSE NOT NULL,
  cronExpression VARCHAR(100) NULL,
  timezone VARCHAR(50) DEFAULT 'UTC' NOT NULL,
  priority INT DEFAULT 0 NOT NULL,
  maxRetries INT DEFAULT 0 NOT NULL,
  retryDelay INT DEFAULT 0 NOT NULL,
  scheduleMetadata JSON NULL,
  lastExecutedAt TIMESTAMP NULL,
  lastErrorAt TIMESTAMP NULL,
  executionCount INT DEFAULT 0 NOT NULL,
  failureCount INT DEFAULT 0 NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_rulechain_schedule_enabled ON RuleChain (scheduleEnabled);
CREATE INDEX idx_rulechain_last_executed ON RuleChain (lastExecutedAt);
CREATE INDEX idx_rulechain_organization_schedule ON RuleChain (organizationId, scheduleEnabled);

-- Add some sample comments for documentation
-- scheduleEnabled: Boolean flag to enable/disable scheduling for this rule chain
-- cronExpression: Cron expression defining when to execute (e.g., '0 */10 * * * *' for every 10 minutes)
-- timezone: Timezone for cron execution (e.g., 'America/New_York', 'Europe/London', 'UTC')
-- priority: Execution priority (higher numbers = higher priority)
-- maxRetries: Maximum number of retry attempts on failure
-- retryDelay: Delay in seconds between retry attempts
-- scheduleMetadata: JSON object for storing additional schedule configuration
-- lastExecutedAt: Timestamp of last successful execution
-- lastErrorAt: Timestamp of last error occurrence
-- executionCount: Total number of executions
-- failureCount: Total number of failed executions

-- Verify the migration
SELECT 
  COLUMN_NAME,
  DATA_TYPE,
  IS_NULLABLE,
  COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'RuleChain' 
  AND COLUMN_NAME IN (
    'scheduleEnabled', 'cronExpression', 'timezone', 'priority', 
    'maxRetries', 'retryDelay', 'scheduleMetadata', 'lastExecutedAt', 
    'lastErrorAt', 'executionCount', 'failureCount'
  )
ORDER BY ORDINAL_POSITION; 