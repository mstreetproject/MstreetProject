-- RUN THIS IN SUPABASE SQL EDITOR

-- 1. Create report_shares table if not exists
CREATE TABLE IF NOT EXISTS report_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_type TEXT NOT NULL,
    date_start DATE,
    date_end DATE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    view_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create the RPC function (with correct parameter name)
CREATE OR REPLACE FUNCTION get_report_by_token(p_token TEXT)
RETURNS JSON AS $$
DECLARE
    v_share RECORD;
BEGIN
    SELECT * INTO v_share 
    FROM report_shares 
    WHERE token = p_token 
    AND expires_at > NOW();
    
    IF v_share IS NULL THEN
        RETURN json_build_object('error', 'Report not found or expired');
    END IF;
    
    UPDATE report_shares SET view_count = view_count + 1 WHERE token = p_token;
    
    RETURN json_build_object(
        'report_type', v_share.report_type,
        'date_start', v_share.date_start,
        'date_end', v_share.date_end,
        'created_at', v_share.created_at,
        'view_count', v_share.view_count + 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Grant access
GRANT EXECUTE ON FUNCTION get_report_by_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_report_by_token(TEXT) TO authenticated;

-- 4. Enable RLS on report_shares
ALTER TABLE report_shares ENABLE ROW LEVEL SECURITY;

-- 5. Create policy for authenticated users to insert
CREATE POLICY "Authenticated can insert shares" ON report_shares
FOR INSERT TO authenticated WITH CHECK (true);

-- 6. Create policy for anyone to read by token
CREATE POLICY "Anyone can read by token" ON report_shares
FOR SELECT USING (true);

SELECT 'report_shares setup complete' as status;
