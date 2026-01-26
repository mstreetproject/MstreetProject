-- System Settings Schema
-- Run this in Supabase SQL Editor

-- =====================================================
-- 1. CREATE SYSTEM_SETTINGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 2. RLS POLICIES
-- =====================================================

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read settings (needed for loan request form)
CREATE POLICY "settings_public_read"
ON system_settings FOR SELECT
TO authenticated
USING (true);

-- Only super_admin can update settings
CREATE POLICY "settings_admin_update"
ON system_settings FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.name = 'super_admin'
    )
);

-- Only super_admin can insert settings
CREATE POLICY "settings_admin_insert"
ON system_settings FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.name = 'super_admin'
    )
);

-- Only super_admin can delete settings
CREATE POLICY "settings_admin_delete"
ON system_settings FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.name = 'super_admin'
    )
);

-- =====================================================
-- 3. INSERT DEFAULT SETTINGS
-- =====================================================

INSERT INTO system_settings (setting_key, setting_value, description) VALUES
(
    'loan_limits',
    '{"min": 0, "max": 5000000}',
    'Minimum and maximum loan amounts'
),
(
    'guarantor_enabled',
    'true',
    'Whether guarantor verification is required'
),
(
    'guarantor_tiers',
    '[
        {"min": 0, "max": 500000, "required": 1},
        {"min": 500001, "max": 2000000, "required": 2},
        {"min": 2000001, "max": 999999999, "required": 3}
    ]',
    'Guarantor requirements per loan amount tier'
),
(
    'interest_rate',
    '{"default": 5, "min": 2, "max": 15}',
    'Interest rate settings (percentage)'
),
(
    'tenure_options',
    '[3, 6, 12, 18, 24, 36]',
    'Available loan tenure options in months'
)
ON CONFLICT (setting_key) DO NOTHING;

-- =====================================================
-- 4. TRIGGER FOR UPDATED_AT
-- =====================================================

CREATE TRIGGER set_updated_at_system_settings
BEFORE UPDATE ON system_settings
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();

-- =====================================================
-- 5. VERIFY
-- =====================================================

SELECT * FROM system_settings;
