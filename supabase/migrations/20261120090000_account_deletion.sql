-- ════════════════════════════════════════════════════════════════════════════
-- Account deletion (Google Play compliance) — 2026-11-20. One transaction; safe to re-run.
--
-- Financial records are kept but detached from the person:
--   • bookings.user_id  → nullable, ON DELETE SET NULL  (customer side)
--   • services.user_id  → nullable, ON DELETE SET NULL  (provider side; the
--     listing is hidden and stripped of photos/location but keeps its title so
--     past receipts still say what was bought)
-- Personal data is deleted: profile, provider application (ID documents,
-- payout numbers), messages, reviews, favorites, searches, notifications.
-- Deletion is refused while money is in escrow or owed to the provider.
--
-- Functions:
--   my_account_deletion_blockers()   → text[]  (signed-in user; empty = OK)
--   delete_account_data(uuid)        → jsonb   (service role only; the app then
--                                               deletes storage files + the auth user)
-- ════════════════════════════════════════════════════════════════════════════
BEGIN;

-- ── 1. Detachable owner columns ─────────────────────────────────────────────
DO $$
DECLARE r record;
BEGIN
    -- Drop whatever FK currently sits on bookings.user_id / services.user_id
    FOR r IN
        SELECT c.conname, c.conrelid::regclass AS tbl
          FROM pg_constraint c
          JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
         WHERE c.contype = 'f' AND a.attname = 'user_id'
           AND c.conrelid IN ('public.bookings'::regclass, 'public.services'::regclass)
    LOOP
        EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
    END LOOP;
END $$;

ALTER TABLE public.bookings ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.services ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.services ADD CONSTRAINT services_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- When the account went away (shown as "Deleted account" on receipts/dashboards)
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS customer_deleted_at timestamptz;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS owner_deleted_at timestamptz;

-- ── 2. What blocks deletion ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.account_deletion_blockers(p_user uuid)
RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT array_remove(ARRAY[
        CASE WHEN EXISTS (SELECT 1 FROM bookings b WHERE b.user_id = p_user AND b.status = 'paid')
             THEN 'You have a paid booking held in escrow. Mark it completed or wait for it to finish first.' END,
        CASE WHEN EXISTS (SELECT 1 FROM bookings b WHERE b.user_id = p_user AND b.status = 'disputed')
             THEN 'You have an open dispute. It must be resolved by Eth-Links support first.' END,
        CASE WHEN EXISTS (SELECT 1 FROM bookings b JOIN services s ON s.id = b.service_id
                           WHERE s.user_id = p_user AND b.status IN ('paid', 'disputed'))
             THEN 'A customer''s payment for one of your services is still held in escrow or disputed.' END,
        CASE WHEN EXISTS (SELECT 1 FROM bookings b JOIN services s ON s.id = b.service_id
                           WHERE s.user_id = p_user AND b.status = 'completed' AND b.payout_status = 'unpaid')
             THEN 'Eth-Links still owes you a payout for a completed job. Wait until it has been paid out.' END
    ], NULL)
$$;
REVOKE ALL ON FUNCTION public.account_deletion_blockers(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.my_account_deletion_blockers()
RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT CASE WHEN auth.uid() IS NULL THEN ARRAY['Not signed in']::text[]
                ELSE public.account_deletion_blockers(auth.uid()) END
$$;
REVOKE ALL ON FUNCTION public.my_account_deletion_blockers() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_account_deletion_blockers() TO authenticated;

-- ── 3. Delete / anonymise everything the user owns ─────────────────────────
-- Service role only. Idempotent: running it twice is harmless.
-- Returns the storage paths the app must remove (ID documents etc.).
CREATE OR REPLACE FUNCTION public.delete_account_data(p_user uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_blockers text[];
    v_kyc text[];
    v_cancelled int := 0;
    v_services_deleted int := 0;
    v_services_kept int := 0;
    v_bookings_kept int := 0;
    v_n int;
BEGIN
    IF p_user IS NULL THEN
        RAISE EXCEPTION 'No user given';
    END IF;

    -- Serialise with payment confirmation / status changes on this user's bookings
    PERFORM 1 FROM bookings b
     WHERE b.user_id = p_user OR b.service_id IN (SELECT id FROM services WHERE user_id = p_user)
       FOR UPDATE;

    v_blockers := public.account_deletion_blockers(p_user);
    IF cardinality(v_blockers) > 0 THEN
        RAISE EXCEPTION 'ACCOUNT_DELETE_BLOCKED: %', array_to_string(v_blockers, ' | ')
            USING ERRCODE = 'P0001';
    END IF;

    -- Unpaid requests can't go ahead without this person: cancel them.
    UPDATE bookings b SET status = 'cancelled'
     WHERE b.status IN ('pending', 'confirmed')
       AND (b.user_id = p_user OR b.service_id IN (SELECT id FROM services WHERE user_id = p_user));
    GET DIAGNOSTICS v_cancelled = ROW_COUNT;

    -- ID documents to remove from the private bucket
    SELECT array_remove(ARRAY[pv.id_front_path, pv.id_back_path, pv.selfie_path, pv.license_path], NULL)
      INTO v_kyc FROM provider_verifications pv WHERE pv.user_id = p_user;

    -- Conversations, saved items, notifications
    DELETE FROM messages WHERE sender_id = p_user OR receiver_id = p_user;
    DELETE FROM favorites WHERE user_id = p_user;
    DELETE FROM saved_searches WHERE user_id = p_user;
    DELETE FROM notifications WHERE user_id = p_user;
    DELETE FROM reviews WHERE user_id = p_user;
    -- Legacy tables (may not exist everywhere)
    IF to_regclass('public.chat_messages') IS NOT NULL THEN
        EXECUTE 'DELETE FROM public.chat_messages WHERE sender_id = $1
                    OR chat_room_id IN (SELECT id FROM public.chat_rooms WHERE participant1_id = $1 OR participant2_id = $1)' USING p_user;
    END IF;
    IF to_regclass('public.chat_rooms') IS NOT NULL THEN
        EXECUTE 'DELETE FROM public.chat_rooms WHERE participant1_id = $1 OR participant2_id = $1' USING p_user;
    END IF;
    IF to_regclass('public.listings') IS NOT NULL THEN
        EXECUTE 'DELETE FROM public.listings WHERE user_id = $1' USING p_user;
    END IF;

    -- Provider listings: never booked → delete; booked → keep for receipts, anonymised.
    DELETE FROM services s
     WHERE s.user_id = p_user AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.service_id = s.id);
    GET DIAGNOSTICS v_services_deleted = ROW_COUNT;

    UPDATE services s
       SET user_id = NULL, owner_deleted_at = now(), is_active = false,
           description = NULL, location = NULL, latitude = NULL, longitude = NULL,
           image_url = NULL, images = NULL, gallery = '{}', amenities = '{}',
           whats_included = NULL, updated_at = now()
     WHERE s.user_id = p_user;
    GET DIAGNOSTICS v_services_kept = ROW_COUNT;

    -- Customer bookings: keep amounts, receipt numbers and payment refs; drop the person.
    UPDATE bookings b SET user_id = NULL, customer_deleted_at = now() WHERE b.user_id = p_user;
    GET DIAGNOSTICS v_bookings_kept = ROW_COUNT;

    -- Provider application (ID documents, payout numbers) and the profile itself
    DELETE FROM provider_verifications WHERE user_id = p_user;
    DELETE FROM profiles WHERE id = p_user;
    GET DIAGNOSTICS v_n = ROW_COUNT;

    RETURN jsonb_build_object(
        'kyc_paths', to_jsonb(coalesce(v_kyc, ARRAY[]::text[])),
        'cancelled_bookings', v_cancelled,
        'services_deleted', v_services_deleted,
        'services_anonymised', v_services_kept,
        'bookings_anonymised', v_bookings_kept,
        'profile_deleted', v_n > 0
    );
END $$;
REVOKE ALL ON FUNCTION public.delete_account_data(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_account_data(uuid) TO service_role;

COMMIT;
