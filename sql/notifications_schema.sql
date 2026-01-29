-- 1. Create Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL, -- 'user', 'credit', 'loan', 'expense', 'system'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT, -- URL to navigate to when clicked
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Allow staff/admins to view all notifications (Global Activity Feed)
CREATE POLICY "Staff view all notifications" 
ON notifications FOR SELECT 
USING (has_any_role(ARRAY['super_admin', 'finance_manager', 'ops_officer', 'risk_officer']));

-- Allow system (triggers) to insert
CREATE POLICY "System insert notifications" 
ON notifications FOR INSERT 
WITH CHECK (true); -- Triggers run with enough privileges, but this allows explicit inserts if needed

-- Allow staff to update (mark as read)
CREATE POLICY "Staff update notifications" 
ON notifications FOR UPDATE 
USING (has_any_role(ARRAY['super_admin', 'finance_manager', 'ops_officer', 'risk_officer']));

-- 4. Trigger Function for Auto-Notifications
CREATE OR REPLACE FUNCTION public.handle_new_activity_notification()
RETURNS TRIGGER AS $$
DECLARE
    notif_title TEXT;
    notif_message TEXT;
    notif_link TEXT;
    notif_type TEXT;
    user_name TEXT;
BEGIN
    -- Determine the source table and construct message
    IF TG_TABLE_NAME = 'users' THEN
        notif_type := 'user';
        notif_title := 'New User Registration';
        notif_message := 'New user ' || NEW.email || ' has joined.';
        notif_link := '/dashboard/internal/users?search=' || NEW.email;
        
        -- Only notify for new signups, not updates
        IF TG_OP = 'INSERT' THEN
             INSERT INTO notifications (type, title, message, link)
             VALUES (notif_type, notif_title, notif_message, notif_link);
        END IF;

    ELSIF TG_TABLE_NAME = 'credits' THEN
        -- Fetch creditor name
        SELECT full_name INTO user_name FROM users WHERE id = NEW.creditor_id;
        
        notif_type := 'credit';
        notif_title := 'New Credit Deposit';
        notif_message := 'Recieved ' || NEW.principal || ' from ' || COALESCE(user_name, 'Unknown');
        notif_link := '/dashboard/internal/creditors';

        INSERT INTO notifications (type, title, message, link)
        VALUES (notif_type, notif_title, notif_message, notif_link);

    ELSIF TG_TABLE_NAME = 'loans' THEN
        -- Fetch debtor name
        SELECT full_name INTO user_name FROM users WHERE id = NEW.debtor_id;

        notif_type := 'loan';
        notif_title := 'New Loan Disbursed';
        notif_message := 'Disbursed ' || NEW.principal || ' to ' || COALESCE(user_name, 'Unknown');
        notif_link := '/dashboard/internal/debtors';

        INSERT INTO notifications (type, title, message, link)
        VALUES (notif_type, notif_title, notif_message, notif_link);

    ELSIF TG_TABLE_NAME = 'operating_expenses' THEN
        notif_type := 'expense';
        notif_title := 'New Expense Recorded';
        notif_message := NEW.expense_name || ': ' || NEW.amount;
        notif_link := '/dashboard/internal/expenses';

        INSERT INTO notifications (type, title, message, link)
        VALUES (notif_type, notif_title, notif_message, notif_link);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Attach Triggers to Tables
DROP TRIGGER IF EXISTS notify_on_new_user ON users;
CREATE TRIGGER notify_on_new_user
AFTER INSERT ON users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_activity_notification();

DROP TRIGGER IF EXISTS notify_on_new_credit ON credits;
CREATE TRIGGER notify_on_new_credit
AFTER INSERT ON credits
FOR EACH ROW EXECUTE FUNCTION public.handle_new_activity_notification();

DROP TRIGGER IF EXISTS notify_on_new_loan ON loans;
CREATE TRIGGER notify_on_new_loan
AFTER INSERT ON loans
FOR EACH ROW EXECUTE FUNCTION public.handle_new_activity_notification();

DROP TRIGGER IF EXISTS notify_on_new_expense ON operating_expenses;
CREATE TRIGGER notify_on_new_expense
AFTER INSERT ON operating_expenses
FOR EACH ROW EXECUTE FUNCTION public.handle_new_activity_notification();

-- 6. Index for performance
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
