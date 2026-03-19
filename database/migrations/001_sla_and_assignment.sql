-- ===========================================
-- V2 Migration: SLA, Assignment, WAITING status
-- Hospital de Ilhéus - Sistema de Chamados
-- Date: 2026-03-19
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

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can view SLA config') THEN
        CREATE POLICY "Authenticated users can view SLA config"
            ON sla_config FOR SELECT
            USING (auth.uid() IS NOT NULL);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage SLA config') THEN
        CREATE POLICY "Admins can manage SLA config"
            ON sla_config FOR ALL
            USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'))
            WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'));
    END IF;
END $$;

INSERT INTO sla_config (priority, deadline_hours) VALUES
    ('CRITICAL', 1), ('HIGH', 4), ('MEDIUM', 24), ('LOW', 72)
ON CONFLICT (priority) DO NOTHING;

-- 6. Technician-sector binding table
CREATE TABLE IF NOT EXISTS technician_sectors (
    technician_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    sector_id TEXT REFERENCES sectors(id) ON DELETE CASCADE,
    PRIMARY KEY (technician_id, sector_id)
);

ALTER TABLE technician_sectors ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view technician sectors') THEN
        CREATE POLICY "Anyone can view technician sectors"
            ON technician_sectors FOR SELECT USING (true);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage technician sectors') THEN
        CREATE POLICY "Admins can manage technician sectors"
            ON technician_sectors FOR ALL
            USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'))
            WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'));
    END IF;
END $$;

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
