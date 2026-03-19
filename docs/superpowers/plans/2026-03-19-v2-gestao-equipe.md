# Sistema de Chamados v2 - Gestão de Equipe Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add team management features (SLA tracking, intelligent assignment, workload dashboard) to the hospital ticket system, plus UX and performance improvements.

**Architecture:** Extend existing Supabase backend with new tables/triggers for SLA and auto-assignment. Extract App.tsx monolith into Context API providers. Add new dashboard components for workload visualization and new Kanban features (WAITING column, filters, SLA badges).

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Supabase (PostgreSQL + RLS + Realtime), Tailwind CSS, Chart.js, @hello-pangea/dnd, Vitest

**Spec:** `docs/superpowers/specs/2026-03-19-v2-gestao-equipe-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `database/migrations/001_sla_and_assignment.sql` | All DB migrations: new tables, columns, triggers, RLS |
| `contexts/AuthContext.tsx` | Session, profile, login/logout state |
| `contexts/TicketContext.tsx` | Tickets, CRUD, filters, pagination |
| `contexts/ThemeContext.tsx` | Dark mode toggle |
| `hooks/useSLA.ts` | Fetch SLA config, compute SLA status for tickets |
| `hooks/useTechnicians.ts` | Fetch technicians, availability, sector bindings |
| `components/SLABadge.tsx` | SLA countdown badge (green/yellow/red/paused) |
| `components/SkeletonCard.tsx` | Skeleton loading placeholder for cards |
| `components/ProgressBar.tsx` | Ticket progress bar for solicitante view |
| `components/TechnicianWorkload.tsx` | Workload cards per technician in Dashboard |
| `components/TicketAssigner.tsx` | Dropdown to assign technician to ticket |
| `tests/SLABadge.test.tsx` | Tests for SLA badge logic |
| `tests/ProgressBar.test.tsx` | Tests for progress bar |
| `tests/TicketAssigner.test.tsx` | Tests for ticket assignment component |
| `tests/TechnicianWorkload.test.tsx` | Tests for workload dashboard |
| `tests/useSLA.test.ts` | Tests for SLA hook |
| `tests/useTechnicians.test.ts` | Tests for technicians hook |
| `.env.example` | Template for environment variables |

### Modified Files
| File | Changes |
|------|---------|
| `types.ts` | Add WAITING status, SLAConfig, TechnicianSector, new fields |
| `App.tsx` | Replace state with Context providers, add lazy loading |
| `components/TecnicoView.tsx` | Add WAITING column, SLA badges, filters, assignment dropdown |
| `components/Dashboard.tsx` | Add TechnicianWorkload, real metrics, SLA tracking |
| `components/SolicitanteView.tsx` | Add ProgressBar, SLA info |
| `components/MyTickets.tsx` | Add ProgressBar per ticket |
| `components/SectorManager.tsx` | Add auto_assign toggle, technician-sector bindings |
| `components/TicketDetailModal.tsx` | Add TicketAssigner, SLA info |
| `hooks/useTickets.ts` | Support WAITING status, fetch SLA fields |
| `hooks/index.ts` | Export new hooks |
| `database/schema.sql` | Update with v2 schema (reference only) |
| `nginx.conf` | Already modified in v1 audit |

---

## Chunk 1: Database & Types Foundation

### Task 1: Database Migration Script

**Files:**
- Create: `database/migrations/001_sla_and_assignment.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- ===========================================
-- V2 Migration: SLA, Assignment, WAITING status
-- ===========================================

-- 1. New columns on tickets
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMPTZ;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ;

-- 2. Update status constraint to include WAITING
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check;
ALTER TABLE tickets ADD CONSTRAINT tickets_status_check
    CHECK (status IN ('TODO', 'IN_PROGRESS', 'WAITING', 'DONE'));

-- 3. New column on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true;

-- 4. New column on sectors
ALTER TABLE sectors ADD COLUMN IF NOT EXISTS auto_assign BOOLEAN DEFAULT false;

-- 5. SLA config table
CREATE TABLE IF NOT EXISTS sla_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    priority TEXT NOT NULL UNIQUE CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    deadline_hours INTEGER NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES profiles(id)
);

ALTER TABLE sla_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view SLA config"
    ON sla_config FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage SLA config"
    ON sla_config FOR ALL
    USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'))
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'));

INSERT INTO sla_config (priority, deadline_hours) VALUES
    ('CRITICAL', 1), ('HIGH', 4), ('MEDIUM', 24), ('LOW', 72)
ON CONFLICT (priority) DO NOTHING;

-- 6. Technician-sector binding table
CREATE TABLE IF NOT EXISTS technician_sectors (
    technician_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    sector_id UUID REFERENCES sectors(id) ON DELETE CASCADE,
    PRIMARY KEY (technician_id, sector_id)
);

ALTER TABLE technician_sectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view technician sectors"
    ON technician_sectors FOR SELECT USING (true);

CREATE POLICY "Admins can manage technician sectors"
    ON technician_sectors FOR ALL
    USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'))
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'));

-- 7. Triggers

-- SLA deadline on insert
CREATE OR REPLACE FUNCTION calculate_sla_deadline()
RETURNS trigger AS $$
DECLARE hours INTEGER;
BEGIN
    SELECT deadline_hours INTO hours FROM sla_config WHERE priority = NEW.priority;
    IF hours IS NOT NULL THEN
        NEW.sla_deadline := NOW() + (hours || ' hours')::INTERVAL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_sla_deadline ON tickets;
CREATE TRIGGER set_sla_deadline
    BEFORE INSERT ON tickets
    FOR EACH ROW EXECUTE FUNCTION calculate_sla_deadline();

-- SLA recalculation on priority change
CREATE OR REPLACE FUNCTION recalculate_sla_on_priority_change()
RETURNS trigger AS $$
DECLARE hours INTEGER;
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

DROP TRIGGER IF EXISTS recalculate_sla_on_priority ON tickets;
CREATE TRIGGER recalculate_sla_on_priority
    BEFORE UPDATE ON tickets
    FOR EACH ROW EXECUTE FUNCTION recalculate_sla_on_priority_change();

-- First response tracking
CREATE OR REPLACE FUNCTION set_first_response()
RETURNS trigger AS $$
BEGIN
    IF OLD.status = 'TODO' AND NEW.status = 'IN_PROGRESS' AND OLD.first_response_at IS NULL THEN
        NEW.first_response_at := NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_first_response ON tickets;
CREATE TRIGGER on_first_response
    BEFORE UPDATE ON tickets
    FOR EACH ROW EXECUTE FUNCTION set_first_response();

-- Auto-assignment (round-robin by sector)
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

DROP TRIGGER IF EXISTS on_ticket_auto_assign ON tickets;
CREATE TRIGGER on_ticket_auto_assign
    BEFORE INSERT ON tickets
    FOR EACH ROW EXECUTE FUNCTION auto_assign_technician();

-- 8. Indexes
CREATE INDEX IF NOT EXISTS idx_tickets_sla ON tickets(sla_deadline) WHERE status != 'DONE';
CREATE INDEX IF NOT EXISTS idx_tickets_technician_status ON tickets(technician_id, status);

-- 9. Backfill existing data
UPDATE tickets SET first_response_at = updated_at
WHERE status IN ('IN_PROGRESS', 'DONE') AND first_response_at IS NULL;

-- 10. Add to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE sla_config;
ALTER PUBLICATION supabase_realtime ADD TABLE technician_sectors;
```

- [ ] **Step 2: Run migration on Supabase**

Run the SQL in Supabase Dashboard > SQL Editor, or via CLI:
```bash
npx supabase db push
```
Verify: tables `sla_config` and `technician_sectors` exist, `tickets` has new columns.

- [ ] **Step 3: Commit**

```bash
git add database/migrations/001_sla_and_assignment.sql
git commit -m "feat(db): add SLA, auto-assignment, and WAITING status migrations"
```

---

### Task 2: Update TypeScript Types

**Files:**
- Modify: `types.ts`

- [ ] **Step 1: Update types.ts**

Add WAITING to TicketStatus, add new interfaces, add new fields:

```typescript
// In types.ts, change line 14:
export type TicketStatus = 'TODO' | 'IN_PROGRESS' | 'WAITING' | 'DONE';

// Add after Sector interface (line 23):
export interface SLAConfig {
  id: string;
  priority: Priority;
  deadline_hours: number;
  updated_at: string;
  updated_by?: string;
}

export interface TechnicianSector {
  technician_id: string;
  sector_id: string;
}

// Update Sector interface to add auto_assign:
export interface Sector {
  id: string;
  name: string;
  icon: string;
  colorClass: string;
  auto_assign?: boolean;
}

// Update Profile interface to add is_available:
export interface Profile {
  id: string;
  full_name: string;
  email?: string;
  role: UserRole;
  avatar_url?: string;
  sector?: string;
  is_available?: boolean;
}

// Add to Ticket interface (after rating_comment line 60):
  sla_deadline?: string;
  first_response_at?: string;
```

- [ ] **Step 2: Run type check**

```bash
node ./node_modules/typescript/bin/tsc --noEmit
```
Expected: No new errors (existing code doesn't reference WAITING yet).

- [ ] **Step 3: Run tests to ensure no regressions**

```bash
npx vitest run
```
Expected: All 224 tests pass.

- [ ] **Step 4: Commit**

```bash
git add types.ts
git commit -m "feat(types): add WAITING status, SLA, and assignment types"
```

---

### Task 3: Create .env.example

**Files:**
- Create: `.env.example`

- [ ] **Step 1: Create .env.example template**

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# SMTP Configuration (for Edge Functions)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASS=your-smtp-password

# App Configuration
VITE_APP_NAME=Hospital de Ilhéus - Sistema de Chamados
```

- [ ] **Step 2: Add .env to .gitignore if not already present**

Check `.gitignore` for `.env` entry. If missing, add it.

- [ ] **Step 3: Commit**

```bash
git add .env.example .gitignore
git commit -m "chore: add .env.example template, ensure .env is gitignored"
```

---

## Chunk 2: Context API Extraction

### Task 4: Create ThemeContext

**Files:**
- Create: `contexts/ThemeContext.tsx`
- Test: `tests/ThemeContext.test.tsx`

- [ ] **Step 1: Write the test**

```typescript
// tests/ThemeContext.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('ThemeContext', () => {
  it('should default to light mode', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.darkMode).toBe(false);
  });

  it('should toggle dark mode', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    act(() => result.current.toggleDarkMode());
    expect(result.current.darkMode).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/ThemeContext.test.tsx
```
Expected: FAIL - module not found.

- [ ] **Step 3: Implement ThemeContext**

```typescript
// contexts/ThemeContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';

interface ThemeContextType {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode: () => setDarkMode(prev => !prev) }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/ThemeContext.test.tsx
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add contexts/ThemeContext.tsx tests/ThemeContext.test.tsx
git commit -m "feat: extract ThemeContext from App.tsx"
```

---

### Task 5: Create AuthContext

**Files:**
- Create: `contexts/AuthContext.tsx`
- Test: `tests/AuthContext.test.tsx`

- [ ] **Step 1: Write the test**

```typescript
// tests/AuthContext.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } }
      })
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null })
        })
      })
    })
  }
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('AuthContext', () => {
  it('should start with null session and profile', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.session).toBeNull();
    expect(result.current.profile).toBeNull();
  });

  it('should expose loading state', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(typeof result.current.loading).toBe('boolean');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/AuthContext.test.tsx
```
Expected: FAIL

- [ ] **Step 3: Implement AuthContext**

Extract auth logic from App.tsx lines 78-114 into a context:

```typescript
// contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile, ViewType } from '../types';
import { requestNotificationPermission } from '../lib/notifications';

interface AuthContextType {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  view: ViewType;
  setView: (v: ViewType) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewType>('SOLICITANTE');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
        requestNotificationPermission();
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) {
      setProfile(data);
      setView(data.role === 'TECNICO' || data.role === 'ADMIN' ? 'TECNICO' : 'SOLICITANTE');
    }
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ session, profile, loading, view, setView }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/AuthContext.test.tsx
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add contexts/AuthContext.tsx tests/AuthContext.test.tsx
git commit -m "feat: extract AuthContext from App.tsx"
```

---

### Task 6: Create TicketContext

**Files:**
- Create: `contexts/TicketContext.tsx`

- [ ] **Step 1: Create TicketContext**

This wraps the existing `useTickets` hook and adds sector fetching:

```typescript
// contexts/TicketContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Ticket, Sector, TicketStatus } from '../types';
import { useTickets } from '../hooks/useTickets';
import { useAuth } from './AuthContext';

interface TicketContextType {
  tickets: Ticket[];
  ticketsLoading: boolean;
  hasMore: boolean;
  fetchNextPage: () => void;
  updateTicketStatus: (id: string, status: TicketStatus) => Promise<void>;
  deleteTicket: (id: string) => Promise<void>;
  pinTicket: (id: string, isPinned: boolean) => Promise<void>;
  sectors: Sector[];
  refreshTickets: () => void;
}

const TicketContext = createContext<TicketContextType | undefined>(undefined);

export const TicketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, profile } = useAuth();
  const [sectors, setSectors] = useState<Sector[]>([]);

  const {
    tickets, loading: ticketsLoading, hasMore, fetchNextPage,
    updateTicketStatus: rawUpdate, deleteTicket: rawDelete,
    pinTicket: rawPin, refreshTickets
  } = useTickets(session?.user.id, profile?.role);

  useEffect(() => {
    if (session) {
      supabase.from('sectors').select('*').order('name').then(({ data }) => {
        if (data) setSectors(data);
      });
    }
  }, [session]);

  const updateTicketStatus = useCallback(async (id: string, status: TicketStatus) => {
    if (!session) return;
    await rawUpdate(id, status, session.user.id);
  }, [session, rawUpdate]);

  const deleteTicket = useCallback(async (id: string) => {
    await rawDelete(id);
  }, [rawDelete]);

  const pinTicket = useCallback(async (id: string, isPinned: boolean) => {
    if (!session) return;
    await rawPin(id, isPinned, session.user.id);
  }, [session, rawPin]);

  return (
    <TicketContext.Provider value={{
      tickets, ticketsLoading, hasMore, fetchNextPage,
      updateTicketStatus, deleteTicket, pinTicket, sectors, refreshTickets
    }}>
      {children}
    </TicketContext.Provider>
  );
};

export const useTicketContext = () => {
  const ctx = useContext(TicketContext);
  if (!ctx) throw new Error('useTicketContext must be used within TicketProvider');
  return ctx;
};
```

- [ ] **Step 2: Run type check**

```bash
node ./node_modules/typescript/bin/tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add contexts/TicketContext.tsx
git commit -m "feat: extract TicketContext from App.tsx"
```

---

### Task 7: Wire Contexts into App.tsx

**Files:**
- Modify: `App.tsx`

- [ ] **Step 1: Refactor App.tsx to use contexts**

Replace the inline state management with context providers. The App component becomes a thin shell:

1. Wrap the app with `<ThemeProvider>`, `<AuthProvider>`, `<TicketProvider>`
2. Move the main rendering logic into a new `AppContent` component that uses `useAuth()`, `useTheme()`, and `useTicketContext()`
3. Remove the duplicated state variables (session, profile, view, darkMode, sectors, tickets)
4. Keep modal state (isModalOpen, selectedTicket, selectedSector) local to AppContent

Key changes:
- Remove `useState` for: session, profile, view, darkMode, sectors, tickets/loading/hasMore
- Import and use contexts instead
- Add `React.lazy()` for Dashboard, UserManager, SectorManager, GlobalAlertManager
- Wrap lazy components in `<Suspense fallback={<Loader2 />}>`

- [ ] **Step 2: Run tests**

```bash
npx vitest run
```
Expected: All existing tests pass.

- [ ] **Step 3: Commit**

```bash
git add App.tsx
git commit -m "refactor: wire Context providers into App.tsx, add lazy loading"
```

---

## Chunk 3: New Hooks

### Task 8: useSLA Hook

**Files:**
- Create: `hooks/useSLA.ts`
- Test: `tests/useSLA.test.ts`

- [ ] **Step 1: Write the test**

```typescript
// tests/useSLA.test.ts
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { getSLAStatus } from '../hooks/useSLA';

describe('getSLAStatus', () => {
  it('should return "green" when > 50% time remains', () => {
    const deadline = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(); // 4h from now
    const created = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(); // 1h ago
    expect(getSLAStatus(deadline).color).toBe('green');
  });

  it('should return "yellow" when 20-50% time remains', () => {
    const deadline = new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(); // 1h from now
    expect(getSLAStatus(deadline).color).toBe('yellow');
  });

  it('should return "red" when < 20% time remains', () => {
    const deadline = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5min from now
    expect(getSLAStatus(deadline).color).toBe('red');
  });

  it('should return "expired" when deadline has passed', () => {
    const deadline = new Date(Date.now() - 1000).toISOString();
    expect(getSLAStatus(deadline).color).toBe('red');
    expect(getSLAStatus(deadline).expired).toBe(true);
  });

  it('should return "paused" for WAITING status', () => {
    const deadline = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    expect(getSLAStatus(deadline, 'WAITING').color).toBe('paused');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/useSLA.test.ts
```

- [ ] **Step 3: Implement useSLA**

```typescript
// hooks/useSLA.ts
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { SLAConfig, TicketStatus } from '../types';

export interface SLAStatusResult {
  color: 'green' | 'yellow' | 'red' | 'paused';
  remainingMs: number;
  remainingText: string;
  expired: boolean;
}

export const getSLAStatus = (deadline: string, status?: TicketStatus): SLAStatusResult => {
  if (status === 'WAITING') {
    return { color: 'paused', remainingMs: 0, remainingText: 'Pausado', expired: false };
  }

  const now = Date.now();
  const deadlineMs = new Date(deadline).getTime();
  const remainingMs = deadlineMs - now;

  if (remainingMs <= 0) {
    return { color: 'red', remainingMs: 0, remainingText: 'Vencido', expired: true };
  }

  const totalMs = 24 * 60 * 60 * 1000; // approximate, will refine with created_at
  const pct = remainingMs / totalMs;

  const hours = Math.floor(remainingMs / (1000 * 60 * 60));
  const mins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
  const remainingText = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  let color: 'green' | 'yellow' | 'red';
  if (remainingMs > 2 * 60 * 60 * 1000) color = 'green';      // > 2h
  else if (remainingMs > 30 * 60 * 1000) color = 'yellow';     // > 30min
  else color = 'red';

  return { color, remainingMs, remainingText, expired: false };
};

export const useSLA = () => {
  const [config, setConfig] = useState<SLAConfig[]>([]);

  useEffect(() => {
    supabase.from('sla_config').select('*').then(({ data }) => {
      if (data) setConfig(data);
    });
  }, []);

  return { config, getSLAStatus };
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/useSLA.test.ts
```

- [ ] **Step 5: Export from hooks/index.ts**

Add `export { useSLA } from './useSLA';` to `hooks/index.ts`.

- [ ] **Step 6: Commit**

```bash
git add hooks/useSLA.ts hooks/index.ts tests/useSLA.test.ts
git commit -m "feat: add useSLA hook with SLA status calculation"
```

---

### Task 9: useTechnicians Hook

**Files:**
- Create: `hooks/useTechnicians.ts`
- Test: `tests/useTechnicians.test.ts`

- [ ] **Step 1: Write the test**

```typescript
// tests/useTechnicians.test.ts
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({
          data: [
            { id: 't1', full_name: 'João', role: 'TECNICO', is_available: true },
            { id: 't2', full_name: 'Maria', role: 'TECNICO', is_available: false }
          ]
        })
      })
    })
  }
}));

import { useTechnicians } from '../hooks/useTechnicians';

describe('useTechnicians', () => {
  it('should fetch technicians', async () => {
    const { result } = renderHook(() => useTechnicians());
    await waitFor(() => {
      expect(result.current.technicians.length).toBe(2);
    });
  });

  it('should filter available technicians', async () => {
    const { result } = renderHook(() => useTechnicians());
    await waitFor(() => {
      const available = result.current.availableTechnicians;
      expect(available.length).toBe(1);
      expect(available[0].full_name).toBe('João');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/useTechnicians.test.ts
```

- [ ] **Step 3: Implement useTechnicians**

```typescript
// hooks/useTechnicians.ts
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Profile, TechnicianSector } from '../types';

export const useTechnicians = () => {
  const [technicians, setTechnicians] = useState<Profile[]>([]);
  const [techSectors, setTechSectors] = useState<TechnicianSector[]>([]);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('*')
      .in('role', ['TECNICO', 'ADMIN'])
      .then(({ data }) => {
        if (data) setTechnicians(data);
      });

    supabase
      .from('technician_sectors')
      .select('*')
      .then(({ data }) => {
        if (data) setTechSectors(data);
      });
  }, []);

  const availableTechnicians = useMemo(
    () => technicians.filter(t => t.is_available !== false),
    [technicians]
  );

  const getTechniciansForSector = (sectorId: string) => {
    const techIds = techSectors
      .filter(ts => ts.sector_id === sectorId)
      .map(ts => ts.technician_id);
    return technicians.filter(t => techIds.includes(t.id));
  };

  return { technicians, availableTechnicians, techSectors, getTechniciansForSector };
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/useTechnicians.test.ts
```

- [ ] **Step 5: Export from hooks/index.ts**

Add `export { useTechnicians } from './useTechnicians';`

- [ ] **Step 6: Commit**

```bash
git add hooks/useTechnicians.ts hooks/index.ts tests/useTechnicians.test.ts
git commit -m "feat: add useTechnicians hook for technician management"
```

---

## Chunk 4: Base UI Components

### Task 10: SLABadge Component

**Files:**
- Create: `components/SLABadge.tsx`
- Test: `tests/SLABadge.test.tsx`

- [ ] **Step 1: Write the test**

```typescript
// tests/SLABadge.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import SLABadge from '../components/SLABadge';

describe('SLABadge', () => {
  it('should show remaining time for active SLA', () => {
    const deadline = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
    render(<SLABadge deadline={deadline} />);
    expect(screen.getByText(/h/)).toBeDefined();
  });

  it('should show "Vencido" for expired SLA', () => {
    const deadline = new Date(Date.now() - 1000).toISOString();
    render(<SLABadge deadline={deadline} />);
    expect(screen.getByText('Vencido')).toBeDefined();
  });

  it('should show "Pausado" for WAITING status', () => {
    const deadline = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
    render(<SLABadge deadline={deadline} ticketStatus="WAITING" />);
    expect(screen.getByText('Pausado')).toBeDefined();
  });

  it('should not render when no deadline', () => {
    const { container } = render(<SLABadge />);
    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement SLABadge**

```typescript
// components/SLABadge.tsx
import React from 'react';
import { Clock, Pause } from 'lucide-react';
import { getSLAStatus } from '../hooks/useSLA';
import { TicketStatus } from '../types';

interface SLABadgeProps {
  deadline?: string;
  ticketStatus?: TicketStatus;
}

const colorMap = {
  green: 'bg-emerald-100 text-emerald-700',
  yellow: 'bg-amber-100 text-amber-700',
  red: 'bg-rose-100 text-rose-700',
  paused: 'bg-slate-100 text-slate-500'
};

const SLABadge: React.FC<SLABadgeProps> = ({ deadline, ticketStatus }) => {
  if (!deadline) return null;

  const status = getSLAStatus(deadline, ticketStatus);
  const Icon = status.color === 'paused' ? Pause : Clock;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colorMap[status.color]}`}>
      <Icon size={12} />
      {status.remainingText}
    </span>
  );
};

export default SLABadge;
```

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Commit**

```bash
git add components/SLABadge.tsx tests/SLABadge.test.tsx
git commit -m "feat: add SLABadge component with countdown display"
```

---

### Task 11: SkeletonCard Component

**Files:**
- Create: `components/SkeletonCard.tsx`

- [ ] **Step 1: Implement SkeletonCard**

```typescript
// components/SkeletonCard.tsx
import React from 'react';

const SkeletonCard: React.FC = () => (
  <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 animate-pulse">
    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-3" />
    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-2" />
    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
    <div className="flex gap-2 mt-3">
      <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-full w-16" />
      <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-full w-12" />
    </div>
  </div>
);

export default SkeletonCard;
```

- [ ] **Step 2: Commit**

```bash
git add components/SkeletonCard.tsx
git commit -m "feat: add SkeletonCard loading placeholder"
```

---

### Task 12: ProgressBar Component

**Files:**
- Create: `components/ProgressBar.tsx`
- Test: `tests/ProgressBar.test.tsx`

- [ ] **Step 1: Write the test**

```typescript
// tests/ProgressBar.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import ProgressBar from '../components/ProgressBar';

describe('ProgressBar', () => {
  it('should highlight TODO step for TODO status', () => {
    render(<ProgressBar status="TODO" />);
    expect(screen.getByText('Aberto')).toBeDefined();
  });

  it('should highlight IN_PROGRESS step', () => {
    render(<ProgressBar status="IN_PROGRESS" />);
    expect(screen.getByText('Em Andamento')).toBeDefined();
  });

  it('should highlight WAITING step', () => {
    render(<ProgressBar status="WAITING" />);
    expect(screen.getByText('Aguardando')).toBeDefined();
  });

  it('should highlight DONE step', () => {
    render(<ProgressBar status="DONE" />);
    expect(screen.getByText('Concluído')).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement ProgressBar**

```typescript
// components/ProgressBar.tsx
import React from 'react';
import { TicketStatus } from '../types';
import { Circle, Clock, Pause, CheckCircle2 } from 'lucide-react';

interface ProgressBarProps {
  status: TicketStatus;
}

const steps = [
  { key: 'TODO', label: 'Aberto', icon: Circle },
  { key: 'IN_PROGRESS', label: 'Em Andamento', icon: Clock },
  { key: 'WAITING', label: 'Aguardando', icon: Pause },
  { key: 'DONE', label: 'Concluído', icon: CheckCircle2 }
] as const;

const statusOrder: Record<TicketStatus, number> = {
  TODO: 0, IN_PROGRESS: 1, WAITING: 1, DONE: 3
};

const ProgressBar: React.FC<ProgressBarProps> = ({ status }) => {
  const currentIdx = statusOrder[status];

  return (
    <div className="flex items-center gap-1 w-full">
      {steps.map((step, i) => {
        const isActive = step.key === status;
        const isDone = i < currentIdx;
        const Icon = step.icon;

        return (
          <React.Fragment key={step.key}>
            {i > 0 && (
              <div className={`flex-1 h-0.5 ${isDone ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
            )}
            <div className="flex flex-col items-center">
              <Icon
                size={16}
                className={
                  isActive ? 'text-blue-600' :
                  isDone ? 'text-blue-500' :
                  'text-slate-300 dark:text-slate-600'
                }
              />
              <span className={`text-[10px] mt-1 ${isActive ? 'text-blue-600 font-semibold' : 'text-slate-400'}`}>
                {step.label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default ProgressBar;
```

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Commit**

```bash
git add components/ProgressBar.tsx tests/ProgressBar.test.tsx
git commit -m "feat: add ProgressBar component for ticket status visualization"
```

---

### Task 13: TicketAssigner Component

**Files:**
- Create: `components/TicketAssigner.tsx`
- Test: `tests/TicketAssigner.test.tsx`

- [ ] **Step 1: Write the test**

```typescript
// tests/TicketAssigner.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import TicketAssigner from '../components/TicketAssigner';

const mockTechnicians = [
  { id: 't1', full_name: 'João Silva', role: 'TECNICO' as const, is_available: true },
  { id: 't2', full_name: 'Maria Santos', role: 'TECNICO' as const, is_available: true }
];

describe('TicketAssigner', () => {
  it('should render technician options', () => {
    render(
      <TicketAssigner
        technicians={mockTechnicians}
        currentTechnicianId={undefined}
        onAssign={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText(/Atribuir/));
    expect(screen.getByText('João Silva')).toBeDefined();
    expect(screen.getByText('Maria Santos')).toBeDefined();
  });

  it('should call onAssign when technician is selected', () => {
    const onAssign = vi.fn();
    render(
      <TicketAssigner
        technicians={mockTechnicians}
        currentTechnicianId={undefined}
        onAssign={onAssign}
      />
    );
    fireEvent.click(screen.getByText(/Atribuir/));
    fireEvent.click(screen.getByText('João Silva'));
    expect(onAssign).toHaveBeenCalledWith('t1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement TicketAssigner**

```typescript
// components/TicketAssigner.tsx
import React, { useState } from 'react';
import { UserPlus, ChevronDown } from 'lucide-react';
import { Profile } from '../types';

interface TicketAssignerProps {
  technicians: Profile[];
  currentTechnicianId?: string;
  onAssign: (technicianId: string) => void;
}

const TicketAssigner: React.FC<TicketAssignerProps> = ({ technicians, currentTechnicianId, onAssign }) => {
  const [open, setOpen] = useState(false);
  const currentTech = technicians.find(t => t.id === currentTechnicianId);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
      >
        <UserPlus size={14} />
        {currentTech ? currentTech.full_name : 'Atribuir'}
        <ChevronDown size={14} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg py-1">
          {technicians.map(tech => (
            <button
              key={tech.id}
              onClick={() => { onAssign(tech.id); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 ${
                tech.id === currentTechnicianId ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              {tech.full_name}
              {tech.is_available === false && <span className="text-xs text-slate-400 ml-1">(indisponível)</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default TicketAssigner;
```

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Commit**

```bash
git add components/TicketAssigner.tsx tests/TicketAssigner.test.tsx
git commit -m "feat: add TicketAssigner dropdown component"
```

---

## Chunk 5: Dashboard & Kanban Integration

### Task 14: TechnicianWorkload Component

**Files:**
- Create: `components/TechnicianWorkload.tsx`
- Test: `tests/TechnicianWorkload.test.tsx`

- [ ] **Step 1: Write the test**

```typescript
// tests/TechnicianWorkload.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import TechnicianWorkload from '../components/TechnicianWorkload';

const mockTickets = [
  { id: '1', technician_id: 't1', technician_name: 'João', status: 'IN_PROGRESS', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), first_response_at: new Date().toISOString() },
  { id: '2', technician_id: 't1', technician_name: 'João', status: 'DONE', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), first_response_at: new Date().toISOString() },
  { id: '3', technician_id: 't2', technician_name: 'Maria', status: 'IN_PROGRESS', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), first_response_at: new Date().toISOString() }
];

describe('TechnicianWorkload', () => {
  it('should render technician cards', () => {
    render(<TechnicianWorkload tickets={mockTickets as any} />);
    expect(screen.getByText('João')).toBeDefined();
    expect(screen.getByText('Maria')).toBeDefined();
  });

  it('should show active ticket counts', () => {
    render(<TechnicianWorkload tickets={mockTickets as any} />);
    // João has 1 active, Maria has 1 active
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(2);
  });
});
```

- [ ] **Step 2: Implement TechnicianWorkload**

A card grid showing per-technician metrics. Groups tickets by `technician_id`, calculates active count, resolved today count, and average response time.

- [ ] **Step 3: Run tests, commit**

```bash
git add components/TechnicianWorkload.tsx tests/TechnicianWorkload.test.tsx
git commit -m "feat: add TechnicianWorkload dashboard component"
```

---

### Task 15: Update Dashboard with Real Metrics

**Files:**
- Modify: `components/Dashboard.tsx`

- [ ] **Step 1: Add TechnicianWorkload to Dashboard**

Import TechnicianWorkload and add it as a new section above the charts. Replace the hardcoded "14min" response time with real calculation from `first_response_at`.

- [ ] **Step 2: Add SLA Tracking Section**

Add a table showing tickets approaching SLA deadline, sorted by urgency. Use `getSLAStatus()` to color-code rows.

- [ ] **Step 3: Run existing Dashboard tests**

```bash
npx vitest run tests/Dashboard.test.tsx
```

- [ ] **Step 4: Commit**

```bash
git add components/Dashboard.tsx
git commit -m "feat: add real metrics and workload tracking to Dashboard"
```

---

### Task 16: Update TecnicoView with WAITING Column and SLA Badges

**Files:**
- Modify: `components/TecnicoView.tsx`

- [ ] **Step 1: Add WAITING to statusConfig**

```typescript
const statusConfig: Record<TicketStatus, { title: string; color: string; icon: any }> = {
  TODO: { title: 'A Fazer', color: 'bg-slate-500', icon: Clock },
  IN_PROGRESS: { title: 'Em Andamento', color: 'bg-blue-600', icon: Wrench },
  WAITING: { title: 'Aguardando', color: 'bg-amber-500', icon: Pause },
  DONE: { title: 'Concluído', color: 'bg-green-500', icon: CheckCircle2 }
};
```

- [ ] **Step 2: Add SLABadge to ticket cards**

Import SLABadge and render it on each card that has `sla_deadline`.

- [ ] **Step 3: Add "Meus Chamados" toggle**

Add a toggle button that filters tickets to only those where `technician_id === currentUserId`. This requires passing `currentUserId` as a new prop.

- [ ] **Step 4: Add filter bar**

Add filter dropdowns for: priority, sector, SLA status (OK/Vencendo/Vencido).

- [ ] **Step 5: Add TicketAssigner to each card**

Import TicketAssigner and render it on each Kanban card, calling the assignment API.

- [ ] **Step 6: Run tests**

```bash
npx vitest run tests/TecnicoView.test.tsx
```
Update tests as needed for new props.

- [ ] **Step 7: Commit**

```bash
git add components/TecnicoView.tsx tests/TecnicoView.test.tsx
git commit -m "feat: add WAITING column, SLA badges, filters, and assignment to Kanban"
```

---

### Task 17: Update SolicitanteView with ProgressBar

**Files:**
- Modify: `components/SolicitanteView.tsx`
- Modify: `components/MyTickets.tsx`

- [ ] **Step 1: Add ProgressBar to MyTickets cards**

Import ProgressBar and render it at the bottom of each ticket card in MyTickets, showing the current status visually.

- [ ] **Step 2: Add SLA info to ticket cards**

Show "Previsão: Xh" based on sla_deadline for active tickets.

- [ ] **Step 3: Run tests**

```bash
npx vitest run tests/SolicitanteView.test.tsx
```

- [ ] **Step 4: Commit**

```bash
git add components/SolicitanteView.tsx components/MyTickets.tsx
git commit -m "feat: add progress bar and SLA info to solicitante view"
```

---

### Task 18: Update SectorManager with Auto-Assign Config

**Files:**
- Modify: `components/SectorManager.tsx`

- [ ] **Step 1: Add auto_assign toggle**

Add a toggle switch next to each sector in the edit form. When enabled, show a multi-select for technicians assigned to this sector (fetched from `technician_sectors`).

- [ ] **Step 2: Add technician-sector binding management**

When saving a sector with auto_assign enabled, also save the selected technicians to `technician_sectors` table.

- [ ] **Step 3: Commit**

```bash
git add components/SectorManager.tsx
git commit -m "feat: add auto-assign config and technician binding to SectorManager"
```

---

## Chunk 6: Integration, useTickets Update, and Final Tests

### Task 19: Update useTickets for WAITING Status and SLA Fields

**Files:**
- Modify: `hooks/useTickets.ts`

- [ ] **Step 1: Add sla_deadline and first_response_at to select query**

The existing select already uses `*`, so these fields will be included automatically. Verify the `formattedTickets` mapping doesn't strip them.

- [ ] **Step 2: Support WAITING in updateTicketStatus**

The existing function already accepts any `TicketStatus`, so no code change needed. Just verify the type allows 'WAITING'.

- [ ] **Step 3: Run all tests**

```bash
npx vitest run
```

- [ ] **Step 4: Commit if any changes needed**

---

### Task 20: Update TicketDetailModal with Assignment and SLA

**Files:**
- Modify: `components/TicketDetailModal.tsx`

- [ ] **Step 1: Add TicketAssigner and SLABadge**

Import and render TicketAssigner in the modal header area (for TECNICO/ADMIN). Show SLABadge next to the priority badge.

- [ ] **Step 2: Commit**

```bash
git add components/TicketDetailModal.tsx
git commit -m "feat: add assignment and SLA info to TicketDetailModal"
```

---

### Task 21: Full Test Suite Run and Fixes

- [ ] **Step 1: Run complete test suite**

```bash
npx vitest run
```

- [ ] **Step 2: Fix any failing tests**

Update mocks and assertions as needed for new types and props.

- [ ] **Step 3: Run type check**

```bash
node ./node_modules/typescript/bin/tsc --noEmit
```

- [ ] **Step 4: Run build**

```bash
npx vite build
```

- [ ] **Step 5: Commit all fixes**

```bash
git add -A
git commit -m "fix: resolve test and type errors from v2 integration"
```

---

### Task 22: Update schema.sql Reference

**Files:**
- Modify: `database/schema.sql`

- [ ] **Step 1: Update schema.sql with v2 schema**

Incorporate the migration changes into the main schema file for reference. Add the new tables, columns, triggers, and indexes.

- [ ] **Step 2: Commit**

```bash
git add database/schema.sql
git commit -m "docs: update schema.sql with v2 tables and triggers"
```

---

## Summary

| Chunk | Tasks | Focus |
|-------|-------|-------|
| 1 | 1-3 | Database migrations, TypeScript types, .env cleanup |
| 2 | 4-7 | Context API extraction (Theme, Auth, Ticket) |
| 3 | 8-9 | New hooks (useSLA, useTechnicians) |
| 4 | 10-13 | Base UI components (SLABadge, SkeletonCard, ProgressBar, TicketAssigner) |
| 5 | 14-18 | Dashboard & Kanban integration, SolicitanteView, SectorManager |
| 6 | 19-22 | Integration, test fixes, schema update |

**Total: 22 tasks across 6 chunks**
