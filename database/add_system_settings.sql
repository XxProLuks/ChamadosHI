-- Migration: Add system settings for theme customization
-- Description: Allows admin to customize system appearance (colors, logo, name)

-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES profiles(id)
);

-- Insert default theme settings
INSERT INTO system_settings (key, value) VALUES
('theme', '{
    "primaryColor": "#3b82f6",
    "secondaryColor": "#1e293b",
    "accentColor": "#f59e0b",
    "systemName": "Sistema de Chamados",
    "logoUrl": null,
    "darkMode": false
}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Insert default branding settings
INSERT INTO system_settings (key, value) VALUES
('branding', '{
    "hospitalName": "Hospital de Ilhéus",
    "supportEmail": "suporte@hospital.com",
    "footerText": "© 2025 Hospital de Ilhéus - Todos os direitos reservados"
}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies - everyone can read, only admins can update
CREATE POLICY "Anyone can read system settings" ON system_settings
    FOR SELECT
    USING (true);

CREATE POLICY "Only admins can update system settings" ON system_settings
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'ADMIN'
        )
    );

CREATE POLICY "Only admins can insert system settings" ON system_settings
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'ADMIN'
        )
    );

-- Create index
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);
