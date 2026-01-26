-- ==============================================================================
-- FIX: Allow Creditors to View Their Own Credits
-- ==============================================================================
-- The "Payout History" disappears when joined with "credits" because 
-- the user likely lacks permission to see the linked Credit record.

-- 1. Enable RLS (Ensure it's on)
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing restrictive policies (if any) that might conflict
DROP POLICY IF EXISTS "Creditors view own credits" ON credits;
DROP POLICY IF EXISTS "Creditors can view their own credits" ON credits;

-- 3. Create Policy: Creditors View Own
CREATE POLICY "Creditors view own credits" ON credits
FOR SELECT
USING (
    auth.uid() = creditor_id
);

-- 4. Grant Select Permission
GRANT SELECT ON credits TO authenticated;
