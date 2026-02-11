import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useNotifications } from '../hooks/useNotifications';
import { supabase } from '../lib/supabase';

const mockSupabase = vi.mocked(supabase);

describe('useNotifications', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return initial empty state', () => {
        const { result } = renderHook(() => useNotifications(undefined));
        expect(result.current.notifications).toEqual([]);
    });

    it('should not fetch if userId is undefined', () => {
        renderHook(() => useNotifications(undefined));
        expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should fetch notifications when userId is provided', async () => {
        const mockNotifications = [
            { id: 'n-1', user_id: 'user-1', message: 'Novo chamado', is_read: false, created_at: '2026-01-01T00:00:00Z' },
            { id: 'n-2', user_id: 'user-1', message: 'Status atualizado', is_read: true, created_at: '2026-01-02T00:00:00Z' }
        ];

        const orderMock = vi.fn().mockResolvedValue({ data: mockNotifications, error: null });
        const eqMock = vi.fn().mockReturnValue({ order: orderMock });
        const selectMock = vi.fn().mockReturnValue({ eq: eqMock });

        mockSupabase.from.mockReturnValue({
            select: selectMock,
            insert: vi.fn(),
            update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) }),
            delete: vi.fn()
        } as any);

        const { result } = renderHook(() => useNotifications('user-1'));

        await waitFor(() => {
            expect(result.current.notifications).toHaveLength(2);
        });

        expect(mockSupabase.from).toHaveBeenCalledWith('notifications');
        // Should add `read` field from `is_read`
        expect(result.current.notifications[0]!.is_read).toBe(false);
        expect(result.current.notifications[1]!.is_read).toBe(true);
    });

    it('should call markAllAsRead correctly', async () => {
        const orderMock = vi.fn().mockResolvedValue({ data: [], error: null });
        const eqMock = vi.fn().mockReturnValue({ order: orderMock });
        const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
        const updateEqMock = vi.fn().mockResolvedValue({ data: null, error: null });
        const updateMock = vi.fn().mockReturnValue({ eq: updateEqMock });

        mockSupabase.from.mockReturnValue({
            select: selectMock,
            insert: vi.fn(),
            update: updateMock,
            delete: vi.fn()
        } as any);

        const { result } = renderHook(() => useNotifications('user-1'));

        await waitFor(() => {
            expect(result.current.notifications).toBeDefined();
        });

        await act(async () => {
            await result.current.markAllAsRead();
        });

        // Should have called update with is_read: true
        expect(updateMock).toHaveBeenCalledWith({ is_read: true });
    });

    it('should not markAllAsRead if userId is undefined', async () => {
        const { result } = renderHook(() => useNotifications(undefined));

        await act(async () => {
            await result.current.markAllAsRead();
        });

        expect(mockSupabase.from).not.toHaveBeenCalled();
    });
});
