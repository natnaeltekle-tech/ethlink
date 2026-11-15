-- ════════════════════════════════════════════════════════════════════════════
-- Pre-launch catch-up for production (market-ai-v3) — 2026-11-15
--
-- Brings the live DB in line with the app, excluding the Chapa webhook log
-- (payment_webhook_events), which is deferred until Chapa keys exist.
-- One transaction; safe to re-run (IF NOT EXISTS / DROP ... IF EXISTS /
-- CREATE OR REPLACE throughout). Any error rolls back everything.
--
--   0. Booking status + dispute columns (re-asserts 20260621092000)
--   1. profiles: role, id_card_link, business fields, fixed signup trigger
--      (handle_new_user wrote columns that don't exist → signups failing),
--      guard against self-promotion to admin / self-verification
--   2. notifications: columns the app writes (content, type) — every insert
--      has been failing; table verified empty
--   3. processed_payments + process_payment_confirmation (manual admin confirm)
--   4. bookings: guard so clients can't mark themselves paid / edit prices
--   5. Double-booking index, ai_logs, performance indexes,
--      customer completion policy
--   6. Security: profiles PII exposure, notification forging
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 0. Booking statuses + dispute columns ───────────────────────────────────
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check
    CHECK (status IN ('pending', 'confirmed', 'paid', 'cancelled', 'completed', 'disputed', 'refunded'));

ALTER TABLE public.bookings
    ADD COLUMN IF NOT EXISTS dispute_reason text,
    ADD COLUMN IF NOT EXISTS dispute_resolved_at timestamptz,
    ADD COLUMN IF NOT EXISTS dispute_resolution text
        CHECK (dispute_resolution IN ('release_to_provider', 'refund_customer'));

CREATE INDEX IF NOT EXISTS idx_bookings_disputed
    ON public.bookings (status, created_at DESC) WHERE status = 'disputed';

-- ── 1. profiles: role + id_card_link ────────────────────────────────────────
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user',
    ADD COLUMN IF NOT EXISTS id_card_link text,
    ADD COLUMN IF NOT EXISTS business_name text,
    ADD COLUMN IF NOT EXISTS business_category text;

-- Replace any role CHECK (incl. auto-named legacy ones) with the final one
DO $$
DECLARE con record;
BEGIN
    FOR con IN
        SELECT conname FROM pg_constraint
        WHERE conrelid = 'public.profiles'::regclass AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%role%'
    LOOP
        EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT %I', con.conname);
    END LOOP;
END $$;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('user', 'provider', 'admin'));

-- Anyone who already lists a service is a provider (never demotes admins)
UPDATE public.profiles p SET role = 'provider'
 WHERE p.role = 'user'
   AND EXISTS (SELECT 1 FROM public.services s WHERE s.user_id = p.id);

-- Signup trigger (on_auth_user_created → handle_new_user). The live version
-- inserted role/business_* columns that did not exist, so new signups failed.
-- Role comes from user-supplied signup metadata: accept only user/provider.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, role, full_name, phone_number, business_name, business_category)
    VALUES (
        NEW.id,
        CASE WHEN NEW.raw_user_meta_data->>'role' = 'provider' THEN 'provider' ELSE 'user' END,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'phone_number',
        NEW.raw_user_meta_data->>'business_name',
        NEW.raw_user_meta_data->>'business_category'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

-- Users update their own profile row via the API. Stop them from granting
-- themselves admin or verified status: only user → provider is allowed
-- ("Become a Provider"); anything else is silently kept as it was.
-- New rows can never start as admin or verified (covers signup too).
-- Updates by the service role / SQL editor are unrestricted.
CREATE OR REPLACE FUNCTION public.guard_profile_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.role IS NULL OR NEW.role NOT IN ('user', 'provider') THEN
            NEW.role := 'user';
        END IF;
        NEW.is_verified := false;
        RETURN NEW;
    END IF;

    IF coalesce(auth.role(), '') NOT IN ('authenticated', 'anon') THEN
        RETURN NEW;
    END IF;

    IF NEW.role IS DISTINCT FROM OLD.role
       AND NOT (OLD.role = 'user' AND NEW.role = 'provider') THEN
        NEW.role := OLD.role;
    END IF;
    NEW.is_verified := OLD.is_verified;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_privileged_columns ON public.profiles;
CREATE TRIGGER guard_profile_privileged_columns
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privileged_columns();

-- ── 2. notifications: match what the app writes ─────────────────────────────
ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS content text,
    ADD COLUMN IF NOT EXISTS type text;
ALTER TABLE public.notifications ALTER COLUMN title DROP NOT NULL;
ALTER TABLE public.notifications ALTER COLUMN message DROP NOT NULL;
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
    CHECK (type IS NULL OR type IN ('booking', 'payment', 'message', 'info'));

-- ── 3. Payment ledger + atomic confirmation (used by admin manual confirm) ──
CREATE TABLE IF NOT EXISTS public.processed_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tx_ref text NOT NULL UNIQUE,
    booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE RESTRICT,
    provider text NOT NULL CHECK (provider IN ('chapa', 'telebirr', 'cbe')),
    processed_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    commission_amount numeric,
    provider_earnings numeric
);
CREATE INDEX IF NOT EXISTS idx_processed_payments_booking_id
    ON public.processed_payments (booking_id);
CREATE INDEX IF NOT EXISTS idx_processed_payments_processed_at
    ON public.processed_payments (processed_at DESC);

ALTER TABLE public.processed_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "No direct access to processed_payments" ON public.processed_payments;
CREATE POLICY "No direct access to processed_payments"
    ON public.processed_payments FOR ALL USING (false) WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.process_payment_confirmation(
    p_tx_ref text,
    p_booking_id uuid,
    p_provider text,
    p_commission numeric,
    p_provider_earnings numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_booking bookings%ROWTYPE;
    v_processed_id uuid;
BEGIN
    SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'booking_not_found');
    END IF;

    IF v_booking.status = 'paid' THEN
        INSERT INTO processed_payments (tx_ref, booking_id, provider, commission_amount, provider_earnings)
        VALUES (p_tx_ref, p_booking_id, p_provider, p_commission, p_provider_earnings)
        ON CONFLICT (tx_ref) DO NOTHING;
        RETURN jsonb_build_object('status', 'already_processed');
    END IF;

    INSERT INTO processed_payments (tx_ref, booking_id, provider, commission_amount, provider_earnings)
    VALUES (p_tx_ref, p_booking_id, p_provider, p_commission, p_provider_earnings)
    ON CONFLICT (tx_ref) DO NOTHING
    RETURNING id INTO v_processed_id;

    IF v_processed_id IS NULL THEN
        RETURN jsonb_build_object('status', 'already_processed');
    END IF;

    UPDATE bookings
       SET status = 'paid',
           commission_amount = p_commission,
           provider_earnings = p_provider_earnings
     WHERE id = p_booking_id AND status <> 'paid';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'booking_status_race';
    END IF;

    INSERT INTO notifications (user_id, content, type, link)
    VALUES (v_booking.user_id, 'Payment Received — your booking is confirmed!', 'payment', '/dashboard');

    RETURN jsonb_build_object('status', 'success');
END;
$$;

REVOKE ALL ON FUNCTION public.process_payment_confirmation(text, uuid, text, numeric, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_payment_confirmation(text, uuid, text, numeric, numeric) TO service_role;

-- ── 4. bookings: clients may only make the status changes the app makes ─────
-- Existing UPDATE policies let customers/providers change ANY column on their
-- bookings (e.g. status → 'paid'). The server actions only ever do:
--   provider: pending/confirmed → confirmed/cancelled
--   customer: paid → completed   (and may cancel before payment)
-- Payment confirmation and dispute resolution use the service role.
CREATE OR REPLACE FUNCTION public.guard_booking_client_changes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_is_provider boolean;
    v_is_customer boolean;
BEGIN
    IF coalesce(auth.role(), '') NOT IN ('authenticated', 'anon') THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        NEW.status := 'pending';
        NEW.commission_amount := NULL;
        NEW.provider_earnings := NULL;
        NEW.dispute_reason := NULL;
        NEW.dispute_resolution := NULL;
        NEW.dispute_resolved_at := NULL;
        RETURN NEW;
    END IF;

    -- UPDATE: only status may change
    IF (to_jsonb(NEW) - 'status') IS DISTINCT FROM (to_jsonb(OLD) - 'status') THEN
        RAISE EXCEPTION 'Only the booking status can be changed' USING ERRCODE = '42501';
    END IF;

    IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
        RETURN NEW;
    END IF;

    v_is_customer := OLD.user_id = auth.uid();
    SELECT EXISTS (
        SELECT 1 FROM services s WHERE s.id = OLD.service_id AND s.user_id = auth.uid()
    ) INTO v_is_provider;

    IF v_is_provider AND OLD.status IN ('pending', 'confirmed')
       AND NEW.status IN ('confirmed', 'cancelled') THEN
        RETURN NEW;
    END IF;

    IF v_is_customer AND OLD.status = 'paid' AND NEW.status = 'completed' THEN
        RETURN NEW;
    END IF;

    IF v_is_customer AND OLD.status IN ('pending', 'confirmed') AND NEW.status = 'cancelled' THEN
        RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Booking status change % → % not allowed', OLD.status, NEW.status
        USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS guard_booking_client_changes ON public.bookings;
CREATE TRIGGER guard_booking_client_changes
    BEFORE INSERT OR UPDATE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION public.guard_booking_client_changes();

-- ── 5a. Double-booking prevention (0 conflicting slots verified) ────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_bookings_per_slot
    ON public.bookings (service_id, date)
    WHERE status IN ('pending', 'confirmed', 'paid', 'completed');

-- ── 5b. AI concierge logs (written with the service role only) ──────────────
CREATE TABLE IF NOT EXISTS public.ai_logs (
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
CREATE INDEX IF NOT EXISTS idx_ai_logs_created_at ON public.ai_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_logs_success ON public.ai_logs (success, created_at DESC);
ALTER TABLE public.ai_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role can manage ai logs" ON public.ai_logs;
CREATE POLICY "Service role can manage ai logs" ON public.ai_logs
    FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- ── 5c. Performance indexes (20260218100000 + 20260713200000, de-duplicated) ─
CREATE INDEX IF NOT EXISTS idx_bookings_user_status          ON public.bookings (user_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_service_date_status  ON public.bookings (service_id, date, status);
CREATE INDEX IF NOT EXISTS idx_bookings_status               ON public.bookings (status);
CREATE INDEX IF NOT EXISTS idx_services_active_category      ON public.services (is_active, category);
CREATE INDEX IF NOT EXISTS idx_services_active_price         ON public.services (is_active, price);
CREATE INDEX IF NOT EXISTS idx_services_active_location      ON public.services (is_active, location);
CREATE INDEX IF NOT EXISTS idx_services_user_id_active       ON public.services (user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_messages_service_created      ON public.messages (service_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_service_sender_receiver ON public.messages (service_id, sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read       ON public.notifications (user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_service_id            ON public.reviews (service_id, created_at DESC);

-- ── 5d. Customer booking-completion policy ──────────────────────────────────
-- (Policies are permissive/OR'd: the trigger in section 4 is what enforces.)
DROP POLICY IF EXISTS "Customers can complete their paid bookings" ON public.bookings;
CREATE POLICY "Customers can complete their paid bookings"
    ON public.bookings FOR UPDATE
    USING (auth.uid() = user_id AND status = 'paid')
    WITH CHECK (auth.uid() = user_id AND status = 'completed');

-- ── 6a. SECURITY: stop profile/phone-number scraping ─────────────────────────
-- "Public Read Profiles" (USING true) let every logged-in user read every
-- profile, including phone numbers and ID-card links. Users keep reading
-- their own row via "Users can view their own profile".
DROP POLICY IF EXISTS "Public Read Profiles" ON public.profiles;
REVOKE ALL ON public.profiles FROM anon;

-- Public names/avatars are read through public_profiles, a whitelist of safe
-- columns. It was security_invoker, so without the policy above it would
-- return only the caller's own row. Run it with owner rights (intended design,
-- see 20260822000000) and make it strictly read-only for clients.
ALTER VIEW public.public_profiles SET (security_invoker = false);
REVOKE ALL ON public.public_profiles FROM anon, authenticated;
GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- ── 6b. SECURITY: stop forged notifications ─────────────────────────────────
-- "Unified Notification Access" had WITH CHECK (true): any user could create
-- notifications for anyone (e.g. fake "payment received"). The app creates
-- notifications only with the service role, so clients get no INSERT at all.
DROP POLICY IF EXISTS "Unified Notification Access" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications." ON public.notifications;
DROP POLICY IF EXISTS "Users can view their own notifications." ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications." ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications." ON public.notifications;

CREATE POLICY "Users can view their own notifications."
    ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications."
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own notifications."
    ON public.notifications FOR DELETE USING (auth.uid() = user_id);

COMMIT;

-- After running: promote your admin account(s) (not part of the transaction):
--   UPDATE public.profiles SET role = 'admin' WHERE id = '<your-user-uuid>';
