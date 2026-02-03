-- Add username column to profiles table
alter table profiles add column if not exists username text;

-- Update the public_profiles view to include username
create or replace view public_profiles as
select
  id,
  full_name,
  username,
  avatar_url,
  business_name,
  business_category,
  role,
  created_at
from profiles;

-- Grant access to the view (re-apply grants after recreating view)
grant select on public_profiles to anon, authenticated;
