import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import SolicitanteView from '../components/SolicitanteView';
import { Sector, Ticket } from '../types';

const mockSectors: Sector[] = [
    { id: 's1', name: 'UTI', icon: 'Heart', colorClass: 'bg-red-100 text-red-600' },
    { id: 's2', name: 'Farmácia', icon: 'Pill', colorClass: 'bg-green-100 text-green-600' },
    { id: 's3', name: 'Recepção', icon: 'Building', colorClass: 'bg-blue-100 text-blue-600' },
    { id: 's4', name: 'TI', icon: 'Cpu', colorClass: 'bg-purple-100 text-purple-600' }
];

const mockTickets: Ticket[] = [
    {
        id: 't1', title: 'PC não liga', location: 'Sala 201',
        sector_id: 's4', category: 'TI', status: 'TODO', priority: 'HIGH',
        is_critical: false, created_at: '2026-01-01', updated_at: '2026-01-01',
        requester_name: 'Maria Santos'
    }
];

const defaultProps = {
    sectors: mockSectors,
    onSelectSector: vi.fn(),
    searchQuery: '',
    onSearchChange: vi.fn(),
    tickets: mockTickets,
    onViewTicketDetails: vi.fn(),
    requesterName: 'Maria Santos',
    hasMore: false,
    onLoadMore: vi.fn()
};

describe('SolicitanteView Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render greeting with first name', () => {
        render(<SolicitanteView {...defaultProps} />);
        expect(screen.getByText('Maria')).toBeDefined();
    });

    it('should render all sectors as grid', () => {
        render(<SolicitanteView {...defaultProps} />);
        expect(screen.getByText('UTI')).toBeDefined();
        expect(screen.getByText('Farmácia')).toBeDefined();
        expect(screen.getByText('Recepção')).toBeDefined();
        expect(screen.getByText('TI')).toBeDefined();
    });

    it('should render search input', () => {
        render(<SolicitanteView {...defaultProps} />);
        expect(screen.getByPlaceholderText(/Busque por um setor/)).toBeDefined();
    });

    it('should filter sectors by search query', () => {
        render(<SolicitanteView {...defaultProps} searchQuery="UTI" />);
        expect(screen.getByText('UTI')).toBeDefined();
        expect(screen.queryByText('Farmácia')).toBeNull();
        expect(screen.queryByText('Recepção')).toBeNull();
    });

    it('should show empty state when no sectors match search', () => {
        render(<SolicitanteView {...defaultProps} searchQuery="xyz999" />);
        expect(screen.getByText(/Nenhum setor encontrado/)).toBeDefined();
    });

    it('should call onSelectSector when sector button is clicked', () => {
        render(<SolicitanteView {...defaultProps} />);
        fireEvent.click(screen.getByText('UTI'));
        expect(defaultProps.onSelectSector).toHaveBeenCalledWith(mockSectors[0]);
    });

    it('should call onSearchChange when typing in search', () => {
        render(<SolicitanteView {...defaultProps} />);
        fireEvent.change(screen.getByPlaceholderText(/Busque por um setor/), {
            target: { value: 'Farm' }
        });
        expect(defaultProps.onSearchChange).toHaveBeenCalledWith('Farm');
    });

    it('should render my tickets section', () => {
        render(<SolicitanteView {...defaultProps} />);
        expect(screen.getByText('Meus Chamados')).toBeDefined();
    });
});
