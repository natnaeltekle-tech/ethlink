create table if not exists services (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  title text not null,
  category text not null,
  description text,
  price numeric,
  location text,
  image_url text,
  user_id uuid references auth.users not null
);

alter table services enable row level security;

drop policy if exists "Services are viewable by everyone." on services;
create policy "Services are viewable by everyone."
  on services for select
  using ( true );

drop policy if exists "Users can insert their own services." on services;
create policy "Users can insert their own services."
  on services for insert
  with check ( auth.uid() = user_id );

drop policy if exists "Users can update their own services." on services;
create policy "Users can update their own services."
  on services for update
  using ( auth.uid() = user_id );

drop policy if exists "Users can delete their own services." on services;
create policy "Users can delete their own services."
  on services for delete
  using ( auth.uid() = user_id );
