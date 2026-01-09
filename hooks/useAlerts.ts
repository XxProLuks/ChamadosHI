import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { GlobalAlert } from '../types';
import { isAlertDismissed, markAlertAsDismissed } from '../lib/localStorage';
import { sendDesktopNotification } from '../lib/notifications';
import toast from 'react-hot-toast';
import type { Session } from '@supabase/supabase-js';

interface UseAlertsOptions {
    session: Session | null;
}

interface UseAlertsReturn {
    activeAlerts: GlobalAlert[];
    visibleAlerts: GlobalAlert[];
    loading: boolean;
    fetchAlerts: () => Promise<void>;
    dismissAlert: (alertId: string) => void;
    // Stats
    alertCount: number;
}

/**
 * Custom hook for managing global alerts
 * Handles fetching, filtering dismissed alerts, and notifications
 */
export function useAlerts({ session }: UseAlertsOptions): UseAlertsReturn {
    const [activeAlerts, setActiveAlerts] = useState<GlobalAlert[]>([]);
    const [previousAlertIds, setPreviousAlertIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchAlerts = useCallback(async () => {
        if (!session) return;

        try {
            const { data, error } = await supabase
                .from('global_alerts')
                .select('*')
                .gt('expires_at', new Date().toISOString())
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (data) setActiveAlerts(data);
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Erro desconhecido';
            console.error('Erro ao buscar alertas:', msg);
        } finally {
            setLoading(false);
        }
    }, [session]);

    // Filter out dismissed alerts
    const visibleAlerts = useMemo(
        () => activeAlerts.filter(alert => !isAlertDismissed(alert.id, session?.user?.id || '')),
        [activeAlerts, session?.user?.id]
    );

    // Dismiss an alert
    const dismissAlert = useCallback((alertId: string) => {
        if (!session?.user?.id) return;
        markAlertAsDismissed(alertId, session.user.id);
        // Force re-render by updating state
        setActiveAlerts(prev => [...prev]);
    }, [session?.user?.id]);

    // Desktop notifications for new CRITICAL alerts
    useEffect(() => {
        if (!session) return;

        const currentIds = activeAlerts.map(a => a.id);
        const newAlerts = activeAlerts.filter(alert =>
            !previousAlertIds.includes(alert.id) && alert.type === 'CRITICAL'
        );

        newAlerts.forEach(sendDesktopNotification);
        setPreviousAlertIds(currentIds);
    }, [activeAlerts, session, previousAlertIds]);

    // Initial fetch and realtime subscription
    useEffect(() => {
        if (!session) return;

        fetchAlerts();

        const alertsChannel = supabase
            .channel('global_alerts_hook')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'global_alerts' },
                () => fetchAlerts()
            )
            .subscribe();

        // Backup polling
        const interval = setInterval(fetchAlerts, 60000);

        return () => {
            supabase.removeChannel(alertsChannel);
            clearInterval(interval);
        };
    }, [session, fetchAlerts]);

    return {
        activeAlerts,
        visibleAlerts,
        loading,
        fetchAlerts,
        dismissAlert,
        alertCount: visibleAlerts.length
    };
}

export default useAlerts;
