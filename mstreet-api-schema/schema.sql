-- =============================================================================
-- MStreet Finance — Public Loan Application Schema
-- Database: Supabase (PostgreSQL)
-- Storage Bucket: mstreetstorage
-- 
-- PURPOSE: Handles public-facing loan applications from the website
--          (https://mstreetsfinance.com/loan-application)
--          Applicants do NOT need to register — all access is anonymous/public.
-- =============================================================================

-- 0. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. SEQUENCE & HELPER FUNCTIONS
-- =============================================================================

-- Sequence for application reference numbers (e.g., MSLA00001)
CREATE SEQUENCE IF NOT EXISTS loan_application_ref_seq START 1;

-- Function to auto-generate loan application reference number
CREATE OR REPLACE FUNCTION generate_loan_application_ref()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.reference_no IS NULL THEN
        NEW.reference_no := 'MSLA' || LPAD(nextval('loan_application_ref_seq')::TEXT, 5, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle updated_at timestamps
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =============================================================================
-- 2. PROFILES TABLE (Loan Applications)
-- =============================================================================
-- Maps directly to the 4-step loan application form on the public website.
-- Each row = one loan application submitted by a member of the public.

CREATE TABLE profiles (
    -- Primary Key
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_no            TEXT UNIQUE,                                -- Auto-generated: MSLA00001, MSLA00002, etc.

    -- =========================================================================
    -- STEP 1: Personal Information
    -- =========================================================================
    title                   TEXT CHECK (title IN ('Mr.', 'Mrs.', 'Miss', 'Dr.', 'Chief.', 'Ms.')),
    gender                  TEXT CHECK (gender IN ('Male', 'Female')),
    first_name              TEXT NOT NULL,
    middle_name             TEXT,
    last_name               TEXT NOT NULL,
    marital_status          TEXT CHECK (marital_status IN ('Single', 'Married', 'Separated', 'Divorced', 'Widowed')),
    date_of_birth           DATE,
    phone_number            TEXT NOT NULL,                              -- Format: +234XXXXXXXXXX (must be on WhatsApp)
    email                   TEXT,
    home_address            TEXT,
    bvn                     TEXT,                                       -- Bank Verification Number
    nin                     TEXT,                                       -- National Identification Number

    -- =========================================================================
    -- STEP 2: Employment Details
    -- =========================================================================
    employment_type         TEXT CHECK (employment_type IN ('employed', 'self_employed')),

    -- Fields for "Employed"
    employer                TEXT,                                       -- Employer name
    office_email            TEXT,                                       -- Office email address
    office_address          TEXT,                                       -- Office physical address

    -- Fields for "Self Employed"
    nature_of_business      TEXT,                                       -- Nature of business
    business_name           TEXT,                                       -- Name of business
    business_address        TEXT,                                       -- Business physical address

    -- =========================================================================
    -- STEP 3: Next of Kin
    -- =========================================================================
    nok_first_name          TEXT,                                       -- Next of Kin first name
    nok_middle_name         TEXT,                                       -- Next of Kin middle name
    nok_last_name           TEXT,                                       -- Next of Kin last name
    nok_relationship        TEXT,                                       -- Relationship to applicant
    nok_mobile_number       TEXT,                                       -- Next of Kin mobile number
    nok_email               TEXT,                                       -- Next of Kin email

    -- =========================================================================
    -- STEP 4: Upload Documents (stored in Supabase Storage → mstreetstorage)
    -- =========================================================================
    id_type                 TEXT CHECK (id_type IN ('International Passport', 'Drivers Licence', 'Voters card', 'National ID')),
    id_document_url         TEXT,                                       -- URL/path to uploaded ID in mstreetstorage
    utility_bill_url        TEXT,                                       -- URL/path to uploaded utility bill
    passport_photo_url      TEXT,                                       -- URL/path to passport photograph (optional)

    -- =========================================================================
    -- APPLICATION STATUS & ADMIN FIELDS
    -- =========================================================================
    status                  TEXT CHECK (status IN (
                                'submitted',        -- Just submitted by applicant
                                'under_review',     -- Being reviewed by staff
                                'approved',         -- Application approved
                                'rejected',         -- Application rejected
                                'additional_info'   -- More info requested from applicant
                            )) DEFAULT 'submitted',

    admin_notes             TEXT,                                       -- Internal notes from reviewing staff
    reviewed_by             UUID,                                       -- UUID of the admin who reviewed (no FK to keep schema independent)
    reviewed_at             TIMESTAMP WITH TIME ZONE,

    -- =========================================================================
    -- AUDIT TIMESTAMPS
    -- =========================================================================
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add table comment
COMMENT ON TABLE profiles IS 'Public loan application submissions from mstreetsfinance.com/loan-application. No auth required to submit.';


-- =============================================================================
-- 3. TRIGGERS
-- =============================================================================

-- Auto-generate reference number on insert
CREATE TRIGGER trg_generate_loan_application_ref
    BEFORE INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION generate_loan_application_ref();

-- Auto-update updated_at on row modification
CREATE TRIGGER set_updated_at_profiles
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();


-- =============================================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- =============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- PUBLIC (Anonymous) Policies — for applicants submitting from the website
-- -----------------------------------------------------------------------------

-- Anyone can INSERT a new loan application (no auth needed)
CREATE POLICY "Public can submit loan applications"
    ON profiles
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- Anyone can upload documents to storage (handled in storage policies below)

-- Applicants CANNOT read, update, or delete any profiles (no SELECT/UPDATE/DELETE for anon)
-- This prevents data scraping and unauthorized access to other applications.

-- -----------------------------------------------------------------------------
-- AUTHENTICATED Policies — for internal MStreet staff via the dashboard
-- -----------------------------------------------------------------------------

-- Authenticated staff can view all applications
CREATE POLICY "Authenticated staff can view all applications"
    ON profiles
    FOR SELECT
    TO authenticated
    USING (true);

-- Authenticated staff can update applications (change status, add notes, etc.)
CREATE POLICY "Authenticated staff can update applications"
    ON profiles
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Authenticated staff can delete applications (e.g., spam, duplicates)
CREATE POLICY "Authenticated staff can delete applications"
    ON profiles
    FOR DELETE
    TO authenticated
    USING (true);


-- =============================================================================
-- 5. SUPABASE STORAGE — mstreetstorage Bucket
-- =============================================================================

-- Create the storage bucket (run via Supabase dashboard or API)
-- Bucket name: mstreetstorage
-- Public: false (files accessed via signed URLs or RLS)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'mstreetstorage',
    'mstreetstorage',
    false,
    5242880,   -- 5MB max file size
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- 6. STORAGE RLS POLICIES
-- =============================================================================

-- Allow anonymous users to UPLOAD files to the loan-applications folder
CREATE POLICY "Public can upload loan application documents"
    ON storage.objects
    FOR INSERT
    TO anon
    WITH CHECK (
        bucket_id = 'mstreetstorage'
        AND (storage.foldername(name))[1] = 'loan-applications'
    );

-- Allow authenticated staff to VIEW/DOWNLOAD all files in the bucket
CREATE POLICY "Authenticated staff can view all documents"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'mstreetstorage');

-- Allow authenticated staff to DELETE files (cleanup)
CREATE POLICY "Authenticated staff can delete documents"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'mstreetstorage');

-- Allow authenticated staff to UPDATE file metadata
CREATE POLICY "Authenticated staff can update documents"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'mstreetstorage')
    WITH CHECK (bucket_id = 'mstreetstorage');


-- =============================================================================
-- 7. PERFORMANCE INDEXES
-- =============================================================================

CREATE INDEX idx_profiles_reference_no ON profiles(reference_no);
CREATE INDEX idx_profiles_status ON profiles(status);
CREATE INDEX idx_profiles_phone_number ON profiles(phone_number);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_created_at ON profiles(created_at);
CREATE INDEX idx_profiles_employment_type ON profiles(employment_type);
CREATE INDEX idx_profiles_first_last_name ON profiles(first_name, last_name);


-- =============================================================================
-- 8. USEFUL VIEWS (Optional — for the internal dashboard)
-- =============================================================================
-- IMPORTANT: Views use SECURITY INVOKER so they respect RLS policies.
-- Without this, views default to SECURITY DEFINER which bypasses RLS entirely.

-- View: Recent loan applications (last 30 days)
CREATE OR REPLACE VIEW recent_loan_applications
WITH (security_invoker = on) AS
SELECT
    id,
    reference_no,
    title,
    first_name,
    middle_name,
    last_name,
    phone_number,
    email,
    employment_type,
    status,
    created_at
FROM profiles
WHERE created_at >= NOW() - INTERVAL '30 days'
ORDER BY created_at DESC;

-- View: Application counts by status
CREATE OR REPLACE VIEW application_status_summary
WITH (security_invoker = on) AS
SELECT
    status,
    COUNT(*) as total,
    MIN(created_at) as earliest,
    MAX(created_at) as latest
FROM profiles
GROUP BY status;
