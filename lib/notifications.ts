import { GlobalAlert } from '../types';

export async function requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
        console.warn('Browser does not support notifications');
        return 'denied';
    }

    if (Notification.permission === 'granted') {
        return 'granted';
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission;
    }

    return Notification.permission;
}

export function sendDesktopNotification(alert: GlobalAlert): void {
    if (!('Notification' in window)) {
        return;
    }

    if (Notification.permission !== 'granted') {
        return;
    }

    const iconMap = {
        CRITICAL: '🚨',
        WARNING: '⚠️',
        INFO: 'ℹ️'
    };

    const notification = new Notification('Hospital de Ilhéus - Alerta', {
        body: alert.message,
        icon: '/hospital-icon.png',
        badge: '/badge.png',
        tag: alert.id, // Prevents duplicate notifications
        requireInteraction: alert.type === 'CRITICAL', // Stays until dismissed for critical
        silent: alert.type === 'INFO',
        data: {
            alertId: alert.id,
            type: alert.type
        }
    });

    notification.onclick = () => {
        window.focus();
        notification.close();
    };

    // Auto-close INFO notifications after 10 seconds
    if (alert.type === 'INFO') {
        setTimeout(() => notification.close(), 10000);
    }
}

export function hasNotificationSupport(): boolean {
    return 'Notification' in window;
}

export function getNotificationPermissionStatus(): NotificationPermission {
    if (!hasNotificationSupport()) {
        return 'denied';
    }
    return Notification.permission;
}
