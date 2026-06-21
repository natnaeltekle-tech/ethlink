CREATE TABLE IF NOT EXISTS ai_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    model_version text NOT NULL,
    prompt_length integer NOT NULL DEFAULT 0,
    success boolean NOT NULL,
    input_tokens integer,
    output_tokens integer,
    total_tokens integer,
    fallback_used boolean NOT NULL DEFAULT false,
    error_message text,
    metadata jsonb
);

CREATE INDEX IF NOT EXISTS idx_ai_logs_created_at
    ON ai_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_logs_success
    ON ai_logs (success, created_at DESC);

ALTER TABLE ai_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage ai logs" ON ai_logs;
CREATE POLICY "Service role can manage ai logs"
    ON ai_logs
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
