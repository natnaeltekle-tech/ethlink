-- Every service must have a price (create form requires it; payments/escrow
-- compute commission from it). Verified 0 NULL rows on 2026-11-15.
-- Fails safely (no change) if a NULL price has appeared since.

ALTER TABLE public.services ALTER COLUMN price SET NOT NULL;
