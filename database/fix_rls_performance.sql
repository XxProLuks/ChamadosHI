-- =========================================================================
-- FIX: RLS Performance Optimization
-- Resolves: auth_rls_initplan + multiple_permissive_policies
-- Date: 2026-02-11
-- 
-- ISSUE 1: auth.uid() is re-evaluated per row. Fix: wrap in (select ...)
-- ISSUE 2: Duplicate permissive policies on same table/role/action
--
-- HOW TO RUN: Execute this SQL in Supabase Dashboard > SQL Editor
-- =========================================================================

BEGIN;

-- =========================================================
-- PART 1: Fix auth_rls_initplan (wrap auth.uid() in select)
-- =========================================================

-- ---------------------------------------------------------
-- 1.1 PROFILES
-- ---------------------------------------------------------

-- Drop and recreate: "Users can update their own profile"
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING ((select auth.uid()) = id);

-- Drop and recreate: "Admins can delete profiles"
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;
CREATE POLICY "Admins can delete profiles"
    ON profiles FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = (select auth.uid()) AND profiles.role = 'ADMIN'
        )
    );

-- ---------------------------------------------------------
-- 1.2 SECTORS (also uses auth.uid() in subquery)
-- ---------------------------------------------------------

DROP POLICY IF EXISTS "Only admins can modify sectors" ON sectors;
CREATE POLICY "Only admins can modify sectors"
    ON sectors FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = (select auth.uid()) AND profiles.role = 'ADMIN'
        )
    );

-- ---------------------------------------------------------
-- 1.3 TICKETS
-- ---------------------------------------------------------

-- Fix: "Users can view relevant tickets"
DROP POLICY IF EXISTS "Users can view relevant tickets" ON tickets;

-- Fix: "Users can see all tickets" (duplicate SELECT - keep only one)
DROP POLICY IF EXISTS "Users can see all tickets" ON tickets;
DROP POLICY IF EXISTS "Anyone can view tickets" ON tickets;
CREATE POLICY "Users can view all tickets"
    ON tickets FOR SELECT
    USING (true);

-- Fix: "Users can create tickets"
DROP POLICY IF EXISTS "Users can create tickets" ON tickets;
DROP POLICY IF EXISTS "Authenticated users can create tickets" ON tickets;
CREATE POLICY "Users can create tickets"
    ON tickets FOR INSERT
    WITH CHECK ((select auth.uid()) IS NOT NULL);

-- Fix: "Owners can update their own tickets" + "Técnicos can update any ticket"
-- Merge into single policy to avoid multiple_permissive_policies
DROP POLICY IF EXISTS "Owners can update their own tickets" ON tickets;
DROP POLICY IF EXISTS "Técnicos can update any ticket" ON tickets;
DROP POLICY IF EXISTS "Technicians and admins can update tickets" ON tickets;
DROP POLICY IF EXISTS "Technicians and admins can pin tickets" ON tickets;
CREATE POLICY "Users can update tickets"
    ON tickets FOR UPDATE
    USING (
        (select auth.uid()) = requester_id
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = (select auth.uid())
            AND profiles.role IN ('TECNICO', 'ADMIN')
        )
    );

-- Fix: "Creator can delete own TODO tickets"
DROP POLICY IF EXISTS "Creator can delete own TODO tickets" ON tickets;
DROP POLICY IF EXISTS "Admins can delete tickets" ON tickets;
CREATE POLICY "Users can delete tickets"
    ON tickets FOR DELETE
    USING (
        ((select auth.uid()) = requester_id AND status = 'TODO')
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = (select auth.uid()) AND profiles.role = 'ADMIN'
        )
    );

-- ---------------------------------------------------------
-- 1.4 TICKET MESSAGES
-- ---------------------------------------------------------

-- Fix duplicate SELECT policies
DROP POLICY IF EXISTS "Users can view relevant messages" ON ticket_messages;
DROP POLICY IF EXISTS "Users can view ticket messages" ON ticket_messages;
DROP POLICY IF EXISTS "Anyone can view ticket messages" ON ticket_messages;
CREATE POLICY "Users can view ticket messages"
    ON ticket_messages FOR SELECT
    USING (true);

-- Fix: "Authenticated users can send messages"
DROP POLICY IF EXISTS "Authenticated users can send messages" ON ticket_messages;
CREATE POLICY "Authenticated users can send messages"
    ON ticket_messages FOR INSERT
    WITH CHECK ((select auth.uid()) IS NOT NULL);

-- ---------------------------------------------------------
-- 1.5 TICKET HISTORY
-- ---------------------------------------------------------

-- Fix: "Users can view relevant history"
DROP POLICY IF EXISTS "Users can view relevant history" ON ticket_history;
DROP POLICY IF EXISTS "Anyone can view ticket history" ON ticket_history;
CREATE POLICY "Anyone can view ticket history"
    ON ticket_history FOR SELECT
    USING (true);

-- Fix: "Users can insert history"
DROP POLICY IF EXISTS "Users can insert history" ON ticket_history;
DROP POLICY IF EXISTS "System can insert history" ON ticket_history;
CREATE POLICY "Users can insert history"
    ON ticket_history FOR INSERT
    WITH CHECK ((select auth.uid()) IS NOT NULL);

-- ---------------------------------------------------------
-- 1.6 NOTIFICATIONS
-- ---------------------------------------------------------

-- Fix: "Users can see their own notifications"
DROP POLICY IF EXISTS "Users can see their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can see their own notifications"
    ON notifications FOR SELECT
    USING ((select auth.uid()) = user_id);

-- Fix: "Users can update their own notifications"
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications"
    ON notifications FOR UPDATE
    USING ((select auth.uid()) = user_id);

-- ---------------------------------------------------------
-- 1.7 GLOBAL ALERTS
-- ---------------------------------------------------------

-- Fix: "Admins/Techs can insert alerts"
DROP POLICY IF EXISTS "Admins/Techs can insert alerts" ON global_alerts;
CREATE POLICY "Admins/Techs can insert alerts"
    ON global_alerts FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = (select auth.uid())
            AND profiles.role IN ('ADMIN', 'TECNICO')
        )
    );

-- Fix: "Admins/Techs can delete alerts"
DROP POLICY IF EXISTS "Admins/Techs can delete alerts" ON global_alerts;
CREATE POLICY "Admins/Techs can delete alerts"
    ON global_alerts FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = (select auth.uid())
            AND profiles.role IN ('ADMIN', 'TECNICO')
        )
    );

-- ---------------------------------------------------------
-- 1.8 ATTACHMENTS
-- ---------------------------------------------------------

-- Fix: "Users can view attachments for tickets they can access"
DROP POLICY IF EXISTS "Users can view attachments for tickets they can access" ON attachments;
CREATE POLICY "Users can view attachments"
    ON attachments FOR SELECT
    USING (true);

-- Fix: "Authenticated users can upload attachments"
DROP POLICY IF EXISTS "Authenticated users can upload attachments" ON attachments;
CREATE POLICY "Authenticated users can upload attachments"
    ON attachments FOR INSERT
    WITH CHECK ((select auth.uid()) IS NOT NULL);

-- Fix: "Users can delete their own attachments"
DROP POLICY IF EXISTS "Users can delete their own attachments" ON attachments;
CREATE POLICY "Users can delete their own attachments"
    ON attachments FOR DELETE
    USING ((select auth.uid()) = uploaded_by);

-- ---------------------------------------------------------
-- 1.9 SYSTEM SETTINGS
-- ---------------------------------------------------------

-- Fix: "Only admins can update system settings"
DROP POLICY IF EXISTS "Only admins can update system settings" ON system_settings;
CREATE POLICY "Only admins can update system settings"
    ON system_settings FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = (select auth.uid()) AND profiles.role = 'ADMIN'
        )
    );

-- Fix: "Only admins can insert system settings"
DROP POLICY IF EXISTS "Only admins can insert system settings" ON system_settings;
CREATE POLICY "Only admins can insert system settings"
    ON system_settings FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = (select auth.uid()) AND profiles.role = 'ADMIN'
        )
    );

-- ---------------------------------------------------------
-- 1.10 ERP SYNC LOG
-- ---------------------------------------------------------

DROP POLICY IF EXISTS "Only admins can view ERP sync logs" ON erp_sync_log;
CREATE POLICY "Only admins can view ERP sync logs"
    ON erp_sync_log FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = (select auth.uid()) AND profiles.role = 'ADMIN'
        )
    );

-- ---------------------------------------------------------
-- 1.11 ERP CONFIG
-- ---------------------------------------------------------

DROP POLICY IF EXISTS "Only admins can manage ERP config" ON erp_config;
CREATE POLICY "Only admins can manage ERP config"
    ON erp_config FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = (select auth.uid()) AND profiles.role = 'ADMIN'
        )
    );

COMMIT;

-- =========================================================================
-- VERIFICATION: Run this after to confirm no more lint warnings
-- =========================================================================
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, cmd;
