-- Add commission tracking columns to bookings table
DO $$ BEGIN
  ALTER TABLE bookings ADD COLUMN commission_amount NUMERIC;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE bookings ADD COLUMN provider_earnings NUMERIC;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- Optional: update existing paid bookings to have default values (e.g. 0 commission, full price earnings)
-- This assumes we want to protect historical data integrity, or we can leave them null.
-- For now, we leave them null or let the app handle it.
