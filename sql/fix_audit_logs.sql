-- FIX AUDIT LOGS NULL VALUES

-- 1. Fix created_at default
-- This ensures that if created_at is omitted during insert, it takes the current timestamp
ALTER TABLE audit_logs ALTER COLUMN created_at SET DEFAULT NOW();

-- 2. Backfill existing null dates
-- Any logs already created with NULL date will be set to the current time so they don't show as 1970
UPDATE audit_logs SET created_at = NOW() WHERE created_at IS NULL;

-- 3. Validation (Optional)
-- Verify that logs now have dates
SELECT count(*) as null_dates FROM audit_logs WHERE created_at IS NULL;
