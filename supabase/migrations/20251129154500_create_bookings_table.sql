create table bookings (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  service_id uuid references services(id) not null,
  user_id uuid references auth.users(id) not null,
  date timestamp with time zone not null,
  status text default 'pending' check (status in ('pending', 'confirmed', 'cancelled'))
);

-- Enable RLS
alter table bookings enable row level security;

-- Policies
create policy "Users can view their own bookings"
  on bookings for select
  using (auth.uid() = user_id);

create policy "Users can create bookings"
  on bookings for insert
  with check (auth.uid() = user_id);
