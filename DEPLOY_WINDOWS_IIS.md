# 🏥 Deploy Windows Server - IIS + PostgreSQL

Guia completo para implantar o Sistema de Chamados em Windows Server **sem Docker**.

---

## 📐 Arquitetura

```
Usuário (PC da rede)
    ↓
https://chamados.hospital.local
    ↓
IIS (porta 443/80)
    ↓
Arquivos Estáticos (React)
    ↓
Supabase Cloud ou PostgreSQL Local
```

> [!NOTE]
> Como o sistema é uma **SPA React**, após o build ele gera arquivos estáticos (HTML/JS/CSS).
> O IIS serve esses arquivos diretamente - **não precisa de Node.js rodando como serviço**.

---

## ✅ Pré-requisitos

### Hardware Mínimo

| Item   | Mínimo   | Recomendado |
|--------|----------|-------------|
| CPU    | 2 cores  | 4 cores     |
| RAM    | 4 GB     | 8 GB        |
| Disco  | 20 GB    | 50 GB SSD   |

### Software

- Windows Server 2016+ ou Windows 10/11 Pro
- Node.js 18+ (apenas para build)
- PostgreSQL 15+ (se não usar Supabase cloud)

---

## 🔧 Passo a Passo

### 1️⃣ Instalar o IIS

1. Abra **Server Manager** → **Manage** → **Add Roles and Features**
2. Selecione **Web Server (IIS)**
3. Em **Role Services**, marque:
   - ✅ Static Content
   - ✅ Default Document
   - ✅ HTTP Errors
   - ✅ HTTP Redirect (opcional, para HTTPS)

```powershell
# Ou via PowerShell (como Admin):
Install-WindowsFeature -Name Web-Server -IncludeManagementTools
```

---

### 2️⃣ Instalar Node.js (para build)

1. Baixe Node.js LTS: https://nodejs.org/
2. Instale com opções padrão
3. Verifique:

```powershell
node --version   # v18.x ou superior
npm --version
```

---

### 3️⃣ Build do Projeto

```powershell
# Clone ou copie o projeto para o servidor
cd C:\Sist.Chamado

# Instale dependências
npm install

# Crie o arquivo .env com suas configurações
Copy-Item .env.example .env
notepad .env  # Edite com suas chaves Supabase

# Build para produção
npm run build
```

O build gera a pasta `dist/` com os arquivos estáticos.

---

### 4️⃣ Configurar Variáveis de Ambiente (.env)

Antes do build, configure o `.env`:

```env
# Supabase (obrigatório)
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_aqui

# Se usar PostgreSQL local ao invés de Supabase cloud:
# VITE_SUPABASE_URL=http://localhost:8000
# VITE_SUPABASE_ANON_KEY=sua_chave_local

# Gemini AI (opcional)
GEMINI_API_KEY=sua_chave_gemini
```

> [!IMPORTANT]
> As variáveis são incorporadas durante o **build**. 
> Se mudar o `.env`, precisa rodar `npm run build` novamente.

---

### 5️⃣ Configurar Site no IIS

#### Via IIS Manager (GUI)

1. Abra **IIS Manager** (`inetmgr`)
2. Clique direito em **Sites** → **Add Website**
3. Configure:
   - **Site name**: `Chamados`
   - **Physical path**: `C:\Sist.Chamado\dist`
   - **Binding**: 
     - Type: `http` (ou `https`)
     - Port: `80` (ou `443`)
     - Host name: `chamados.hospital.local`

4. Clique **OK**

#### Via PowerShell

```powershell
# Criar o site
New-IISSite -Name 'Chamados' -BindingInformation '*:80:chamados.hospital.local' -PhysicalPath 'C:\Sist.Chamado\dist'

# Para HTTPS (após ter certificado instalado):
# New-IISSite -Name 'Chamados' -BindingInformation '*:443:chamados.hospital.local' -PhysicalPath 'C:\Sist.Chamado\dist' -Protocol https
```

---

### 6️⃣ Configurar URL Rewrite (SPA Routing)

Para que as rotas do React funcionem (ex: `/admin`, `/tecnico`), crie um `web.config`:

```powershell
# Criar web.config na pasta dist
```

Crie o arquivo `C:\Sist.Chamado\dist\web.config`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="React Routes" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/" />
        </rule>
      </rules>
    </rewrite>
    <staticContent>
      <mimeMap fileExtension=".json" mimeType="application/json" />
      <mimeMap fileExtension=".woff" mimeType="font/woff" />
      <mimeMap fileExtension=".woff2" mimeType="font/woff2" />
    </staticContent>
  </system.webServer>
</configuration>
```

> [!WARNING]
> Precisa instalar o **URL Rewrite Module** para o IIS:
> https://www.iis.net/downloads/microsoft/url-rewrite

---

### 7️⃣ Configurar HTTPS (Recomendado)

#### Opção A: Certificado Interno (Self-Signed ou CA Interna)

```powershell
# Gerar certificado auto-assinado (para testes)
New-SelfSignedCertificate -DnsName "chamados.hospital.local" -CertStoreLocation "cert:\LocalMachine\My"

# Para produção, use certificado da sua CA interna
```

1. No IIS Manager, selecione o site **Chamados**
2. Clique em **Bindings** → **Add**
3. Type: `https`, Port: `443`
4. Selecione o certificado SSL
5. OK

#### Opção B: Redirecionar HTTP para HTTPS

Adicione ao `web.config`:

```xml
<rule name="HTTP to HTTPS" stopProcessing="true">
  <match url="(.*)" />
  <conditions>
    <add input="{HTTPS}" pattern="off" ignoreCase="true" />
  </conditions>
  <action type="Redirect" url="https://{HTTP_HOST}/{R:1}" redirectType="Permanent" />
</rule>
```

---

### 8️⃣ Configurar DNS Interno

No servidor DNS do hospital, adicione:

| Tipo | Nome | Valor |
|------|------|-------|
| A | chamados.hospital.local | IP do servidor (ex: 192.168.1.100) |

Ou adicione no arquivo `hosts` dos PCs para teste:

```
192.168.1.100  chamados.hospital.local
```

---

## 🗄️ PostgreSQL Local (Opcional)

Se preferir **não usar** Supabase cloud, instale PostgreSQL local:

### Instalar PostgreSQL

1. Baixe: https://www.postgresql.org/download/windows/
2. Instale com senha do usuário `postgres`
3. Porta padrão: `5432`

### Criar Banco de Dados

```powershell
# Via psql
psql -U postgres
```

```sql
CREATE DATABASE chamados;
\c chamados
\i C:/Sist.Chamado/database/schema.sql
```

### Configurar Supabase Local (Self-Hosted)

Para ter a API REST do Supabase localmente, você precisa do **Supabase Self-Hosted**.
Consulte: https://supabase.com/docs/guides/self-hosting

> [!NOTE]
> Se usar apenas PostgreSQL (sem Supabase), será necessário criar uma API backend
> (Flask, Node.js Express, etc.) para expor os endpoints.

---

## 🔐 Segurança (Obrigatório)

### Checklist de Segurança

- [ ] ❌ Nunca usar modo debug em produção
- [ ] ✅ HTTPS ativado com certificado válido
- [ ] ✅ Firewall: bloquear acesso direto ao PostgreSQL (porta 5432) de fora
- [ ] ✅ Chaves do Supabase são apenas anon key (sem service key no frontend)
- [ ] ✅ Row Level Security (RLS) ativado no Supabase
- [ ] ✅ Backup automático do banco

### Firewall do Windows

```powershell
# Bloquear PostgreSQL de acesso externo (permitir apenas localhost)
New-NetFirewallRule -DisplayName "Block PostgreSQL External" -Direction Inbound -LocalPort 5432 -Protocol TCP -Action Block

# Permitir HTTP/HTTPS para o IIS
New-NetFirewallRule -DisplayName "Allow HTTP" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Allow HTTPS" -Direction Inbound -LocalPort 443 -Protocol TCP -Action Allow
```

---

## 📦 Backup Automático

### Script de Backup (PostgreSQL)

Crie `C:\Scripts\backup-chamados.ps1`:

```powershell
$date = Get-Date -Format "yyyy-MM-dd_HHmm"
$backupDir = "C:\Backups\Chamados"
$backupFile = "$backupDir\chamados_$date.sql"

# Criar pasta se não existir
New-Item -ItemType Directory -Force -Path $backupDir

# Backup do banco
& "C:\Program Files\PostgreSQL\15\bin\pg_dump.exe" -U postgres -d chamados -f $backupFile

# Manter apenas últimos 30 backups
Get-ChildItem $backupDir -Filter "*.sql" | Sort-Object LastWriteTime -Descending | Select-Object -Skip 30 | Remove-Item

Write-Host "Backup criado: $backupFile"
```

### Agendar no Task Scheduler

```powershell
# Criar tarefa agendada (diário às 2h)
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-File C:\Scripts\backup-chamados.ps1"
$trigger = New-ScheduledTaskTrigger -Daily -At 2am
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount
Register-ScheduledTask -TaskName "Backup Chamados DB" -Action $action -Trigger $trigger -Principal $principal
```

---

## 🔄 Atualização do Sistema

Quando precisar atualizar:

```powershell
cd C:\Sist.Chamado

# Baixar atualizações
git pull

# Instalar novas dependências (se houver)
npm install

# Rebuild
npm run build

# Copiar web.config para dist (se não estiver no git)
Copy-Item .\web.config .\dist\web.config

# Reiniciar site no IIS (opcional, geralmente não precisa)
# Restart-WebItem -PSPath "IIS:\Sites\Chamados"
```

---

## 🆘 Troubleshooting

### Problema: Página em branco ou 404 nas rotas

**Causa**: URL Rewrite não configurado

**Solução**: 
1. Instale o URL Rewrite Module
2. Verifique se o `web.config` está na pasta `dist`

### Problema: "Cannot connect to Supabase"

**Causa**: Variáveis de ambiente incorretas ou build antigo

**Solução**:
1. Verifique o `.env`
2. Rode `npm run build` novamente
3. Limpe cache do navegador

### Problema: Certificado não confiável

**Causa**: Certificado auto-assinado

**Solução**: 
1. Distribua o certificado para os PCs via GPO
2. Ou use certificado da CA interna do hospital

### Ver logs do IIS

```powershell
# Logs em:
C:\inetpub\logs\LogFiles\W3SVC1\
```

---

## 📊 Resumo Final

| ✅ Item | Status |
|---------|--------|
| Windows Server | ✅ |
| Sem Docker | ✅ |
| IIS como servidor web | ✅ |
| HTTPS | ✅ |
| Fácil manutenção | ✅ |
| Padrão de TI hospitalar | ✅ |
| Escala para muitos usuários | ✅ |

---

© 2026 Hospital de Ilhéus - Sistema de Chamados
