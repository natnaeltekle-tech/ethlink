-- Create profiles table
create table profiles (
  id uuid references auth.users not null primary key,
  updated_at timestamp with time zone,
  username text unique,
  full_name text,
  avatar_url text,
  website text,

  constraint username_length check (char_length(username) >= 3)
);

alter table profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- Create a trigger to automatically create a profile for new users
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create chat_rooms table
create table chat_rooms (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  participant1_id uuid references auth.users not null,
  participant2_id uuid references auth.users not null
);

alter table chat_rooms enable row level security;

create policy "Users can view chat rooms they are part of."
  on chat_rooms for select
  using ( auth.uid() = participant1_id or auth.uid() = participant2_id );

create policy "Users can create chat rooms."
  on chat_rooms for insert
  with check ( auth.uid() = participant1_id or auth.uid() = participant2_id );

-- Update messages table to link to chat_rooms (if not already done, or create new if replacing)
-- Assuming we want to enhance the existing messages table or create a new structure.
-- Let's add chat_room_id to the existing messages table if it exists, or create it if it doesn't.
-- For this starter, let's assume we are altering the existing one or creating it fresh if the previous one was simple.
-- Since we can't easily check existence in this script without dynamic SQL which might be complex for the user to run,
-- let's just add the column if it doesn't exist (idempotent-ish) or recreate.
-- To be safe and simple for the user, let's create a new table `chat_messages` to avoid conflicts with the previous simple `messages` table.

create table chat_messages (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  chat_room_id uuid references chat_rooms not null,
  sender_id uuid references auth.users not null,
  content text not null
);

alter table chat_messages enable row level security;

create policy "Users can view messages in their chat rooms."
  on chat_messages for select
  using (
    exists (
      select 1 from chat_rooms
      where id = chat_messages.chat_room_id
      and (participant1_id = auth.uid() or participant2_id = auth.uid())
    )
  );

create policy "Users can insert messages in their chat rooms."
  on chat_messages for insert
  with check (
    exists (
      select 1 from chat_rooms
      where id = chat_messages.chat_room_id
      and (participant1_id = auth.uid() or participant2_id = auth.uid())
    )
    and auth.uid() = sender_id
  );

-- Create saved_searches table
create table saved_searches (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references auth.users not null,
  query text not null,
  filters jsonb
);

alter table saved_searches enable row level security;

create policy "Users can view their own saved searches."
  on saved_searches for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own saved searches."
  on saved_searches for insert
  with check ( auth.uid() = user_id );

create policy "Users can delete their own saved searches."
  on saved_searches for delete
  using ( auth.uid() = user_id );
