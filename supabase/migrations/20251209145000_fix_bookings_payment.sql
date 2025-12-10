-- Fix Booking Status Check Constraint to include 'paid'
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check 
    CHECK (status IN ('pending', 'confirmed', 'cancelled', 'paid'));

-- Add Policy to allow Customers to Update their booking (e.g. to 'paid')
DROP POLICY IF EXISTS "Users can update their own bookings" ON bookings;
CREATE POLICY "Users can update their own bookings"
    ON bookings FOR UPDATE
    USING (auth.uid() = user_id);

-- Add Policy to allow Providers to View bookings for their services
DROP POLICY IF EXISTS "Providers can view bookings for their services" ON bookings;
CREATE POLICY "Providers can view bookings for their services"
    ON bookings FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM services
            WHERE services.id = bookings.service_id
            AND services.user_id = auth.uid()
        )
    );

-- Add Policy to allow Providers to Update bookings (e.g. accept/reject)
DROP POLICY IF EXISTS "Providers can update bookings for their services" ON bookings;
CREATE POLICY "Providers can update bookings for their services"
    ON bookings FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM services
            WHERE services.id = bookings.service_id
            AND services.user_id = auth.uid()
        )
    );
