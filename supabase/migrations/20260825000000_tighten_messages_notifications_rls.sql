-- ─── Group 4: Tighten messages INSERT + notifications INSERT RLS ────────────

-- Messages: a user may only send a message about a service if:
--   * they really are the sender (auth.uid() = sender_id), AND
--   * the message belongs to a service chat (service_id is set), AND
--   * they are either the provider of that service (replying in their own
--     service's chat) or a customer writing to that service's provider.
DROP POLICY IF EXISTS "Users can insert messages" ON messages;
CREATE POLICY "Users can insert messages"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND service_id IS NOT NULL
    AND (
      -- Provider sending within their own service chat
      EXISTS (
        SELECT 1 FROM services s
        WHERE s.id = service_id AND s.user_id = auth.uid()
      )
      OR
      -- Customer messaging the provider of the service (receiver must be the provider)
      (
        receiver_id <> auth.uid()
        AND EXISTS (
          SELECT 1 FROM services s
          WHERE s.id = service_id AND s.user_id = receiver_id
        )
      )
    )
  );

-- Notifications: normal users must not be able to insert notifications for
-- arbitrary users. All app inserts go through server code using the admin
-- (service_role) client, which bypasses RLS. With RLS enabled and no INSERT
-- policy, direct inserts by authenticated users are denied by default.
DROP POLICY IF EXISTS "Authenticated users can insert notifications." ON notifications;
