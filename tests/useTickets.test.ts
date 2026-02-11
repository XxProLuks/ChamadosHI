import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTickets } from '../hooks/useTickets';
import { supabase } from '../lib/supabase';

// Cast supabase mock for easier access
const mockSupabase = vi.mocked(supabase);

describe('useTickets', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return initial loading state', () => {
        const { result } = renderHook(() => useTickets(undefined, undefined));
        expect(result.current.tickets).toEqual([]);
        expect(result.current.loading).toBe(true);
        expect(result.current.hasMore).toBe(true);
    });

    it('should not fetch if userId is undefined', async () => {
        renderHook(() => useTickets(undefined, 'TECNICO'));
        expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should not fetch if userRole is undefined', async () => {
        renderHook(() => useTickets('user-1', undefined));
        expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should fetch tickets for a technician', async () => {
        const mockTickets = [
            {
                id: 'tk-1',
                title: 'Impressora com problema',
                status: 'TODO',
                requester_id: 'user-2',
                requester: { full_name: 'João' },
                technician: null,
                sector: { name: 'TI' },
                created_at: '2026-01-01T00:00:00Z'
            }
        ];

        // Build chaining mock: from -> select -> order -> range
        const rangeMock = vi.fn().mockResolvedValue({ data: mockTickets, error: null, count: 1 });
        const orderMock = vi.fn().mockReturnValue({ range: rangeMock });
        const selectMock = vi.fn().mockReturnValue({ order: orderMock, eq: vi.fn().mockReturnValue({ order: orderMock }) });
        mockSupabase.from.mockReturnValue({
            select: selectMock,
            insert: vi.fn(),
            update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) }),
            delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) })
        } as any);

        const { result } = renderHook(() => useTickets('user-1', 'TECNICO'));

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(mockSupabase.from).toHaveBeenCalledWith('tickets');
        expect(result.current.tickets).toHaveLength(1);
        expect(result.current.tickets[0]!.requester_name).toBe('João');
        expect(result.current.tickets[0]!.sector_name).toBe('TI');
    });

    it('should apply requester filter for SOLICITANTE role', async () => {
        const eqMock = vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 })
            })
        });
        const selectMock = vi.fn().mockReturnValue({ eq: eqMock, order: vi.fn() });
        mockSupabase.from.mockReturnValue({
            select: selectMock,
            insert: vi.fn(),
            update: vi.fn().mockReturnValue({ eq: vi.fn() }),
            delete: vi.fn().mockReturnValue({ eq: vi.fn() })
        } as any);

        renderHook(() => useTickets('user-sol', 'SOLICITANTE'));

        await waitFor(() => {
            expect(eqMock).toHaveBeenCalledWith('requester_id', 'user-sol');
        });
    });

    it('should update ticket status successfully', async () => {
        const eqMock = vi.fn().mockResolvedValue({ data: null, error: null });
        const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
        const rangeMock = vi.fn().mockResolvedValue({ data: [], error: null, count: 0 });
        const orderMock = vi.fn().mockReturnValue({ range: rangeMock });
        const selectMock = vi.fn().mockReturnValue({ order: orderMock, eq: vi.fn().mockReturnValue({ order: orderMock }) });

        mockSupabase.from.mockReturnValue({
            select: selectMock,
            insert: vi.fn(),
            update: updateMock,
            delete: vi.fn().mockReturnValue({ eq: vi.fn() })
        } as any);

        const { result } = renderHook(() => useTickets('user-1', 'TECNICO'));

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        let updateResult: any;
        await act(async () => {
            updateResult = await result.current.updateTicketStatus('tk-1', 'IN_PROGRESS', 'user-1');
        });

        expect(updateMock).toHaveBeenCalled();
        expect(updateResult).toEqual({ success: true });
    });

    it('should delete a ticket successfully', async () => {
        const deleteEqMock = vi.fn().mockResolvedValue({ data: null, error: null });
        const deleteMock = vi.fn().mockReturnValue({ eq: deleteEqMock });
        const rangeMock = vi.fn().mockResolvedValue({ data: [{ id: 'tk-1', title: 'Test', requester: null, technician: null, sector: null }], error: null, count: 1 });
        const orderMock = vi.fn().mockReturnValue({ range: rangeMock });
        const selectMock = vi.fn().mockReturnValue({ order: orderMock, eq: vi.fn().mockReturnValue({ order: orderMock }) });

        mockSupabase.from.mockReturnValue({
            select: selectMock,
            insert: vi.fn(),
            update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) }),
            delete: deleteMock
        } as any);

        const { result } = renderHook(() => useTickets('user-1', 'TECNICO'));

        await waitFor(() => {
            expect(result.current.tickets).toHaveLength(1);
        });

        await act(async () => {
            await result.current.deleteTicket('tk-1');
        });

        expect(deleteMock).toHaveBeenCalled();
        expect(result.current.tickets).toHaveLength(0);
    });

    it('should pin a ticket successfully', async () => {
        const pinEqMock = vi.fn().mockResolvedValue({ data: null, error: null });
        const updateMock = vi.fn().mockReturnValue({ eq: pinEqMock });
        const rangeMock = vi.fn().mockResolvedValue({ data: [{ id: 'tk-1', title: 'Test', is_pinned: false, requester: null, technician: null, sector: null }], error: null, count: 1 });
        const orderMock = vi.fn().mockReturnValue({ range: rangeMock });
        const selectMock = vi.fn().mockReturnValue({ order: orderMock, eq: vi.fn().mockReturnValue({ order: orderMock }) });

        mockSupabase.from.mockReturnValue({
            select: selectMock,
            insert: vi.fn(),
            update: updateMock,
            delete: vi.fn().mockReturnValue({ eq: vi.fn() })
        } as any);

        const { result } = renderHook(() => useTickets('user-1', 'TECNICO'));

        await waitFor(() => {
            expect(result.current.tickets).toHaveLength(1);
        });

        let pinResult: any;
        await act(async () => {
            pinResult = await result.current.pinTicket('tk-1', true, 'user-1');
        });

        expect(updateMock).toHaveBeenCalled();
        expect(pinResult).toEqual({ success: true });
        expect(result.current.tickets[0]!.is_pinned).toBe(true);
    });
});
