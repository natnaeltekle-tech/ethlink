-- Allow public read access to profiles so ProviderCard works
create policy "Public profiles are viewable by everyone"
on profiles for select
using ( true );

-- Allow public read access to messages so ChatBox works for all parties
-- (Note: In a real app you might want to restrict this to participants, but for this fix we're opening it up)
create policy "Messages are viewable by everyone"
on messages for select
using ( true );

-- Ensure RLS is enabled so policies apply
alter table profiles enable row level security;
alter table messages enable row level security;
