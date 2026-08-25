-- Group 1 repair (v2, corrected to REAL profiles schema): PII lock-down
--
-- Real columns: id, first_name, last_name, phone, phone_number, id_card_url,
--               email, username, full_name, avatar_url, is_verified, updated_at
--
-- Sensitive columns that must never be publicly readable:
--   phone, phone_number, id_card_url, email
--
-- Fix strategy:
--   1. Base table: owner-only row access. service_role bypasses RLS, so
--      admin/payment/server flows keep full read.
--   2. Public reads go ONLY through the public_profiles view, which projects
--      a whitelist of safe columns. Views execute with the owner's privileges
--      (postgres), so the view intentionally bypasses base-table RLS while
--      structurally excluding all sensitive columns.

-- ── 1. Lock the base table ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING ( auth.uid() = id );

-- Existing insert/update policies are already scoped to auth.uid() = id and stay as-is.

-- Defense in depth: anonymous clients must never touch the base table directly.
REVOKE ALL ON public.profiles FROM anon;

-- ── 2. Rebuild the public read path as a strict column whitelist ───────────
-- Keeps the LIVE view's exact definition (safe columns only). Drop + recreate
-- so grants are re-applied deterministically even if the live view drifted.
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles AS
SELECT id, first_name, last_name,
       TRIM(BOTH FROM (first_name || ' ' || COALESCE(last_name, ''))) AS full_name,
       username, avatar_url, is_verified
FROM profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;
