import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import MyTickets from '../components/MyTickets';
import { Ticket } from '../types';

const makeTicket = (overrides: Partial<Ticket> = {}): Ticket => ({
    id: 't1',
    title: 'Impressora com defeito',
    description: 'A impressora não imprime',
    location: 'Sala 101',
    sector_id: 's1',
    category: 'CHAMADO',
    status: 'TODO',
    priority: 'MEDIUM',
    is_critical: false,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-16T14:00:00Z',
    requester_name: 'Maria Santos',
    sector_name: 'TI',
    ...overrides
});

describe('MyTickets Component', () => {
    const mockOnViewDetails = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return null when there are no tickets from requester', () => {
        const { container } = render(
            <MyTickets
                tickets={[]}
                onViewDetails={mockOnViewDetails}
                requesterName="Maria Santos"
            />
        );
        expect(container.innerHTML).toBe('');
    });

    it('should show "Meus Chamados" title when there are tickets', () => {
        const tickets = [makeTicket({ requester_name: 'Maria Santos' })];
        render(
            <MyTickets
                tickets={tickets}
                onViewDetails={mockOnViewDetails}
                requesterName="Maria Santos"
            />
        );
        expect(screen.getByText('Meus Chamados')).toBeDefined();
    });

    it('should display ticket title', () => {
        const tickets = [makeTicket({ requester_name: 'Maria Santos' })];
        render(
            <MyTickets
                tickets={tickets}
                onViewDetails={mockOnViewDetails}
                requesterName="Maria Santos"
            />
        );
        expect(screen.getByText('Impressora com defeito')).toBeDefined();
    });

    it('should only show tickets from the matching requester', () => {
        const tickets = [
            makeTicket({ id: 't1', requester_name: 'Maria Santos', title: 'Ticket Maria' }),
            makeTicket({ id: 't2', requester_name: 'João Silva', title: 'Ticket João' })
        ];
        render(
            <MyTickets
                tickets={tickets}
                onViewDetails={mockOnViewDetails}
                requesterName="Maria Santos"
            />
        );
        expect(screen.getByText('Ticket Maria')).toBeDefined();
        expect(screen.queryByText('Ticket João')).toBeNull();
    });

    it('should show filter tabs: Todos, Aguardando, Atendimento, Concluídos', () => {
        const tickets = [makeTicket({ requester_name: 'Maria Santos' })];
        render(
            <MyTickets
                tickets={tickets}
                onViewDetails={mockOnViewDetails}
                requesterName="Maria Santos"
            />
        );
        expect(screen.getByText('Todos')).toBeDefined();
        expect(screen.getAllByText('Aguardando').length).toBeGreaterThan(0);
        expect(screen.getByText('Atendimento')).toBeDefined();
        expect(screen.getByText('Concluídos')).toBeDefined();
    });

    it('should show status labels on tickets', () => {
        const tickets = [
            makeTicket({ id: 't1', status: 'TODO', requester_name: 'Maria Santos' }),
            makeTicket({ id: 't2', status: 'IN_PROGRESS', requester_name: 'Maria Santos' }),
            makeTicket({ id: 't3', status: 'DONE', requester_name: 'Maria Santos' })
        ];
        render(
            <MyTickets
                tickets={tickets}
                onViewDetails={mockOnViewDetails}
                requesterName="Maria Santos"
            />
        );
        // Status badge labels from statusConfig
        expect(screen.getAllByText('Aguardando').length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Em Atendimento/).length).toBeGreaterThan(0);
        // "Concluído" is the ticket badge, "Concluídos" is the filter tab 
        expect(screen.getAllByText(/Concluíd/).length).toBeGreaterThan(0);
    });

    it('should show URGENTE badge for critical tickets', () => {
        const tickets = [makeTicket({ requester_name: 'Maria Santos', is_critical: true })];
        render(
            <MyTickets
                tickets={tickets}
                onViewDetails={mockOnViewDetails}
                requesterName="Maria Santos"
            />
        );
        expect(screen.getByText('URGENTE')).toBeDefined();
    });

    it('should call onViewDetails when ticket is clicked', () => {
        const ticket = makeTicket({ requester_name: 'Maria Santos' });
        render(
            <MyTickets
                tickets={[ticket]}
                onViewDetails={mockOnViewDetails}
                requesterName="Maria Santos"
            />
        );
        fireEvent.click(screen.getByText('Impressora com defeito'));
        expect(mockOnViewDetails).toHaveBeenCalledWith(ticket);
    });

    it('should show ticket count badge', () => {
        const tickets = [
            makeTicket({ id: 't1', requester_name: 'Maria Santos' }),
            makeTicket({ id: 't2', requester_name: 'Maria Santos' })
        ];
        render(
            <MyTickets
                tickets={tickets}
                onViewDetails={mockOnViewDetails}
                requesterName="Maria Santos"
            />
        );
        expect(screen.getAllByText('2').length).toBeGreaterThan(0);
    });

    it('should display sector and location info', () => {
        const tickets = [makeTicket({ requester_name: 'Maria Santos', sector_name: 'TI', location: 'Sala 101' })];
        render(
            <MyTickets
                tickets={tickets}
                onViewDetails={mockOnViewDetails}
                requesterName="Maria Santos"
            />
        );
        expect(screen.getByText(/TI.*Sala 101/)).toBeDefined();
    });

    it('should show load more button when hasMore is true', () => {
        const tickets = [makeTicket({ requester_name: 'Maria Santos' })];
        render(
            <MyTickets
                tickets={tickets}
                onViewDetails={mockOnViewDetails}
                requesterName="Maria Santos"
                hasMore={true}
                onLoadMore={vi.fn()}
            />
        );
        expect(screen.getByText(/Mais Chamados/)).toBeDefined();
    });

    it('should filter by status when tab is clicked', () => {
        const tickets = [
            makeTicket({ id: 't1', status: 'TODO', title: 'Ticket Aguardando', requester_name: 'Maria Santos' }),
            makeTicket({ id: 't2', status: 'DONE', title: 'Ticket Finalizado', requester_name: 'Maria Santos' })
        ];
        render(
            <MyTickets
                tickets={tickets}
                onViewDetails={mockOnViewDetails}
                requesterName="Maria Santos"
            />
        );
        // Click on Concluídos tab
        fireEvent.click(screen.getByText('Concluídos'));
        // Should show finished ticket
        expect(screen.getByText('Ticket Finalizado')).toBeDefined();
        // Should hide TODO ticket
        expect(screen.queryByText('Ticket Aguardando')).toBeNull();
    });
});
