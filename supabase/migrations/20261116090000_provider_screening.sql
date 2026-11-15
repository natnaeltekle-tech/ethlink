-- ════════════════════════════════════════════════════════════════════════════
-- Provider Screening & Verification (2026-11-16)
-- Private KYC bucket, provider_verifications, verification_status workflow,
-- verified-only public listings/bookings, booking-ready service fields.
-- One transaction; safe to re-run.
-- ════════════════════════════════════════════════════════════════════════════
BEGIN;

-- ── 1. profiles: public-facing provider fields + verification status ────────
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS account_type text,
    ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'unsubmitted',
    ADD COLUMN IF NOT EXISTS rejection_reason text,
    ADD COLUMN IF NOT EXISTS verification_submitted_at timestamptz,
    ADD COLUMN IF NOT EXISTS verified_at timestamptz,
    ADD COLUMN IF NOT EXISTS has_business_license boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_account_type_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_account_type_check
    CHECK (account_type IS NULL OR account_type IN ('individual', 'business'));
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_verification_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_verification_status_check
    CHECK (verification_status IN ('unsubmitted', 'pending', 'verified', 'rejected'));

-- ── 2. Private screening data (one row per provider; never public) ──────────
CREATE TABLE IF NOT EXISTS public.provider_verifications (
    user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    id_type text NOT NULL CHECK (id_type IN ('fayda', 'kebele', 'passport', 'drivers_license')),
    id_front_path text NOT NULL,
    id_back_path text,                       -- passport has no back
    selfie_path text NOT NULL,
    license_path text,                       -- optional: Trade License / TIN / certificate
    phone_whatsapp boolean NOT NULL DEFAULT false,
    phone_telegram boolean NOT NULL DEFAULT false,
    service_modes text[] NOT NULL DEFAULT '{}',
    service_zones text[] NOT NULL DEFAULT '{}',
    payout_telebirr_phone text,
    payout_cbe_account text,
    payout_account_name text NOT NULL,
    years_experience integer CHECK (years_experience BETWEEN 0 AND 60),
    bio text CHECK (char_length(bio) <= 1000),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    reviewed_at timestamptz,
    reviewed_by uuid,
    CONSTRAINT pv_service_modes_check CHECK (service_modes <@ ARRAY['travels_to_customer', 'customer_visits', 'online']::text[]),
    CONSTRAINT pv_payout_present CHECK (payout_telebirr_phone IS NOT NULL OR payout_cbe_account IS NOT NULL),
    CONSTRAINT pv_telebirr_format CHECK (payout_telebirr_phone IS NULL OR payout_telebirr_phone ~ '^\+251[79][0-9]{8}$'),
    CONSTRAINT pv_cbe_format CHECK (payout_cbe_account IS NULL OR payout_cbe_account ~ '^[0-9]{13}$'),
    -- documents must live in the uploader's own private folder
    CONSTRAINT pv_paths_own_folder CHECK (
        id_front_path LIKE user_id::text || '/%' AND selfie_path LIKE user_id::text || '/%'
        AND (id_back_path IS NULL OR id_back_path LIKE user_id::text || '/%')
        AND (license_path IS NULL OR license_path LIKE user_id::text || '/%'))
);

ALTER TABLE public.provider_verifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.provider_verifications FROM anon;

-- Helper: caller's own status (SECURITY DEFINER so policies can read it)
CREATE OR REPLACE FUNCTION public.my_verification_status()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT verification_status FROM profiles WHERE id = auth.uid()
$$;

-- Providers read their own application; may write it only while not pending/verified
DROP POLICY IF EXISTS "Providers read own application" ON public.provider_verifications;
CREATE POLICY "Providers read own application" ON public.provider_verifications
    FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Providers create own application" ON public.provider_verifications;
CREATE POLICY "Providers create own application" ON public.provider_verifications
    FOR INSERT WITH CHECK (auth.uid() = user_id
        AND public.my_verification_status() IN ('unsubmitted', 'rejected'));
DROP POLICY IF EXISTS "Providers edit own application before review" ON public.provider_verifications;
CREATE POLICY "Providers edit own application before review" ON public.provider_verifications
    FOR UPDATE USING (auth.uid() = user_id
        AND public.my_verification_status() IN ('unsubmitted', 'rejected'))
    WITH CHECK (auth.uid() = user_id);
-- Clients can never set review fields
CREATE OR REPLACE FUNCTION public.guard_provider_verification_review()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
    IF coalesce(auth.role(), '') IN ('authenticated', 'anon') THEN
        NEW.reviewed_at := CASE WHEN TG_OP = 'UPDATE' THEN OLD.reviewed_at ELSE NULL END;
        NEW.reviewed_by := CASE WHEN TG_OP = 'UPDATE' THEN OLD.reviewed_by ELSE NULL END;
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_provider_verification_review ON public.provider_verifications;
CREATE TRIGGER guard_provider_verification_review
    BEFORE INSERT OR UPDATE ON public.provider_verifications
    FOR EACH ROW EXECUTE FUNCTION public.guard_provider_verification_review();

-- ── 3. Extend the profile guard: status workflow ────────────────────────────
-- Clients: unsubmitted|rejected → pending only (and only with a complete
-- application on file). verified / is_verified / has_business_license /
-- rejection_reason / verified_at are admin-only (service role).
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
        NEW.verification_status := 'unsubmitted';
        NEW.has_business_license := false;
        NEW.rejection_reason := NULL;
        NEW.verified_at := NULL;
        RETURN NEW;
    END IF;

    IF coalesce(auth.role(), '') NOT IN ('authenticated', 'anon') THEN
        -- service role / SQL editor: keep is_verified in sync with status
        NEW.is_verified := (NEW.verification_status = 'verified');
        RETURN NEW;
    END IF;

    IF NEW.role IS DISTINCT FROM OLD.role
       AND NOT (OLD.role = 'user' AND NEW.role = 'provider') THEN
        NEW.role := OLD.role;
    END IF;
    NEW.is_verified := OLD.is_verified;
    NEW.has_business_license := OLD.has_business_license;
    NEW.rejection_reason := OLD.rejection_reason;
    NEW.verified_at := OLD.verified_at;

    IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
        IF OLD.verification_status IN ('unsubmitted', 'rejected')
           AND NEW.verification_status = 'pending'
           AND EXISTS (SELECT 1 FROM provider_verifications v WHERE v.user_id = OLD.id) THEN
            NEW.verification_submitted_at := now();
        ELSE
            NEW.verification_status := OLD.verification_status;
            NEW.verification_submitted_at := OLD.verification_submitted_at;
        END IF;
    ELSE
        NEW.verification_submitted_at := OLD.verification_submitted_at;
    END IF;
    RETURN NEW;
END;
$$;

-- ── 4. Gate: only verified providers' active listings are public/bookable ───
CREATE OR REPLACE FUNCTION public.is_verified_provider(p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id AND verification_status = 'verified')
$$;
GRANT EXECUTE ON FUNCTION public.is_verified_provider(uuid) TO anon, authenticated;

-- Customers keep seeing services they already booked (dashboards, chat, receipts)
CREATE OR REPLACE FUNCTION public.has_booking_on_service(p_service_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (SELECT 1 FROM bookings WHERE service_id = p_service_id AND user_id = auth.uid())
$$;
GRANT EXECUTE ON FUNCTION public.has_booking_on_service(uuid) TO authenticated;

DROP POLICY IF EXISTS "Services are viewable by everyone." ON public.services;
DROP POLICY IF EXISTS "Public sees verified providers' active services" ON public.services;
CREATE POLICY "Public sees verified providers' active services" ON public.services
    FOR SELECT USING (
        (is_active AND public.is_verified_provider(user_id))
        OR auth.uid() = user_id                    -- owners preview their pending listing
        OR public.has_booking_on_service(id)       -- existing customers keep access
    );

-- Bookings: block new bookings on unverified/inactive listings (extends guard)
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
        RETURN NEW;
    END IF;

    IF (to_jsonb(NEW) - 'status') IS DISTINCT FROM (to_jsonb(OLD) - 'status') THEN
        RAISE EXCEPTION 'Only the booking status can be changed' USING ERRCODE = '42501';
    END IF;
    IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
        RETURN NEW;
    END IF;

    v_is_customer := OLD.user_id = auth.uid();
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

-- ── 5. Booking-ready service fields ─────────────────────────────────────────
ALTER TABLE public.services
    ADD COLUMN IF NOT EXISTS pricing_unit text NOT NULL DEFAULT 'fixed',
    ADD COLUMN IF NOT EXISTS working_days text[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS opens_at time,
    ADD COLUMN IF NOT EXISTS closes_at time,
    ADD COLUMN IF NOT EXISTS whats_included text;
ALTER TABLE public.services DROP CONSTRAINT IF EXISTS services_pricing_unit_check;
ALTER TABLE public.services ADD CONSTRAINT services_pricing_unit_check
    CHECK (pricing_unit IN ('fixed', 'per_hour', 'per_day', 'starting_from'));
ALTER TABLE public.services DROP CONSTRAINT IF EXISTS services_working_days_check;
ALTER TABLE public.services ADD CONSTRAINT services_working_days_check
    CHECK (working_days <@ ARRAY['mon','tue','wed','thu','fri','sat','sun']::text[]);
ALTER TABLE public.services DROP CONSTRAINT IF EXISTS services_whats_included_len;
ALTER TABLE public.services ADD CONSTRAINT services_whats_included_len
    CHECK (whats_included IS NULL OR char_length(whats_included) <= 1000);

-- services_view: append new fields + provider badges (columns appended at end)
CREATE OR REPLACE VIEW public.services_view
WITH (security_invoker = true) AS
 SELECT s.id, s.title, s.category, s.description, s.price, s.location, s.image_url,
    s.user_id, s.created_at, s.updated_at, s.images, s.is_active,
    COALESCE(avg(r.rating), 0::numeric) AS avg_rating,
    count(r.id) AS review_count,
    s.gallery, s.latitude, s.longitude,
    s.pricing_unit, s.working_days, s.opens_at, s.closes_at, s.whats_included, s.amenities,
    public.is_verified_provider(s.user_id) AS provider_verified
   FROM services s
     LEFT JOIN reviews r ON s.id = r.service_id
  GROUP BY s.id;
GRANT SELECT ON public.services_view TO anon, authenticated;

-- public_profiles: append badge fields (whitelisted, non-sensitive)
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT id, first_name, last_name,
       TRIM(BOTH FROM (first_name || ' ' || COALESCE(last_name, ''))) AS full_name,
       username, avatar_url, is_verified,
       account_type, business_name, has_business_license
FROM profiles;
ALTER VIEW public.public_profiles SET (security_invoker = false);
REVOKE ALL ON public.public_profiles FROM anon, authenticated;
GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- ── 6. Private KYC storage bucket ───────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('provider-kyc', 'provider-kyc', false, 10485760,
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Providers: upload + read only inside {their uid}/. No update/delete (no
-- swapping documents after review). Admins read via service-role signed URLs.
DROP POLICY IF EXISTS "KYC: providers upload to own folder" ON storage.objects;
CREATE POLICY "KYC: providers upload to own folder" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'provider-kyc' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "KYC: providers read own folder" ON storage.objects;
CREATE POLICY "KYC: providers read own folder" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'provider-kyc' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Portfolio photos (public bucket): new uploads must go in the uploader's folder
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Portfolio: upload to own folder" ON storage.objects;
CREATE POLICY "Portfolio: upload to own folder" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'service-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ── 6b. Signup trigger: also store account_type (individual | business) ────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_provider boolean := NEW.raw_user_meta_data->>'role' = 'provider';
BEGIN
    INSERT INTO public.profiles (id, role, full_name, phone_number, business_name, business_category, account_type)
    VALUES (
        NEW.id,
        CASE WHEN v_is_provider THEN 'provider' ELSE 'user' END,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'phone_number',
        NEW.raw_user_meta_data->>'business_name',
        NEW.raw_user_meta_data->>'business_category',
        CASE WHEN v_is_provider AND NEW.raw_user_meta_data->>'account_type' IN ('individual', 'business')
             THEN NEW.raw_user_meta_data->>'account_type' END
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

-- ── 7. Switchover for existing accounts ─────────────────────────────────────
-- Platform admin accounts are verified (their listings stay live).
UPDATE public.profiles SET verification_status = 'verified', verified_at = coalesce(verified_at, now())
 WHERE role = 'admin' AND verification_status <> 'verified';
-- Other existing providers start at 'unsubmitted': their listings are hidden
-- until they submit and you approve. Existing bookings are unaffected.

CREATE INDEX IF NOT EXISTS idx_profiles_verification_status
    ON public.profiles (verification_status) WHERE verification_status IN ('pending', 'rejected');

COMMIT;

-- ── 8. Remove the stray, empty "service-images." bucket (outside the
-- transaction: Supabase may block direct deletes from storage tables; if so
-- this only prints a notice — delete it in Dashboard → Storage instead).
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'service-images.')
       AND NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'service-images.') THEN
        DELETE FROM storage.buckets WHERE id = 'service-images.';
    END IF;
EXCEPTION WHEN others THEN
    RAISE NOTICE 'Could not delete bucket "service-images." via SQL (%). Delete it in Dashboard → Storage.', SQLERRM;
END $$;
