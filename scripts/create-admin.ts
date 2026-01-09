// Script para criar usuário admin no Supabase
// Execute com: npx tsx scripts/create-admin.ts
//
// CONFIGURAÇÃO:
// 1. Copie .env.example para .env
// 2. Preencha ADMIN_EMAIL, ADMIN_PASSWORD e SUPABASE_SERVICE_KEY
// 3. Execute: npx tsx scripts/create-admin.ts

import { createClient } from '@supabase/supabase-js';

// Carregar variáveis de ambiente
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://bciikaayphdkikfqnqhp.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Credenciais do admin (use variáveis de ambiente em produção!)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@hospital.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123';

if (!supabaseServiceKey) {
    console.log('\n⚠️  SUPABASE_SERVICE_KEY não encontrada.\n');
    console.log('Para criar um usuário admin, siga estes passos no Supabase Dashboard:\n');
    console.log('1. Acesse: https://supabase.com/dashboard');
    console.log('2. Vá em Authentication > Users');
    console.log('3. Clique em "Add user" > "Create new user"');
    console.log('4. Preencha com suas credenciais');
    console.log('5. Após criar, vá em Table Editor > profiles');
    console.log('6. Encontre o usuário e altere "role" para "ADMIN"');
    console.log('\nOu execute o SQL abaixo no SQL Editor:\n');
    console.log(`
-- Atualizar usuário existente para ADMIN
UPDATE profiles 
SET role = 'ADMIN', full_name = 'Administrador'
WHERE id = (SELECT id FROM profiles LIMIT 1);

-- Ou criar um novo perfil admin (se o usuário já existe no auth)
-- INSERT INTO profiles (id, full_name, role) 
-- VALUES ('user-uuid-here', 'Administrador', 'ADMIN');
  `);
    process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function createAdminUser() {
    console.log('🔐 Criando usuário admin...\n');

    // Criar usuário no Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: {
            full_name: 'Administrador',
            role: 'ADMIN'
        }
    });

    if (authError) {
        if (authError.message.includes('already been registered')) {
            console.log('ℹ️  Usuário já existe. Atualizando para ADMIN...');

            // Buscar o usuário existente
            const { data: userData } = await supabase.auth.admin.listUsers();
            const existingUser = (userData?.users as any[])?.find(u => u.email === ADMIN_EMAIL);

            if (existingUser) {
                await supabase
                    .from('profiles')
                    .update({ role: 'ADMIN', full_name: 'Administrador' })
                    .eq('id', existingUser.id);

                console.log('✅ Usuário promovido a ADMIN!\n');
                console.log(`📧 Email: ${ADMIN_EMAIL}`);
                console.log('🔑 Senha: (configurada via variável de ambiente)');
            }
        } else {
            console.error('❌ Erro ao criar usuário:', authError.message);
        }
        return;
    }

    if (authData.user) {
        // Atualizar o perfil para ADMIN
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: authData.user.id,
                full_name: 'Administrador',
                role: 'ADMIN'
            });

        if (profileError) {
            console.error('⚠️  Usuário criado mas erro ao configurar perfil:', profileError.message);
        } else {
            console.log('✅ Usuário ADMIN criado com sucesso!\n');
            console.log(`📧 Email: ${ADMIN_EMAIL}`);
            console.log('🔑 Senha: (configurada via variável de ambiente)');
            console.log('👤 Role: ADMIN');
        }
    }
}

createAdminUser();
