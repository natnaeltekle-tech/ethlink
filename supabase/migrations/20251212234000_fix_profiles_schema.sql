-- Ensure profiles table has all required columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_number text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS id_card_link text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text check (role in ('user', 'provider')) default 'user';

-- Update RLS if needed (idempotent)
alter table profiles enable row level security;

-- Ensure policies exist (dropping first to avoid "policy already exists" errors if we want to be clean, 
-- or using DO blocks, but simple IF NOT EXISTS logic for policies depends on PG version. 
-- For now, purely adding columns is the safest "Fix" for the reported error).
