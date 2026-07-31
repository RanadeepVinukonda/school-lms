-- Fix notifications schema: add missing columns and enable realtime.
-- The live table (from 051) had unquoted camelCase identifiers folded to
-- lowercase by Postgres, so the app's camelCase queries (userId/createdAt/readAt)
-- failed. This migration adds the missing data/link columns and enables
-- realtime publication so notification invalidation works.

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link TEXT;

ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- users.notification_preferences JSONB column read/written by
-- notification.service.ts and push.service.ts (preferences stored per user).
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preferences JSONB;

-- Drop redundant folded camelCase columns from migration 051. The table was
-- created with unquoted camelCase identifiers (userId/readAt/createdAt) which
-- Postgres folded to lowercase (userid/readat/createdat). Code now uses the
-- snake_case columns (user_id/read_at/created_at), and the leftover `userid`
-- NOT NULL column blocked inserts.
ALTER TABLE notifications DROP COLUMN IF EXISTS userid;
ALTER TABLE notifications DROP COLUMN IF EXISTS readat;
ALTER TABLE notifications DROP COLUMN IF EXISTS createdat;
