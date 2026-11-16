-- ════════════════════════════════════════════════════════════════════════════
-- Push notification device tokens (FCM) — 2026-11-21. One transaction; safe to re-run.
--
-- One row per device token. A token belongs to whoever signed in on that device
-- last: register_push_token() moves it to the current user. Rows disappear when
-- the user is deleted (ON DELETE CASCADE) and when FCM reports the token dead.
-- Clients never write the table directly — only through the two functions.
-- ════════════════════════════════════════════════════════════════════════════
BEGIN;

CREATE TABLE IF NOT EXISTS public.push_tokens (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token         text NOT NULL,
    platform      text NOT NULL DEFAULT 'android',
    created_at    timestamptz NOT NULL DEFAULT now(),
    last_seen_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT push_tokens_token_key UNIQUE (token),
    CONSTRAINT push_tokens_platform_check CHECK (platform IN ('android', 'ios', 'web')),
    CONSTRAINT push_tokens_token_len CHECK (char_length(token) BETWEEN 20 AND 4096)
);
CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON public.push_tokens (user_id);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.push_tokens FROM anon;
REVOKE INSERT, UPDATE ON public.push_tokens FROM authenticated;
GRANT SELECT, DELETE ON public.push_tokens TO authenticated;

DROP POLICY IF EXISTS "Users see own push tokens" ON public.push_tokens;
CREATE POLICY "Users see own push tokens" ON public.push_tokens
    FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users delete own push tokens" ON public.push_tokens;
CREATE POLICY "Users delete own push tokens" ON public.push_tokens
    FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Save this device's token for the signed-in user (takes it over from a previous user).
CREATE OR REPLACE FUNCTION public.register_push_token(p_token text, p_platform text DEFAULT 'android')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not signed in' USING ERRCODE = '42501';
    END IF;
    INSERT INTO push_tokens (user_id, token, platform)
    VALUES (auth.uid(), btrim(p_token), coalesce(p_platform, 'android'))
    ON CONFLICT (token) DO UPDATE
        SET user_id = EXCLUDED.user_id, platform = EXCLUDED.platform, last_seen_at = now();
END $$;
REVOKE ALL ON FUNCTION public.register_push_token(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_push_token(text, text) TO authenticated;

-- Forget this device's token (called just before signing out).
CREATE OR REPLACE FUNCTION public.unregister_push_token(p_token text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
    DELETE FROM push_tokens WHERE token = btrim(p_token) AND user_id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.unregister_push_token(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unregister_push_token(text) TO authenticated;

COMMIT;
