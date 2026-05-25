-- Create a table for public profiles
DO $$
DECLARE
  r_kind char;
  t_exists boolean;
BEGIN
  SELECT c.relkind INTO r_kind
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'profiles';

  IF r_kind = 'v' THEN
    EXECUTE 'DROP VIEW IF EXISTS public.profiles CASCADE';
  ELSIF r_kind = 'm' THEN
    EXECUTE 'DROP MATERIALIZED VIEW IF EXISTS public.profiles CASCADE';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'profiles' AND t.typtype != 'c'
  ) INTO t_exists;

  IF t_exists THEN
    EXECUTE 'DROP TYPE IF EXISTS public.profiles CASCADE';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS profiles (
  id uuid references auth.users on delete cascade not null primary key,
  role text not null check (role in ('user', 'provider')),
  full_name text,
  phone_number text,
  business_name text,
  business_category text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS)
alter table profiles enable row level security;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON profiles;
create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

DROP POLICY IF EXISTS "Users can insert their own profile." ON profiles;
create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

DROP POLICY IF EXISTS "Users can update own profile." ON profiles;
create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, phone_number, business_name, business_category)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'user'),
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone_number',
    new.raw_user_meta_data->>'business_name',
    new.raw_user_meta_data->>'business_category'
  );
  return new;
end;
$$;

-- Trigger the function every time a user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
