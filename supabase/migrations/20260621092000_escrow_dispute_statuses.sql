ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
    CHECK (status IN ('pending', 'confirmed', 'paid', 'cancelled', 'completed', 'disputed', 'refunded'));

ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS dispute_reason text,
    ADD COLUMN IF NOT EXISTS dispute_resolved_at timestamptz,
    ADD COLUMN IF NOT EXISTS dispute_resolution text CHECK (dispute_resolution IN ('release_to_provider', 'refund_customer'));

CREATE INDEX IF NOT EXISTS idx_bookings_disputed
    ON bookings (status, created_at DESC)
    WHERE status = 'disputed';
