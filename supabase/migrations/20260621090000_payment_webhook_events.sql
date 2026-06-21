CREATE TABLE IF NOT EXISTS payment_webhook_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    tx_ref text,
    booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
    provider text CHECK (provider IN ('chapa', 'telebirr', 'cbe')),
    status text NOT NULL CHECK (status IN ('received', 'verified', 'ignored', 'processed', 'already_processed', 'failed')),
    message text,
    payload jsonb
);

CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_tx_ref
    ON payment_webhook_events (tx_ref);

CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_booking_id
    ON payment_webhook_events (booking_id);

CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_created_at
    ON payment_webhook_events (created_at DESC);

ALTER TABLE payment_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage payment webhook events" ON payment_webhook_events;
CREATE POLICY "Service role can manage payment webhook events"
    ON payment_webhook_events
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
