-- Add 'completed' status to bookings table check constraint
-- This allows customers to mark jobs as completed after payment

-- Drop the existing constraint
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;

-- Add the new constraint with 'completed' status
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check 
    CHECK (status IN ('pending', 'confirmed', 'paid', 'cancelled', 'completed'));
