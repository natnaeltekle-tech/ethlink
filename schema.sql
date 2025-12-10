-- Add service_id to messages if it doesn't exist
alter table messages add column if not exists service_id uuid references services(id) on delete cascade;

-- Add service_id to reviews if it doesn't exist
alter table reviews add column if not exists service_id uuid references services(id) on delete cascade;

-- Create reviews table if it doesn't exist (with all columns)
create table if not exists reviews (
  id uuid default gen_random_uuid() primary key,
  service_id uuid references services(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  rating integer check (rating >= 1 and rating <= 5) not null,
  comment text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create messages table if it doesn't exist (with all columns)
create table if not exists messages (
  id uuid default gen_random_uuid() primary key,
  service_id uuid references services(id) on delete cascade not null,
  sender_id uuid references auth.users(id) on delete cascade not null,
  receiver_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table reviews enable row level security;
alter table messages enable row level security;

-- Policies for reviews (drop first to avoid errors if they exist)
drop policy if exists "Public reviews are viewable by everyone." on reviews;
create policy "Public reviews are viewable by everyone."
  on reviews for select
  using ( true );

drop policy if exists "Users can insert their own reviews." on reviews;
create policy "Users can insert their own reviews."
  on reviews for insert
  with check ( auth.uid() = user_id );

-- Policies for messages
drop policy if exists "Users can view their own messages." on messages;
create policy "Users can view their own messages."
  on messages for select
  using ( auth.uid() = sender_id or auth.uid() = receiver_id );

drop policy if exists "Users can insert their own messages." on messages;
create policy "Users can insert their own messages."
  on messages for insert
  with check ( auth.uid() = sender_id );

-- Add location and images to services if they don't exist
alter table services add column if not exists location text;
alter table services add column if not exists images text[];

-- Add guests column to bookings if it doesn't exist
alter table bookings add column if not exists guests integer default 1;

-- Add is_active column to services if it doesn't exist
alter table services add column if not exists is_active boolean default true;

-- Create favorites table
create table if not exists favorites (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  service_id uuid references services(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, service_id)
);

-- Enable RLS for favorites
alter table favorites enable row level security;

-- Policies for favorites
drop policy if exists "Users can view their own favorites." on favorites;
create policy "Users can view their own favorites."
  on favorites for select
  using ( auth.uid() = user_id );

drop policy if exists "Users can insert their own favorites." on favorites;
create policy "Users can insert their own favorites."
  on favorites for insert
  with check ( auth.uid() = user_id );

drop policy if exists "Users can delete their own favorites." on favorites;
create policy "Users can delete their own favorites."
  on favorites for delete
  using ( auth.uid() = user_id );
