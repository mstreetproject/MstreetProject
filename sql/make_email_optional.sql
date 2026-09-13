-- Migration to make email optional in users table for creditors and debtors without portal access

-- 1. Drop NOT NULL constraint on users.email
ALTER TABLE public.users ALTER COLUMN email DROP NOT NULL;

-- 2. Update notification trigger function to handle NULL emails gracefully
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
        notif_message := 'New user ' || COALESCE(NEW.full_name, NEW.email, 'User') || ' has joined.';
        notif_link := '/dashboard/internal/users?search=' || COALESCE(NEW.email, NEW.full_name, '');
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
