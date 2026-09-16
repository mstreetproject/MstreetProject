-- Debtor Portal Schema Updates
-- Run this in Supabase SQL Editor

-- 1. Add profile picture to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;

-- 2. Create payment_uploads table for payment proof storage
CREATE TABLE IF NOT EXISTS payment_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID REFERENCES loans(id) ON DELETE CASCADE NOT NULL,
    debtor_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    amount_paid NUMERIC(15,2),
    payment_date DATE,
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    admin_notes TEXT,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Extend loan_guarantors table for file uploads
ALTER TABLE loan_guarantors ADD COLUMN IF NOT EXISTS form_url TEXT;
ALTER TABLE loan_guarantors ADD COLUMN IF NOT EXISTS guarantor_id_url TEXT;
ALTER TABLE loan_guarantors ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
-- Note: Can't add CHECK constraint with ALTER, so validate in app

-- 4. Enable RLS on payment_uploads
ALTER TABLE payment_uploads ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for payment_uploads

-- Debtors can view their own uploads
CREATE POLICY "Debtors view own payment uploads"
ON payment_uploads
FOR SELECT
USING (debtor_id = auth.uid());

-- Debtors can create their own uploads
CREATE POLICY "Debtors create own payment uploads"
ON payment_uploads
FOR INSERT
WITH CHECK (debtor_id = auth.uid());

-- Staff can view all uploads
CREATE POLICY "Staff view all payment uploads"
ON payment_uploads
FOR SELECT
USING (has_any_role(ARRAY['super_admin', 'finance_manager', 'ops_officer']));

-- Staff can update uploads (approve/reject)
CREATE POLICY "Staff update payment uploads"
ON payment_uploads
FOR UPDATE
USING (has_any_role(ARRAY['super_admin', 'finance_manager', 'ops_officer']));

-- Staff can delete uploads
CREATE POLICY "Staff delete payment uploads"
ON payment_uploads
FOR DELETE
USING (has_any_role(ARRAY['super_admin', 'finance_manager']));

-- 6. Storage Bucket Policies (run separately in Supabase Storage settings)
-- Create bucket 'mstreetstorage' with folders:
--   - profile-pictures/
--   - payment-proofs/
--   - guarantor-forms/

-- Storage RLS Example (apply via Supabase Dashboard -> Storage -> Policies):
-- 
-- SELECT: authenticated users can view their own files
-- INSERT: authenticated users can upload to their folder
-- UPDATE: staff can update any file
-- DELETE: staff can delete any file

-- 7. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_payment_uploads_debtor ON payment_uploads(debtor_id);
CREATE INDEX IF NOT EXISTS idx_payment_uploads_loan ON payment_uploads(loan_id);
CREATE INDEX IF NOT EXISTS idx_payment_uploads_status ON payment_uploads(status);
