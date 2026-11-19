-- ════════════════════════════════════════════════════════════════════════════
-- Chapa escrow + platform commission + vendor payouts — 2026-11-22.
-- One transaction; safe to re-run. Preserves all existing data.
--
-- Money is integer cents (ETB × 100) everywhere new. Balances are never stored:
-- they are computed from the append-only wallet_transactions ledger:
--   available = SUM(seller_credit) − SUM(payout_completed)
--             − SUM(payout_requested WHERE status = 'pending')
-- Clients can only READ their own rows; every write goes through the
-- service-role functions below (idempotent, row-locked, advisory-locked).
-- ════════════════════════════════════════════════════════════════════════════
BEGIN;

-- ── 1. Commission rules (basis points; 1000 = 10%) ──────────────────────────
CREATE TABLE IF NOT EXISTS public.commission_rules (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    scope      text NOT NULL CHECK (scope IN ('default', 'category', 'vendor')),
    category   text,
    vendor_id  uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    rate_bps   integer NOT NULL CHECK (rate_bps BETWEEN 0 AND 5000),
    note       text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT commission_rules_scope_shape CHECK (
        (scope = 'default'  AND category IS NULL     AND vendor_id IS NULL) OR
        (scope = 'category' AND category IS NOT NULL AND vendor_id IS NULL) OR
        (scope = 'vendor'   AND vendor_id IS NOT NULL AND category IS NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS commission_rules_one_default ON public.commission_rules ((true)) WHERE scope = 'default';
CREATE UNIQUE INDEX IF NOT EXISTS commission_rules_one_per_category ON public.commission_rules (category) WHERE scope = 'category';
CREATE UNIQUE INDEX IF NOT EXISTS commission_rules_one_per_vendor ON public.commission_rules (vendor_id) WHERE scope = 'vendor';
INSERT INTO public.commission_rules (scope, rate_bps, note)
SELECT 'default', 1000, 'Platform default: 10% on services'
WHERE NOT EXISTS (SELECT 1 FROM public.commission_rules WHERE scope = 'default');

ALTER TABLE public.commission_rules ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.commission_rules FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.commission_rules FROM authenticated;
GRANT SELECT ON public.commission_rules TO authenticated;
DROP POLICY IF EXISTS "Read platform and own commission rules" ON public.commission_rules;
CREATE POLICY "Read platform and own commission rules" ON public.commission_rules
    FOR SELECT TO authenticated USING (scope <> 'vendor' OR vendor_id = auth.uid());

-- vendor > category > default > 10%
CREATE OR REPLACE FUNCTION public.commission_bps_for(p_service uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT coalesce(
        (SELECT r.rate_bps FROM commission_rules r JOIN services s ON s.id = p_service WHERE r.scope = 'vendor' AND r.vendor_id = s.user_id),
        (SELECT r.rate_bps FROM commission_rules r JOIN services s ON s.id = p_service WHERE r.scope = 'category' AND r.category = s.category),
        (SELECT r.rate_bps FROM commission_rules r WHERE r.scope = 'default'),
        1000)
$$;

-- Integer split: commission rounded half-up, seller gets the rest (never loses a cent to rounding twice)
CREATE OR REPLACE FUNCTION public.commission_cents(p_gross bigint, p_bps integer)
RETURNS bigint LANGUAGE sql IMMUTABLE AS $$ SELECT (p_gross * p_bps + 5000) / 10000 $$;

-- ── 2. Booking money columns (cents) ────────────────────────────────────────
ALTER TABLE public.bookings
    ADD COLUMN IF NOT EXISTS tx_ref text,
    ADD COLUMN IF NOT EXISTS gross_amount_cents bigint,
    ADD COLUMN IF NOT EXISTS commission_rate_bps integer,
    ADD COLUMN IF NOT EXISTS commission_amount_cents bigint,
    ADD COLUMN IF NOT EXISTS seller_net_amount_cents bigint,
    ADD COLUMN IF NOT EXISTS escrow_status text NOT NULL DEFAULT 'unpaid',
    ADD COLUMN IF NOT EXISTS released_at timestamptz;
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_escrow_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_escrow_status_check
    CHECK (escrow_status IN ('unpaid', 'held_in_escrow', 'released', 'disputed', 'refunded'));
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_cents_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_cents_check CHECK (
    coalesce(gross_amount_cents, 0) >= 0 AND coalesce(commission_amount_cents, 0) >= 0 AND coalesce(seller_net_amount_cents, 0) >= 0
    AND coalesce(commission_rate_bps, 0) BETWEEN 0 AND 5000
    AND (gross_amount_cents IS NULL OR commission_amount_cents IS NULL OR seller_net_amount_cents IS NULL
         OR gross_amount_cents = commission_amount_cents + seller_net_amount_cents));
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_tx_ref_len;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_tx_ref_len CHECK (tx_ref IS NULL OR char_length(tx_ref) <= 50);
CREATE UNIQUE INDEX IF NOT EXISTS bookings_tx_ref_key ON public.bookings (tx_ref) WHERE tx_ref IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_escrow_held ON public.bookings (service_id) WHERE escrow_status IN ('held_in_escrow', 'disputed');

-- Clients can never set money/escrow fields on insert (updates are already
-- limited to `status` by guard_booking_client_changes).
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
        NEW.tx_ref := NULL;
        NEW.gross_amount_cents := NULL;
        NEW.commission_rate_bps := NULL;
        NEW.commission_amount_cents := NULL;
        NEW.seller_net_amount_cents := NULL;
        NEW.escrow_status := 'unpaid';
        NEW.released_at := NULL;
    END IF;
    RETURN NEW;
END $$;

-- Keep escrow_status (and the cents split) in step with every status change,
-- whichever path made it (webhook, customer "Mark completed", admin dispute
-- resolution, auto-release). Runs after guard_/stamp_ triggers (name order).
CREATE OR REPLACE FUNCTION public.sync_booking_escrow()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
        RETURN NEW;
    END IF;

    IF NEW.status = 'paid' AND NEW.gross_amount_cents IS NULL THEN
        -- Paid through a path that didn't pass cents: derive them once from the charged amount.
        NEW.gross_amount_cents := round(coalesce(NEW.amount_paid, NEW.commission_amount + NEW.provider_earnings, NEW.quoted_price, 0) * 100)::bigint;
        NEW.commission_rate_bps := coalesce(NEW.commission_rate_bps, public.commission_bps_for(NEW.service_id));
        NEW.commission_amount_cents := public.commission_cents(NEW.gross_amount_cents, NEW.commission_rate_bps);
        NEW.seller_net_amount_cents := NEW.gross_amount_cents - NEW.commission_amount_cents;
    END IF;
    IF NEW.gross_amount_cents IS NOT NULL THEN
        -- Legacy decimal columns mirror the cents (receipts, older screens)
        NEW.commission_rate := round(NEW.commission_rate_bps / 10000.0, 4);
        NEW.commission_amount := round(NEW.commission_amount_cents / 100.0, 2);
        NEW.provider_earnings := round(NEW.seller_net_amount_cents / 100.0, 2);
    END IF;

    NEW.escrow_status := CASE NEW.status
        WHEN 'paid' THEN 'held_in_escrow'
        WHEN 'disputed' THEN 'disputed'
        WHEN 'completed' THEN CASE WHEN OLD.escrow_status IN ('held_in_escrow', 'disputed') OR OLD.status IN ('paid', 'disputed') THEN 'released' ELSE NEW.escrow_status END
        WHEN 'refunded' THEN 'refunded'
        ELSE NEW.escrow_status
    END;
    IF NEW.escrow_status = 'released' AND NEW.released_at IS NULL THEN
        NEW.released_at := now();
    END IF;
    RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS sync_booking_escrow ON public.bookings;
CREATE TRIGGER sync_booking_escrow
    BEFORE UPDATE OF status ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION public.sync_booking_escrow();

-- ── 3. Checkout attempts (one per Chapa checkout; tx_ref ≤ 20 chars) ────────
CREATE TABLE IF NOT EXISTS public.payment_attempts (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tx_ref                  text NOT NULL UNIQUE CHECK (char_length(tx_ref) BETWEEN 8 AND 50),
    booking_id              uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    customer_id             uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    amount_cents            bigint NOT NULL CHECK (amount_cents > 0),
    commission_rate_bps     integer NOT NULL CHECK (commission_rate_bps BETWEEN 0 AND 5000),
    commission_amount_cents bigint NOT NULL CHECK (commission_amount_cents >= 0),
    seller_net_amount_cents bigint NOT NULL CHECK (seller_net_amount_cents >= 0),
    currency                text NOT NULL DEFAULT 'ETB' CHECK (currency = 'ETB'),
    provider                text NOT NULL DEFAULT 'chapa' CHECK (provider IN ('chapa', 'sandbox', 'manual')),
    status                  text NOT NULL DEFAULT 'initialized'
                            CHECK (status IN ('initialized', 'succeeded', 'failed', 'duplicate', 'orphaned')),
    checkout_url            text,
    provider_reference      text,
    failure_reason          text,
    created_at              timestamptz NOT NULL DEFAULT now(),
    paid_at                 timestamptz,
    CONSTRAINT payment_attempts_split CHECK (amount_cents = commission_amount_cents + seller_net_amount_cents)
);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_booking ON public.payment_attempts (booking_id, created_at DESC);
ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_attempts FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.payment_attempts FROM authenticated;
GRANT SELECT ON public.payment_attempts TO authenticated;
DROP POLICY IF EXISTS "Customers read own payment attempts" ON public.payment_attempts;
CREATE POLICY "Customers read own payment attempts" ON public.payment_attempts
    FOR SELECT TO authenticated USING (customer_id = auth.uid());

-- ── 4. Payout accounts + requests ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payout_accounts (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    method         text NOT NULL CHECK (method IN ('bank', 'telebirr')),
    bank_code      text NOT NULL CHECK (char_length(bank_code) BETWEEN 1 AND 40),
    bank_name      text NOT NULL CHECK (char_length(bank_name) BETWEEN 2 AND 100),
    account_name   text NOT NULL CHECK (char_length(account_name) BETWEEN 2 AND 100),
    account_number text NOT NULL CHECK (account_number ~ '^\+?[0-9]{6,20}$'),
    is_default     boolean NOT NULL DEFAULT false,
    -- New or changed accounts can't receive money for 24h (account-takeover safety)
    cooldown_until timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS payout_accounts_one_default ON public.payout_accounts (user_id) WHERE is_default;
CREATE UNIQUE INDEX IF NOT EXISTS payout_accounts_unique_number ON public.payout_accounts (user_id, bank_code, account_number);
ALTER TABLE public.payout_accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payout_accounts FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.payout_accounts FROM authenticated;
GRANT SELECT ON public.payout_accounts TO authenticated;
DROP POLICY IF EXISTS "Users read own payout accounts" ON public.payout_accounts;
CREATE POLICY "Users read own payout accounts" ON public.payout_accounts
    FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.payout_requests (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    payout_account_id  uuid REFERENCES public.payout_accounts(id) ON DELETE SET NULL,
    amount_cents       bigint NOT NULL CHECK (amount_cents > 0),
    currency           text NOT NULL DEFAULT 'ETB' CHECK (currency = 'ETB'),
    reference          text NOT NULL UNIQUE CHECK (char_length(reference) BETWEEN 8 AND 50),
    status             text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    provider           text NOT NULL DEFAULT 'chapa' CHECK (provider IN ('chapa', 'sandbox', 'legacy')),
    provider_reference text,
    failure_reason     text,
    account_snapshot   jsonb NOT NULL DEFAULT '{}'::jsonb,
    requested_at       timestamptz NOT NULL DEFAULT now(),
    approved_at        timestamptz,
    completed_at       timestamptz,
    failed_at          timestamptz
);
CREATE INDEX IF NOT EXISTS idx_payout_requests_user ON public.payout_requests (user_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_payout_requests_pending ON public.payout_requests (requested_at) WHERE status = 'pending';
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payout_requests FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.payout_requests FROM authenticated;
GRANT SELECT ON public.payout_requests TO authenticated;
DROP POLICY IF EXISTS "Users read own payout requests" ON public.payout_requests;
CREATE POLICY "Users read own payout requests" ON public.payout_requests
    FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ── 5. Immutable ledger ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id                bigserial PRIMARY KEY,
    created_at        timestamptz NOT NULL DEFAULT now(),
    event_type        text NOT NULL CHECK (event_type IN ('escrow_deposit', 'commission_earned', 'seller_credit',
                          'payout_requested', 'payout_completed', 'payout_failed', 'refund_issued')),
    reference_id      text NOT NULL,
    user_id           uuid REFERENCES auth.users(id) ON DELETE SET NULL,   -- NULL = platform (commission)
    booking_id        uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
    payout_request_id uuid REFERENCES public.payout_requests(id) ON DELETE SET NULL,
    amount_cents      bigint NOT NULL,
    currency          text NOT NULL DEFAULT 'ETB' CHECK (currency = 'ETB'),
    status            text NOT NULL DEFAULT 'posted' CHECK (status IN ('posted', 'pending', 'completed', 'failed')),
    description       text,
    CONSTRAINT wallet_transactions_event_ref_key UNIQUE (event_type, reference_id),
    -- Only refund reversals may be negative
    CONSTRAINT wallet_transactions_amount_sign CHECK (amount_cents > 0 OR (amount_cents < 0 AND reference_id LIKE '%:reversal')),
    CONSTRAINT wallet_transactions_status_shape CHECK (
        (event_type = 'payout_requested' AND status IN ('pending', 'completed', 'failed')) OR
        (event_type <> 'payout_requested' AND status = 'posted'))
);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_user ON public.wallet_transactions (user_id, event_type);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_booking ON public.wallet_transactions (booking_id);

-- Append-only: no deletes; the only update is payout_requested pending → completed|failed.
CREATE OR REPLACE FUNCTION public.wallet_transactions_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'wallet_transactions is append-only' USING ERRCODE = '42501';
    END IF;
    IF OLD.event_type = 'payout_requested' AND OLD.status = 'pending' AND NEW.status IN ('completed', 'failed')
       AND (to_jsonb(NEW) - 'status') = (to_jsonb(OLD) - 'status') THEN
        RETURN NEW;
    END IF;
    -- user_id / booking_id may be cleared by ON DELETE SET NULL (account deletion)
    IF (to_jsonb(NEW) - 'user_id' - 'booking_id' - 'payout_request_id') = (to_jsonb(OLD) - 'user_id' - 'booking_id' - 'payout_request_id')
       AND (NEW.user_id IS NULL OR NEW.user_id = OLD.user_id)
       AND (NEW.booking_id IS NULL OR NEW.booking_id = OLD.booking_id)
       AND (NEW.payout_request_id IS NULL OR NEW.payout_request_id = OLD.payout_request_id) THEN
        RETURN NEW;
    END IF;
    RAISE EXCEPTION 'wallet_transactions is append-only' USING ERRCODE = '42501';
END $$;
DROP TRIGGER IF EXISTS wallet_transactions_immutable ON public.wallet_transactions;
CREATE TRIGGER wallet_transactions_immutable
    BEFORE UPDATE OR DELETE ON public.wallet_transactions
    FOR EACH ROW EXECUTE FUNCTION public.wallet_transactions_immutable();

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.wallet_transactions FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.wallet_transactions FROM authenticated;
GRANT SELECT ON public.wallet_transactions TO authenticated;
DROP POLICY IF EXISTS "Users read own ledger" ON public.wallet_transactions;
CREATE POLICY "Users read own ledger" ON public.wallet_transactions
    FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Ledger rows for every escrow transition, whichever path changed the status.
CREATE OR REPLACE FUNCTION public.post_booking_ledger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_seller uuid;
    v_ref text := NEW.id::text;
BEGIN
    IF NEW.status IS NOT DISTINCT FROM OLD.status OR NEW.gross_amount_cents IS NULL THEN
        RETURN NEW;
    END IF;
    SELECT s.user_id INTO v_seller FROM services s WHERE s.id = NEW.service_id;

    IF NEW.status = 'paid' AND OLD.status IN ('pending', 'confirmed') THEN
        INSERT INTO wallet_transactions (event_type, reference_id, user_id, booking_id, amount_cents, description)
        VALUES ('escrow_deposit', v_ref, NEW.user_id, NEW.id, NEW.gross_amount_cents, 'Customer payment held in escrow')
        ON CONFLICT (event_type, reference_id) DO NOTHING;
    END IF;

    IF NEW.status = 'completed' AND OLD.status IN ('paid', 'disputed') THEN
        INSERT INTO wallet_transactions (event_type, reference_id, user_id, booking_id, amount_cents, description)
        VALUES ('commission_earned', v_ref, NULL, NEW.id, NEW.commission_amount_cents, 'Platform commission')
        ON CONFLICT (event_type, reference_id) DO NOTHING;
        INSERT INTO wallet_transactions (event_type, reference_id, user_id, booking_id, amount_cents, description)
        VALUES ('seller_credit', v_ref, v_seller, NEW.id, NEW.seller_net_amount_cents, 'Escrow released to provider')
        ON CONFLICT (event_type, reference_id) DO NOTHING;
    END IF;

    IF NEW.status = 'refunded' AND OLD.status IN ('paid', 'disputed', 'completed') THEN
        IF OLD.status = 'completed' THEN
            -- Money was already released: reverse the provider credit and our commission.
            INSERT INTO wallet_transactions (event_type, reference_id, user_id, booking_id, amount_cents, description)
            VALUES ('seller_credit', v_ref || ':reversal', v_seller, NEW.id, -NEW.seller_net_amount_cents, 'Reversed: booking refunded')
            ON CONFLICT (event_type, reference_id) DO NOTHING;
            INSERT INTO wallet_transactions (event_type, reference_id, user_id, booking_id, amount_cents, description)
            VALUES ('commission_earned', v_ref || ':reversal', NULL, NEW.id, -NEW.commission_amount_cents, 'Reversed: booking refunded')
            ON CONFLICT (event_type, reference_id) DO NOTHING;
        END IF;
        INSERT INTO wallet_transactions (event_type, reference_id, user_id, booking_id, amount_cents, description)
        VALUES ('refund_issued', v_ref, NEW.user_id, NEW.id, NEW.gross_amount_cents, 'Escrow refunded to customer')
        ON CONFLICT (event_type, reference_id) DO NOTHING;
    END IF;
    RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS post_booking_ledger ON public.bookings;
CREATE TRIGGER post_booking_ledger
    AFTER UPDATE OF status ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION public.post_booking_ledger();

-- An admin recording a hand-made payout for one booking (older admin screen)
-- is posted to the ledger as a completed payout, so balances stay right.
CREATE OR REPLACE FUNCTION public.post_legacy_booking_payout()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_seller uuid;
    v_ref text := 'LEGACY-' || replace(NEW.id::text, '-', '');
    r payout_requests%ROWTYPE;
BEGIN
    IF NEW.payout_status <> 'paid_out' OR OLD.payout_status = 'paid_out' OR coalesce(NEW.seller_net_amount_cents, 0) <= 0
       OR NOT EXISTS (SELECT 1 FROM wallet_transactions WHERE event_type = 'seller_credit' AND reference_id = NEW.id::text) THEN
        RETURN NEW;
    END IF;
    SELECT s.user_id INTO v_seller FROM services s WHERE s.id = NEW.service_id;
    INSERT INTO payout_requests (user_id, amount_cents, reference, status, provider, provider_reference, account_snapshot, requested_at, completed_at)
    VALUES (v_seller, NEW.seller_net_amount_cents, v_ref, 'completed', 'legacy', NEW.payout_reference,
            jsonb_build_object('method', NEW.payout_method, 'bank_name', coalesce(NEW.payout_method, 'manual')),
            coalesce(NEW.paid_out_at, now()), coalesce(NEW.paid_out_at, now()))
    ON CONFLICT (reference) DO NOTHING
    RETURNING * INTO r;
    IF r.id IS NOT NULL THEN
        INSERT INTO wallet_transactions (event_type, reference_id, user_id, payout_request_id, amount_cents, description)
        VALUES ('payout_completed', v_ref, v_seller, r.id, r.amount_cents, 'Paid out manually by Eth-Links')
        ON CONFLICT (event_type, reference_id) DO NOTHING;
    END IF;
    RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS post_legacy_booking_payout ON public.bookings;
CREATE TRIGGER post_legacy_booking_payout
    AFTER UPDATE OF payout_status ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION public.post_legacy_booking_payout();

-- ── 6. Balances (the exact formula) ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.seller_available_cents(p_user uuid)
RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT coalesce(sum(amount_cents) FILTER (WHERE event_type = 'seller_credit'), 0)
         - coalesce(sum(amount_cents) FILTER (WHERE event_type = 'payout_completed'), 0)
         - coalesce(sum(amount_cents) FILTER (WHERE event_type = 'payout_requested' AND status = 'pending'), 0)
      FROM wallet_transactions WHERE user_id = p_user
$$;

CREATE OR REPLACE FUNCTION public.wallet_summary_for(p_user uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT jsonb_build_object(
        'available_cents', public.seller_available_cents(p_user),
        'total_earned_cents', (SELECT coalesce(sum(amount_cents), 0) FROM wallet_transactions WHERE user_id = p_user AND event_type = 'seller_credit'),
        'paid_out_cents', (SELECT coalesce(sum(amount_cents), 0) FROM wallet_transactions WHERE user_id = p_user AND event_type = 'payout_completed'),
        'pending_payout_cents', (SELECT coalesce(sum(amount_cents), 0) FROM wallet_transactions WHERE user_id = p_user AND event_type = 'payout_requested' AND status = 'pending'),
        'held_in_escrow_cents', (SELECT coalesce(sum(b.seller_net_amount_cents), 0) FROM bookings b JOIN services s ON s.id = b.service_id
                                  WHERE s.user_id = p_user AND b.escrow_status IN ('held_in_escrow', 'disputed'))
    )
$$;

CREATE OR REPLACE FUNCTION public.my_wallet_summary()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT CASE WHEN auth.uid() IS NULL THEN NULL ELSE public.wallet_summary_for(auth.uid()) END
$$;

-- ── 7. Money functions (service role only) ──────────────────────────────────
-- Create (or reuse, if recent and unchanged) a checkout attempt with the split in cents.
CREATE OR REPLACE FUNCTION public.create_payment_attempt(p_booking uuid, p_customer uuid, p_provider text, p_tx_ref text)
RETURNS public.payment_attempts LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    b bookings%ROWTYPE;
    a payment_attempts%ROWTYPE;
    v_gross bigint;
    v_bps integer;
    v_comm bigint;
BEGIN
    SELECT * INTO b FROM bookings WHERE id = p_booking FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'BOOKING_NOT_FOUND'; END IF;
    IF p_customer IS NOT NULL AND b.user_id IS DISTINCT FROM p_customer THEN RAISE EXCEPTION 'NOT_YOUR_BOOKING'; END IF;
    IF b.status NOT IN ('pending', 'confirmed') THEN RAISE EXCEPTION 'BOOKING_NOT_PAYABLE: %', b.status; END IF;

    v_gross := round(coalesce(b.quoted_price, (SELECT s.price FROM services s WHERE s.id = b.service_id)) * 100)::bigint;
    IF v_gross IS NULL OR v_gross <= 0 THEN RAISE EXCEPTION 'INVALID_PRICE'; END IF;
    v_bps := public.commission_bps_for(b.service_id);
    v_comm := public.commission_cents(v_gross, v_bps);

    -- Reuse an open attempt from the last 30 minutes with the same amount (double taps, back button)
    SELECT * INTO a FROM payment_attempts
     WHERE booking_id = p_booking AND status = 'initialized' AND provider = p_provider
       AND amount_cents = v_gross AND created_at > now() - interval '30 minutes'
     ORDER BY created_at DESC LIMIT 1;
    IF FOUND THEN RETURN a; END IF;

    INSERT INTO payment_attempts (tx_ref, booking_id, customer_id, amount_cents, commission_rate_bps,
                                  commission_amount_cents, seller_net_amount_cents, provider)
    VALUES (p_tx_ref, p_booking, b.user_id, v_gross, v_bps, v_comm, v_gross - v_comm, p_provider)
    RETURNING * INTO a;
    RETURN a;
END $$;

-- Verified payment → booking paid, escrow held (ledger via trigger). Idempotent.
CREATE OR REPLACE FUNCTION public.confirm_escrow_payment(
    p_tx_ref text, p_amount_cents bigint, p_provider_reference text, p_method text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    a payment_attempts%ROWTYPE;
    b bookings%ROWTYPE;
    v_seller uuid;
BEGIN
    SELECT * INTO a FROM payment_attempts WHERE tx_ref = p_tx_ref FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('status', 'error', 'message', 'unknown_tx_ref'); END IF;
    IF a.status = 'succeeded' THEN RETURN jsonb_build_object('status', 'already_processed', 'booking_id', a.booking_id); END IF;
    IF a.status IN ('duplicate', 'orphaned') THEN RETURN jsonb_build_object('status', a.status, 'booking_id', a.booking_id); END IF;

    IF p_amount_cents IS NOT NULL AND p_amount_cents <> a.amount_cents THEN
        UPDATE payment_attempts SET status = 'failed', failure_reason = format('amount mismatch: paid %s, expected %s', p_amount_cents, a.amount_cents)
         WHERE id = a.id;
        RETURN jsonb_build_object('status', 'error', 'message', 'amount_mismatch', 'booking_id', a.booking_id);
    END IF;

    SELECT * INTO b FROM bookings WHERE id = a.booking_id FOR UPDATE;
    SELECT s.user_id INTO v_seller FROM services s WHERE s.id = b.service_id;
    IF b.status IN ('paid', 'completed', 'disputed', 'refunded') THEN
        -- Paid twice (another attempt won): keep the money traceable for a manual refund.
        UPDATE payment_attempts SET status = 'duplicate', provider_reference = p_provider_reference, paid_at = now(),
               failure_reason = 'booking already paid by ' || coalesce(b.tx_ref, 'another payment')
         WHERE id = a.id;
        RETURN jsonb_build_object('status', 'duplicate', 'booking_id', b.id);
    END IF;
    IF b.status NOT IN ('pending', 'confirmed') THEN
        UPDATE payment_attempts SET status = 'orphaned', provider_reference = p_provider_reference, paid_at = now(),
               failure_reason = 'booking was ' || b.status || ' when the payment arrived'
         WHERE id = a.id;
        RETURN jsonb_build_object('status', 'orphaned', 'booking_id', b.id);
    END IF;

    UPDATE payment_attempts SET status = 'succeeded', provider_reference = p_provider_reference, paid_at = now() WHERE id = a.id;

    INSERT INTO processed_payments (tx_ref, booking_id, provider, commission_amount, provider_earnings)
    VALUES (a.tx_ref, b.id, 'chapa', round(a.commission_amount_cents / 100.0, 2), round(a.seller_net_amount_cents / 100.0, 2))
    ON CONFLICT (tx_ref) DO NOTHING;

    UPDATE bookings SET
        status = 'paid',
        tx_ref = a.tx_ref,
        gross_amount_cents = a.amount_cents,
        commission_rate_bps = a.commission_rate_bps,
        commission_amount_cents = a.commission_amount_cents,
        seller_net_amount_cents = a.seller_net_amount_cents,
        payment_method = CASE WHEN p_method IN ('telebirr', 'cbe', 'chapa', 'card', 'cash', 'other', 'test') THEN p_method
                              WHEN a.provider = 'sandbox' THEN 'test' ELSE 'chapa' END,
        payment_reference = coalesce(nullif(p_provider_reference, ''), a.tx_ref)
     WHERE id = b.id;

    RETURN jsonb_build_object('status', 'success', 'booking_id', b.id, 'seller_id', v_seller, 'customer_id', b.user_id,
                              'gross_cents', a.amount_cents, 'seller_net_cents', a.seller_net_amount_cents);
END $$;

-- Customer confirmed / admin / auto-release: escrow → seller balance (ledger via trigger).
CREATE OR REPLACE FUNCTION public.release_escrow(p_booking uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b bookings%ROWTYPE;
BEGIN
    SELECT * INTO b FROM bookings WHERE id = p_booking FOR UPDATE;
    IF NOT FOUND THEN RETURN 'not_found'; END IF;
    IF b.escrow_status = 'released' OR b.status = 'completed' THEN RETURN 'already_released'; END IF;
    IF b.status <> 'paid' THEN RETURN 'not_releasable'; END IF;   -- disputes are resolved by an admin
    UPDATE bookings SET status = 'completed' WHERE id = p_booking;
    RETURN 'released';
END $$;

-- 48h (default) after the scheduled time, undisputed escrow releases automatically.
CREATE OR REPLACE FUNCTION public.release_due_escrow(p_hours integer DEFAULT 48)
RETURNS SETOF uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
    FOR v_id IN
        SELECT id FROM bookings
         WHERE status = 'paid' AND escrow_status = 'held_in_escrow'
           AND date + make_interval(hours => p_hours) < now()
         ORDER BY date LIMIT 200
         FOR UPDATE SKIP LOCKED
    LOOP
        UPDATE bookings SET status = 'completed' WHERE id = v_id;
        RETURN NEXT v_id;
    END LOOP;
END $$;

-- Withdrawal: advisory lock per seller so concurrent requests can't overdraft.
CREATE OR REPLACE FUNCTION public.request_payout(
    p_user uuid, p_amount_cents bigint, p_account uuid, p_reference text, p_provider text, p_min_cents bigint DEFAULT 1000)
RETURNS public.payout_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    acc payout_accounts%ROWTYPE;
    r payout_requests%ROWTYPE;
    v_available bigint;
BEGIN
    PERFORM pg_advisory_xact_lock(hashtextextended('payout:' || p_user::text, 0));

    SELECT * INTO acc FROM payout_accounts WHERE id = p_account AND user_id = p_user;
    IF NOT FOUND THEN RAISE EXCEPTION 'PAYOUT_ACCOUNT_NOT_FOUND'; END IF;
    IF acc.cooldown_until > now() THEN RAISE EXCEPTION 'PAYOUT_ACCOUNT_COOLDOWN: %', acc.cooldown_until; END IF;
    IF p_amount_cents IS NULL OR p_amount_cents < p_min_cents THEN RAISE EXCEPTION 'PAYOUT_BELOW_MINIMUM: %', p_min_cents; END IF;

    v_available := public.seller_available_cents(p_user);
    IF p_amount_cents > v_available THEN RAISE EXCEPTION 'INSUFFICIENT_BALANCE: %', v_available; END IF;

    INSERT INTO payout_requests (user_id, payout_account_id, amount_cents, reference, provider, account_snapshot)
    VALUES (p_user, acc.id, p_amount_cents, p_reference, p_provider, jsonb_build_object(
        'method', acc.method, 'bank_code', acc.bank_code, 'bank_name', acc.bank_name, 'account_name', acc.account_name,
        'account_number_masked', repeat('•', greatest(char_length(acc.account_number) - 4, 0)) || right(acc.account_number, 4)))
    RETURNING * INTO r;

    INSERT INTO wallet_transactions (event_type, reference_id, user_id, payout_request_id, amount_cents, status, description)
    VALUES ('payout_requested', p_reference, p_user, r.id, p_amount_cents, 'pending', 'Withdrawal to ' || acc.bank_name);
    RETURN r;
END $$;

-- Transfer approval callback: approve only a payout that is still pending.
CREATE OR REPLACE FUNCTION public.approve_payout(p_reference text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    UPDATE payout_requests SET approved_at = coalesce(approved_at, now())
     WHERE reference = p_reference AND status = 'pending';
    RETURN FOUND;
END $$;

-- Final transfer result. Idempotent: only a pending payout changes.
CREATE OR REPLACE FUNCTION public.finalize_payout(p_reference text, p_success boolean, p_provider_reference text, p_reason text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r payout_requests%ROWTYPE;
BEGIN
    SELECT * INTO r FROM payout_requests WHERE reference = p_reference FOR UPDATE;
    IF NOT FOUND THEN RETURN 'not_found'; END IF;
    IF r.status <> 'pending' THEN RETURN 'already_' || r.status; END IF;

    UPDATE payout_requests SET
        status = CASE WHEN p_success THEN 'completed' ELSE 'failed' END,
        completed_at = CASE WHEN p_success THEN now() END,
        failed_at = CASE WHEN p_success THEN NULL ELSE now() END,
        provider_reference = coalesce(p_provider_reference, provider_reference),
        failure_reason = CASE WHEN p_success THEN NULL ELSE left(coalesce(p_reason, 'Transfer failed'), 300) END
     WHERE id = r.id;

    UPDATE wallet_transactions SET status = CASE WHEN p_success THEN 'completed' ELSE 'failed' END
     WHERE event_type = 'payout_requested' AND reference_id = p_reference AND status = 'pending';

    INSERT INTO wallet_transactions (event_type, reference_id, user_id, payout_request_id, amount_cents, description)
    VALUES (CASE WHEN p_success THEN 'payout_completed' ELSE 'payout_failed' END, p_reference, r.user_id, r.id, r.amount_cents,
            CASE WHEN p_success THEN 'Sent to ' || coalesce(r.account_snapshot->>'bank_name', 'your account')
                 ELSE 'Returned to balance: ' || left(coalesce(p_reason, 'transfer failed'), 200) END)
    ON CONFLICT (event_type, reference_id) DO NOTHING;
    RETURN CASE WHEN p_success THEN 'completed' ELSE 'failed' END;
END $$;

-- Admin revenue view
CREATE OR REPLACE FUNCTION public.platform_revenue_summary()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT jsonb_build_object(
        'commission_earned_cents', (SELECT coalesce(sum(amount_cents), 0) FROM wallet_transactions WHERE event_type = 'commission_earned'),
        'escrow_held_cents', (SELECT coalesce(sum(gross_amount_cents), 0) FROM bookings WHERE escrow_status IN ('held_in_escrow', 'disputed')),
        'escrow_held_count', (SELECT count(*) FROM bookings WHERE escrow_status IN ('held_in_escrow', 'disputed')),
        'pending_payout_cents', (SELECT coalesce(sum(amount_cents), 0) FROM payout_requests WHERE status = 'pending'),
        'pending_payout_count', (SELECT count(*) FROM payout_requests WHERE status = 'pending'),
        'completed_payout_cents', (SELECT coalesce(sum(amount_cents), 0) FROM payout_requests WHERE status = 'completed'),
        'sellers_available_cents', (SELECT coalesce(sum(amount_cents) FILTER (WHERE event_type = 'seller_credit'), 0)
                                         - coalesce(sum(amount_cents) FILTER (WHERE event_type = 'payout_completed'), 0)
                                         - coalesce(sum(amount_cents) FILTER (WHERE event_type = 'payout_requested' AND status = 'pending'), 0)
                                      FROM wallet_transactions)
    )
$$;

REVOKE ALL ON FUNCTION public.commission_bps_for(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.seller_available_cents(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wallet_summary_for(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_payment_attempt(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.confirm_escrow_payment(text, bigint, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_escrow(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_due_escrow(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.request_payout(uuid, bigint, uuid, text, text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.approve_payout(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finalize_payout(text, boolean, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.platform_revenue_summary() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.commission_bps_for(uuid), public.seller_available_cents(uuid), public.wallet_summary_for(uuid),
    public.create_payment_attempt(uuid, uuid, text, text), public.confirm_escrow_payment(text, bigint, text, text),
    public.release_escrow(uuid), public.release_due_escrow(integer), public.request_payout(uuid, bigint, uuid, text, text, bigint),
    public.approve_payout(text), public.finalize_payout(text, boolean, text, text), public.platform_revenue_summary() TO service_role;
REVOKE ALL ON FUNCTION public.my_wallet_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_wallet_summary() TO authenticated;

-- Account deletion must not strand money owed to the provider.
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
                           WHERE s.user_id = p_user AND b.status = 'completed' AND b.payout_status = 'unpaid'
                             AND b.gross_amount_cents IS NULL)
             THEN 'Eth-Links still owes you a payout for a completed job. Wait until it has been paid out.' END,
        CASE WHEN public.seller_available_cents(p_user) > 0
             THEN 'You have an unpaid payout balance. Withdraw your available earnings first.' END,
        CASE WHEN EXISTS (SELECT 1 FROM payout_requests r WHERE r.user_id = p_user AND r.status = 'pending')
             THEN 'A withdrawal is still being processed. Wait until it completes.' END
    ], NULL)
$$;

-- ── 8. Backfill existing paid bookings (cents, escrow status, ledger) ───────
UPDATE public.bookings b SET
    gross_amount_cents = round((coalesce(b.commission_amount, 0) + coalesce(b.provider_earnings, 0)) * 100)::bigint,
    commission_amount_cents = round(coalesce(b.commission_amount, 0) * 100)::bigint,
    seller_net_amount_cents = round((coalesce(b.commission_amount, 0) + coalesce(b.provider_earnings, 0)) * 100)::bigint
                              - round(coalesce(b.commission_amount, 0) * 100)::bigint,
    commission_rate_bps = coalesce(round(b.commission_rate * 10000)::integer, public.commission_bps_for(b.service_id))
 WHERE b.gross_amount_cents IS NULL
   AND b.status IN ('paid', 'completed', 'disputed', 'refunded')
   AND b.provider_earnings IS NOT NULL AND b.commission_amount IS NOT NULL;

-- Paid bookings without a recorded split: derive from the quoted price.
UPDATE public.bookings b SET
    gross_amount_cents = round(coalesce(b.amount_paid, b.quoted_price, 0) * 100)::bigint,
    commission_rate_bps = public.commission_bps_for(b.service_id)
 WHERE b.gross_amount_cents IS NULL AND b.status IN ('paid', 'completed', 'disputed', 'refunded');
UPDATE public.bookings b SET
    commission_amount_cents = public.commission_cents(b.gross_amount_cents, b.commission_rate_bps),
    seller_net_amount_cents = b.gross_amount_cents - public.commission_cents(b.gross_amount_cents, b.commission_rate_bps)
 WHERE b.gross_amount_cents IS NOT NULL AND b.commission_amount_cents IS NULL;

UPDATE public.bookings SET escrow_status = CASE status
        WHEN 'paid' THEN 'held_in_escrow' WHEN 'disputed' THEN 'disputed'
        WHEN 'completed' THEN 'released' WHEN 'refunded' THEN 'refunded' ELSE 'unpaid' END
 WHERE escrow_status = 'unpaid' AND status IN ('paid', 'disputed', 'completed', 'refunded');
UPDATE public.bookings SET released_at = coalesce(dispute_resolved_at, paid_at, created_at)
 WHERE escrow_status = 'released' AND released_at IS NULL;

INSERT INTO public.wallet_transactions (event_type, reference_id, user_id, booking_id, amount_cents, description, created_at)
SELECT 'escrow_deposit', b.id::text, b.user_id, b.id, b.gross_amount_cents, 'Customer payment held in escrow (backfill)', coalesce(b.paid_at, b.created_at)
  FROM public.bookings b WHERE b.escrow_status IN ('held_in_escrow', 'disputed', 'released', 'refunded') AND b.gross_amount_cents > 0
ON CONFLICT (event_type, reference_id) DO NOTHING;
INSERT INTO public.wallet_transactions (event_type, reference_id, user_id, booking_id, amount_cents, description, created_at)
SELECT 'commission_earned', b.id::text, NULL, b.id, b.commission_amount_cents, 'Platform commission (backfill)', b.released_at
  FROM public.bookings b WHERE b.escrow_status = 'released' AND b.commission_amount_cents > 0
ON CONFLICT (event_type, reference_id) DO NOTHING;
INSERT INTO public.wallet_transactions (event_type, reference_id, user_id, booking_id, amount_cents, description, created_at)
SELECT 'seller_credit', b.id::text, s.user_id, b.id, b.seller_net_amount_cents, 'Escrow released to provider (backfill)', b.released_at
  FROM public.bookings b JOIN public.services s ON s.id = b.service_id
 WHERE b.escrow_status = 'released' AND b.seller_net_amount_cents > 0
ON CONFLICT (event_type, reference_id) DO NOTHING;
INSERT INTO public.wallet_transactions (event_type, reference_id, user_id, booking_id, amount_cents, description, created_at)
SELECT 'refund_issued', b.id::text, b.user_id, b.id, b.gross_amount_cents, 'Escrow refunded to customer (backfill)', coalesce(b.dispute_resolved_at, b.created_at)
  FROM public.bookings b WHERE b.escrow_status = 'refunded' AND b.gross_amount_cents > 0
ON CONFLICT (event_type, reference_id) DO NOTHING;

-- Bookings an admin already paid out by hand (old per-booking payouts) count as completed payouts.
INSERT INTO public.payout_requests (user_id, amount_cents, reference, status, provider, provider_reference, account_snapshot, requested_at, completed_at)
SELECT s.user_id, b.seller_net_amount_cents, 'LEGACY-' || replace(b.id::text, '-', ''), 'completed', 'legacy', b.payout_reference,
       jsonb_build_object('method', b.payout_method, 'bank_name', coalesce(b.payout_method, 'manual')), coalesce(b.paid_out_at, now()), coalesce(b.paid_out_at, now())
  FROM public.bookings b JOIN public.services s ON s.id = b.service_id
 WHERE b.payout_status = 'paid_out' AND b.escrow_status = 'released' AND b.seller_net_amount_cents > 0
ON CONFLICT (reference) DO NOTHING;
INSERT INTO public.wallet_transactions (event_type, reference_id, user_id, payout_request_id, amount_cents, description, created_at)
SELECT 'payout_completed', r.reference, r.user_id, r.id, r.amount_cents, 'Paid out manually (backfill)', r.completed_at
  FROM public.payout_requests r WHERE r.provider = 'legacy'
ON CONFLICT (event_type, reference_id) DO NOTHING;

-- Provider payout details from the verification application become default payout accounts (already verified: no cooldown).
INSERT INTO public.payout_accounts (user_id, method, bank_code, bank_name, account_name, account_number, is_default, cooldown_until)
SELECT pv.user_id, 'telebirr', 'telebirr', 'telebirr', pv.payout_account_name, pv.payout_telebirr_phone, true, now()
  FROM public.provider_verifications pv
 WHERE pv.payout_telebirr_phone IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM public.payout_accounts pa WHERE pa.user_id = pv.user_id)
ON CONFLICT DO NOTHING;
INSERT INTO public.payout_accounts (user_id, method, bank_code, bank_name, account_name, account_number, is_default, cooldown_until)
SELECT pv.user_id, 'bank', 'cbe', 'Commercial Bank of Ethiopia', pv.payout_account_name, pv.payout_cbe_account,
       NOT EXISTS (SELECT 1 FROM public.payout_accounts pa WHERE pa.user_id = pv.user_id), now()
  FROM public.provider_verifications pv
 WHERE pv.payout_cbe_account IS NOT NULL
ON CONFLICT DO NOTHING;

COMMIT;
