import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Notification } from '../types';

export const useNotifications = (userId: string | undefined) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const fetchNotifications = useCallback(async () => {
        if (!userId) return;
        const { data } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (data) {
            const formatted = data.map(n => ({ ...n, read: n.is_read }));
            setNotifications(formatted);
        }
    }, [userId]);

    useEffect(() => {
        if (!userId) return;

        fetchNotifications();

        const notificationSubscription = supabase
            .channel('notifications-channel')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${userId}`
            }, () => {
                fetchNotifications();
            })
            .subscribe();

        return () => {
            notificationSubscription.unsubscribe();
        };
    }, [userId, fetchNotifications]);

    const markAllAsRead = async () => {
        if (!userId) return;
        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', userId);
        fetchNotifications();
    };

    return {
        notifications,
        markAllAsRead,
        refreshNotifications: fetchNotifications
    };
};
