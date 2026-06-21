-- Production indexes, constraints, and RLS hardening

-- Bookings: composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_bookings_user_id_status
    ON bookings (user_id, status);

CREATE INDEX IF NOT EXISTS idx_bookings_service_id_date
    ON bookings (service_id, date);

CREATE INDEX IF NOT EXISTS idx_bookings_status
    ON bookings (status)
    WHERE status IN ('pending', 'confirmed', 'paid');

-- Services: active listings lookup
CREATE INDEX IF NOT EXISTS idx_services_user_id_active
    ON services (user_id, is_active)
    WHERE is_active = true;

-- Messages: conversation lookup
CREATE INDEX IF NOT EXISTS idx_messages_service_sender_receiver
    ON messages (service_id, sender_id, receiver_id);

-- Reviews: per-service lookup
CREATE INDEX IF NOT EXISTS idx_reviews_service_id
    ON reviews (service_id, created_at DESC);

-- processed_payments: deny all direct access (service_role only via RPC)
DROP POLICY IF EXISTS "No direct access to processed_payments" ON processed_payments;
CREATE POLICY "No direct access to processed_payments"
    ON processed_payments
    FOR ALL
    USING (false)
    WITH CHECK (false);

-- Strengthen bookings: customers can only complete their own paid bookings
DROP POLICY IF EXISTS "Customers can complete their paid bookings" ON bookings;
CREATE POLICY "Customers can complete their paid bookings"
    ON bookings FOR UPDATE
    USING (auth.uid() = user_id AND status = 'paid')
    WITH CHECK (auth.uid() = user_id AND status = 'completed');

-- Ensure tx_ref uniqueness is enforced at DB level (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'processed_payments_tx_ref_key'
    ) THEN
        ALTER TABLE processed_payments ADD CONSTRAINT processed_payments_tx_ref_key UNIQUE (tx_ref);
    END IF;
END $$;
