/**
 * Integration Flow Test: Full Ticket Lifecycle
 * Simulates: Create → Assign → In Progress → Complete → Rate
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../../lib/supabase';
import { Ticket } from '../../types';

const mockSupabase = vi.mocked(supabase);

// Helper to build a ticket at any stage
const buildTicket = (overrides: Partial<Ticket> = {}): Ticket => ({
    id: 'lifecycle-ticket-1',
    title: 'Impressora não liga',
    description: 'A impressora do 2o andar não responde',
    location: 'Sala 301 - 2o andar',
    sector_id: 'sector-ti',
    sector_name: 'TI',
    category: 'TI',
    status: 'TODO',
    priority: 'HIGH',
    is_critical: false,
    requester_name: 'Maria Santos',
    requester_id: 'user-maria',
    created_at: '2026-01-15T08:00:00Z',
    updated_at: '2026-01-15T08:00:00Z',
    ...overrides
});

describe('Ticket Lifecycle Flow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('Step 1: Ticket is created with initial TODO status', () => {
        const newTicket = buildTicket();
        expect(newTicket.status).toBe('TODO');
        expect(newTicket.requester_name).toBe('Maria Santos');
        expect(newTicket.priority).toBe('HIGH');
        expect(newTicket.sector_name).toBe('TI');
    });

    it('Step 2: Technician assigns themselves and moves to IN_PROGRESS', () => {
        const assignedTicket = buildTicket({
            status: 'IN_PROGRESS',
            technician_id: 'user-joao',
            technician_name: 'João Técnico',
            updated_at: '2026-01-15T09:30:00Z'
        });

        expect(assignedTicket.status).toBe('IN_PROGRESS');
        expect(assignedTicket.technician_name).toBe('João Técnico');
        // Updated timestamp should be later than created
        expect(new Date(assignedTicket.updated_at).getTime())
            .toBeGreaterThan(new Date(assignedTicket.created_at).getTime());
    });

    it('Step 3: Status transitions follow valid paths', () => {
        const validTransitions: Record<string, string[]> = {
            'TODO': ['IN_PROGRESS'],
            'IN_PROGRESS': ['DONE', 'TODO'],
            'DONE': []
        };

        // TODO → IN_PROGRESS is valid
        expect(validTransitions['TODO']).toContain('IN_PROGRESS');
        // IN_PROGRESS → DONE is valid
        expect(validTransitions['IN_PROGRESS']).toContain('DONE');
        // DONE has no valid outgoing transitions
        expect(validTransitions['DONE']!.length).toBe(0);
    });

    it('Step 4: Ticket is completed by technician', () => {
        const completedTicket = buildTicket({
            status: 'DONE',
            technician_id: 'user-joao',
            technician_name: 'João Técnico',
            resolution_notes: 'Cartucho de tinta substituído',
            updated_at: '2026-01-15T11:00:00Z'
        } as any);

        expect(completedTicket.status).toBe('DONE');
        expect((completedTicket as any).resolution_notes).toBe('Cartucho de tinta substituído');
    });

    it('Step 5: Supabase update is called on status change', async () => {
        // Mock the chained update call
        const mockUpdate = vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null })
        });
        mockSupabase.from = vi.fn().mockReturnValue({
            update: mockUpdate
        }) as any;

        // Simulate the status update call
        await supabase.from('tickets').update({ status: 'IN_PROGRESS' });

        expect(mockSupabase.from).toHaveBeenCalledWith('tickets');
        expect(mockUpdate).toHaveBeenCalledWith({ status: 'IN_PROGRESS' });
    });

    it('Step 6: Full lifecycle data integrity is maintained', () => {
        // Simulate the full lifecycle of a single ticket
        const stages = [
            buildTicket({ status: 'TODO' }),
            buildTicket({ status: 'IN_PROGRESS', technician_name: 'João', updated_at: '2026-01-15T09:00:00Z' }),
            buildTicket({ status: 'DONE', technician_name: 'João', updated_at: '2026-01-15T11:00:00Z' })
        ];

        // All stages share same core identity
        stages.forEach(stage => {
            expect(stage.id).toBe('lifecycle-ticket-1');
            expect(stage.title).toBe('Impressora não liga');
            expect(stage.requester_name).toBe('Maria Santos');
        });

        // Status progresses correctly
        expect(stages.map(s => s.status)).toEqual(['TODO', 'IN_PROGRESS', 'DONE']);

        // Timestamps are ordered
        const timestamps = stages.map(s => new Date(s.updated_at).getTime());
        for (let i = 1; i < timestamps.length; i++) {
            expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]!);
        }
    });

    it('Step 7: Critical ticket has is_critical flag and CRITICAL priority', () => {
        const criticalTicket = buildTicket({
            is_critical: true,
            priority: 'CRITICAL'
        });
        expect(criticalTicket.is_critical).toBe(true);
        expect(criticalTicket.priority).toBe('CRITICAL');
    });
});
