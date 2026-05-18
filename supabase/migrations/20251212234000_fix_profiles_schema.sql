-- Ensure profiles table has all required columns
DO $$ BEGIN alter table profiles add column full_name text; EXCEPTION WHEN duplicate_column THEN END $$;
DO $$ BEGIN alter table profiles add column phone_number text; EXCEPTION WHEN duplicate_column THEN END $$;
DO $$ BEGIN alter table profiles add column id_card_link text; EXCEPTION WHEN duplicate_column THEN END $$;
DO $$ BEGIN alter table profiles add column role text check (role in ('user', 'provider')) default 'user'; EXCEPTION WHEN duplicate_column THEN END $$;

-- Update RLS if needed (idempotent)
alter table profiles enable row level security;

-- Ensure policies exist (dropping first to avoid "policy already exists" errors if we want to be clean, 
-- or using DO blocks, but simple IF NOT EXISTS logic for policies depends on PG version. 
-- For now, purely adding columns is the safest "Fix" for the reported error).
