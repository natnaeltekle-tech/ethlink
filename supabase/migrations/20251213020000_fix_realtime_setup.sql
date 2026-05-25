-- Enable Realtime for messages table
-- This is required for `postgres_changes` to work

-- 1. Ensure the table is part of the publication
-- We use a DO block to avoid errors if it's already added, or just simple SQL if we assume standard setup.
-- Standard Supabase setup has a 'supabase_realtime' publication.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr
    JOIN pg_class c ON pr.prrelid = c.oid
    JOIN pg_publication p ON pr.prpubid = p.oid
    WHERE c.relname = 'messages' AND p.pubname = 'supabase_realtime'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;
END $$;

-- 2. Verify RLS (Just to be safe)
alter table messages enable row level security;

-- 3. Verify Policies (Just ensuring they exist, though previous migration should have handled it)
-- We won't re-create them to avoid conflicts, assuming 20251124 migration ran.
-- If user reports RLS errors, we can add a robust policy check here.
