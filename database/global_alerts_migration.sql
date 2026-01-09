-- =========================================================================
-- SISTEMA DE ALERTAS GLOBAIS (Broadcasting)
-- EXECUTAR NO SQL EDITOR DO SUPABASE
-- =========================================================================

-- Criar tabela se não existir
CREATE TABLE IF NOT EXISTS global_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message TEXT NOT NULL,
    type TEXT CHECK (type IN ('INFO', 'WARNING', 'CRITICAL')) DEFAULT 'INFO',
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '24 hours'),
    created_by UUID REFERENCES profiles(id) ON DELETE CASCADE
);

-- Adicionar coluna expires_at se a tabela já existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'global_alerts' AND column_name = 'expires_at') THEN
        ALTER TABLE global_alerts ADD COLUMN expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '24 hours');
    END IF;
END $$;

-- 1. Habilitar RLS
ALTER TABLE global_alerts ENABLE ROW LEVEL SECURITY;

-- 2. Remover políticas antigas (evita conflitos)
DROP POLICY IF EXISTS "Public can view active alerts" ON global_alerts;
DROP POLICY IF EXISTS "Admins/Techs can manage alerts" ON global_alerts;
DROP POLICY IF EXISTS "Admins/Techs can insert alerts" ON global_alerts;
DROP POLICY IF EXISTS "Admins/Techs can delete alerts" ON global_alerts;
DROP POLICY IF EXISTS "Anyone can view alerts" ON global_alerts;

-- 3. Política de LEITURA: Todos autenticados podem ver alertas
CREATE POLICY "Anyone can view alerts" ON global_alerts
    FOR SELECT
    TO authenticated
    USING (true);

-- 4. Política de INSERÇÃO: Admins e Técnicos podem criar
CREATE POLICY "Admins/Techs can insert alerts" ON global_alerts
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('ADMIN', 'TECNICO')
        )
    );

-- 5. Política de DELEÇÃO: Admins e Técnicos podem remover
CREATE POLICY "Admins/Techs can delete alerts" ON global_alerts
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('ADMIN', 'TECNICO')
        )
    );

-- 6. Habilitar Realtime
-- Se falhar, habilite manualmente em: Database -> Replication -> Tables
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE global_alerts;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;
