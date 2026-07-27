-- D2: Performance indexes for 500+ provider scale
-- D3: CHECK constraint on booking status

-- Composite indexes for hot query paths
CREATE INDEX IF NOT EXISTS idx_services_active_category ON services(is_active, category);
CREATE INDEX IF NOT EXISTS idx_services_active_price ON services(is_active, price);
CREATE INDEX IF NOT EXISTS idx_services_active_location ON services(is_active, location);
CREATE INDEX IF NOT EXISTS idx_services_user_id_active ON services(user_id, is_active);

-- Booking query performance
CREATE INDEX IF NOT EXISTS idx_bookings_service_date_status ON bookings(service_id, date, status);
CREATE INDEX IF NOT EXISTS idx_bookings_user_status ON bookings(user_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- Message query performance (chat loads)
CREATE INDEX IF NOT EXISTS idx_messages_service_created ON messages(service_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_read ON messages(receiver_id, is_read);

-- Notification feed performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read, created_at DESC);

-- Review aggregation performance
CREATE INDEX IF NOT EXISTS idx_reviews_service ON reviews(service_id);

-- Payment idempotency (E1)
CREATE UNIQUE INDEX IF NOT EXISTS idx_processed_payments_tx_ref ON processed_payments(tx_ref);

-- D3: Constrain booking status to valid values only
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'bookings_status_check'
    ) THEN
        ALTER TABLE bookings
            ADD CONSTRAINT bookings_status_check
            CHECK (status IN ('pending', 'confirmed', 'cancelled', 'paid', 'completed', 'disputed', 'refunded'));
    END IF;
END
$$;
