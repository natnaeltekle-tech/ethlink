-- Create notifications table
create table if not exists notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  link text,
  type text not null check (type in ('booking', 'payment', 'message', 'info')),
  is_read boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table notifications enable row level security;

-- Policies
drop policy if exists "Users can view their own notifications." on notifications;
create policy "Users can view their own notifications."
  on notifications for select
  using ( auth.uid() = user_id );

drop policy if exists "Authenticated users can insert notifications." on notifications;
create policy "Authenticated users can insert notifications."
  on notifications for insert
  with check ( auth.uid() is not null );

drop policy if exists "Users can update their own notifications." on notifications;
create policy "Users can update their own notifications."
  on notifications for update
  using ( auth.uid() = user_id );

-- Add to realtime publication
alter publication supabase_realtime add table notifications;