-- Migration: Add attachments feature
-- Description: Allows uploading documents (PDF, DOC, XLS) to tickets and chat

-- Create attachments table
CREATE TABLE IF NOT EXISTS attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    message_id UUID REFERENCES ticket_messages(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    uploaded_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_attachments_ticket ON attachments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_attachments_message ON attachments(message_id);

-- Enable RLS
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view attachments for tickets they can access" ON attachments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM tickets 
            WHERE tickets.id = attachments.ticket_id
            AND (
                tickets.requester_id = auth.uid() 
                OR tickets.technician_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE profiles.id = auth.uid() 
                    AND profiles.role IN ('TECNICO', 'ADMIN')
                )
            )
        )
    );

CREATE POLICY "Authenticated users can upload attachments" ON attachments
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own attachments" ON attachments
    FOR DELETE
    USING (uploaded_by = auth.uid());

-- Create storage bucket for documents (run in Supabase Dashboard > Storage)
-- CREATE BUCKET 'documents' WITH public = false;
