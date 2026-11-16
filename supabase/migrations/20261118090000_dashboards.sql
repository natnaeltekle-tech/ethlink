-- ════════════════════════════════════════════════════════════════════════════
-- Role-aware dashboards (2026-11-18). One transaction; safe to re-run.
--   1. Per-booking payout tracking (admin-only fields)
--   2. Customer disputes: paid → disputed with a reason (+ notifications)
--   3. Verified reviews: one review per completed booking
--   4. favorites: cascade when a service is deleted
--   5. saved_searches: limits + index (recent searches)
--   6. profiles.bio (public via public_profiles)
--   7. Verified providers may edit service zones/modes/experience/bio only
-- ════════════════════════════════════════════════════════════════════════════
BEGIN;

-- ── 1. Payout tracking ──────────────────────────────────────────────────────
ALTER TABLE public.bookings
    ADD COLUMN IF NOT EXISTS payout_status text NOT NULL DEFAULT 'unpaid',
    ADD COLUMN IF NOT EXISTS paid_out_at timestamptz,
    ADD COLUMN IF NOT EXISTS payout_method text,
    ADD COLUMN IF NOT EXISTS payout_reference text;
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_payout_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_payout_status_check
    CHECK (payout_status IN ('unpaid', 'paid_out'));
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_payout_method_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_payout_method_check
    CHECK (payout_method IS NULL OR payout_method IN ('telebirr', 'cbe', 'cash', 'other'));
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_payout_reference_len;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_payout_reference_len
    CHECK (payout_reference IS NULL OR char_length(payout_reference) <= 100);
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_paid_out_consistency;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_paid_out_consistency
    CHECK (payout_status = 'unpaid' OR (status = 'completed' AND paid_out_at IS NOT NULL));
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_dispute_reason_len;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_dispute_reason_len
    CHECK (dispute_reason IS NULL OR char_length(dispute_reason) <= 1000);
CREATE INDEX IF NOT EXISTS idx_bookings_awaiting_payout
    ON public.bookings (service_id) WHERE status = 'completed' AND payout_status = 'unpaid';

-- ── 2. Booking guard: + customer disputes, + payout fields admin-only ───────
-- Clients (authenticated/anon) may only make these status changes:
--   provider: pending/confirmed → confirmed/cancelled
--   customer: pending/confirmed → cancelled; paid → completed;
--             paid → disputed (with a 10–1000 char reason, nothing else)
-- Everything else (money, payout, dispute resolution) is service-role only.
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
        IF NOT EXISTS (
            SELECT 1 FROM services s
             WHERE s.id = NEW.service_id AND s.is_active
               AND public.is_verified_provider(s.user_id)
        ) THEN
            RAISE EXCEPTION 'This service is not available for booking yet'
                USING ERRCODE = '42501';
        END IF;
        NEW.status := 'pending';
        NEW.commission_amount := NULL;
        NEW.provider_earnings := NULL;
        NEW.dispute_reason := NULL;
        NEW.dispute_resolution := NULL;
        NEW.dispute_resolved_at := NULL;
        NEW.payout_status := 'unpaid';
        NEW.paid_out_at := NULL;
        NEW.payout_method := NULL;
        NEW.payout_reference := NULL;
        RETURN NEW;
    END IF;

    v_is_customer := OLD.user_id = auth.uid();

    -- Customer opens a dispute while the money is in escrow
    IF v_is_customer AND OLD.status = 'paid' AND NEW.status = 'disputed' THEN
        IF (to_jsonb(NEW) - 'status' - 'dispute_reason') IS DISTINCT FROM (to_jsonb(OLD) - 'status' - 'dispute_reason')
           OR char_length(btrim(coalesce(NEW.dispute_reason, ''))) NOT BETWEEN 10 AND 1000 THEN
            RAISE EXCEPTION 'Describe the problem (10–1000 characters) to open a dispute' USING ERRCODE = '42501';
        END IF;
        NEW.dispute_reason := btrim(NEW.dispute_reason);
        RETURN NEW;
    END IF;

    IF (to_jsonb(NEW) - 'status') IS DISTINCT FROM (to_jsonb(OLD) - 'status') THEN
        RAISE EXCEPTION 'Only the booking status can be changed' USING ERRCODE = '42501';
    END IF;
    IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
        RETURN NEW;
    END IF;

    SELECT EXISTS (SELECT 1 FROM services s WHERE s.id = OLD.service_id AND s.user_id = auth.uid())
      INTO v_is_provider;

    IF v_is_provider AND OLD.status IN ('pending', 'confirmed') AND NEW.status IN ('confirmed', 'cancelled') THEN
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

-- Notify provider + admins when a customer opens a dispute
CREATE OR REPLACE FUNCTION public.notify_booking_disputed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_title text;
    v_owner uuid;
BEGIN
    SELECT s.title, s.user_id INTO v_title, v_owner FROM services s WHERE s.id = NEW.service_id;
    INSERT INTO notifications (user_id, type, link, content)
    SELECT x.uid, 'booking', x.link, x.content
      FROM (
        SELECT v_owner AS uid, '/dashboard?mode=provider&tab=history' AS link,
               'A customer opened a dispute on "' || coalesce(v_title, 'your service') || '". Our team will review it.' AS content
        UNION ALL
        SELECT p.id, '/admin#disputes',
               'Dispute opened: "' || coalesce(v_title, 'booking') || '" — ' || left(coalesce(NEW.dispute_reason, ''), 80)
          FROM profiles p WHERE p.role = 'admin'
      ) x
     WHERE x.uid IS NOT NULL;
    RETURN NEW;
EXCEPTION WHEN others THEN
    RAISE WARNING 'notify_booking_disputed failed: %', SQLERRM;
    RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS notify_booking_disputed ON public.bookings;
CREATE TRIGGER notify_booking_disputed
    AFTER UPDATE OF status ON public.bookings
    FOR EACH ROW WHEN (OLD.status = 'paid' AND NEW.status = 'disputed')
    EXECUTE FUNCTION public.notify_booking_disputed();

-- ── 3. Verified reviews (existing reviews stay; new ones need a booking) ────
ALTER TABLE public.reviews
    ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS reviews_one_per_booking ON public.reviews (booking_id) WHERE booking_id IS NOT NULL;
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_comment_len;
ALTER TABLE public.reviews ADD CONSTRAINT reviews_comment_len
    CHECK (comment IS NULL OR char_length(comment) <= 1000);

DROP POLICY IF EXISTS "Users can insert their own reviews." ON public.reviews;
DROP POLICY IF EXISTS "Customers review their completed bookings" ON public.reviews;
CREATE POLICY "Customers review their completed bookings" ON public.reviews
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
        AND booking_id IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM public.bookings b
             WHERE b.id = booking_id AND b.user_id = auth.uid()
               AND b.service_id = reviews.service_id AND b.status = 'completed'
        )
    );
REVOKE INSERT, UPDATE, DELETE ON public.reviews FROM anon;

-- ── 4. favorites follow their service ───────────────────────────────────────
ALTER TABLE public.favorites DROP CONSTRAINT IF EXISTS favorites_service_id_fkey;
ALTER TABLE public.favorites ADD CONSTRAINT favorites_service_id_fkey
    FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE;

-- ── 5. Recent searches ──────────────────────────────────────────────────────
ALTER TABLE public.saved_searches DROP CONSTRAINT IF EXISTS saved_searches_query_len;
ALTER TABLE public.saved_searches ADD CONSTRAINT saved_searches_query_len
    CHECK (char_length(query) BETWEEN 1 AND 200);
CREATE INDEX IF NOT EXISTS idx_saved_searches_user_recent ON public.saved_searches (user_id, created_at DESC);
REVOKE ALL ON public.saved_searches FROM anon;

-- ── 6. Public bio ───────────────────────────────────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_bio_len;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_bio_len CHECK (bio IS NULL OR char_length(bio) <= 500);

CREATE OR REPLACE VIEW public.public_profiles AS
SELECT id, first_name, last_name,
       TRIM(BOTH FROM (first_name || ' ' || COALESCE(last_name, ''))) AS full_name,
       username, avatar_url, is_verified,
       account_type, business_name, has_business_license,
       bio
FROM profiles;
ALTER VIEW public.public_profiles SET (security_invoker = false);
REVOKE ALL ON public.public_profiles FROM anon, authenticated;
GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- ── 7. Verified providers: service area & experience stay editable ─────────
-- Unsubmitted/rejected: full edit (re-submission). Pending: locked.
-- Verified: only service_zones, service_modes, years_experience, bio;
-- documents and payout details need admin (re-verification).
DROP POLICY IF EXISTS "Providers edit own application before review" ON public.provider_verifications;
DROP POLICY IF EXISTS "Providers edit own application" ON public.provider_verifications;
CREATE POLICY "Providers edit own application" ON public.provider_verifications
    FOR UPDATE USING (auth.uid() = user_id
        AND public.my_verification_status() IN ('unsubmitted', 'rejected', 'verified'))
    WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.guard_provider_verification_review()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
    IF coalesce(auth.role(), '') IN ('authenticated', 'anon') THEN
        NEW.reviewed_at := CASE WHEN TG_OP = 'UPDATE' THEN OLD.reviewed_at ELSE NULL END;
        NEW.reviewed_by := CASE WHEN TG_OP = 'UPDATE' THEN OLD.reviewed_by ELSE NULL END;
        IF TG_OP = 'UPDATE' AND public.my_verification_status() = 'verified'
           AND (to_jsonb(NEW) - 'service_zones' - 'service_modes' - 'years_experience' - 'bio' - 'updated_at')
               IS DISTINCT FROM (to_jsonb(OLD) - 'service_zones' - 'service_modes' - 'years_experience' - 'bio' - 'updated_at') THEN
            RAISE EXCEPTION 'Documents and payout details can only be changed by Eth-Links support'
                USING ERRCODE = '42501';
        END IF;
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
END $$;

COMMIT;
