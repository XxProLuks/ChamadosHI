import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import TicketDetailModal from '../components/TicketDetailModal';
import { Ticket } from '../types';

// Mock child components to isolate testing
vi.mock('../components/TicketChat', () => ({
    default: () => <div data-testid="ticket-chat">TicketChat Mock</div>
}));
vi.mock('../components/TicketHistory', () => ({
    default: () => <div data-testid="ticket-history">TicketHistory Mock</div>
}));
vi.mock('../components/TicketRating', () => ({
    default: () => <div data-testid="ticket-rating">TicketRating Mock</div>
}));

const makeTicket = (overrides: Partial<Ticket> = {}): Ticket => ({
    id: 'ticket-abcdef01',
    title: 'Ar condicionado com defeito',
    description: 'O ar condicionado da sala 201 está fazendo barulho',
    location: 'Sala 201',
    sector_id: 's1',
    category: 'CLIMATIZACAO',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    is_critical: false,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-16T14:00:00Z',
    requester_name: 'Maria Silva',
    technician_name: 'João Técnico',
    sector_name: 'Climatização',
    ...overrides
});

describe('TicketDetailModal Component', () => {
    const mockOnClose = vi.fn();
    const mockOnUpdateStatus = vi.fn();
    const mockOnDelete = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should display ticket title', () => {
        render(
            <TicketDetailModal ticket={makeTicket()} onClose={mockOnClose} />
        );
        expect(screen.getByText('Ar condicionado com defeito')).toBeDefined();
    });

    it('should display Detalhes do Chamado header', () => {
        render(
            <TicketDetailModal ticket={makeTicket()} onClose={mockOnClose} />
        );
        expect(screen.getByText('Detalhes do Chamado')).toBeDefined();
    });

    it('should display priority badge', () => {
        render(
            <TicketDetailModal ticket={makeTicket()} onClose={mockOnClose} />
        );
        expect(screen.getByText('Alta')).toBeDefined();
    });

    it('should display status badge', () => {
        render(
            <TicketDetailModal ticket={makeTicket({ status: 'IN_PROGRESS' })} onClose={mockOnClose} />
        );
        expect(screen.getByText('Em Atendimento')).toBeDefined();
    });

    it('should display requester name', () => {
        render(
            <TicketDetailModal ticket={makeTicket()} onClose={mockOnClose} />
        );
        expect(screen.getByText('Maria Silva')).toBeDefined();
    });

    it('should display technician name', () => {
        render(
            <TicketDetailModal ticket={makeTicket()} onClose={mockOnClose} />
        );
        expect(screen.getByText('João Técnico')).toBeDefined();
    });

    it('should close on X button click', () => {
        render(
            <TicketDetailModal ticket={makeTicket()} onClose={mockOnClose} />
        );
        const buttons = screen.getAllByRole('button');
        // Click the close X button (small rounded button in header area)
        const closeBtn = buttons.find(btn => btn.className.includes('rounded-full'));
        if (closeBtn) fireEvent.click(closeBtn);
        expect(mockOnClose).toHaveBeenCalled();
    });

    it('should show Iniciar Atendimento button for TODO tickets when onUpdateStatus provided', () => {
        render(
            <TicketDetailModal
                ticket={makeTicket({ status: 'TODO' })}
                onClose={mockOnClose}
                onUpdateStatus={mockOnUpdateStatus}
            />
        );
        expect(screen.getByText(/Iniciar Atendimento/)).toBeDefined();
    });

    it('should show Finalizar button for IN_PROGRESS tickets when onUpdateStatus provided', () => {
        render(
            <TicketDetailModal
                ticket={makeTicket({ status: 'IN_PROGRESS' })}
                onClose={mockOnClose}
                onUpdateStatus={mockOnUpdateStatus}
            />
        );
        expect(screen.getByText(/Finalizar Chamado/)).toBeDefined();
    });

    it('should render TicketChat when user info provided', () => {
        render(
            <TicketDetailModal
                ticket={makeTicket()}
                onClose={mockOnClose}
                currentUserId="user-1"
                currentUserName="João"
                currentUserRole="TECNICO"
            />
        );
        expect(screen.getByTestId('ticket-chat')).toBeDefined();
    });

    it('should render TicketHistory component always', () => {
        render(
            <TicketDetailModal ticket={makeTicket()} onClose={mockOnClose} />
        );
        expect(screen.getByTestId('ticket-history')).toBeDefined();
    });

    it('should show Excluir button when appropriate conditions met', () => {
        render(
            <TicketDetailModal
                ticket={makeTicket({ status: 'TODO', requester_id: 'user-1' })}
                onClose={mockOnClose}
                onUpdateStatus={mockOnUpdateStatus}
                onDelete={mockOnDelete}
                currentUserId="user-1"
            />
        );
        expect(screen.getByText('Excluir')).toBeDefined();
    });
});
