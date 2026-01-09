-- ============================================
-- EXECUTAR NO SUPABASE SQL EDITOR
-- ============================================

-- 1. Adicionar coluna de imagem nas mensagens
ALTER TABLE ticket_messages 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. Criar tabela de histórico de alterações
CREATE TABLE IF NOT EXISTS ticket_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Índice para histórico
CREATE INDEX IF NOT EXISTS idx_ticket_history_ticket ON ticket_history(ticket_id);

-- 4. RLS para histórico
ALTER TABLE ticket_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view ticket history" ON ticket_history;
CREATE POLICY "Anyone can view ticket history" ON ticket_history
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert history" ON ticket_history;
CREATE POLICY "Users can insert history" ON ticket_history
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 5. Trigger para registrar mudanças de status
CREATE OR REPLACE FUNCTION public.log_ticket_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO ticket_history (ticket_id, user_id, action, old_value, new_value)
        VALUES (NEW.id, auth.uid(), 'STATUS_CHANGE', OLD.status, NEW.status);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_ticket_update ON tickets;
CREATE TRIGGER on_ticket_update
    AFTER UPDATE ON tickets
    FOR EACH ROW EXECUTE FUNCTION log_ticket_changes();
