-- Script para cadastro em massa de usuários
-- Execute este script no Supabase SQL Editor

-- ===========================================
-- TÉCNICOS DE TI (Role: TECNICO)
-- ===========================================

-- Nota: Usuários devem ser criados via Auth primeiro
-- Este script apenas cria/atualiza os perfis

-- Exemplo de inserção de perfis (após criar usuários no Auth):
/*
INSERT INTO profiles (id, full_name, role, sector) 
VALUES 
    ('uuid-do-usuario-1', 'João da Silva', 'TECNICO', 'TI'),
    ('uuid-do-usuario-2', 'Maria Santos', 'TECNICO', 'TI');
*/

-- ===========================================
-- SOLICITANTES (Role: SOLICITANTE)
-- ===========================================

-- Para cadastro em massa, use o script create_users.ts
-- ou importe de uma planilha CSV

-- Exemplo de template para planilha CSV:
-- email,full_name,sector
-- joao@hospital.local,João da Silva,Administração
-- maria@hospital.local,Maria Santos,UTI
-- pedro@hospital.local,Pedro Oliveira,Farmácia

-- ===========================================
-- CRIAR ADMIN (se ainda não existir)
-- ===========================================

-- Primeiro crie o usuário no Supabase Auth Dashboard
-- Depois execute:
/*
UPDATE profiles 
SET role = 'ADMIN' 
WHERE id = 'uuid-do-admin';
*/

-- ===========================================
-- LISTAR TODOS OS USUÁRIOS
-- ===========================================
SELECT 
    p.id,
    p.full_name,
    p.role,
    p.sector,
    u.email,
    p.created_at
FROM profiles p
JOIN auth.users u ON p.id = u.id
ORDER BY p.role, p.full_name;

-- ===========================================
-- ESTATÍSTICAS DE USUÁRIOS
-- ===========================================
SELECT 
    role,
    COUNT(*) as total
FROM profiles
GROUP BY role
ORDER BY role;
