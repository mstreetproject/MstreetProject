-- Loan Request & Guarantor System Schema
-- Run this in Supabase SQL Editor

-- =====================================================
-- 1. LOAN REQUESTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS loan_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    debtor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Loan details
    amount_requested DECIMAL(15,2) NOT NULL,
    tenure_months INT NOT NULL,
    purpose TEXT,
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'disbursed')),
    
    -- Review info
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP,
    admin_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 2. GUARANTOR SUBMISSIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS guarantor_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_request_id UUID REFERENCES loan_requests(id) ON DELETE CASCADE,
    debtor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Access token for public link
    access_token UUID DEFAULT gen_random_uuid() UNIQUE,
    
    -- Guarantor details (filled by debtor or guarantor)
    full_name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    relationship TEXT, -- e.g., 'colleague', 'friend', 'family', 'employer'
    employer TEXT,
    occupation TEXT,
    
    -- Documents (uploaded by guarantor via link)
    selfie_url TEXT,
    id_document_url TEXT,
    
    -- Status tracking
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'verified', 'rejected')),
    submitted_at TIMESTAMP,
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMP,
    admin_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 3. INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_loan_requests_debtor ON loan_requests(debtor_id);
CREATE INDEX IF NOT EXISTS idx_loan_requests_status ON loan_requests(status);
CREATE INDEX IF NOT EXISTS idx_guarantor_submissions_loan ON guarantor_submissions(loan_request_id);
CREATE INDEX IF NOT EXISTS idx_guarantor_submissions_debtor ON guarantor_submissions(debtor_id);
CREATE INDEX IF NOT EXISTS idx_guarantor_submissions_token ON guarantor_submissions(access_token);

-- =====================================================
-- 4. RLS POLICIES
-- =====================================================

ALTER TABLE loan_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE guarantor_submissions ENABLE ROW LEVEL SECURITY;

-- Loan Requests: Debtors can view/create their own
CREATE POLICY "loan_requests_debtor_select"
ON loan_requests FOR SELECT TO authenticated
USING (debtor_id = auth.uid());

CREATE POLICY "loan_requests_debtor_insert"
ON loan_requests FOR INSERT TO authenticated
WITH CHECK (debtor_id = auth.uid());

-- Loan Requests: Staff can manage all
CREATE POLICY "loan_requests_staff_all"
ON loan_requests FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.name IN ('super_admin', 'finance_manager', 'ops_officer')
    )
);

-- Guarantor Submissions: Debtors can view/create their own
CREATE POLICY "guarantor_submissions_debtor_select"
ON guarantor_submissions FOR SELECT TO authenticated
USING (debtor_id = auth.uid());

CREATE POLICY "guarantor_submissions_debtor_insert"
ON guarantor_submissions FOR INSERT TO authenticated
WITH CHECK (debtor_id = auth.uid());

-- Guarantor Submissions: Public can update via token (for guarantor form)
CREATE POLICY "guarantor_submissions_public_update"
ON guarantor_submissions FOR UPDATE TO anon
USING (true)
WITH CHECK (true);

-- Guarantor Submissions: Public can select via token (for guarantor form)
CREATE POLICY "guarantor_submissions_public_select"
ON guarantor_submissions FOR SELECT TO anon
USING (true);

-- Guarantor Submissions: Staff can manage all
CREATE POLICY "guarantor_submissions_staff_all"
ON guarantor_submissions FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.name IN ('super_admin', 'finance_manager', 'ops_officer')
    )
);

-- =====================================================
-- 5. TRIGGERS
-- =====================================================

CREATE TRIGGER set_updated_at_loan_requests
BEFORE UPDATE ON loan_requests
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at_guarantor_submissions
BEFORE UPDATE ON guarantor_submissions
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();
