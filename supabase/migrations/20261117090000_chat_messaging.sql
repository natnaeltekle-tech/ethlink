-- ════════════════════════════════════════════════════════════════════════════
-- Chat / messaging fixes (2026-11-17)
-- One transaction; safe to re-run.
--   1. Read tracking (is_read, read_at); existing history marked read
--   2. Delete owner-to-self messages; forbid self-messages, empty/oversized text
--   3. can_message(): customer → provider, provider → existing customer only
--   4. Strict RLS: participants read; send as yourself; receiver marks read;
--      no edits, no deletes (guard trigger)
--   5. Grouped notification per new message (database trigger)
--   6. get_my_conversations() inbox
--   7. Indexes
--   8. Ensure public.messages is in the supabase_realtime publication
-- ════════════════════════════════════════════════════════════════════════════
BEGIN;

-- ── 1. Read tracking (existing history counts as read) ──────────────────────
ALTER TABLE public.messages
    ADD COLUMN IF NOT EXISTS is_read boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS read_at timestamptz;

-- ── 2. Remove owner-to-self messages, then forbid them ──────────────────────
-- (must run before the guard trigger exists; it only affects client sessions anyway)
DELETE FROM public.messages WHERE sender_id = receiver_id;

ALTER TABLE public.messages ALTER COLUMN service_id SET NOT NULL;
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_not_self;
ALTER TABLE public.messages ADD CONSTRAINT messages_not_self CHECK (sender_id <> receiver_id);
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_content_len;
ALTER TABLE public.messages ADD CONSTRAINT messages_content_len
    CHECK (char_length(btrim(content)) BETWEEN 1 AND 2000);

-- ── 3. Who may message whom ─────────────────────────────────────────────────
-- Customer → the service's provider; provider → a customer who already wrote
-- to them about this service or booked it. Never yourself.
CREATE OR REPLACE FUNCTION public.can_message(p_service uuid, p_sender uuid, p_receiver uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT p_sender IS DISTINCT FROM p_receiver AND EXISTS (
        SELECT 1 FROM services s
         WHERE s.id = p_service
           AND (s.user_id = p_receiver
                OR (s.user_id = p_sender AND (
                        EXISTS (SELECT 1 FROM messages m WHERE m.service_id = p_service
                                   AND m.sender_id = p_receiver AND m.receiver_id = p_sender)
                     OR EXISTS (SELECT 1 FROM bookings b WHERE b.service_id = p_service
                                   AND b.user_id = p_receiver))))
    )
$$;
REVOKE ALL ON FUNCTION public.can_message(uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_message(uuid, uuid, uuid) TO authenticated;

-- ── 4. Policies ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Unified Message Access" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;
DROP POLICY IF EXISTS "Participants read their messages" ON public.messages;
DROP POLICY IF EXISTS "Users send messages as themselves" ON public.messages;
DROP POLICY IF EXISTS "Receivers mark messages read" ON public.messages;

CREATE POLICY "Participants read their messages" ON public.messages
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users send messages as themselves" ON public.messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id AND public.can_message(service_id, sender_id, receiver_id));
CREATE POLICY "Receivers mark messages read" ON public.messages
    FOR UPDATE USING (auth.uid() = receiver_id) WITH CHECK (auth.uid() = receiver_id);
-- No DELETE policy: messages cannot be deleted by clients.
REVOKE ALL ON public.messages FROM anon;

-- Clients: new messages start unread with a server timestamp; afterwards only
-- is_read may change, and only false → true. Service role is unrestricted.
CREATE OR REPLACE FUNCTION public.guard_message_changes()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
    IF coalesce(auth.role(), '') NOT IN ('authenticated', 'anon') THEN
        RETURN NEW;
    END IF;
    IF TG_OP = 'INSERT' THEN
        NEW.is_read := false;
        NEW.read_at := NULL;
        NEW.created_at := now();
        RETURN NEW;
    END IF;
    IF (to_jsonb(NEW) - 'is_read' - 'read_at') IS DISTINCT FROM (to_jsonb(OLD) - 'is_read' - 'read_at') THEN
        RAISE EXCEPTION 'Messages cannot be edited' USING ERRCODE = '42501';
    END IF;
    IF OLD.is_read THEN
        NEW.is_read := true;                          -- never mark unread again
    END IF;
    NEW.read_at := CASE WHEN NEW.is_read THEN coalesce(OLD.read_at, now()) END;
    RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_message_changes ON public.messages;
CREATE TRIGGER guard_message_changes
    BEFORE INSERT OR UPDATE ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.guard_message_changes();

-- Existing history counts as read (runs after the trigger is created, as the
-- SQL editor / service role, which the guard leaves unrestricted)
UPDATE public.messages SET is_read = true, read_at = coalesce(read_at, created_at) WHERE NOT is_read;

-- ── 5. One grouped notification per conversation burst ─────────────────────
-- Skips if the receiver already has an unread message notification for this
-- conversation from the last 30 minutes. Covers every insert path (chat,
-- booking auto-message).
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_link text := '/messages/' || NEW.service_id || '/' || NEW.sender_id;
    v_name text;
BEGIN
    IF EXISTS (
        SELECT 1 FROM notifications n
         WHERE n.user_id = NEW.receiver_id AND n.type = 'message' AND n.link = v_link
           AND NOT coalesce(n.is_read, false)
           AND n.created_at > now() - interval '30 minutes'
    ) THEN
        RETURN NEW;
    END IF;

    SELECT nullif(btrim(coalesce(full_name, concat_ws(' ', first_name, last_name))), '')
      INTO v_name FROM profiles WHERE id = NEW.sender_id;

    INSERT INTO notifications (user_id, type, link, content)
    VALUES (
        NEW.receiver_id, 'message', v_link,
        coalesce(v_name, 'New message') || ': ' || left(NEW.content, 80)
            || CASE WHEN char_length(NEW.content) > 80 THEN '…' ELSE '' END
    );
    RETURN NEW;
EXCEPTION WHEN others THEN
    -- A notification problem must never block the message itself
    RAISE WARNING 'notify_new_message failed: %', SQLERRM;
    RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS notify_new_message ON public.messages;
CREATE TRIGGER notify_new_message
    AFTER INSERT ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();

-- ── 6. Inbox: one row per (service, other person), scoped to the caller ─────
CREATE OR REPLACE FUNCTION public.get_my_conversations()
RETURNS TABLE (
    service_id uuid, service_title text, service_owner_id uuid,
    other_user_id uuid, other_name text, other_avatar text,
    other_is_verified boolean, other_has_license boolean,
    last_message text, last_sender_id uuid, last_at timestamptz, unread_count bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    WITH mine AS (
        SELECT m.service_id, m.sender_id, m.receiver_id, m.content, m.created_at, m.is_read,
               CASE WHEN m.sender_id = auth.uid() THEN m.receiver_id ELSE m.sender_id END AS other
          FROM messages m
         WHERE auth.uid() IS NOT NULL AND auth.uid() IN (m.sender_id, m.receiver_id)
    ), last AS (
        SELECT DISTINCT ON (service_id, other) *
          FROM mine ORDER BY service_id, other, created_at DESC
    )
    SELECT l.service_id, s.title, s.user_id,
           l.other, p.full_name, p.avatar_url,
           coalesce(p.is_verified, false), coalesce(p.has_business_license, false),
           l.content, l.sender_id, l.created_at,
           (SELECT count(*) FROM mine u
             WHERE u.service_id = l.service_id AND u.other = l.other
               AND u.receiver_id = auth.uid() AND NOT u.is_read)
      FROM last l
      JOIN services s ON s.id = l.service_id
      LEFT JOIN public_profiles p ON p.id = l.other
     ORDER BY l.created_at DESC
$$;
REVOKE ALL ON FUNCTION public.get_my_conversations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_conversations() TO authenticated;

-- ── 7. Indexes ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_messages_unread ON public.messages (receiver_id) WHERE NOT is_read;
CREATE INDEX IF NOT EXISTS idx_messages_thread ON public.messages (service_id, sender_id, receiver_id, created_at);

-- ── 8. Realtime: make sure messages are published (no-op if already added) ──
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
       AND NOT EXISTS (
           SELECT 1 FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
       ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;
END $$;

COMMIT;
