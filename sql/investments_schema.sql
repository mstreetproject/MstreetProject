-- MStreet Outward Investments Schema
-- Tracks investments made by MStreet in other companies

CREATE TABLE investee_companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    industry TEXT,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE investments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investee_id UUID REFERENCES investee_companies(id) ON DELETE CASCADE,
    company_name TEXT, -- Fallback / Legacy
    principal NUMERIC(15, 2) NOT NULL,
    roi_rate NUMERIC(5, 2) NOT NULL, -- ROI percentage
    tenure_months INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT CHECK (status IN ('active', 'matured', 'liquidated', 'exited')) DEFAULT 'active',
    
    -- Liquidation details
    liquidated_at TIMESTAMP WITH TIME ZONE,
    liquidation_amount NUMERIC(15, 2),
    liquidation_notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE investment_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investment_id UUID REFERENCES investments(id) ON DELETE CASCADE NOT NULL,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE investee_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_documents ENABLE ROW LEVEL SECURITY;

-- Staff Policies (Internal access only)
CREATE POLICY "Staff view investee_companies" ON investee_companies 
    FOR SELECT TO authenticated USING (has_any_role(ARRAY['super_admin', 'finance_manager', 'ops_officer', 'risk_officer']));

CREATE POLICY "Staff manage investee_companies" ON investee_companies 
    FOR ALL TO authenticated USING (has_any_role(ARRAY['super_admin', 'finance_manager', 'ops_officer']));

CREATE POLICY "Staff view investments" ON investments 
    FOR SELECT TO authenticated USING (has_any_role(ARRAY['super_admin', 'finance_manager', 'ops_officer', 'risk_officer']));

CREATE POLICY "Staff manage investments" ON investments 
    FOR ALL TO authenticated USING (has_any_role(ARRAY['super_admin', 'finance_manager', 'ops_officer']));

CREATE POLICY "Staff view investment docs" ON investment_documents 
    FOR SELECT TO authenticated USING (has_any_role(ARRAY['super_admin', 'finance_manager', 'ops_officer', 'risk_officer']));

CREATE POLICY "Staff manage investment docs" ON investment_documents 
    FOR ALL TO authenticated USING (has_any_role(ARRAY['super_admin', 'finance_manager', 'ops_officer']));

-- Triggers for updated_at
CREATE TRIGGER set_updated_at_investee_companies BEFORE UPDATE ON investee_companies FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_updated_at_investments BEFORE UPDATE ON investments FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Indexes
CREATE INDEX idx_investments_investee_id ON investments(investee_id);
CREATE INDEX idx_investments_status ON investments(status);
CREATE INDEX idx_investment_documents_investment_id ON investment_documents(investment_id);
