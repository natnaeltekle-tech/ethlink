-- Ensure profiles can store name, phone, and avatar (fixes schema cache error)
DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_name text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT timezone('utc'::text, now());
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Refresh PostgREST schema cache so API sees new columns immediately
NOTIFY pgrst, 'reload schema';
