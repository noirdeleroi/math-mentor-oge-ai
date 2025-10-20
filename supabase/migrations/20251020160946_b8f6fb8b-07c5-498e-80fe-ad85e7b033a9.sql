-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Initialize all existing users' weekly_goal_set_at to Oct 19th 2025 23:00 CET
UPDATE user_statistics
SET weekly_goal_set_at = '2025-10-19 21:00:00+00'::timestamptz -- 23:00 CET = 21:00 UTC
WHERE weekly_goal_set_at IS NULL OR weekly_goal_set_at != '2025-10-19 21:00:00+00'::timestamptz;

-- Create a cron job that runs every Sunday at 22:00 UTC (23:00 CET in winter) and 21:00 UTC (23:00 CEST in summer)
-- We'll run it at both times to handle DST transitions, the function will handle deduplication
SELECT cron.schedule(
  'weekly-energy-points-reset-cet',
  '0 21,22 * * 0',
  $$
  SELECT
    net.http_post(
        url:='https://kbaazksvkvnafrwtmkcw.supabase.co/functions/v1/weekly-energy-points-reset',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiYWF6a3N2a3ZuYWZyd3Rta2N3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY3NTg2NTAsImV4cCI6MjA2MjMzNDY1MH0.aSyfch6PX1fr9wyWSGpUPNzT6jjIdfu9eA3E3J4uqzs"}'::jsonb,
        body:=concat('{"scheduled_time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);