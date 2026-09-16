-- Seed Creditors Data for Testing
-- Run this in the Supabase SQL Editor

-- Step 1: Create sample creditor users (if they don't already exist)
-- Note: These users will need to be created via Auth if you want them to be able to log in
-- For display purposes on the dashboard, we just need entries in the users table

INSERT INTO users (id, email, full_name, phone, is_creditor, is_debtor, is_internal, email_activated, created_at)
VALUES
    (gen_random_uuid(), 'john.investor@example.com', 'John Investor', '+1234567890', true, false, false, true, NOW() - INTERVAL '30 days'),
    (gen_random_uuid(), 'sarah.capital@example.com', 'Sarah Capital', '+1987654321', true, false, false, true, NOW() - INTERVAL '25 days'),
    (gen_random_uuid(), 'mike.funds@example.com', 'Mike Funds', '+1122334455', true, false, false, true, NOW() - INTERVAL '20 days'),
    (gen_random_uuid(), 'emma.wealth@example.com', 'Emma Wealth', '+1555666777', true, false, false, true, NOW() - INTERVAL '15 days'),
    (gen_random_uuid(), 'david.trust@example.com', 'David Trust', '+1888999000', true, false, false, true, NOW() - INTERVAL '10 days')
ON CONFLICT (email) DO NOTHING;

-- Step 2: Create credit records for these creditors
-- First, get the IDs of the creditors we just created
DO $$
DECLARE
    creditor1_id UUID;
    creditor2_id UUID;
    creditor3_id UUID;
    creditor4_id UUID;
    creditor5_id UUID;
BEGIN
    SELECT id INTO creditor1_id FROM users WHERE email = 'john.investor@example.com';
    SELECT id INTO creditor2_id FROM users WHERE email = 'sarah.capital@example.com';
    SELECT id INTO creditor3_id FROM users WHERE email = 'mike.funds@example.com';
    SELECT id INTO creditor4_id FROM users WHERE email = 'emma.wealth@example.com';
    SELECT id INTO creditor5_id FROM users WHERE email = 'david.trust@example.com';

    -- Insert credits if creditors exist
    IF creditor1_id IS NOT NULL THEN
        INSERT INTO credits (id, creditor_id, principal, interest_rate, start_date, status, created_at)
        VALUES
            (gen_random_uuid(), creditor1_id, 50000.00, 8.5, NOW() - INTERVAL '30 days', 'active', NOW() - INTERVAL '30 days'),
            (gen_random_uuid(), creditor1_id, 75000.00, 9.0, NOW() - INTERVAL '60 days', 'matured', NOW() - INTERVAL '60 days');
    END IF;

    IF creditor2_id IS NOT NULL THEN
        INSERT INTO credits (id, creditor_id, principal, interest_rate, start_date, status, created_at)
        VALUES
            (gen_random_uuid(), creditor2_id, 100000.00, 7.5, NOW() - INTERVAL '25 days', 'active', NOW() - INTERVAL '25 days');
    END IF;

    IF creditor3_id IS NOT NULL THEN
        INSERT INTO credits (id, creditor_id, principal, interest_rate, start_date, status, created_at)
        VALUES
            (gen_random_uuid(), creditor3_id, 25000.00, 10.0, NOW() - INTERVAL '20 days', 'active', NOW() - INTERVAL '20 days'),
            (gen_random_uuid(), creditor3_id, 30000.00, 8.0, NOW() - INTERVAL '45 days', 'withdrawn', NOW() - INTERVAL '45 days');
    END IF;

    IF creditor4_id IS NOT NULL THEN
        INSERT INTO credits (id, creditor_id, principal, interest_rate, start_date, status, created_at)
        VALUES
            (gen_random_uuid(), creditor4_id, 150000.00, 6.5, NOW() - INTERVAL '15 days', 'active', NOW() - INTERVAL '15 days');
    END IF;

    IF creditor5_id IS NOT NULL THEN
        INSERT INTO credits (id, creditor_id, principal, interest_rate, start_date, status, created_at)
        VALUES
            (gen_random_uuid(), creditor5_id, 80000.00, 8.5, NOW() - INTERVAL '10 days', 'active', NOW() - INTERVAL '10 days');
    END IF;
END $$;

-- Verify the data
SELECT 
    u.full_name as creditor_name,
    u.email,
    c.principal,
    c.interest_rate,
    c.status,
    c.created_at
FROM credits c
JOIN users u ON c.creditor_id = u.id
ORDER BY c.created_at DESC;
