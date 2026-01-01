-- Create a secure view for public profile access
-- This avoids exposing sensitive columns like phone_number or internal IDs if any
create or replace view public_profiles as
select
  id,
  full_name,
  avatar_url,
  business_name,
  business_category,
  role,
  created_at
from profiles;

-- Grant access to the view
grant select on public_profiles to anon, authenticated;

-- Revoke public access to the raw profiles table (if it was granted widely before)
-- We keep 'authenticated' able to select own profile via RLS, but for public queries we force the view.
-- (Existing RLS policies on 'profiles' might still allow select if "true", so we should ideally tighten that too, 
-- but creating the view is the first step to safe queries).

-- Let's tighten the RLS policy on profiles if it was "true"
-- We will replace the "Public profiles are viewable by everyone" policy with a restrictive one
-- BUT removing it might break other parts of the app that haven't been updated to use the view yet.
-- Ideally, we update the code first, then tighten the policy.
-- For now, we JUST create the view so we can switch the code to use it.
