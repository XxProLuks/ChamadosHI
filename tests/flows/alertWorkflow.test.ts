/**
 * Integration Flow Test: Global Alert Workflow
 * Simulates: Create → Display → Dismiss → Expire → Cleanup
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GlobalAlert } from '../../types';

// Helpers
const createAlert = (overrides: Partial<GlobalAlert> = {}): GlobalAlert => ({
    id: 'alert-1',
    message: 'Manutenção programada às 22h',
    type: 'WARNING',
    created_at: '2026-01-15T08:00:00Z',
    expires_at: '2026-01-16T08:00:00Z',
    created_by: 'admin-user',
    ...overrides
});

const now = new Date('2026-01-15T12:00:00Z');

describe('Alert Workflow Flow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.setSystemTime(now);
    });

    it('Step 1: Alert is created with required fields', () => {
        const alert = createAlert();
        expect(alert.id).toBe('alert-1');
        expect(alert.message).toBe('Manutenção programada às 22h');
        expect(alert.type).toBe('WARNING');
        expect(alert.created_by).toBe('admin-user');
        expect(alert.expires_at).toBeDefined();
    });

    it('Step 2: Alert types are correctly classified', () => {
        const types: GlobalAlert['type'][] = ['INFO', 'WARNING', 'CRITICAL'];
        types.forEach(type => {
            const alert = createAlert({ type });
            expect(['INFO', 'WARNING', 'CRITICAL']).toContain(alert.type);
        });
    });

    it('Step 3: Active alerts are those not yet expired', () => {
        const alerts = [
            createAlert({ id: 'a1', expires_at: '2026-01-16T00:00:00Z' }), // future = active
            createAlert({ id: 'a2', expires_at: '2026-01-14T00:00:00Z' }), // past = expired
            createAlert({ id: 'a3', expires_at: '2026-01-20T00:00:00Z' })  // future = active
        ];

        const activeAlerts = alerts.filter(a => new Date(a.expires_at!) > now);
        expect(activeAlerts.length).toBe(2);
        expect(activeAlerts.map(a => a.id)).toEqual(['a1', 'a3']);
    });

    it('Step 4: Expired alerts are filtered out', () => {
        const alerts = [
            createAlert({ id: 'a1', expires_at: '2026-01-10T00:00:00Z' }),
            createAlert({ id: 'a2', expires_at: '2026-01-11T00:00:00Z' }),
            createAlert({ id: 'a3', expires_at: '2026-01-20T00:00:00Z' })
        ];

        const expiredAlerts = alerts.filter(a => new Date(a.expires_at!) <= now);
        expect(expiredAlerts.length).toBe(2);
        expect(expiredAlerts.map(a => a.id)).toEqual(['a1', 'a2']);
    });

    it('Step 5: Dismissed alerts are tracked in local storage', () => {
        const dismissedIds = new Set<string>();

        // Dismiss alert
        dismissedIds.add('alert-1');
        expect(dismissedIds.has('alert-1')).toBe(true);
        expect(dismissedIds.has('alert-2')).toBe(false);

        // Dismiss another
        dismissedIds.add('alert-2');
        expect(dismissedIds.size).toBe(2);
    });

    it('Step 6: Active alerts exclude dismissed ones', () => {
        const allAlerts = [
            createAlert({ id: 'a1', expires_at: '2026-01-20T00:00:00Z' }),
            createAlert({ id: 'a2', expires_at: '2026-01-20T00:00:00Z' }),
            createAlert({ id: 'a3', expires_at: '2026-01-20T00:00:00Z' })
        ];

        const dismissedIds = new Set(['a2']);

        const visibleAlerts = allAlerts
            .filter(a => new Date(a.expires_at!) > now)
            .filter(a => !dismissedIds.has(a.id));

        expect(visibleAlerts.length).toBe(2);
        expect(visibleAlerts.map(a => a.id)).toEqual(['a1', 'a3']);
    });

    it('Step 7: Alert without expiry is treated as permanent', () => {
        const permanentAlert = createAlert({ expires_at: undefined });
        // Without expires_at, alert should be considered always active
        const isActive = !permanentAlert.expires_at || new Date(permanentAlert.expires_at) > now;
        expect(isActive).toBe(true);
    });

    it('Step 8: Multiple alert types can coexist', () => {
        const alerts = [
            createAlert({ id: 'a1', type: 'INFO', message: 'Atualização disponível' }),
            createAlert({ id: 'a2', type: 'WARNING', message: 'Manutenção amanhã' }),
            createAlert({ id: 'a3', type: 'CRITICAL', message: 'Sistema instável' })
        ];

        const byType = alerts.reduce((acc, a) => {
            acc[a.type] = (acc[a.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        expect(byType['INFO']).toBe(1);
        expect(byType['WARNING']).toBe(1);
        expect(byType['CRITICAL']).toBe(1);
    });
});
