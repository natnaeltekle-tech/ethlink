-- ════════════════════════════════════════════════════════════════════════════
-- Landmark / Sefer — 2026-11-23.
-- Ethiopian addresses are found by landmarks ("Bole Medhanialem, behind Edna Mall").
-- Optional free text on listings (where the provider is) and bookings (where
-- the customer wants the service). Idempotent; no data changes.
-- ════════════════════════════════════════════════════════════════════════════
BEGIN;

ALTER TABLE public.services ADD COLUMN IF NOT EXISTS landmark text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS landmark text;

ALTER TABLE public.services DROP CONSTRAINT IF EXISTS services_landmark_len;
ALTER TABLE public.services ADD CONSTRAINT services_landmark_len
    CHECK (landmark IS NULL OR char_length(landmark) <= 150);
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_landmark_len;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_landmark_len
    CHECK (landmark IS NULL OR char_length(landmark) <= 150);

COMMIT;
