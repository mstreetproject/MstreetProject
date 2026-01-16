-- =====================================================
-- AUDIT LOGS SCHEMA
-- Tracks user activities across the system
-- =====================================================

-- 1. CREATE AUDIT LOGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,           -- e.g., 'CREATE_LOAN', 'APPROVE_USER', 'ARCHIVE_CREDIT'
    entity_type TEXT NOT NULL,      -- e.g., 'loan', 'user', 'credit', 'payout'
    entity_id UUID,                -- ID of the affected entity
    details JSONB DEFAULT '{}',     -- Additional context (e.g., old_status, new_status, reason)
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Grant permissions (CRITICAL FIX)
GRANT ALL ON audit_logs TO postgres;
GRANT INSERT, SELECT, DELETE ON audit_logs TO authenticated;
GRANT INSERT, SELECT, DELETE ON audit_logs TO service_role;

-- Index for faster filtering
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- =====================================================
-- 2. RLS POLICIES
-- =====================================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow any authenticated user to INSERT logs (for their own actions)
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON audit_logs;
CREATE POLICY "Authenticated users can insert audit logs" ON audit_logs
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Allow Super Admins to VIEW all logs
DROP POLICY IF EXISTS "Super Admins can view audit logs" ON audit_logs;
CREATE POLICY "Super Admins can view audit logs" ON audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name = 'super_admin'
        )
    );

-- Allow Super Admins to DELETE logs
DROP POLICY IF EXISTS "Super Admins can delete audit logs" ON audit_logs;
CREATE POLICY "Super Admins can delete audit logs" ON audit_logs
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name = 'super_admin'
        )
    );

-- =====================================================
-- 3. HELPER FUNCTION TO LOG ACTIVITY (Optional Wrapper)
-- =====================================================

CREATE OR REPLACE FUNCTION log_activity(
    p_action TEXT,
    p_entity_type TEXT,
    p_entity_id UUID,
    p_details JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
    VALUES (auth.uid(), p_action, p_entity_type, p_entity_id, p_details)
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION log_activity TO authenticated;
GRANT EXECUTE ON FUNCTION log_activity TO service_role;
