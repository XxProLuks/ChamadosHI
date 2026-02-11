import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import Dashboard from '../components/Dashboard';
import { Ticket } from '../types';

// Mock chart.js and react-chartjs-2
vi.mock('chart.js', () => ({
    Chart: { register: vi.fn() },
    CategoryScale: vi.fn(),
    LinearScale: vi.fn(),
    PointElement: vi.fn(),
    LineElement: vi.fn(),
    BarElement: vi.fn(),
    Title: vi.fn(),
    Tooltip: vi.fn(),
    Legend: vi.fn(),
    ArcElement: vi.fn()
}));

vi.mock('react-chartjs-2', () => ({
    Line: () => <canvas data-testid="line-chart" />,
    Bar: () => <canvas data-testid="bar-chart" />,
    Doughnut: () => <canvas data-testid="doughnut-chart" />
}));

const makeTicket = (overrides: Partial<Ticket> = {}): Ticket => ({
    id: 't1',
    title: 'Test Ticket',
    description: 'Test Description',
    location: 'Sala 101',
    sector_id: 's1',
    category: 'CHAMADO',
    status: 'TODO',
    priority: 'MEDIUM',
    is_critical: false,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-16T14:00:00Z',
    requester_name: 'Test User',
    sector_name: 'TI',
    ...overrides
});

describe('Dashboard Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render Painel de Controle title', () => {
        render(<Dashboard tickets={[]} />);
        expect(screen.getByText('Painel de Controle')).toBeDefined();
    });

    it('should render chart components', () => {
        const tickets = [makeTicket()];
        render(<Dashboard tickets={tickets} />);
        expect(screen.getByTestId('doughnut-chart')).toBeDefined();
        expect(screen.getByTestId('bar-chart')).toBeDefined();
    });

    it('should show status counts (TODO, IN_PROGRESS, DONE keys)', () => {
        const tickets = [
            makeTicket({ id: 't1', status: 'TODO' }),
            makeTicket({ id: 't2', status: 'IN_PROGRESS' }),
            makeTicket({ id: 't3', status: 'DONE' })
        ];
        render(<Dashboard tickets={tickets} />);
        // Status keys are displayed as text in the status distribution
        expect(screen.getByText('TODO')).toBeDefined();
        expect(screen.getByText('IN_PROGRESS')).toBeDefined();
        expect(screen.getByText('DONE')).toBeDefined();
    });

    it('should display Top Setores section', () => {
        const tickets = [makeTicket({ sector_name: 'TI' })];
        render(<Dashboard tickets={tickets} />);
        expect(screen.getByText('Top Setores')).toBeDefined();
        expect(screen.getByText('TI')).toBeDefined();
    });

    it('should display Setores Críticos section', () => {
        const tickets = [
            makeTicket({ id: 't1', priority: 'CRITICAL', sector_name: 'UTI' })
        ];
        render(<Dashboard tickets={tickets} />);
        expect(screen.getByText('Setores Críticos')).toBeDefined();
        expect(screen.getAllByText('UTI').length).toBeGreaterThan(0);
    });

    it('should show Distribuição chart heading', () => {
        render(<Dashboard tickets={[makeTicket()]} />);
        expect(screen.getByText(/Distribuição/)).toBeDefined();
    });

    it('should show Prioridades chart heading', () => {
        render(<Dashboard tickets={[makeTicket()]} />);
        expect(screen.getByText(/Prioridades/)).toBeDefined();
    });

    it('should show efficiency indicators: Tempo Médio, Resolução, Satisfação', () => {
        render(<Dashboard tickets={[makeTicket()]} />);
        expect(screen.getByText('Tempo Médio')).toBeDefined();
        expect(screen.getByText('Resolução')).toBeDefined();
        expect(screen.getByText('Satisfação')).toBeDefined();
    });

    it('should show Tendência Semanal section', () => {
        render(<Dashboard tickets={[makeTicket()]} />);
        expect(screen.getByText('Tendência Semanal')).toBeDefined();
    });
});
