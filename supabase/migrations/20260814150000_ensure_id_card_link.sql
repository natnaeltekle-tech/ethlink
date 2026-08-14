-- Ensure identity verification can save document URL on profiles
DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS id_card_link text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

NOTIFY pgrst, 'reload schema';
