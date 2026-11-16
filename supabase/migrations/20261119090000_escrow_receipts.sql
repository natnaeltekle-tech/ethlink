-- ════════════════════════════════════════════════════════════════════════════
-- Escrow Guarantee Receipts (2026-11-19). One transaction; safe to re-run.
--   1. quoted_price: the service price locked when the booking is made
--   2. amount_paid / paid_at / receipt_number / payment_method /
--      payment_reference: stamped once when a booking becomes paid
--   3. verify_token: unguessable id for the public verification link + QR
--   4. Backfill existing bookings
-- Clients still cannot change any of these (guard trigger: status only).
-- ════════════════════════════════════════════════════════════════════════════
BEGIN;

-- ── 1–3. Columns ────────────────────────────────────────────────────────────
ALTER TABLE public.bookings
    ADD COLUMN IF NOT EXISTS quoted_price numeric(12,2),
    ADD COLUMN IF NOT EXISTS amount_paid numeric(12,2),
    ADD COLUMN IF NOT EXISTS paid_at timestamptz,
    ADD COLUMN IF NOT EXISTS receipt_number text,
    ADD COLUMN IF NOT EXISTS payment_method text,
    ADD COLUMN IF NOT EXISTS payment_reference text,
    ADD COLUMN IF NOT EXISTS verify_token uuid NOT NULL DEFAULT gen_random_uuid();

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_quoted_price_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_quoted_price_check
    CHECK (quoted_price IS NULL OR quoted_price >= 0);
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_amount_paid_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_amount_paid_check
    CHECK (amount_paid IS NULL OR amount_paid >= 0);
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_payment_method_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_payment_method_check
    CHECK (payment_method IS NULL OR payment_method IN ('telebirr', 'cbe', 'chapa', 'card', 'cash', 'other', 'test'));
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_payment_reference_len;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_payment_reference_len
    CHECK (payment_reference IS NULL OR char_length(payment_reference) <= 120);

CREATE UNIQUE INDEX IF NOT EXISTS bookings_receipt_number_key ON public.bookings (receipt_number) WHERE receipt_number IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS bookings_verify_token_key ON public.bookings (verify_token);

CREATE SEQUENCE IF NOT EXISTS public.booking_receipt_seq;
REVOKE ALL ON SEQUENCE public.booking_receipt_seq FROM anon, authenticated;

-- ── Lock the price on insert (all roles; clients can't override it) ─────────
CREATE OR REPLACE FUNCTION public.lock_booking_quote()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NEW.quoted_price IS NULL OR coalesce(auth.role(), '') IN ('authenticated', 'anon') THEN
        SELECT s.price INTO NEW.quoted_price FROM services s WHERE s.id = NEW.service_id;
    END IF;
    IF coalesce(auth.role(), '') IN ('authenticated', 'anon') THEN
        NEW.amount_paid := NULL;
        NEW.paid_at := NULL;
        NEW.receipt_number := NULL;
        NEW.payment_method := NULL;
        NEW.payment_reference := NULL;
        NEW.verify_token := gen_random_uuid();
    END IF;
    RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS lock_booking_quote ON public.bookings;
CREATE TRIGGER lock_booking_quote
    BEFORE INSERT ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION public.lock_booking_quote();

-- ── Stamp the receipt once, when the booking first becomes paid ────────────
-- Runs inside the same UPDATE as process_payment_confirmation, so
-- commission_amount + provider_earnings are the values that were charged.
CREATE OR REPLACE FUNCTION public.stamp_booking_payment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_ref text;
BEGIN
    IF NEW.status = 'paid' AND OLD.status IS DISTINCT FROM 'paid' AND NEW.amount_paid IS NULL THEN
        NEW.amount_paid := CASE
            WHEN NEW.commission_amount IS NOT NULL AND NEW.provider_earnings IS NOT NULL
                THEN round(NEW.commission_amount + NEW.provider_earnings, 2)
            ELSE NEW.quoted_price
        END;
        NEW.paid_at := coalesce(NEW.paid_at, now());
        IF NEW.receipt_number IS NULL THEN
            NEW.receipt_number := 'ETH-' || to_char(NEW.paid_at AT TIME ZONE 'Africa/Addis_Ababa', 'YYYY')
                || '-' || lpad(nextval('public.booking_receipt_seq')::text, 6, '0');
        END IF;
        IF NEW.payment_reference IS NULL THEN
            SELECT pp.tx_ref INTO v_ref FROM processed_payments pp
             WHERE pp.booking_id = NEW.id ORDER BY pp.processed_at DESC LIMIT 1;
            NEW.payment_reference := v_ref;
        END IF;
    END IF;
    RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS stamp_booking_payment ON public.bookings;
CREATE TRIGGER stamp_booking_payment
    BEFORE UPDATE OF status ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION public.stamp_booking_payment();

-- ── 4. Backfill ─────────────────────────────────────────────────────────────
UPDATE public.bookings b
   SET quoted_price = CASE
        WHEN b.commission_amount IS NOT NULL AND b.provider_earnings IS NOT NULL
            THEN round(b.commission_amount + b.provider_earnings, 2)
        ELSE s.price END
  FROM public.services s
 WHERE s.id = b.service_id AND b.quoted_price IS NULL;

-- Bookings that were paid before this migration: stamp them in date order.
WITH paid AS (
    SELECT b.id,
           coalesce((SELECT max(pp.processed_at) FROM processed_payments pp WHERE pp.booking_id = b.id), b.created_at) AS at,
           (SELECT pp.tx_ref FROM processed_payments pp WHERE pp.booking_id = b.id ORDER BY pp.processed_at DESC LIMIT 1) AS ref
      FROM public.bookings b
     WHERE b.status IN ('paid', 'completed', 'disputed', 'refunded') AND b.receipt_number IS NULL
     ORDER BY 2
)
UPDATE public.bookings b
   SET amount_paid = coalesce(b.amount_paid, b.quoted_price),
       paid_at = coalesce(b.paid_at, paid.at),
       payment_reference = coalesce(b.payment_reference, paid.ref),
       receipt_number = 'ETH-' || to_char(paid.at AT TIME ZONE 'Africa/Addis_Ababa', 'YYYY')
           || '-' || lpad(nextval('public.booking_receipt_seq')::text, 6, '0')
  FROM paid
 WHERE paid.id = b.id;

COMMIT;
