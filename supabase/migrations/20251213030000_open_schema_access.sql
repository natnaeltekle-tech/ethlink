-- Allow public read access to profiles so ProviderCard works
drop policy if exists "Public profiles are viewable by everyone" on profiles;
create policy "Public profiles are viewable by everyone"
on profiles for select
using ( true );

-- Allow public read access to messages so ChatBox works for all parties
-- (Note: In a real app you might want to restrict this to participants, but for this fix we're opening it up)
-- Allow users to view messages they are part of (sender or receiver)
drop policy if exists "Users can view own messages" on messages;
create policy "Users can view own messages"
on messages for select
using ( auth.uid() = sender_id OR auth.uid() = receiver_id );

-- Ensure RLS is enabled so policies apply
alter table profiles enable row level security;
alter table messages enable row level security;
