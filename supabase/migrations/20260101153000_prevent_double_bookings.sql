-- Prevent double bookings using a partial unique index
-- This ensures no two bookings can exist for the same service at the same time
-- unless they are cancelled or completed (though completed usually means it was valid)
-- Actually, 'completed' bookings logically occupy the slot too (past tense), but for future blocking:
-- We primarily care about preventing new bookings overlapping with Active ones.
-- Active statuses: 'pending', 'confirmed', 'paid'. 
-- We should also include 'completed' to prevent re-booking a past slot if that matters, 
-- but usually 'completed' means the slot is used.
-- Let's include 'pending', 'confirmed', 'paid', 'completed'.
-- 'cancelled' is the only status that frees up a slot.

CREATE UNIQUE INDEX IF NOT EXISTS idx_active_bookings_per_slot
ON bookings (service_id, date)
WHERE status IN ('pending', 'confirmed', 'paid', 'completed');
