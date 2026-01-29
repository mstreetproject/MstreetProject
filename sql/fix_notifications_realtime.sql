-- Enable Realtime for the notifications table
-- This allows the frontend to receive instant updates when a notification is created
BEGIN;

-- Check if the publication 'supabase_realtime' exists (it should in Supabase)
-- and add the table if it's not already there.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END $$;

COMMIT;
