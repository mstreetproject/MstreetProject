-- FIX LOANS STATUS CONSTRAINT
-- The 'archived' and 'partial_repaid' statuses need to be added.

-- 1. Drop the existing constraint
ALTER TABLE loans DROP CONSTRAINT IF EXISTS loans_status_check;

-- 2. Add the new constraint with all statuses included
-- Common statuses: active, partial_repaid, repaid, overdue, defaulted, archived
ALTER TABLE loans ADD CONSTRAINT loans_status_check 
CHECK (status IN ('active', 'partial_repaid', 'repaid', 'overdue', 'defaulted', 'archived'));

-- 3. Ensure archival columns exist (if not already)
ALTER TABLE loans ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS archive_reason TEXT;
