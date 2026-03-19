# Sistema de Chamados v2 - Design Spec: Gestão de Equipe

**Data**: 2026-03-19
**Status**: Aprovado
**Abordagem**: "Gestão First" - foco em gestão de equipe com melhorias incrementais em UX, performance e infra

## Contexto

Sistema de chamados para o Hospital de Ilhéus. MVP funcional com React 19 + Supabase + Docker/Nginx.
Público-alvo: 50-200 usuários (médio porte). Maior dor atual: gestão de equipe técnica.

### Stack Atual
- Frontend: React 19 + TypeScript 5.8 + Vite 6 + Tailwind CSS
- Backend: Supabase (PostgreSQL + RLS + Auth + Realtime + Storage + Edge Functions)
- UI: Lucide Icons, Chart.js, react-hot-toast, @hello-pangea/dnd
- Deploy: Docker + Nginx
- Testes: Vitest + Testing Library (224 testes)

### Roles
- **SOLICITANTE**: Cria chamados, acompanha status, avalia atendimento
- **TECNICO**: Visualiza Kanban, assume chamados, resolve
- **ADMIN**: Gerencia usuários, setores, alertas globais + tudo do TECNICO

---

## Seção 1: Dashboard de Gestão de Equipe

### 1.1 Carga de Trabalho por Técnico

Cards individuais por técnico mostrando:
- Chamados ativos (IN_PROGRESS) atribuídos
- Chamados resolvidos hoje (DONE com updated_at = hoje)
- Tempo médio de resposta (diferença entre created_at e first_response_at)
- Barra de progresso visual: verde (0-3 ativos), amarelo (4-6), vermelho (7+)
- Status online/offline via Supabase Presence API

**Componente**: `TechnicianWorkload.tsx` dentro do Dashboard existente.

### 1.2 SLA Tracking

Prazos por prioridade:
| Prioridade | SLA |
|-----------|-----|
| CRITICAL  | 1h  |
| HIGH      | 4h  |
| MEDIUM    | 24h |
| LOW       | 72h |

Features:
- Tabela de chamados próximos de vencer SLA, ordenados por urgência
- Badge no card do Kanban com tempo restante (verde > 50%, amarelo 20-50%, vermelho < 20%)
- % de cumprimento de SLA geral e por técnico
- Configuração de SLA editável pelo ADMIN (tabela `sla_config`)

### 1.3 Métricas Reais de Performance

Substituir valores hardcoded do Dashboard atual:
- **Tempo médio de resposta**: calculado de `first_response_at - created_at`
- **Tempo médio de resolução**: calculado de tickets DONE `updated_at - created_at`
- **Ranking de técnicos**: por satisfação (rating médio) e por volume
- **Volume semanal**: manter comparativo existente mas com dados reais

### 1.4 Mudanças no Banco - Dashboard

```sql
-- Novos campos na tabela tickets
ALTER TABLE tickets ADD COLUMN sla_deadline TIMESTAMPTZ;
ALTER TABLE tickets ADD COLUMN first_response_at TIMESTAMPTZ;

-- Tabela de configuração de SLA
CREATE TABLE sla_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    priority TEXT NOT NULL UNIQUE CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    deadline_hours INTEGER NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES profiles(id)
);

-- RLS para sla_config
ALTER TABLE sla_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view SLA config"
    ON sla_config FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage SLA config"
    ON sla_config FOR ALL
    USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'))
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'));

-- Dados iniciais
INSERT INTO sla_config (priority, deadline_hours) VALUES
    ('CRITICAL', 1),
    ('HIGH', 4),
    ('MEDIUM', 24),
    ('LOW', 72);

-- Trigger: calcular sla_deadline na criação do ticket
CREATE OR REPLACE FUNCTION calculate_sla_deadline()
RETURNS trigger AS $$
DECLARE
    hours INTEGER;
BEGIN
    SELECT deadline_hours INTO hours FROM sla_config WHERE priority = NEW.priority;
    IF hours IS NOT NULL THEN
        NEW.sla_deadline := NOW() + (hours || ' hours')::INTERVAL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_sla_deadline
    BEFORE INSERT ON tickets
    FOR EACH ROW EXECUTE FUNCTION calculate_sla_deadline();

-- Trigger: recalcular sla_deadline quando prioridade muda
CREATE OR REPLACE FUNCTION recalculate_sla_on_priority_change()
RETURNS trigger AS $$
DECLARE
    hours INTEGER;
BEGIN
    IF NEW.priority IS DISTINCT FROM OLD.priority THEN
        SELECT deadline_hours INTO hours FROM sla_config WHERE priority = NEW.priority;
        IF hours IS NOT NULL THEN
            NEW.sla_deadline := NOW() + (hours || ' hours')::INTERVAL;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recalculate_sla_on_priority
    BEFORE UPDATE ON tickets
    FOR EACH ROW EXECUTE FUNCTION recalculate_sla_on_priority_change();

-- Trigger: registrar first_response_at
CREATE OR REPLACE FUNCTION set_first_response()
RETURNS trigger AS $$
BEGIN
    IF OLD.status = 'TODO' AND NEW.status = 'IN_PROGRESS' AND OLD.first_response_at IS NULL THEN
        NEW.first_response_at := NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_first_response
    BEFORE UPDATE ON tickets
    FOR EACH ROW EXECUTE FUNCTION set_first_response();

-- Índice para queries de SLA
CREATE INDEX idx_tickets_sla ON tickets(sla_deadline) WHERE status != 'DONE';
CREATE INDEX idx_tickets_technician_status ON tickets(technician_id, status);

-- Backfill: preencher first_response_at para tickets existentes
UPDATE tickets SET first_response_at = updated_at
WHERE status IN ('IN_PROGRESS', 'DONE') AND first_response_at IS NULL;
```

---

## Seção 2: Atribuição Inteligente de Chamados

### 2.1 Atribuição Manual (Admin/Tecnico)

- Dropdown no card do Kanban para atribuir técnico diretamente (visível para ADMIN e TECNICO)
- No TicketDetailModal, botão "Atribuir para" com lista de técnicos disponíveis no setor
- Filtro no Kanban: "Meus chamados" vs "Todos" (toggle)

### 2.2 Atribuição Automática (Round-Robin por Setor)

Configuração por setor no painel Admin:
- Ativar/desativar auto-atribuição
- Ao criar ticket em setor com auto-atribuição, o sistema atribui ao técnico disponível com menos chamados ativos naquele setor

Lógica de seleção:
1. Filtrar técnicos vinculados ao setor (`technician_sectors`)
2. Filtrar apenas disponíveis (`is_available = true`)
3. Ordenar por quantidade de chamados ativos (IN_PROGRESS) ascendente
4. Atribuir ao primeiro (menor carga)

### 2.3 Escalação Automática

- Se chamado HIGH/CRITICAL fica sem técnico atribuído por tempo configurável, notifica todos os ADMINs
- Timer: CRITICAL = 15min, HIGH = 30min
- Implementação via Supabase Edge Function com cron job (pg_cron ou similar)

### 2.4 Mudanças no Banco - Atribuição

```sql
-- Tabela de vínculo técnico-setor
CREATE TABLE technician_sectors (
    technician_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    sector_id UUID REFERENCES sectors(id) ON DELETE CASCADE,
    PRIMARY KEY (technician_id, sector_id)
);

ALTER TABLE technician_sectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view technician sectors"
    ON technician_sectors FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage technician sectors"
    ON technician_sectors FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
        )
    );

-- Novo campo no profiles
ALTER TABLE profiles ADD COLUMN is_available BOOLEAN DEFAULT true;

-- Configuração de auto-atribuição por setor
ALTER TABLE sectors ADD COLUMN auto_assign BOOLEAN DEFAULT false;

-- Função de auto-atribuição
CREATE OR REPLACE FUNCTION auto_assign_technician()
RETURNS trigger AS $$
DECLARE
    tech_id UUID;
    sector_auto BOOLEAN;
BEGIN
    SELECT auto_assign INTO sector_auto FROM sectors WHERE id = NEW.sector_id;

    IF sector_auto = true AND NEW.technician_id IS NULL THEN
        SELECT ts.technician_id INTO tech_id
        FROM technician_sectors ts
        JOIN profiles p ON p.id = ts.technician_id
        WHERE ts.sector_id = NEW.sector_id
          AND p.is_available = true
          AND p.role IN ('TECNICO', 'ADMIN')
        ORDER BY (
            SELECT COUNT(*) FROM tickets t
            WHERE t.technician_id = ts.technician_id AND t.status IN ('IN_PROGRESS', 'WAITING')
        ) ASC
        LIMIT 1;

        IF tech_id IS NOT NULL THEN
            NEW.technician_id := tech_id;
            NEW.status := 'IN_PROGRESS';
            NEW.first_response_at := NOW();
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_ticket_auto_assign
    BEFORE INSERT ON tickets
    FOR EACH ROW EXECUTE FUNCTION auto_assign_technician();
```

---

## Seção 3: Melhorias de UX e Kanban

### 3.1 Kanban Aprimorado (TecnicoView)

- **Filtros rápidos**: por técnico atribuído, prioridade, setor, SLA status
- **Toggle "Meus Chamados"**: filtra para mostrar apenas os do técnico logado
- **Badge de SLA**: no card, ícone com tempo restante e cor (verde/amarelo/vermelho)
- **4a coluna "AGUARDANDO"**: status WAITING para chamados pendentes de resposta do solicitante
  - Apenas TECNICO/ADMIN pode mover para WAITING
  - Retorna a IN_PROGRESS quando solicitante envia mensagem no chat ou quando técnico arrasta de volta
  - SLA timer **pausa** enquanto em WAITING (badge mostra "Pausado")
  - SLA restante é recalculado ao sair de WAITING

### 3.2 Solicitante View Melhorada

- **Barra de progresso**: visual horizontal mostrando etapa do chamado (Aberto > Em Andamento > Concluído)
- **Notificação de atribuição**: "Seu chamado foi atribuído ao técnico [nome]"
- **SLA visível**: tempo estimado restante para resolução

### 3.3 Melhorias Gerais de UX

- **Skeleton loading**: substituir spinners por placeholders animados (cards, listas)
- **Mobile responsivo**: Kanban em telas < 768px exibe cards empilhados em acordeão por status
- **Feedback aprimorado**: toasts mais informativos com ações (ex: "Chamado criado - Ver detalhes")

### 3.4 Mudanças nos Tipos

```typescript
// Novo status adicionado
type TicketStatus = 'TODO' | 'IN_PROGRESS' | 'WAITING' | 'DONE';

// Novos campos no Ticket
interface Ticket {
  // ... campos existentes ...
  sla_deadline?: string;
  first_response_at?: string;
}

// Novo tipo para SLA config
interface SLAConfig {
  id: string;
  priority: Priority;
  deadline_hours: number;
  updated_at: string;
  updated_by?: string;
}

// Atualização do Profile
interface Profile {
  // ... campos existentes ...
  is_available?: boolean;
}

// Novo tipo para vínculo técnico-setor
interface TechnicianSector {
  technician_id: string;
  sector_id: string;
}

// Atualização do Sector
interface Sector {
  // ... campos existentes ...
  auto_assign?: boolean;
}
```

### 3.5 Mudanças no Banco - Status WAITING

```sql
-- Atualizar CHECK constraint do status
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check;
ALTER TABLE tickets ADD CONSTRAINT tickets_status_check
    CHECK (status IN ('TODO', 'IN_PROGRESS', 'WAITING', 'DONE'));
```

---

## Seção 4: Infra, Performance e Testes

### 4.1 Performance

- **Virtualização**: `react-window` para MyTickets e listas longas (renderiza apenas itens visíveis). Nota: NÃO aplicar no Kanban DnD pois `react-window` conflita com `@hello-pangea/dnd` — usar paginação incremental no Kanban
- **Lazy loading**: `React.lazy()` + `Suspense` para Dashboard, UserManager, SectorManager, GlobalAlertManager
- **Context API**: extrair estado do App.tsx monolítico para contextos isolados:
  - `AuthContext` → session, profile, login/logout
  - `TicketContext` → tickets, CRUD, filtros, paginação
  - `ThemeContext` → darkMode toggle
- **Cache de queries**: usar `useMemo` para cálculos derivados e considerar `@tanstack/react-query` para cache de queries com TTL e invalidação automática

### 4.2 Infra/DevOps

- **Segurança**: remover `.env` do git, usar `.env.example` como template (URGENTE: rotacionar chaves do Supabase)
- **HTTPS**: ativar HSTS no nginx.conf quando certificado configurado
- **Health check**: endpoint `/health` retornando 200 OK
- **Monitoramento**: logs estruturados para erros do Supabase

### 4.3 Testes

- Testes unitários para novos componentes: TechnicianWorkload, SLA badges, filtros do Kanban
- Testes de integração: fluxo criação > auto-atribuição > resolução > rating
- Mock de Supabase Realtime para testar subscriptions
- Meta: manter cobertura acima de 80%

### 4.4 Nova Estrutura de Diretórios

```
src/
├── contexts/
│   ├── AuthContext.tsx
│   ├── TicketContext.tsx
│   └── ThemeContext.tsx
├── components/
│   ├── ... (existentes)
│   ├── TechnicianWorkload.tsx  (NOVO)
│   ├── SLABadge.tsx            (NOVO)
│   ├── TicketAssigner.tsx      (NOVO)
│   ├── SkeletonCard.tsx        (NOVO)
│   └── ProgressBar.tsx         (NOVO)
├── hooks/
│   ├── ... (existentes)
│   ├── useSLA.ts               (NOVO)
│   └── useTechnicians.ts       (NOVO)
└── types.ts                    (atualizado)
```

---

## Nota: Ordenação de Triggers

Os triggers `BEFORE INSERT ON tickets` executam em ordem alfabética no PostgreSQL:
1. `on_ticket_auto_assign` — pode setar `status = IN_PROGRESS` e `first_response_at`
2. `set_sla_deadline` — calcula `sla_deadline` baseado em `NEW.priority`

Isso funciona corretamente pois `auto_assign` seta `first_response_at` diretamente (não depende do trigger `set_first_response` que é `BEFORE UPDATE`). Manter esta documentação para evitar bugs em refatorações futuras.

---

## Resumo de Mudanças no Banco

| Tabela | Ação | Campos |
|--------|------|--------|
| tickets | ALTER ADD | sla_deadline, first_response_at |
| tickets | ALTER CONSTRAINT | status aceita 'WAITING' |
| profiles | ALTER ADD | is_available |
| sectors | ALTER ADD | auto_assign |
| sla_config | CREATE | priority, deadline_hours, updated_at, updated_by |
| technician_sectors | CREATE | technician_id, sector_id (PK composta) |

## Novos Triggers

| Trigger | Tabela | Evento | Função |
|---------|--------|--------|--------|
| set_sla_deadline | tickets | BEFORE INSERT | Calcula sla_deadline baseado na prioridade |
| recalculate_sla_on_priority | tickets | BEFORE UPDATE | Recalcula sla_deadline quando prioridade muda |
| on_first_response | tickets | BEFORE UPDATE | Registra first_response_at na primeira resposta |
| on_ticket_auto_assign | tickets | BEFORE INSERT | Auto-atribui técnico se setor tem auto_assign |

## Ordem de Implementação Sugerida

1. **Banco de dados**: migrations (novos campos, tabelas, triggers)
2. **Tipos TypeScript**: atualizar types.ts
3. **Context API**: extrair AuthContext, TicketContext, ThemeContext do App.tsx
4. **Hooks**: useSLA, useTechnicians
5. **Componentes base**: SLABadge, SkeletonCard, ProgressBar
6. **Dashboard de gestão**: TechnicianWorkload + métricas reais
7. **Atribuição**: TicketAssigner + UI no Kanban + config no SectorManager
8. **Kanban v2**: filtros, coluna WAITING, badges SLA, toggle "Meus chamados"
9. **Solicitante v2**: progress bar, notificações de atribuição
10. **Performance**: react-window, lazy loading
11. **Testes**: unitários + integração para novos componentes
12. **Infra**: .env cleanup, HTTPS, health check
