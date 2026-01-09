-- ============================================
-- EXECUTAR NO SUPABASE SQL EDITOR
-- ============================================

-- Adicionar suporte para múltiplas imagens na tabela de chamados
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}';

-- Adicionar suporte para múltiplas imagens na tabela de mensagens
ALTER TABLE ticket_messages 
ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}';

-- Migrar dados existentes de image_url para o array image_urls (opcional)
UPDATE tickets 
SET image_urls = ARRAY[image_url] 
WHERE image_url IS NOT NULL AND (image_urls IS NULL OR cardinality(image_urls) = 0);

UPDATE ticket_messages 
SET image_urls = ARRAY[image_url] 
WHERE image_url IS NOT NULL AND (image_urls IS NULL OR cardinality(image_urls) = 0);
