-- LOAN DOCUMENTS SCHEMA
-- Tracks legal and administrative documents for loans

CREATE TABLE IF NOT EXISTS loan_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID REFERENCES loans(id) ON DELETE CASCADE NOT NULL,
    debtor_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    is_signed BOOLEAN DEFAULT false,
    signed_at TIMESTAMP WITH TIME ZONE,
    signature_data TEXT, -- Can store typed name or path to signature image
    signed_file_url TEXT, -- URL to the PDF with visual signature overlay
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE loan_documents ENABLE ROW LEVEL SECURITY;

-- Staff can manage all documents
CREATE POLICY "docs_staff_all"
ON loan_documents
FOR ALL
TO authenticated
USING (has_any_role(ARRAY['super_admin', 'finance_manager', 'ops_officer']));

-- Debtors can view their own documents
CREATE POLICY "docs_debtor_view"
ON loan_documents
FOR SELECT
TO authenticated
USING (debtor_id = auth.uid());

-- Debtors can update their own documents (for signing)
CREATE POLICY "docs_debtor_update"
ON loan_documents
FOR UPDATE
TO authenticated
USING (debtor_id = auth.uid())
WITH CHECK (debtor_id = auth.uid());

-- Debtors can insert their own documents (for signed upload replacement)
CREATE POLICY "docs_debtor_insert"
ON loan_documents
FOR INSERT
TO authenticated
WITH CHECK (debtor_id = auth.uid());

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_loan_documents_loan_id ON loan_documents(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_documents_debtor_id ON loan_documents(debtor_id);
