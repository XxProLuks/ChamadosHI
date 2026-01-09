-- Migration: Add pinned tickets feature
-- Description: Allows users to pin important tickets to the top

-- Add pinned columns to tickets table
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS pinned_by UUID REFERENCES profiles(id);

-- Create index for faster pinned ticket queries
CREATE INDEX IF NOT EXISTS idx_tickets_pinned ON tickets(is_pinned, pinned_at DESC) WHERE is_pinned = TRUE;

-- RLS policy for pinning (only technicians and admins can pin)
CREATE POLICY "Technicians and admins can pin tickets" ON tickets
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('TECNICO', 'ADMIN')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('TECNICO', 'ADMIN')
        )
    );
