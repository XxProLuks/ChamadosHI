import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { supabase } from '../lib/supabase';

/**
 * Note: useAlerts has a useEffect dependency on `previousAlertIds` that causes
 * infinite re-render loops when the hook renders with a session (each render updates
 * previousAlertIds, triggering re-render). These tests only cover the null-session
 * path and API surface. Full integration testing requires fixing the hook's dependency array.
 */

vi.mock('../lib/notifications', () => ({
    sendDesktopNotification: vi.fn(),
    hasNotificationSupport: vi.fn(() => false),
    getNotificationPermissionStatus: vi.fn(() => 'denied'),
    requestNotificationPermission: vi.fn(() => Promise.resolve('denied'))
}));

const mockSupabase = vi.mocked(supabase);

describe('useAlerts', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('should return correct initial state with null session', async () => {
        const { useAlerts } = await import('../hooks/useAlerts');
        const { result } = renderHook(() => useAlerts({ session: null }));

        expect(result.current.activeAlerts).toEqual([]);
        expect(result.current.visibleAlerts).toEqual([]);
        expect(result.current.loading).toBe(true);
        expect(result.current.alertCount).toBe(0);
    });

    it('should not call supabase when session is null', async () => {
        const { useAlerts } = await import('../hooks/useAlerts');
        renderHook(() => useAlerts({ session: null }));

        expect(mockSupabase.from).not.toHaveBeenCalled();
        expect(mockSupabase.channel).not.toHaveBeenCalled();
    });

    it('should expose dismissAlert as a function', async () => {
        const { useAlerts } = await import('../hooks/useAlerts');
        const { result } = renderHook(() => useAlerts({ session: null }));

        expect(typeof result.current.dismissAlert).toBe('function');
    });

    it('should expose fetchAlerts as a function', async () => {
        const { useAlerts } = await import('../hooks/useAlerts');
        const { result } = renderHook(() => useAlerts({ session: null }));

        expect(typeof result.current.fetchAlerts).toBe('function');
    });

    it('dismissAlert should be noop without session', async () => {
        const { useAlerts } = await import('../hooks/useAlerts');
        const { result } = renderHook(() => useAlerts({ session: null }));

        // Should not throw
        result.current.dismissAlert('some-alert');
        expect(result.current.visibleAlerts).toEqual([]);
    });
});
