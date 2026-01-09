const DISMISSED_ALERTS_PREFIX = 'dismissed_alerts_';

export function markAlertAsDismissed(alertId: string, userId: string): void {
    const key = `${DISMISSED_ALERTS_PREFIX}${userId}`;
    const dismissed = getDismissedAlerts(userId);

    if (!dismissed.includes(alertId)) {
        dismissed.push(alertId);
        localStorage.setItem(key, JSON.stringify(dismissed));
    }
}

export function getDismissedAlerts(userId: string): string[] {
    const key = `${DISMISSED_ALERTS_PREFIX}${userId}`;
    const stored = localStorage.getItem(key);

    if (!stored) {
        return [];
    }

    try {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export function isAlertDismissed(alertId: string, userId: string): boolean {
    const dismissed = getDismissedAlerts(userId);
    return dismissed.includes(alertId);
}

export function clearDismissedAlerts(userId: string): void {
    const key = `${DISMISSED_ALERTS_PREFIX}${userId}`;
    localStorage.removeItem(key);
}

// Clean up dismissed alerts for expired alerts
export function cleanupDismissedAlerts(userId: string, activeAlertIds: string[]): void {
    const dismissed = getDismissedAlerts(userId);
    const cleaned = dismissed.filter(id => activeAlertIds.includes(id));

    const key = `${DISMISSED_ALERTS_PREFIX}${userId}`;
    localStorage.setItem(key, JSON.stringify(cleaned));
}
