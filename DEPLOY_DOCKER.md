# 🐳 Deploy Docker - Windows Server

Guia completo para implantar o Sistema de Chamados usando Docker no Windows Server.

---

## 📐 Arquitetura

```
Usuário (PC da rede)
    ↓
http://chamados.hospital.local
    ↓
Docker (porta 80)
    ↓
Nginx (Container)
    ↓
React SPA (Arquivos estáticos)
    ↓
Supabase Cloud
```

---

## ✅ Pré-requisitos

### Hardware Mínimo

| Item   | Mínimo   | Recomendado |
|--------|----------|-------------|
| CPU    | 2 cores  | 4 cores     |
| RAM    | 4 GB     | 8 GB        |
| Disco  | 20 GB    | 50 GB SSD   |

### Software

- Windows Server 2019+ ou Windows 10/11 Pro
- Docker Desktop ou Docker Engine

---

## 🔧 Instalação do Docker

### Opção A: Docker Desktop (Recomendado)

1. Baixe: https://www.docker.com/products/docker-desktop/
2. Execute o instalador
3. Reinicie o servidor
4. Abra o Docker Desktop e aguarde inicializar

### Opção B: Docker Engine Nativo (Sem GUI)

Para Windows Server 2019+:

```powershell
# Instalar Docker via PowerShell (como Admin)
Install-Module -Name DockerMsftProvider -Repository PSGallery -Force
Install-Package -Name docker -ProviderName DockerMsftProvider -Force

# Reiniciar
Restart-Computer
```

Após reiniciar:

```powershell
# Iniciar serviço Docker
Start-Service docker

# Testar instalação
docker run hello-world
```

### Verificar Instalação

```powershell
docker --version
docker-compose --version
```

---

## 🚀 Deploy da Aplicação

### 1️⃣ Preparar o Projeto

```powershell
cd C:\Sist.Chamado

# Copiar arquivo de exemplo
Copy-Item .env.example .env

# Editar configurações
notepad .env
```

### 2️⃣ Configurar Variáveis (.env)

```env
# Supabase (obrigatório)
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_aqui

# Gemini AI (opcional)
GEMINI_API_KEY=sua_chave_gemini
```

### 3️⃣ Build e Iniciar

```powershell
# Build da imagem e iniciar containers
docker-compose up -d --build

# Verificar status
docker-compose ps

# Ver logs em tempo real
docker-compose logs -f app
```

### 4️⃣ Testar

Acesse: **http://localhost** ou **http://IP-DO-SERVIDOR**

---

## 🔥 Firewall

```powershell
# Liberar porta 80 (HTTP)
New-NetFirewallRule -DisplayName "Docker HTTP" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow

# Liberar porta 443 (HTTPS) - se configurar SSL
New-NetFirewallRule -DisplayName "Docker HTTPS" -Direction Inbound -LocalPort 443 -Protocol TCP -Action Allow
```

---

## 🔄 Comandos Úteis

| Comando | Descrição |
|---------|-----------|
| `docker-compose up -d` | Iniciar em background |
| `docker-compose down` | Parar containers |
| `docker-compose logs -f` | Ver logs em tempo real |
| `docker-compose restart app` | Reiniciar aplicação |
| `docker-compose up -d --build` | Rebuild após mudanças |
| `docker-compose ps` | Ver status dos containers |
| `docker system prune -a` | Limpar imagens não usadas |

---

## 🔄 Atualização do Sistema

```powershell
cd C:\Sist.Chamado

# Baixar atualizações
git pull

# Rebuild e reiniciar
docker-compose up -d --build

# Verificar logs
docker-compose logs -f app
```

---

## 🔒 HTTPS (Opcional)

### Com Traefik (Recomendado para produção)

Crie um `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  traefik:
    image: traefik:v2.10
    container_name: traefik
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./traefik:/etc/traefik
    command:
      - "--providers.docker=true"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"

  app:
    build: .
    container_name: chamados-app
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.app.rule=Host(`chamados.hospital.local`)"
      - "traefik.http.routers.app.entrypoints=websecure"
      - "traefik.http.routers.app.tls=true"
    networks:
      - chamados-network

networks:
  chamados-network:
    driver: bridge
```

---

## 🆘 Troubleshooting

### Container não inicia

```powershell
# Ver logs detalhados
docker-compose logs app

# Verificar se a porta está em uso
netstat -an | findstr :80
```

### Erro de build

```powershell
# Limpar cache e rebuildar
docker-compose down
docker system prune -a
docker-compose up -d --build
```

### Docker não inicia no Windows Server

```powershell
# Verificar serviço
Get-Service docker

# Reiniciar serviço
Restart-Service docker
```

### Verificar se Hyper-V está habilitado

```powershell
# Verificar
Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V

# Habilitar (requer reinício)
Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V -All
```

---

## 📊 Monitoramento

### Ver uso de recursos

```powershell
docker stats
```

### Health Check

O container inclui health check automático. Verifique com:

```powershell
docker inspect --format='{{.State.Health.Status}}' chamados-app
```

---

## 📦 Backup

### Backup do código e configurações

```powershell
$date = Get-Date -Format "yyyy-MM-dd"
Compress-Archive -Path C:\Sist.Chamado -DestinationPath "C:\Backups\chamados_$date.zip"
```

> [!NOTE]
> O banco de dados está no Supabase Cloud, que já possui backup automático.

---

## 🆚 Docker vs IIS

| Aspecto | Docker | IIS |
|---------|--------|-----|
| Instalação | Simples | Mais passos |
| Isolamento | Total | Parcial |
| Portabilidade | Alta | Windows only |
| Atualização | `docker-compose up --build` | Manual |
| Recursos | Maior consumo | Menor consumo |
| Manutenção | Uniforme | Específico Windows |

---

## 📊 Resumo

| ✅ Item | Status |
|---------|--------|
| Windows Server | ✅ |
| Docker | ✅ |
| Nginx containerizado | ✅ |
| Health checks | ✅ |
| Fácil atualização | ✅ |
| Portável | ✅ |

---

© 2026 Hospital de Ilhéus - Sistema de Chamados
