import { describe, it, expect, beforeEach } from 'vitest';
import {
    markAlertAsDismissed,
    getDismissedAlerts,
    isAlertDismissed,
    clearDismissedAlerts,
    cleanupDismissedAlerts
} from '../lib/localStorage';

describe('localStorage - Dismissed Alerts', () => {
    const userId = 'user-123';
    const alertId1 = 'alert-aaa';
    const alertId2 = 'alert-bbb';

    beforeEach(() => {
        localStorage.clear();
    });

    // --- getDismissedAlerts ---
    describe('getDismissedAlerts', () => {
        it('should return empty array when no alerts are dismissed', () => {
            expect(getDismissedAlerts(userId)).toEqual([]);
        });

        it('should return empty array for invalid JSON', () => {
            localStorage.setItem(`dismissed_alerts_${userId}`, 'not-json');
            expect(getDismissedAlerts(userId)).toEqual([]);
        });

        it('should return empty array if stored value is not an array', () => {
            localStorage.setItem(`dismissed_alerts_${userId}`, JSON.stringify({ foo: 'bar' }));
            expect(getDismissedAlerts(userId)).toEqual([]);
        });

        it('should return stored alert ids', () => {
            localStorage.setItem(`dismissed_alerts_${userId}`, JSON.stringify([alertId1]));
            expect(getDismissedAlerts(userId)).toEqual([alertId1]);
        });
    });

    // --- markAlertAsDismissed ---
    describe('markAlertAsDismissed', () => {
        it('should add an alert id to dismissed list', () => {
            markAlertAsDismissed(alertId1, userId);
            expect(getDismissedAlerts(userId)).toEqual([alertId1]);
        });

        it('should not duplicate alert ids', () => {
            markAlertAsDismissed(alertId1, userId);
            markAlertAsDismissed(alertId1, userId);
            expect(getDismissedAlerts(userId)).toEqual([alertId1]);
        });

        it('should add multiple different alerts', () => {
            markAlertAsDismissed(alertId1, userId);
            markAlertAsDismissed(alertId2, userId);
            expect(getDismissedAlerts(userId)).toEqual([alertId1, alertId2]);
        });

        it('should keep alerts per user separate', () => {
            const otherUser = 'user-999';
            markAlertAsDismissed(alertId1, userId);
            markAlertAsDismissed(alertId2, otherUser);
            expect(getDismissedAlerts(userId)).toEqual([alertId1]);
            expect(getDismissedAlerts(otherUser)).toEqual([alertId2]);
        });
    });

    // --- isAlertDismissed ---
    describe('isAlertDismissed', () => {
        it('should return false if alert was not dismissed', () => {
            expect(isAlertDismissed(alertId1, userId)).toBe(false);
        });

        it('should return true if alert was dismissed', () => {
            markAlertAsDismissed(alertId1, userId);
            expect(isAlertDismissed(alertId1, userId)).toBe(true);
        });
    });

    // --- clearDismissedAlerts ---
    describe('clearDismissedAlerts', () => {
        it('should remove all dismissed alerts for user', () => {
            markAlertAsDismissed(alertId1, userId);
            markAlertAsDismissed(alertId2, userId);
            clearDismissedAlerts(userId);
            expect(getDismissedAlerts(userId)).toEqual([]);
        });

        it('should not affect other users', () => {
            const otherUser = 'user-999';
            markAlertAsDismissed(alertId1, userId);
            markAlertAsDismissed(alertId2, otherUser);
            clearDismissedAlerts(userId);
            expect(getDismissedAlerts(otherUser)).toEqual([alertId2]);
        });
    });

    // --- cleanupDismissedAlerts ---
    describe('cleanupDismissedAlerts', () => {
        it('should remove dismissed alerts that are no longer active', () => {
            markAlertAsDismissed(alertId1, userId);
            markAlertAsDismissed(alertId2, userId);

            // Only alertId1 is still active
            cleanupDismissedAlerts(userId, [alertId1]);
            expect(getDismissedAlerts(userId)).toEqual([alertId1]);
        });

        it('should keep all alerts if all are still active', () => {
            markAlertAsDismissed(alertId1, userId);
            markAlertAsDismissed(alertId2, userId);
            cleanupDismissedAlerts(userId, [alertId1, alertId2]);
            expect(getDismissedAlerts(userId)).toEqual([alertId1, alertId2]);
        });

        it('should result in empty list if no alerts are active', () => {
            markAlertAsDismissed(alertId1, userId);
            cleanupDismissedAlerts(userId, []);
            expect(getDismissedAlerts(userId)).toEqual([]);
        });
    });
});
