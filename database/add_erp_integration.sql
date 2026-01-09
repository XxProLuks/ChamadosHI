-- Migration: Add ERP integration support
-- Description: Tables for syncing with TOTVS/SAP ERP systems

-- Create ERP sync log table
CREATE TABLE IF NOT EXISTS erp_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_type TEXT NOT NULL, -- 'users', 'departments', 'tickets'
    direction TEXT NOT NULL DEFAULT 'import', -- 'import' or 'export'
    status TEXT NOT NULL, -- 'pending', 'running', 'success', 'error'
    records_total INTEGER DEFAULT 0,
    records_synced INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_by UUID REFERENCES profiles(id)
);

-- Add ERP ID fields to existing tables
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS erp_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS erp_synced_at TIMESTAMPTZ;

ALTER TABLE sectors ADD COLUMN IF NOT EXISTS erp_id TEXT;
ALTER TABLE sectors ADD COLUMN IF NOT EXISTS erp_synced_at TIMESTAMPTZ;

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS erp_exported_at TIMESTAMPTZ;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS erp_reference TEXT;

-- Create ERP configuration table
CREATE TABLE IF NOT EXISTS erp_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    erp_type TEXT NOT NULL, -- 'TOTVS', 'SAP', 'OTHER'
    api_url TEXT NOT NULL,
    api_token TEXT, -- encrypted in production
    company_code TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES profiles(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_erp_sync_log_type ON erp_sync_log(sync_type, status);
CREATE INDEX IF NOT EXISTS idx_profiles_erp_id ON profiles(erp_id) WHERE erp_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sectors_erp_id ON sectors(erp_id) WHERE erp_id IS NOT NULL;

-- Enable RLS
ALTER TABLE erp_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies - only admins can access ERP data
CREATE POLICY "Only admins can view ERP sync logs" ON erp_sync_log
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'ADMIN'
        )
    );

CREATE POLICY "Only admins can manage ERP config" ON erp_config
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'ADMIN'
        )
    );
