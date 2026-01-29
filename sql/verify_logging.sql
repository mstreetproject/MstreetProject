-- =====================================================
-- MANUAL LOGGING VERIFICATION
-- Run this script to test if the audit_logs table matches permissions
-- =====================================================

-- 1. Try passing the helper function (as admin)
-- Replace "system" with your actual user ID if testing as a specific user, 
-- but this function uses auth.uid(), so running in SQL Editor usually means uid is null or system.
-- If auth.uid() is null, the INSERT might fail if user_id is NOT NULL (schema says it is nullable).

SELECT log_activity(
    'MANUAL_TEST',
    'system',
    gen_random_uuid(),
    '{"message": "Manual test from SQL Editor"}'
);

-- 2. Verify the log exists
SELECT * FROM audit_logs 
WHERE action = 'MANUAL_TEST' 
ORDER BY created_at DESC 
LIMIT 1;

-- If the above works, try a direct insert (which mimics what the function does internally)
INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
VALUES (
    NULL, -- No auth.uid() in editor
    'DIRECT_INSERT_TEST',
    'system', 
    gen_random_uuid(), 
    '{"message": "Direct insert test"}'
);

-- Check direct insert
SELECT * FROM audit_logs 
WHERE action = 'DIRECT_INSERT_TEST' 
ORDER BY created_at DESC 
LIMIT 1;
