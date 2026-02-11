import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useGlobalAlerts } from '../hooks/useGlobalAlerts';
import { supabase } from '../lib/supabase';

const mockSupabase = vi.mocked(supabase);

describe('useGlobalAlerts', () => {
    beforeEach(() => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        vi.clearAllMocks();
        localStorage.clear();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should return initial empty state', () => {
        const { result } = renderHook(() => useGlobalAlerts(undefined));
        expect(result.current.activeAlerts).toEqual([]);
        expect(result.current.visibleAlerts).toEqual([]);
    });

    it('should not fetch if userId is undefined', () => {
        renderHook(() => useGlobalAlerts(undefined));
        expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should fetch global alerts when userId is provided', async () => {
        const mockAlerts = [
            { id: 'ga-1', message: 'Manutenção', type: 'WARNING', created_at: '2026-01-01', expires_at: '2026-12-31', created_by: 'admin' },
            { id: 'ga-2', message: 'Sistema OK', type: 'INFO', created_at: '2026-01-01', expires_at: '2026-12-31', created_by: 'admin' }
        ];

        const orderMock = vi.fn().mockResolvedValue({ data: mockAlerts, error: null });
        const gtMock = vi.fn().mockReturnValue({ order: orderMock });
        const selectMock = vi.fn().mockReturnValue({ gt: gtMock });
        mockSupabase.from.mockReturnValue({
            select: selectMock,
            insert: vi.fn(),
            update: vi.fn(),
            delete: vi.fn()
        } as any);

        const { result } = renderHook(() => useGlobalAlerts('user-1'));

        await waitFor(() => {
            expect(result.current.activeAlerts).toHaveLength(2);
        });

        expect(result.current.visibleAlerts).toHaveLength(2);
    });

    it('should filter dismissed alerts from visibleAlerts', async () => {
        const mockAlerts = [
            { id: 'ga-1', message: 'Manutenção', type: 'WARNING', created_at: '2026-01-01', expires_at: '2026-12-31', created_by: 'admin' },
            { id: 'ga-2', message: 'Sistema OK', type: 'INFO', created_at: '2026-01-01', expires_at: '2026-12-31', created_by: 'admin' }
        ];

        // Dismiss ga-1 before rendering
        localStorage.setItem('dismissed_alerts_user-1', JSON.stringify(['ga-1']));

        const orderMock = vi.fn().mockResolvedValue({ data: mockAlerts, error: null });
        const gtMock = vi.fn().mockReturnValue({ order: orderMock });
        const selectMock = vi.fn().mockReturnValue({ gt: gtMock });
        mockSupabase.from.mockReturnValue({
            select: selectMock,
            insert: vi.fn(),
            update: vi.fn(),
            delete: vi.fn()
        } as any);

        const { result } = renderHook(() => useGlobalAlerts('user-1'));

        await waitFor(() => {
            expect(result.current.activeAlerts).toHaveLength(2);
        });

        expect(result.current.visibleAlerts).toHaveLength(1);
        expect(result.current.visibleAlerts[0]!.id).toBe('ga-2');
    });

    it('should expose previousAlertIds and setPreviousAlertIds', () => {
        const { result } = renderHook(() => useGlobalAlerts(undefined));
        expect(result.current.previousAlertIds).toEqual([]);
        expect(typeof result.current.setPreviousAlertIds).toBe('function');
    });
});
