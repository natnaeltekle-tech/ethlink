-- Idempotent payment ledger + atomic booking confirmation
CREATE TABLE IF NOT EXISTS processed_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tx_ref text NOT NULL UNIQUE,
    booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
    provider text NOT NULL CHECK (provider IN ('chapa', 'telebirr', 'cbe')),
    processed_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    commission_amount numeric,
    provider_earnings numeric
);

CREATE INDEX IF NOT EXISTS idx_processed_payments_booking_id
    ON processed_payments (booking_id);

CREATE INDEX IF NOT EXISTS idx_processed_payments_processed_at
    ON processed_payments (processed_at DESC);

ALTER TABLE processed_payments ENABLE ROW LEVEL SECURITY;

-- Atomic payment confirmation: idempotent on tx_ref, row-locked on booking
CREATE OR REPLACE FUNCTION process_payment_confirmation(
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
    SELECT * INTO v_booking
    FROM bookings
    WHERE id = p_booking_id
    FOR UPDATE;

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
    SET
        status = 'paid',
        commission_amount = p_commission,
        provider_earnings = p_provider_earnings
    WHERE id = p_booking_id
      AND status <> 'paid';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'booking_status_race';
    END IF;

    INSERT INTO notifications (user_id, content, type, link)
    VALUES (
        v_booking.user_id,
        'Payment Received — your booking is confirmed!',
        'payment',
        '/dashboard'
    );

    RETURN jsonb_build_object('status', 'success');
END;
$$;

REVOKE ALL ON FUNCTION process_payment_confirmation(text, uuid, text, numeric, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION process_payment_confirmation(text, uuid, text, numeric, numeric) TO service_role;
