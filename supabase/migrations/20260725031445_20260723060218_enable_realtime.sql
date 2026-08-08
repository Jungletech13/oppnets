/*
# Enable Realtime on Key Tables

## Overview
Enables Supabase Realtime (WAL-based) on messages, notifications, tasks, and activity_log tables so the frontend can subscribe to live changes.

## Changes
1. Adds each table to the `realtime.publication` so changes are broadcast via WebSocket.
2. Tables: messages, notifications, tasks, activity_log, checklist_items

## Security
- Realtime respects RLS policies — clients only receive events for rows they are authorized to read.
- No additional policy changes needed.
*/

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE activity_log;
ALTER PUBLICATION supabase_realtime ADD TABLE checklist_items;
