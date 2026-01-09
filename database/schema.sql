-- ===========================================
-- Hospital Saint-Louis - Sistema de Chamados
-- COMPREHENSIVE Database Schema for Supabase
-- Last Updated: 2026-01-08
-- ===========================================

-- ===========================================
-- PROFILES TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'SOLICITANTE' CHECK (role IN ('SOLICITANTE', 'TECNICO', 'ADMIN')),
    avatar_url TEXT,
    sector TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles"
    ON profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'role', 'SOLICITANTE')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===========================================
-- SECTORS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS sectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    icon TEXT NOT NULL DEFAULT 'Building',
    "colorClass" TEXT NOT NULL DEFAULT 'bg-slate-100 text-slate-600',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for sectors
ALTER TABLE sectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view sectors"
    ON sectors FOR SELECT
    USING (true);

CREATE POLICY "Only admins can modify sectors"
    ON sectors FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
        )
    );

-- Sample sectors
INSERT INTO sectors (name, icon, "colorClass") VALUES
    ('Administração', 'Building', 'bg-slate-100 text-slate-600'),
    ('UTI', 'Activity', 'bg-red-100 text-red-600'),
    ('Farmácia', 'Pill', 'bg-green-100 text-green-600'),
    ('Laboratório', 'FlaskConical', 'bg-purple-100 text-purple-600'),
    ('Emergência', 'Zap', 'bg-orange-100 text-orange-600'),
    ('Recepção', 'Phone', 'bg-blue-100 text-blue-600'),
    ('Enfermaria', 'Bed', 'bg-cyan-100 text-cyan-600'),
    ('TI', 'Cpu', 'bg-indigo-100 text-indigo-600')
ON CONFLICT (name) DO NOTHING;

-- ===========================================
-- TICKETS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    location TEXT NOT NULL,
    sector_id UUID REFERENCES sectors(id) ON DELETE SET NULL,
    category TEXT NOT NULL DEFAULT 'CHAMADO' CHECK (category IN ('CHAMADO', 'CRITICAL', 'MAINTENANCE', 'CLIMATIZACAO', 'TI')),
    status TEXT NOT NULL DEFAULT 'TODO' CHECK (status IN ('TODO', 'IN_PROGRESS', 'DONE')),
    priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    requester_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    technician_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    image_url TEXT,
    image_urls TEXT[] DEFAULT '{}',
    is_critical BOOLEAN DEFAULT FALSE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    rating_comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for tickets
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tickets"
    ON tickets FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can create tickets"
    ON tickets FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Technicians and admins can update tickets"
    ON tickets FOR UPDATE
    USING (
        auth.uid() = requester_id OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role IN ('TECNICO', 'ADMIN')
        )
    );

CREATE POLICY "Admins can delete tickets"
    ON tickets FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
        )
    );

-- ===========================================
-- TICKET MESSAGES TABLE (Chat)
-- ===========================================
CREATE TABLE IF NOT EXISTS ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    image_url TEXT,
    image_urls TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for ticket_messages
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view ticket messages"
    ON ticket_messages FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can send messages"
    ON ticket_messages FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- ===========================================
-- TICKET HISTORY TABLE (Audit Trail)
-- ===========================================
CREATE TABLE IF NOT EXISTS ticket_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for ticket_history
ALTER TABLE ticket_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view ticket history"
    ON ticket_history FOR SELECT
    USING (true);

CREATE POLICY "System can insert history"
    ON ticket_history FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Trigger to log status changes
CREATE OR REPLACE FUNCTION public.log_ticket_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO ticket_history (ticket_id, user_id, action, old_value, new_value)
        VALUES (NEW.id, auth.uid(), 'STATUS_CHANGE', OLD.status, NEW.status);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_ticket_update ON tickets;
CREATE TRIGGER on_ticket_update
    AFTER UPDATE ON tickets
    FOR EACH ROW EXECUTE FUNCTION log_ticket_changes();

-- Trigger to log rating
CREATE OR REPLACE FUNCTION public.log_ticket_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF OLD.rating IS NULL AND NEW.rating IS NOT NULL THEN
        INSERT INTO ticket_history (ticket_id, user_id, action, old_value, new_value)
        VALUES (NEW.id, auth.uid(), 'RATING_GIVEN', NULL, NEW.rating::text);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_ticket_rating ON tickets;
CREATE TRIGGER on_ticket_rating
    AFTER UPDATE ON tickets
    FOR EACH ROW 
    WHEN (OLD.rating IS DISTINCT FROM NEW.rating)
    EXECUTE FUNCTION log_ticket_rating();

-- ===========================================
-- GLOBAL ALERTS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS global_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message TEXT NOT NULL,
    type TEXT CHECK (type IN ('INFO', 'WARNING', 'CRITICAL')) DEFAULT 'INFO',
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '24 hours'),
    created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
    dismissed_by JSONB DEFAULT '[]',
    view_count INTEGER DEFAULT 0,
    dismiss_count INTEGER DEFAULT 0,
    -- Constraint: expires_at must be after created_at
    CONSTRAINT valid_expiration CHECK (expires_at > created_at)
);

-- RLS for global_alerts
ALTER TABLE global_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view alerts"
    ON global_alerts FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins/Techs can insert alerts"
    ON global_alerts FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('ADMIN', 'TECNICO')
        )
    );

CREATE POLICY "Admins/Techs can delete alerts"
    ON global_alerts FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('ADMIN', 'TECNICO')
        )
    );

-- ===========================================
-- NOTIFICATIONS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- ===========================================
-- REALTIME SUBSCRIPTIONS
-- ===========================================
ALTER PUBLICATION supabase_realtime ADD TABLE tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE ticket_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE global_alerts;

-- ===========================================
-- INDEXES FOR PERFORMANCE
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_requester ON tickets(requester_id);
CREATE INDEX IF NOT EXISTS idx_tickets_technician ON tickets(technician_id);
CREATE INDEX IF NOT EXISTS idx_tickets_sector ON tickets(sector_id);
CREATE INDEX IF NOT EXISTS idx_tickets_created ON tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_history_ticket ON ticket_history(ticket_id);
CREATE INDEX IF NOT EXISTS idx_global_alerts_expires ON global_alerts(expires_at);
