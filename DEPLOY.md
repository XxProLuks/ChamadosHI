# 🏥 Sistema de Chamados - Guia de Implantação

Guia completo para implantar o Sistema de Chamados no servidor interno do hospital.

---

## 📋 Índice

1. [Requisitos](#requisitos)
2. [Instalação Rápida](#instalação-rápida)
3. [Configuração](#configuração)
4. [Cadastro de Usuários](#cadastro-de-usuários)
5. [Manutenção](#manutenção)

---

## Requisitos

### Hardware Mínimo

| Item | Mínimo | Recomendado |
|------|--------|-------------|
| CPU | 2 cores | 4 cores |
| RAM | 4 GB | 8 GB |
| Disco | 20 GB SSD | 50 GB SSD |

### Software

- Docker 20.10+ e Docker Compose
- Conta Supabase (gratuita) ou PostgreSQL local

---

## Instalação Rápida

### 1. Clonar o projeto

```bash
git clone <url-do-repositorio>
cd Sist.Chamado
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

### 3. Build e deploy

```bash
docker-compose up -d --build
```

### 4. Acessar o sistema

```
http://localhost
ou
http://chamados.hospital.local (se configurou DNS)
```

---

## Configuração

### Supabase (Banco de Dados)

1. Acesse [supabase.com](https://supabase.com) e crie um projeto
2. Copie a URL e a chave anônima para o `.env`:

   ```env
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua_chave_aqui
   ```

3. Execute os scripts SQL em `database/schema.sql` no SQL Editor do Supabase

### Email (Notificações)

Configure o servidor SMTP no `.env`:

```env
VITE_SMTP_HOST=mail.hospital.local
VITE_SMTP_PORT=587
VITE_SMTP_USER=chamados@hospital.local
VITE_SMTP_PASS=sua_senha
VITE_SMTP_FROM=Sistema de Chamados <chamados@hospital.local>
```

---

## Cadastro de Usuários

### Opção 1: Individual (Dashboard Supabase)

1. Acesse Authentication > Users no Supabase
2. Clique em "Add user"
3. Preencha email e senha

### Opção 2: Em Massa (CSV)

1. Crie um arquivo CSV:

   ```csv
   email,full_name,role,sector
   joao@hospital.local,João da Silva,SOLICITANTE,Administração
   maria@hospital.local,Maria Santos,TECNICO,TI
   ```

2. Execute o script:

   ```bash
   npx ts-node scripts/create_users.ts usuarios.csv
   ```

### Tipos de Usuários

| Role | Permissões |
|------|-----------|
| SOLICITANTE | Criar chamados, ver próprios chamados |
| TECNICO | Gerenciar chamados, Kanban, criar alertas |
| ADMIN | Todas + gerenciar usuários e setores |

---

## Manutenção

### Atualizar o sistema

```bash
git pull
docker-compose up -d --build
```

### Ver logs

```bash
docker-compose logs -f app
```

### Backup do banco (se local)

```bash
docker exec chamados-db pg_dump -U postgres chamados > backup.sql
```

### Reiniciar

```bash
docker-compose restart
```

---

## 🆘 Suporte

Em caso de problemas:

1. Verifique os logs: `docker-compose logs`
2. Teste a conexão com o Supabase
3. Verifique as variáveis de ambiente

---

© 2026 Hospital Saint Louis - Sistema de Chamados
