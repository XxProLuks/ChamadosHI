import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    hasNotificationSupport,
    getNotificationPermissionStatus,
    requestNotificationPermission,
    sendDesktopNotification
} from '../lib/notifications';
import type { GlobalAlert } from '../types';

// Helper: mock alert
function mockAlert(overrides: Partial<GlobalAlert> = {}): GlobalAlert {
    return {
        id: 'alert-1',
        message: 'Test alert message',
        type: 'CRITICAL',
        created_at: '2026-01-01T00:00:00Z',
        expires_at: '2026-12-31T23:59:59Z',
        created_by: 'user-1',
        ...overrides
    };
}

describe('notifications - hasNotificationSupport', () => {
    it('should return true when Notification API exists', () => {
        (window as any).Notification = { permission: 'default', requestPermission: vi.fn() };
        expect(hasNotificationSupport()).toBe(true);
    });

    it('should return false when Notification API missing', () => {
        const saved = (window as any).Notification;
        delete (window as any).Notification;
        expect(hasNotificationSupport()).toBe(false);
        (window as any).Notification = saved;
    });
});

describe('notifications - getNotificationPermissionStatus', () => {
    it('should return current permission when API exists', () => {
        (window as any).Notification = { permission: 'granted', requestPermission: vi.fn() };
        expect(getNotificationPermissionStatus()).toBe('granted');
    });

    it('should return denied when API missing', () => {
        const saved = (window as any).Notification;
        delete (window as any).Notification;
        expect(getNotificationPermissionStatus()).toBe('denied');
        (window as any).Notification = saved;
    });
});

describe('notifications - requestNotificationPermission', () => {
    it('should return granted if already granted', async () => {
        (window as any).Notification = { permission: 'granted', requestPermission: vi.fn() };
        const result = await requestNotificationPermission();
        expect(result).toBe('granted');
    });

    it('should return denied when API not supported', async () => {
        const saved = (window as any).Notification;
        delete (window as any).Notification;
        const result = await requestNotificationPermission();
        expect(result).toBe('denied');
        (window as any).Notification = saved;
    });

    it('should request permission when status is default', async () => {
        const requestPermission = vi.fn().mockResolvedValue('granted');
        (window as any).Notification = { permission: 'default', requestPermission };
        const result = await requestNotificationPermission();
        expect(requestPermission).toHaveBeenCalled();
        expect(result).toBe('granted');
    });

    it('should return denied when permission already denied', async () => {
        (window as any).Notification = { permission: 'denied', requestPermission: vi.fn() };
        const result = await requestNotificationPermission();
        expect(result).toBe('denied');
    });
});

describe('notifications - sendDesktopNotification', () => {
    let constructorCalls: any[];

    beforeEach(() => {
        vi.useFakeTimers();
        constructorCalls = [];

        // Use a real constructor function so `new Notification(...)` works
        function MockNotification(this: any, title: string, options: any) {
            this.title = title;
            this.body = options?.body;
            this.requireInteraction = options?.requireInteraction;
            this.silent = options?.silent;
            this.tag = options?.tag;
            this.close = vi.fn();
            this.onclick = null;
            constructorCalls.push({ title, options, instance: this });
        }
        (MockNotification as any).permission = 'granted';
        (MockNotification as any).requestPermission = vi.fn();
        (window as any).Notification = MockNotification;
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should do nothing if Notification API missing', () => {
        const saved = (window as any).Notification;
        delete (window as any).Notification;
        sendDesktopNotification(mockAlert());
        expect(constructorCalls).toHaveLength(0);
        (window as any).Notification = saved;
    });

    it('should do nothing if permission not granted', () => {
        (window as any).Notification.permission = 'denied';
        sendDesktopNotification(mockAlert());
        expect(constructorCalls).toHaveLength(0);
    });

    it('should create notification for CRITICAL alerts with requireInteraction', () => {
        sendDesktopNotification(mockAlert({ type: 'CRITICAL' }));
        expect(constructorCalls).toHaveLength(1);
        const call = constructorCalls[0];
        expect(call.title).toBe('Hospital de Ilhéus - Alerta');
        expect(call.options.body).toBe('Test alert message');
        expect(call.options.requireInteraction).toBe(true);
        expect(call.options.silent).toBe(false);
    });

    it('should create silent notification for INFO alerts', () => {
        sendDesktopNotification(mockAlert({ type: 'INFO' }));
        expect(constructorCalls).toHaveLength(1);
        const call = constructorCalls[0];
        expect(call.options.silent).toBe(true);
        expect(call.options.requireInteraction).toBe(false);
    });

    it('should use alert.id as tag to prevent duplicates', () => {
        sendDesktopNotification(mockAlert({ id: 'unique-alert-42' }));
        expect(constructorCalls[0].options.tag).toBe('unique-alert-42');
    });
});
