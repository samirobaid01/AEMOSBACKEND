-- TimescaleDB setup for AEMOS time-series data
-- Run once against your TimescaleDB database (TSDB_NAME).
--
-- Prerequisites:
--   1. TimescaleDB extension installed on your PostgreSQL server
--   2. Database already created:  CREATE DATABASE aemos_timeseries;
--
-- Usage:
--   psql -h $TSDB_HOST -p $TSDB_PORT -U $TSDB_USER -d $TSDB_NAME -f scripts/setup-timescaledb.sql

-- Enable the TimescaleDB extension (idempotent)
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Create the DataStream table (mirrors the MySQL schema)
-- "recievedAt" spelling is intentional — kept in sync with the Sequelize model.
CREATE TABLE IF NOT EXISTS "DataStream" (
    id              BIGSERIAL       PRIMARY KEY,
    value           VARCHAR(50),
    "telemetryDataId" BIGINT        NOT NULL,
    "recievedAt"    TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Convert to a hypertable partitioned by time (idempotent via migrate_data => true)
SELECT create_hypertable(
    '"DataStream"',
    'recievedAt',
    if_not_exists => TRUE,
    migrate_data   => TRUE
);

-- Index for the most common query pattern: latest reading per telemetry channel
CREATE INDEX IF NOT EXISTS idx_datastream_telemetry_time
    ON "DataStream" ("telemetryDataId", "recievedAt" DESC);

-- Optional: set a data-retention policy (uncomment and adjust the interval)
-- SELECT add_retention_policy('"DataStream"', INTERVAL '90 days');

-- Verify setup
SELECT
    h.table_name,
    h.num_chunks,
    pg_size_pretty(hypertable_size(format('%I', h.table_name)::regclass)) AS total_size
FROM timescaledb_information.hypertables h
WHERE h.table_name = 'DataStream';
