import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import TecnicoView from '../components/TecnicoView';
import { Ticket } from '../types';

// Mock the drag-and-drop library
vi.mock('@hello-pangea/dnd', () => ({
    DragDropContext: ({ children }: any) => <div>{children}</div>,
    Droppable: ({ children }: any) => children({
        droppableProps: {},
        innerRef: vi.fn(),
        placeholder: null
    }, { isDraggingOver: false }),
    Draggable: ({ children }: any) => children({
        draggableProps: {},
        dragHandleProps: {},
        innerRef: vi.fn()
    }, { isDragging: false })
}));

const makeTicket = (overrides: Partial<Ticket> = {}): Ticket => ({
    id: 't1',
    title: 'Impressora com defeito',
    description: 'A impressora parou de funcionar',
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

describe('TecnicoView Component', () => {
    const defaultProps = {
        tickets: [
            makeTicket({ id: 't1', status: 'TODO', priority: 'LOW', title: 'Ticket Baixa' }),
            makeTicket({ id: 't2', status: 'IN_PROGRESS', priority: 'MEDIUM', title: 'Ticket Média' }),
            makeTicket({ id: 't3', status: 'DONE', priority: 'HIGH', title: 'Ticket Alta' }),
            makeTicket({ id: 't4', status: 'TODO', priority: 'CRITICAL', title: 'Ticket Crítica', is_critical: true })
        ],
        onUpdateStatus: vi.fn(),
        onViewDetails: vi.fn(),
        searchQuery: '',
        onSearchChange: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render kanban column titles: A Fazer, Em Andamento, Concluído', () => {
        render(<TecnicoView {...defaultProps} />);
        expect(screen.getByText('A Fazer')).toBeDefined();
        expect(screen.getByText('Em Andamento')).toBeDefined();
        // "Concluído" used in column title
        expect(screen.getAllByText('Concluído').length).toBeGreaterThan(0);
    });

    it('should render PAINEL KANBAN header', () => {
        render(<TecnicoView {...defaultProps} />);
        expect(screen.getByText('PAINEL KANBAN')).toBeDefined();
    });

    it('should render ticket titles', () => {
        render(<TecnicoView {...defaultProps} />);
        expect(screen.getByText('Ticket Baixa')).toBeDefined();
        expect(screen.getByText('Ticket Média')).toBeDefined();
        expect(screen.getByText('Ticket Alta')).toBeDefined();
        expect(screen.getByText('Ticket Crítica')).toBeDefined();
    });

    it('should display priority labels on tickets', () => {
        render(<TecnicoView {...defaultProps} />);
        expect(screen.getByText('Baixa')).toBeDefined();
        expect(screen.getByText('Média')).toBeDefined();
        expect(screen.getByText('Alta')).toBeDefined();
        expect(screen.getByText('Crítica')).toBeDefined();
    });

    it('should display CRÍTICO badge on critical tickets', () => {
        render(<TecnicoView {...defaultProps} />);
        expect(screen.getByText('CRÍTICO')).toBeDefined();
    });

    it('should display metrics section', () => {
        render(<TecnicoView {...defaultProps} />);
        expect(screen.getAllByText('Aguardando').length).toBeGreaterThan(0);
        expect(screen.getByText('Em Execução')).toBeDefined();
        expect(screen.getByText('Feitos Hoje')).toBeDefined();
    });

    it('should display search input', () => {
        render(<TecnicoView {...defaultProps} />);
        expect(screen.getByPlaceholderText(/Filtre por chamado/)).toBeDefined();
    });

    it('should call onSearchChange when search input changes', () => {
        render(<TecnicoView {...defaultProps} />);
        fireEvent.change(screen.getByPlaceholderText(/Filtre por chamado/), {
            target: { value: 'impressora' }
        });
        expect(defaultProps.onSearchChange).toHaveBeenCalledWith('impressora');
    });

    it('should show Ver Mais Chamados button when hasMore is true', () => {
        render(<TecnicoView {...defaultProps} hasMore={true} onLoadMore={vi.fn()} />);
        expect(screen.getByText('Ver Mais Chamados')).toBeDefined();
    });

    it('should not show Ver Mais button when hasMore is false', () => {
        render(<TecnicoView {...defaultProps} hasMore={false} />);
        expect(screen.queryByText('Ver Mais Chamados')).toBeNull();
    });

    it('should display ticket sector and location info', () => {
        render(<TecnicoView {...defaultProps} />);
        expect(screen.getAllByText(/TI.*Sala 101/).length).toBeGreaterThan(0);
    });
});
