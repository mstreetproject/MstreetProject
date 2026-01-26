-- 1. Add user_id column
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);

-- 2. Update RLS Policies

-- First, drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Staff view all notifications" ON notifications;
DROP POLICY IF EXISTS "Staff update notifications" ON notifications;
DROP POLICY IF EXISTS "Users view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users update own notifications" ON notifications;

-- Policy A: Staff View All (Global Activity + Personal)
-- Staff can view EVERYTHING (System broadcasts + potentially user specific if we want them to ability to debug, 
-- or at least System/Null ones).
-- Use existing logic: Staff can select ALL rows.
CREATE POLICY "Staff view all notifications" 
ON notifications FOR SELECT 
USING (has_any_role(ARRAY['super_admin', 'finance_manager', 'ops_officer', 'risk_officer']));

-- Policy B: Regular Users View OWN Notifications Only
-- Non-staff users can ONLY see notifications where user_id matches their ID.
CREATE POLICY "Users view own notifications" 
ON notifications FOR SELECT 
USING (
    -- Must be authenticated
    auth.role() = 'authenticated' AND 
    -- Must match user_id
    user_id = auth.uid()
);

-- Policy C: Staff Update (Mark Read) - Keep existing but ensure they can update any they can see?
-- Actually, Staff might want to mark their OWN notifications as read, or system ones?
-- If Staff sees ALL, marking "Global" ones as read is tricky (shared state).
-- For now, let's allow Staff to update ANY notification (existing behavior).
CREATE POLICY "Staff update notifications" 
ON notifications FOR UPDATE 
USING (has_any_role(ARRAY['super_admin', 'finance_manager', 'ops_officer', 'risk_officer']));

-- Policy D: Users Update (Mark Read) OWN Notifications
CREATE POLICY "Users update own notifications" 
ON notifications FOR UPDATE 
USING (user_id = auth.uid());

-- 3. Update Trigger Function to support user_id (Optional/Future proofing)
-- The existing triggers (New User, New Credit, etc.) currently insert with NULL user_id (System Notifications).
-- This is fine, as we want Staff to see these.
-- Since the schema defaults user_id to NULL, existing INSERTs in the trigger will still work 
-- and create "System" notifications visible only to Staff (due to Policy B requiring user_id match).

-- 4. Grant access
GRANT SELECT, UPDATE ON notifications TO authenticated;

-- 5. Update Trigger Function to Populate user_id
CREATE OR REPLACE FUNCTION public.handle_new_activity_notification()
RETURNS TRIGGER AS $$
DECLARE
    notif_title TEXT;
    notif_message TEXT;
    notif_link TEXT;
    notif_type TEXT;
    target_user_id UUID;
    user_name TEXT;
BEGIN
    target_user_id := NULL; -- Default to System Notification

    -- Determine the source table and construct message
    IF TG_TABLE_NAME = 'users' THEN
        notif_type := 'user';
        notif_title := 'New User Registration';
        notif_message := 'New user ' || NEW.email || ' has joined.';
        notif_link := '/dashboard/internal/users?search=' || NEW.email;
        -- target_user_id remains NULL (System)
        
        IF TG_OP = 'INSERT' THEN
             INSERT INTO notifications (type, title, message, link, user_id)
             VALUES (notif_type, notif_title, notif_message, notif_link, target_user_id);
        END IF;

    ELSIF TG_TABLE_NAME = 'credits' THEN
        -- Fetch creditor name
        SELECT full_name INTO user_name FROM users WHERE id = NEW.creditor_id;
        
        notif_type := 'credit';
        notif_title := 'New Credit Deposit';
        notif_message := 'Received ' || NEW.principal || ' from ' || COALESCE(user_name, 'Unknown');
        notif_link := '/dashboard/internal/creditors';
        target_user_id := NEW.creditor_id; -- Notify the Creditor

        INSERT INTO notifications (type, title, message, link, user_id)
        VALUES (notif_type, notif_title, notif_message, notif_link, target_user_id);

    ELSIF TG_TABLE_NAME = 'loans' THEN
        -- Fetch debtor name
        SELECT full_name INTO user_name FROM users WHERE id = NEW.debtor_id;

        notif_type := 'loan';
        notif_title := 'New Loan Disbursed';
        notif_message := 'Disbursed ' || NEW.principal || ' to ' || COALESCE(user_name, 'Unknown');
        notif_link := '/dashboard/internal/debtors';
        target_user_id := NEW.debtor_id; -- Notify the Debtor

        INSERT INTO notifications (type, title, message, link, user_id)
        VALUES (notif_type, notif_title, notif_message, notif_link, target_user_id);

    ELSIF TG_TABLE_NAME = 'operating_expenses' THEN
        notif_type := 'expense';
        notif_title := 'New Expense Recorded';
        notif_message := NEW.expense_name || ': ' || NEW.amount;
        notif_link := '/dashboard/internal/expenses';
        -- target_user_id remains NULL (System)

        INSERT INTO notifications (type, title, message, link, user_id)
        VALUES (notif_type, notif_title, notif_message, notif_link, target_user_id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
