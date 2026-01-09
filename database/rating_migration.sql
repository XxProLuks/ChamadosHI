-- ============================================
-- EXECUTAR NO SUPABASE SQL EDITOR
-- ============================================

-- Adicionar colunas de avaliação na tabela de tickets
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating >= 1 AND rating <= 5),
ADD COLUMN IF NOT EXISTS rating_comment TEXT;

-- Adicionar coluna de fecho automático (opcional, mas bom para histórico)
-- ALTER TABLE tickets ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

-- Atualizar histórico quando houver avaliação
CREATE OR REPLACE FUNCTION public.log_ticket_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF OLD.rating IS NULL AND NEW.rating IS NOT NULL THEN
        INSERT INTO ticket_history (ticket_id, user_id, action, old_value, new_value)
        VALUES (NEW.id, auth.uid(), 'RATING_GIVEN', NULL, NEW.rating::text);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_ticket_rating ON tickets;
CREATE TRIGGER on_ticket_rating
    AFTER UPDATE ON tickets
    FOR EACH ROW 
    WHEN (OLD.rating IS DISTINCT FROM NEW.rating)
    EXECUTE FUNCTION log_ticket_rating();
