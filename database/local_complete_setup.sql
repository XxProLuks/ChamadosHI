-- =========================================================================
-- SISTEMA DE CHAMADOS - CONFIGURAÇÃO COMPLETA DO BANCO DE DADOS
-- Este arquivo consolida o schema principal e todas as migrações.
-- Compatível com Supabase e ambientes PostgreSQL com esquema 'auth'.
-- =========================================================================

-- 1. ESQUEMAS NECESSÁRIOS (Se não for Supabase real)
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS storage;

-- 2. TABELA DE PERFIS (PROFILES)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY, -- No Supabase real: REFERENCES auth.users(id)
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'SOLICITANTE' CHECK (role IN ('SOLICITANTE', 'TECNICO', 'ADMIN')),
    avatar_url TEXT,
    sector TEXT,
    erp_id TEXT,
    erp_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. TABELA DE SETORES (SECTORS)
CREATE TABLE IF NOT EXISTS sectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    icon TEXT NOT NULL DEFAULT 'Building',
    "colorClass" TEXT NOT NULL DEFAULT 'bg-slate-100 text-slate-600',
    erp_id TEXT,
    erp_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sectors ENABLE ROW LEVEL SECURITY;

-- 4. TABELA DE CHAMADOS (TICKETS)
CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    location TEXT NOT NULL,
    sector_id UUID REFERENCES sectors(id) ON DELETE SET NULL,
    category TEXT NOT NULL DEFAULT 'CHAMADO' CHECK (category IN ('CHAMADO', 'CRITICAL', 'MAINTENANCE', 'CLIMATIZACAO', 'TI')),
    status TEXT NOT NULL DEFAULT 'TODO' CHECK (status IN ('TODO', 'IN_PROGRESS', 'DONE')),
    priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    requester_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    technician_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    image_url TEXT,
    image_urls TEXT[] DEFAULT '{}',
    is_critical BOOLEAN DEFAULT FALSE,
    is_pinned BOOLEAN DEFAULT FALSE,
    pinned_at TIMESTAMPTZ,
    pinned_by UUID REFERENCES profiles(id),
    erp_exported_at TIMESTAMPTZ,
    erp_reference TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    rating_comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- 5. TABELA DE MENSAGENS (TICKET MESSAGES)
CREATE TABLE IF NOT EXISTS ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    image_url TEXT,
    image_urls TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;

-- 6. TABELA DE ANEXOS (ATTACHMENTS)
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

ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- 7. TABELA DE HISTÓRICO (TICKET HISTORY)
CREATE TABLE IF NOT EXISTS ticket_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ticket_history ENABLE ROW LEVEL SECURITY;

-- 8. TABELA DE ALERTAS GLOBAIS (GLOBAL ALERTS)
CREATE TABLE IF NOT EXISTS global_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message TEXT NOT NULL,
    type TEXT CHECK (type IN ('INFO', 'WARNING', 'CRITICAL')) DEFAULT 'INFO',
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '24 hours'),
    created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
    dismissed_by JSONB DEFAULT '[]',
    view_count INTEGER DEFAULT 0,
    dismiss_count INTEGER DEFAULT 0,
    CONSTRAINT valid_expiration CHECK (expires_at > created_at)
);

ALTER TABLE global_alerts ENABLE ROW LEVEL SECURITY;

-- 9. TABELA DE NOTIFICAÇÕES (NOTIFICATIONS)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 10. TABELA DE CONFIGURAÇÕES DO SISTEMA (SYSTEM SETTINGS)
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES profiles(id)
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- 11. TABELAS DE INTEGRAÇÃO ERP
CREATE TABLE IF NOT EXISTS erp_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_type TEXT NOT NULL,
    direction TEXT NOT NULL DEFAULT 'import',
    status TEXT NOT NULL,
    records_total INTEGER DEFAULT 0,
    records_synced INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_by UUID REFERENCES profiles(id)
);

CREATE TABLE IF NOT EXISTS erp_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    erp_type TEXT NOT NULL,
    api_url TEXT NOT NULL,
    api_token TEXT,
    company_code TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES profiles(id)
);

-- ===========================================
-- DADOS INICIAIS
-- ===========================================

-- Inserir setores padrão
INSERT INTO sectors (name, icon, "colorClass") VALUES
    ('Administração', 'Building', 'bg-slate-100 text-slate-600'),
    ('UTI', 'Activity', 'bg-red-100 text-red-600'),
    ('Farmácia', 'Pill', 'bg-green-100 text-green-600'),
    ('Laboratório', 'FlaskConical', 'bg-purple-100 text-purple-600'),
    ('Emergência', 'Zap', 'bg-orange-100 text-orange-600'),
    ('Recepção', 'Phone', 'bg-blue-100 text-blue-600'),
    ('Enfermaria', 'Bed', 'bg-cyan-100 text-cyan-600'),
    ('TI', 'Cpu', 'bg-indigo-100 text-indigo-600')
ON CONFLICT (name) DO NOTHING;

-- Inserir configurações padrão
INSERT INTO system_settings (key, value) VALUES
('theme', '{
    "primaryColor": "#3b82f6",
    "secondaryColor": "#1e293b",
    "accentColor": "#f59e0b",
    "systemName": "Sistema de Chamados",
    "logoUrl": null,
    "darkMode": false
}'::jsonb),
('branding', '{
    "hospitalName": "Hospital de Ilhéus",
    "supportEmail": "suporte@hospital.com",
    "footerText": "© 2025 Hospital de Ilhéus - Todos os direitos reservados"
}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ===========================================
-- ÍNDICES E PERFORMANCE
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_requester ON tickets(requester_id);
CREATE INDEX IF NOT EXISTS idx_tickets_pinned ON tickets(is_pinned, pinned_at DESC) WHERE is_pinned = TRUE;
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);
