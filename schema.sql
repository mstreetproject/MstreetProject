-- Database Schema for MStreet Financial Platform

-- 0. Extensions and Utilities
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Function to handle updated_at timestamps
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Sequence for loan reference numbers
CREATE SEQUENCE IF NOT EXISTS loan_ref_seq START 1;

-- Function to generate loan reference number
-- Format: MSF00001
CREATE OR REPLACE FUNCTION generate_loan_ref()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.reference_no IS NULL THEN
        NEW.reference_no := 'MSF' || LPAD(nextval('loan_ref_seq')::TEXT, 5, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Helper function for RBAC checks
CREATE OR REPLACE FUNCTION has_any_role(role_names text[])
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND r.name = ANY(role_names)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Custom Types
CREATE TYPE user_role_enum AS ENUM ('super_admin', 'finance_manager', 'ops_officer', 'risk_officer', 'viewer');

-- 2. Identity and Authentication
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identity
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    address TEXT,

    -- Authentication Tracking
    password_reset_token TEXT,
    password_reset_expires_at TIMESTAMP,

    email_activated BOOLEAN DEFAULT FALSE,

    -- Business roles (not access roles)
    is_creditor BOOLEAN DEFAULT FALSE,
    is_debtor BOOLEAN DEFAULT FALSE,
    is_internal BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. RBAC (Role Based Access Control)
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL
);

CREATE TABLE role_permissions (
    role_id INT REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INT REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_roles (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id INT REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- 4. Core Business Logic (Credits & Loans)
-- Credits: Money received from Creditors
CREATE TABLE credits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creditor_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  principal NUMERIC(15, 2) NOT NULL,
  interest_rate NUMERIC(5, 2) NOT NULL, -- Annual percentage
  tenure_months INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT CHECK (status IN ('active', 'matured', 'withdrawn')) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Loans: Money disbursed to Debtors
CREATE TABLE loans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  debtor_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  principal NUMERIC(15, 2) NOT NULL,
  interest_rate NUMERIC(5, 2) NOT NULL, -- Annual percentage
  tenure_months INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT CHECK (status IN ('performing', 'non_performing', 'full_provision', 'preliquidated', 'archived')) DEFAULT 'performing',
  
  -- Enhanced financial tracking fields
  repayment_cycle TEXT CHECK (repayment_cycle IN ('fortnightly', 'monthly', 'bi_monthly', 'quarterly', 'quadrimester', 'semiannual', 'annually', 'bullet')),
  origination_date DATE,
  disbursed_date DATE,
  first_repayment_date DATE,
  reference_no TEXT UNIQUE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Loan Management
CREATE TABLE loan_guarantors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID REFERENCES loans(id) ON DELETE CASCADE,
    guarantor_name TEXT NOT NULL,
    guarantor_contact TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE loan_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID REFERENCES loans(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    changed_at TIMESTAMP DEFAULT NOW(),
    notes TEXT
);

CREATE TABLE bad_debts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID UNIQUE REFERENCES loans(id),
    declared_date DATE NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    reason TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Loan Advances: Loan requests from users
CREATE TABLE loan_advances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ref_no TEXT UNIQUE NOT NULL,                              -- Reference number
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL, -- FK to users table
    
    -- Principal Amounts
    principal_amount_ngn NUMERIC(15, 2),                      -- Principal amount in NGN
    principal_amount_usd NUMERIC(15, 2),                      -- Principal amount in USD
    disbursed_amount NUMERIC(15, 2),                          -- Actual disbursed amount
    
    -- Loan Terms
    rate NUMERIC(5, 2) NOT NULL,                              -- Interest rate (%)
    tenor_months INTEGER NOT NULL,                            -- Loan tenure in months
    
    -- Pre-liquidation
    is_preliquidated BOOLEAN DEFAULT FALSE,                   -- Was the loan pre-liquidated?
    preliquidated_amount NUMERIC(15, 2),                      -- Amount pre-liquidated
    
    -- Loan Balance
    balance_of_loan NUMERIC(15, 2),                           -- Remaining loan balance
    
    -- Important Dates
    disbursed_date DATE,                                      -- Date loan was disbursed
    origination_date DATE,                                    -- Date loan originated
    first_repayment_due_date DATE,                            -- First repayment due date
    termination_date DATE,                                    -- Early termination date (if applicable)
    maturity_date DATE,                                       -- Loan maturity date
    
    -- Status Flags
    is_approved BOOLEAN DEFAULT FALSE,                        -- Has loan been approved?
    is_disbursed BOOLEAN DEFAULT FALSE,                       -- Has loan been disbursed?
    is_performing BOOLEAN DEFAULT TRUE,                       -- Is the loan performing?
    is_closed BOOLEAN DEFAULT FALSE,                          -- Is the loan closed?
    
    -- Status (single aggregate status for convenience)
    status TEXT CHECK (status IN ('pending', 'approved', 'disbursed', 'performing', 'non_performing', 'preliquidated', 'closed', 'rejected')) DEFAULT 'pending',
    
    -- Audit Fields
    approved_by UUID REFERENCES users(id),                    -- Who approved the loan
    approved_at TIMESTAMP,                                    -- When the loan was approved
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. Operations & Financials
CREATE TABLE operating_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_name TEXT NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    expense_month DATE NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE monthly_financials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    month DATE UNIQUE NOT NULL,
    interest_revenue NUMERIC(15,2) NOT NULL,
    interest_cost NUMERIC(15,2) NOT NULL,
    net_interest_margin NUMERIC(15,2) NOT NULL,
    operating_expenses NUMERIC(15,2) NOT NULL,
    bad_debt_loss NUMERIC(15,2) NOT NULL,
    net_profit NUMERIC(15,2) NOT NULL,
    generated_at TIMESTAMP DEFAULT NOW()
);

-- 6. Governance & Compliance
CREATE TABLE view_permissions (
    id SERIAL PRIMARY KEY,
    view_name TEXT NOT NULL,
    permission_id INT REFERENCES permissions(id),
    description TEXT
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    old_value JSONB,
    new_value JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE data_locks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    locked BOOLEAN DEFAULT TRUE,
    locked_at TIMESTAMP DEFAULT NOW(),
    locked_by UUID REFERENCES users(id),
    reason TEXT
);

-- 7. Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_guarantors ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE bad_debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE operating_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_financials ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_locks ENABLE ROW LEVEL SECURITY;

-- 8. Policies

-- USERS
-- Allow PUBLIC (even unauthenticated) to insert - required for Sign Up / Creation
CREATE POLICY "Allow public to insert users" ON users FOR INSERT WITH CHECK (true);

-- Allow users to see their own records (if logged in) or Admins to see all
CREATE POLICY "Users view self" ON users FOR SELECT USING (id = auth.uid() OR has_any_role(ARRAY['super_admin', 'finance_manager', 'ops_officer', 'risk_officer']));

-- Allow users to update their own profiles (full_name, phone, address, etc.)
CREATE POLICY "Users update self" ON users FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Admins retain full control over all users
CREATE POLICY "Admins manage users" ON users FOR ALL TO authenticated USING (has_any_role(ARRAY['super_admin', 'ops_officer']));

-- Only Super Admins can delete users
CREATE POLICY "Super admin delete users" ON users FOR DELETE USING (has_any_role(ARRAY['super_admin']));

-- RBAC TABLES (roles, permissions, role_permissions, view_permissions)
CREATE POLICY "Staff view RBAC" ON roles FOR SELECT USING (has_any_role(ARRAY['super_admin', 'finance_manager', 'ops_officer', 'risk_officer']));
CREATE POLICY "Super admin manage roles" ON roles FOR ALL USING (has_any_role(ARRAY['super_admin']));

CREATE POLICY "Staff view permissions" ON permissions FOR SELECT USING (has_any_role(ARRAY['super_admin', 'finance_manager', 'ops_officer', 'risk_officer']));
CREATE POLICY "Super admin manage permissions" ON permissions FOR ALL USING (has_any_role(ARRAY['super_admin']));

CREATE POLICY "Staff view role_permissions" ON role_permissions FOR SELECT USING (has_any_role(ARRAY['super_admin', 'finance_manager', 'ops_officer', 'risk_officer']));
CREATE POLICY "Super admin manage role_permissions" ON role_permissions FOR ALL USING (has_any_role(ARRAY['super_admin']));

CREATE POLICY "Authenticated users view view_permissions" ON view_permissions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Super admin manage view_permissions" ON view_permissions FOR ALL USING (has_any_role(ARRAY['super_admin']));

CREATE POLICY "Staff view user_roles" ON user_roles FOR SELECT USING (has_any_role(ARRAY['super_admin', 'finance_manager', 'ops_officer', 'risk_officer']));
CREATE POLICY "Super admin manage user_roles" ON user_roles FOR ALL USING (has_any_role(ARRAY['super_admin']));

-- CREDITS
CREATE POLICY "Creditors view own credits" ON credits FOR SELECT USING (creditor_id = auth.uid() OR has_any_role(ARRAY['super_admin', 'finance_manager']));
CREATE POLICY "Staff manage credits" ON credits FOR ALL USING (has_any_role(ARRAY['super_admin', 'finance_manager']));

-- LOANS
CREATE POLICY "Debtors view own loans" ON loans FOR SELECT USING (debtor_id = auth.uid() OR has_any_role(ARRAY['super_admin', 'finance_manager', 'ops_officer', 'risk_officer']));
CREATE POLICY "Staff manage loans" ON loans FOR ALL USING (has_any_role(ARRAY['super_admin', 'ops_officer', 'finance_manager']));

-- LOAN MANAGEMENT (guarantors, history, bad_debts)
CREATE POLICY "View loan management" ON loan_guarantors FOR SELECT USING (EXISTS (SELECT 1 FROM loans WHERE id = loan_id AND (debtor_id = auth.uid() OR has_any_role(ARRAY['super_admin', 'ops_officer']))));
CREATE POLICY "Staff manage loan_guarantors" ON loan_guarantors FOR ALL USING (has_any_role(ARRAY['super_admin', 'ops_officer']));

CREATE POLICY "View loan history" ON loan_status_history FOR SELECT USING (EXISTS (SELECT 1 FROM loans WHERE id = loan_id AND (debtor_id = auth.uid() OR has_any_role(ARRAY['super_admin', 'ops_officer']))));
CREATE POLICY "Staff manage loan_status_history" ON loan_status_history FOR ALL USING (has_any_role(ARRAY['super_admin', 'ops_officer']));

CREATE POLICY "View bad_debts" ON bad_debts FOR SELECT USING (has_any_role(ARRAY['super_admin', 'finance_manager', 'risk_officer']));
CREATE POLICY "Staff manage bad_debts" ON bad_debts FOR ALL USING (has_any_role(ARRAY['super_admin', 'risk_officer', 'finance_manager']));

-- LOAN ADVANCES
CREATE POLICY "Users view own loan advances" ON loan_advances FOR SELECT USING (user_id = auth.uid() OR has_any_role(ARRAY['super_admin', 'finance_manager', 'ops_officer', 'risk_officer']));
CREATE POLICY "Users insert own loan advances" ON loan_advances FOR INSERT WITH CHECK (user_id = auth.uid() OR has_any_role(ARRAY['super_admin', 'finance_manager', 'ops_officer']));
CREATE POLICY "Staff manage loan_advances" ON loan_advances FOR ALL USING (has_any_role(ARRAY['super_admin', 'finance_manager', 'ops_officer']));

-- FINANCIALS & OPS
CREATE POLICY "Manage expenses" ON operating_expenses FOR ALL USING (has_any_role(ARRAY['super_admin', 'finance_manager']));
CREATE POLICY "Manage monthly_financials" ON monthly_financials FOR ALL USING (has_any_role(ARRAY['super_admin', 'finance_manager']));

-- AUDIT & GOVERNANCE
CREATE POLICY "View audit_logs" ON audit_logs FOR SELECT USING (has_any_role(ARRAY['super_admin', 'risk_officer']));
CREATE POLICY "System insert audit_logs" ON audit_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "View data_locks" ON data_locks FOR SELECT USING (has_any_role(ARRAY['super_admin', 'finance_manager', 'ops_officer']));
CREATE POLICY "Super admin manage data_locks" ON data_locks FOR ALL USING (has_any_role(ARRAY['super_admin']));

-- 9. Triggers for updated_at
CREATE TRIGGER set_updated_at_users BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_updated_at_credits BEFORE UPDATE ON credits FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_updated_at_loans BEFORE UPDATE ON loans FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_updated_at_loan_advances BEFORE UPDATE ON loan_advances FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Trigger for auto-generating loan reference numbers
CREATE TRIGGER trg_generate_loan_ref
BEFORE INSERT ON loans
FOR EACH ROW
EXECUTE FUNCTION generate_loan_ref();

-- 11. Supabase Auth Sync
-- This function automatically creates a public.users row when a new user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, full_name, email, is_internal)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', ''), 
    new.email, 
    FALSE -- Force FALSE for public sign-ups
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run the function on every new user sign-up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function to cascade deletions from auth.users to public.users
CREATE OR REPLACE FUNCTION public.handle_user_delete()
RETURNS trigger AS $$
BEGIN
  DELETE FROM public.users WHERE id = old.id;
  RETURN old;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to cascade deletions
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_user_delete();

-- Function to cascade deletions from public.users to auth.users (reverse direction)
CREATE OR REPLACE FUNCTION public.handle_public_user_delete()
RETURNS trigger AS $$
BEGIN
  -- Delete from auth.users using admin privileges
  -- Use DELETE with a WHERE clause to avoid errors if already deleted
  DELETE FROM auth.users WHERE id = old.id;
  RETURN old;
EXCEPTION
  WHEN OTHERS THEN
    -- Ignore errors (likely because the row was already deleted by the other trigger)
    RETURN old;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to cascade deletions from public to auth
-- Changed to AFTER to avoid "tuple already modified" error
CREATE TRIGGER on_public_user_deleted
  AFTER DELETE ON public.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_public_user_delete();

-- 12. Performance Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_credits_creditor_id ON credits(creditor_id);
CREATE INDEX idx_credits_status ON credits(status);
CREATE INDEX idx_loans_debtor_id ON loans(debtor_id);
CREATE INDEX idx_loans_status ON loans(status);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_operating_expenses_month ON operating_expenses(expense_month);
CREATE INDEX idx_loan_advances_user_id ON loan_advances(user_id);
CREATE INDEX idx_loan_advances_status ON loan_advances(status);
CREATE INDEX idx_loan_advances_ref_no ON loan_advances(ref_no);
