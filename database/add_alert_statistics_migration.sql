-- Migration: Add dismiss tracking and statistics to global_alerts table
-- Run this in your Supabase SQL Editor

-- Add new columns for dismiss tracking and statistics
ALTER TABLE global_alerts 
ADD COLUMN IF NOT EXISTS dismissed_by JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS dismiss_count INTEGER DEFAULT 0;

-- Update existing rows to have default values
UPDATE global_alerts 
SET 
  dismissed_by = '[]'::jsonb,
  view_count = 0,
  dismiss_count = 0
WHERE dismissed_by IS NULL 
  OR view_count IS NULL 
  OR dismiss_count IS NULL;

-- Comment for documentation
COMMENT ON COLUMN global_alerts.dismissed_by IS 'Array of user IDs who have dismissed this alert';
COMMENT ON COLUMN global_alerts.view_count IS 'Number of times this alert was viewed';
COMMENT ON COLUMN global_alerts.dismiss_count IS 'Number of times this alert was dismissed';
