-- 20240513_add_logging_table.sql
-- Persistent logging for Trace-ID auditing

CREATE TABLE IF NOT EXISTS trace_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trace_id TEXT NOT NULL,
    level TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast searching by trace_id
CREATE INDEX IF NOT EXISTS idx_trace_logs_trace_id ON trace_logs(trace_id);

-- RLS: Only admins (or nobody) should see logs via API, 
-- but we allow authenticated users to INSERT their own logs.
ALTER TABLE trace_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to insert their own logs" ON trace_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Only admins can view logs" ON trace_logs
    FOR SELECT USING (false); -- Nobody can view via API for now, use Dashboard
