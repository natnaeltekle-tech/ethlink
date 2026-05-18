-- Create listings table
create table if not exists listings (
  id bigint primary key generated always as identity,
  title text not null,
  description text,
  price numeric not null, -- Price in ETB
  category text,
  image_url text,
  user_id uuid references auth.users not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for listings
alter table listings enable row level security;

-- Policies for listings
create policy "Listings are viewable by everyone"
  on listings for select
  using ( true );

create policy "Users can insert their own listings"
  on listings for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own listings"
  on listings for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own listings"
  on listings for delete
  using ( auth.uid() = user_id );

-- Create messages table
create table messages (
  id bigint primary key generated always as identity,
  sender_id uuid references auth.users not null,
  receiver_id uuid references auth.users not null,
  content text not null,
  listing_id bigint references listings,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for messages
alter table messages enable row level security;

-- Policies for messages
create policy "Users can view their own messages"
  on messages for select
  using ( auth.uid() = sender_id or auth.uid() = receiver_id );

create policy "Users can insert messages"
  on messages for insert
  with check ( auth.uid() = sender_id );
