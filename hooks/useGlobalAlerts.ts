import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { GlobalAlert } from '../types';

export const useGlobalAlerts = (userId: string | undefined) => {
    const [activeAlerts, setActiveAlerts] = useState<GlobalAlert[]>([]);
    const [previousAlertIds, setPreviousAlertIds] = useState<string[]>([]);

    const fetchActiveAlerts = useCallback(async () => {
        const { data, error } = await supabase
            .from('global_alerts')
            .select('*')
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false });

        if (!error && data) {
            setActiveAlerts(data);
        }
    }, []);

    useEffect(() => {
        if (!userId) return;

        fetchActiveAlerts();

        const alertsChannel = supabase
            .channel('global_alerts_sync')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'global_alerts' },
                () => {
                    fetchActiveAlerts();
                }
            )
            .subscribe();

        const interval = setInterval(() => {
            fetchActiveAlerts();
        }, 60000);

        return () => {
            supabase.removeChannel(alertsChannel);
            clearInterval(interval);
        };
    }, [userId, fetchActiveAlerts]);

    const isAlertDismissed = (alertId: string, userId: string) => {
        const dismissed = JSON.parse(localStorage.getItem(`dismissed_alerts_${userId}`) || '[]');
        return dismissed.includes(alertId);
    };

    const visibleAlerts = useMemo(
        () => activeAlerts.filter(alert => !isAlertDismissed(alert.id, userId || '')),
        [activeAlerts, userId]
    );

    return {
        activeAlerts,
        visibleAlerts,
        previousAlertIds,
        setPreviousAlertIds,
        refreshAlerts: fetchActiveAlerts
    };
};
