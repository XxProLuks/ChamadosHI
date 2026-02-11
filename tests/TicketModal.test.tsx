import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import TicketModal from '../components/TicketModal';
import { Sector } from '../types';

const mockSector: Sector = {
    id: 's1',
    name: 'TI',
    icon: 'Cpu',
    colorClass: 'bg-purple-100 text-purple-600'
};

describe('TicketModal Component', () => {
    const mockOnClose = vi.fn();
    const mockOnSubmit = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render form with sector name', () => {
        render(<TicketModal sector={mockSector} onClose={mockOnClose} onSubmit={mockOnSubmit} />);
        expect(screen.getByText('TI')).toBeDefined();
    });

    it('should render Novo Chamado header', () => {
        render(<TicketModal sector={mockSector} onClose={mockOnClose} onSubmit={mockOnSubmit} />);
        expect(screen.getByText('Novo Chamado')).toBeDefined();
    });

    it('should render title input field', () => {
        render(<TicketModal sector={mockSector} onClose={mockOnClose} onSubmit={mockOnSubmit} />);
        expect(screen.getByPlaceholderText('O que está acontecendo?')).toBeDefined();
    });

    it('should render description textarea', () => {
        render(<TicketModal sector={mockSector} onClose={mockOnClose} onSubmit={mockOnSubmit} />);
        expect(screen.getByPlaceholderText('Descreva o problema com mais detalhes...')).toBeDefined();
    });

    it('should render priority options', () => {
        render(<TicketModal sector={mockSector} onClose={mockOnClose} onSubmit={mockOnSubmit} />);
        expect(screen.getByText('Baixa')).toBeDefined();
        expect(screen.getByText('Média')).toBeDefined();
        expect(screen.getByText('Alta')).toBeDefined();
        expect(screen.getByText('Crítica')).toBeDefined();
    });

    it('should render submit button with Abrir Chamado text', () => {
        render(<TicketModal sector={mockSector} onClose={mockOnClose} onSubmit={mockOnSubmit} />);
        expect(screen.getByText('Abrir Chamado')).toBeDefined();
    });

    it('should close on cancel button click', () => {
        render(<TicketModal sector={mockSector} onClose={mockOnClose} onSubmit={mockOnSubmit} />);
        fireEvent.click(screen.getByText('Cancelar'));
        expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onSubmit with form data when Abrir Chamado clicked', async () => {
        render(<TicketModal sector={mockSector} onClose={mockOnClose} onSubmit={mockOnSubmit} />);

        fireEvent.change(screen.getByPlaceholderText('O que está acontecendo?'), {
            target: { value: 'PC não liga' }
        });
        fireEvent.change(screen.getByPlaceholderText('Descreva o problema com mais detalhes...'), {
            target: { value: 'O computador não liga desde ontem' }
        });

        fireEvent.click(screen.getByText('Abrir Chamado'));

        await waitFor(() => {
            expect(mockOnSubmit).toHaveBeenCalled();
        });

        const callArgs = mockOnSubmit.mock.calls[0]![0];
        expect(callArgs.title).toBe('PC não liga');
        expect(callArgs.description).toBe('O computador não liga desde ontem');
    });

    it('should prefill title when prefillTitle prop is set', () => {
        render(
            <TicketModal
                sector={mockSector}
                onClose={mockOnClose}
                onSubmit={mockOnSubmit}
                prefillTitle="Manutenção urgente"
            />
        );
        const input = screen.getByPlaceholderText('O que está acontecendo?') as HTMLInputElement;
        expect(input.value).toBe('Manutenção urgente');
    });
});
