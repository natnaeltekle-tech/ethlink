-- Add id_card_link column to profiles table
DO $$ BEGIN alter table profiles add column id_card_link TEXT; EXCEPTION WHEN duplicate_column THEN END $$;
