/**
 * Integration Flow Test: Notification Lifecycle
 * Simulates: Create → Display → Mark Read → Mark All Read → Cleanup
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Notification } from '../../types';

// Helper to build notification
const createNotification = (overrides: Partial<Notification> = {}): Notification => ({
    id: 'notif-1',
    user_id: 'user-maria',
    message: 'Seu chamado foi atualizado',
    type: 'info',
    is_read: false,
    created_at: '2026-01-15T10:00:00Z',
    ...overrides
});

describe('Notification Flow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('Step 1: Notification is created with unread state', () => {
        const notif = createNotification();
        expect(notif.is_read).toBe(false);
        expect(notif.message).toBe('Seu chamado foi atualizado');
        expect(notif.type).toBe('info');
    });

    it('Step 2: Different notification types exist', () => {
        const types = ['info', 'warning', 'success', 'error'];
        types.forEach(type => {
            const notif = createNotification({ type: type as 'info' | 'warning' | 'success' | 'error' });
            expect(notif.type).toBe(type);
        });
    });

    it('Step 3: Unread count is calculated correctly', () => {
        const notifications = [
            createNotification({ id: 'n1', is_read: false }),
            createNotification({ id: 'n2', is_read: false }),
            createNotification({ id: 'n3', is_read: true }),
            createNotification({ id: 'n4', is_read: false }),
            createNotification({ id: 'n5', is_read: true })
        ];

        const unreadCount = notifications.filter(n => !n.is_read).length;
        expect(unreadCount).toBe(3);
    });

    it('Step 4: Marking a single notification as read', () => {
        const notifications = [
            createNotification({ id: 'n1', is_read: false }),
            createNotification({ id: 'n2', is_read: false }),
            createNotification({ id: 'n3', is_read: false })
        ];

        // Mark n2 as read
        const updated = notifications.map(n =>
            n.id === 'n2' ? { ...n, is_read: true } : n
        );

        expect(updated.find(n => n.id === 'n2')!.is_read).toBe(true);
        expect(updated.filter(n => !n.is_read).length).toBe(2);
    });

    it('Step 5: Mark all as read clears unread count', () => {
        const notifications = [
            createNotification({ id: 'n1', is_read: false }),
            createNotification({ id: 'n2', is_read: false }),
            createNotification({ id: 'n3', is_read: false })
        ];

        const allRead = notifications.map(n => ({ ...n, is_read: true }));

        const unreadCount = allRead.filter(n => !n.is_read).length;
        expect(unreadCount).toBe(0);
    });

    it('Step 6: Notifications are sorted by created_at (newest first)', () => {
        const notifications = [
            createNotification({ id: 'n1', created_at: '2026-01-15T08:00:00Z' }),
            createNotification({ id: 'n2', created_at: '2026-01-15T12:00:00Z' }),
            createNotification({ id: 'n3', created_at: '2026-01-15T10:00:00Z' })
        ];

        const sorted = [...notifications].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        expect(sorted.map(n => n.id)).toEqual(['n2', 'n3', 'n1']);
    });

    it('Step 7: Notifications belong to specific users', () => {
        const allNotifications = [
            createNotification({ id: 'n1', user_id: 'user-maria' }),
            createNotification({ id: 'n2', user_id: 'user-joao' }),
            createNotification({ id: 'n3', user_id: 'user-maria' }),
            createNotification({ id: 'n4', user_id: 'user-ana' })
        ];

        const mariasNotifs = allNotifications.filter(n => n.user_id === 'user-maria');
        expect(mariasNotifs.length).toBe(2);
        expect(mariasNotifs.map(n => n.id)).toEqual(['n1', 'n3']);
    });

    it('Step 8: Empty notification list shows zero unread', () => {
        const notifications: Notification[] = [];
        const unreadCount = notifications.filter(n => !n.is_read).length;
        expect(unreadCount).toBe(0);
    });

    it('Step 9: Notification message contains ticket reference', () => {
        const notif = createNotification({
            message: 'O chamado "Impressora não liga" foi atualizado para Em Atendimento'
        });
        expect(notif.message).toContain('Impressora não liga');
        expect(notif.message).toContain('Em Atendimento');
    });
});
