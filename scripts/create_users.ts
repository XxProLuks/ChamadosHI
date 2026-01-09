/**
 * Script para criar usuários em massa a partir de CSV
 * 
 * Uso: npx ts-node scripts/create_users.ts usuarios.csv
 * 
 * Formato do CSV:
 * email,full_name,role,sector
 * joao@hospital.local,João da Silva,SOLICITANTE,Administração
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Configuração - ajuste conforme necessário
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const DEFAULT_PASSWORD = 'Hospital@2026'; // Senha padrão - usuários devem trocar no primeiro login

interface UserData {
    email: string;
    full_name: string;
    role: 'SOLICITANTE' | 'TECNICO' | 'ADMIN';
    sector?: string;
}

interface CreateResult {
    success: boolean;
    email: string;
    error?: string;
}

async function createUser(supabase: SupabaseClient, user: UserData): Promise<CreateResult> {
    try {
        // Criar usuário no Auth
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: user.email,
            password: DEFAULT_PASSWORD,
            email_confirm: true, // Confirma email automaticamente
            user_metadata: {
                full_name: user.full_name,
                role: user.role
            }
        });

        if (authError) {
            return { success: false, email: user.email, error: authError.message };
        }

        // Atualizar perfil com setor (se fornecido)
        if (authData.user && user.sector) {
            await supabase
                .from('profiles')
                .update({ sector: user.sector })
                .eq('id', authData.user.id);
        }

        return { success: true, email: user.email };
    } catch (error) {
        return {
            success: false,
            email: user.email,
            error: error instanceof Error ? error.message : 'Erro desconhecido'
        };
    }
}

function parseCSV(filePath: string): UserData[] {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n');

    if (lines.length < 2) {
        throw new Error('CSV deve ter pelo menos cabeçalho e uma linha de dados');
    }

    const headerLine = lines[0];
    if (!headerLine) {
        throw new Error('CSV não possui cabeçalho');
    }

    const headers = headerLine.split(',').map(h => h.trim().toLowerCase());

    const users: UserData[] = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line || line.trim() === '' || line.startsWith('#')) continue;

        const values = line.split(',').map(v => v.trim());
        const user: Record<string, string> = {};

        headers.forEach((header, index) => {
            user[header] = values[index] || '';
        });

        // Validar campos obrigatórios
        if (!user['email'] || !user['full_name']) continue;

        // Validar role
        const role = user['role'];
        if (!role || !['SOLICITANTE', 'TECNICO', 'ADMIN'].includes(role)) {
            user['role'] = 'SOLICITANTE';
        }

        users.push(user as unknown as UserData);
    }

    return users;
}


async function main() {
    // Verificar argumentos
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.log(`
╔══════════════════════════════════════════════════════════════╗
║           Script de Cadastro em Massa de Usuários            ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Uso: npx ts-node scripts/create_users.ts <arquivo.csv>      ║
║                                                              ║
║  Formato do CSV:                                             ║
║  email,full_name,role,sector                                 ║
║  joao@hospital.local,João da Silva,SOLICITANTE,Administração ║
║                                                              ║
║  Roles disponíveis: SOLICITANTE, TECNICO, ADMIN              ║
║                                                              ║
║  Variáveis de ambiente necessárias:                          ║
║  - VITE_SUPABASE_URL                                         ║
║  - SUPABASE_SERVICE_KEY                                      ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
        `);
        process.exit(1);
    }

    const csvFile = args[0];
    if (!csvFile) {
        console.error('❌ Caminho do arquivo CSV não fornecido');
        process.exit(1);
    }

    const csvPath = path.resolve(csvFile);

    if (!fs.existsSync(csvPath)) {
        console.error(`❌ Arquivo não encontrado: ${csvPath}`);
        process.exit(1);
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        console.error('❌ Variáveis VITE_SUPABASE_URL e SUPABASE_SERVICE_KEY são obrigatórias');
        process.exit(1);
    }

    // Criar cliente Supabase com service key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    console.log('\n🏥 Sistema de Chamados - Cadastro de Usuários\n');
    console.log(`📄 Lendo arquivo: ${csvPath}`);

    const users = parseCSV(csvPath);
    console.log(`👥 ${users.length} usuários encontrados\n`);

    const results: CreateResult[] = [];
    let successCount = 0;
    let errorCount = 0;

    for (const user of users) {
        process.stdout.write(`  Criando ${user.email}... `);
        const result = await createUser(supabase, user);
        results.push(result);

        if (result.success) {
            console.log('✅');
            successCount++;
        } else {
            console.log(`❌ ${result.error}`);
            errorCount++;
        }
    }

    console.log('\n═══════════════════════════════════════════');
    console.log(`✅ Sucesso: ${successCount}`);
    console.log(`❌ Erros: ${errorCount}`);
    console.log('═══════════════════════════════════════════\n');

    if (successCount > 0) {
        console.log(`📧 Senha padrão para todos os usuários: ${DEFAULT_PASSWORD}`);
        console.log('⚠️  Instrua os usuários a alterarem a senha no primeiro acesso!\n');
    }
}

main().catch(console.error);
