-- ─── Group 5: Admin authorization via profiles.role ─────────────────────────
-- profiles.role already exists ('user' | 'provider'). Extend its CHECK
-- constraint to also allow 'admin'. Handles any auto-named legacy constraint.

DO $$
DECLARE
    con record;
BEGIN
    FOR con IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'profiles'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) LIKE '%role%'
    LOOP
        EXECUTE format('ALTER TABLE profiles DROP CONSTRAINT %I', con.conname);
    END LOOP;
END $$;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('user', 'provider', 'admin'));

-- To promote an administrator (run once per admin, e.g. in the Supabase SQL editor):
--   UPDATE profiles SET role = 'admin' WHERE id = '<user-uuid>';
