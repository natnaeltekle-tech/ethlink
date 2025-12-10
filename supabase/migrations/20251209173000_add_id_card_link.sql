-- Add id_card_link column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS id_card_link TEXT;
