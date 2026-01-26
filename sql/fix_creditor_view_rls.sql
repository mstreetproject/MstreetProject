-- Allow creditors to view their own investment credits
-- Run this in Supabase SQL Editor

-- 1. Enable RLS on credits table (ensure it's on)
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;

-- 2. Create policy for creditors to view their own records
DROP POLICY IF EXISTS "Creditors view own credits" ON credits;

CREATE POLICY "Creditors view own credits" ON credits
FOR SELECT
USING (auth.uid() = creditor_id);

-- 3. Verify policies
SELECT tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'credits';
