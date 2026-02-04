-- Placement Documents Table
-- Stores uploaded placement letter files for credits

CREATE TABLE placement_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_id UUID REFERENCES credits(id) ON DELETE CASCADE NOT NULL,
    creditor_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE placement_documents ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Creditors view own placement docs" ON placement_documents 
    FOR SELECT USING (creditor_id = auth.uid() OR has_any_role(ARRAY['super_admin', 'finance_manager', 'ops_officer']));

CREATE POLICY "Staff manage placement docs" ON placement_documents 
    FOR ALL USING (has_any_role(ARRAY['super_admin', 'finance_manager', 'ops_officer']));

-- Index for faster lookups
CREATE INDEX idx_placement_documents_credit_id ON placement_documents(credit_id);
CREATE INDEX idx_placement_documents_creditor_id ON placement_documents(creditor_id);
