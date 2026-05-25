-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
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
DROP POLICY IF EXISTS "Users can view their own notifications." ON notifications;
create policy "Users can view their own notifications."
  on notifications for select
  using ( auth.uid() = user_id );

DROP POLICY IF EXISTS "Authenticated users can insert notifications." ON notifications;
create policy "Authenticated users can insert notifications."
  on notifications for insert
  with check ( auth.uid() is not null );

DROP POLICY IF EXISTS "Users can update their own notifications." ON notifications;
create policy "Users can update their own notifications."
  on notifications for update
  using ( auth.uid() = user_id );

-- Add to realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr
    JOIN pg_class c ON pr.prrelid = c.oid
    JOIN pg_publication p ON pr.prpubid = p.oid
    WHERE c.relname = 'notifications' AND p.pubname = 'supabase_realtime'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END $$;
