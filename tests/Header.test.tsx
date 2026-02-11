import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import Header from '../components/Header';

// Mock supabase
vi.mock('../lib/supabase', () => ({
    supabase: {
        auth: { signOut: vi.fn().mockResolvedValue({}), getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
        from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }) })
    }
}));

// Mock localStorage module
vi.mock('../lib/localStorage', () => ({
    markAlertAsDismissed: vi.fn(),
    isAlertDismissed: vi.fn().mockReturnValue(false)
}));

const defaultProps = {
    view: 'SOLICITANTE' as const,
    setView: vi.fn(),
    notifications: [],
    onNotificationClick: vi.fn(),
    userName: 'João Silva',
    userRole: 'TECNICO',
    darkMode: false,
    onToggleDarkMode: vi.fn(),
    showDashboard: false,
    setShowDashboard: vi.fn(),
    onToggleDashboard: vi.fn(),
    onOpenUserManager: undefined as (() => void) | undefined,
    onOpenSectorManager: undefined as (() => void) | undefined,
    onOpenAlertManager: undefined as (() => void) | undefined,
    activeAlerts: []
};

describe('Header Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render hospital name and user info', () => {
        render(<Header {...defaultProps} />);
        // Hospital name is inside a hidden sm:block div, we can still query all
        expect(screen.getAllByText('Hospital de Ilhéus').length).toBeGreaterThan(0);
    });

    it('should render Solicitante navigation tab', () => {
        render(<Header {...defaultProps} />);
        expect(screen.getAllByText('Solicitante').length).toBeGreaterThan(0);
    });

    it('should render Painel Técnico tab for TECNICO/ADMIN role', () => {
        render(<Header {...defaultProps} />);
        expect(screen.getAllByText('Painel Técnico').length).toBeGreaterThan(0);
    });

    it('should render Dashboard button for TECNICO/ADMIN role', () => {
        render(<Header {...defaultProps} />);
        expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);
    });

    it('should show unread notification badge', () => {
        const notifications = [
            { id: '1', user_id: 'u1', message: 'Test', type: 'info' as const, is_read: false, created_at: '2026-01-01' },
            { id: '2', user_id: 'u1', message: 'Test2', type: 'warning' as const, is_read: true, created_at: '2026-01-01' }
        ];
        render(<Header {...defaultProps} notifications={notifications} />);
        expect(screen.getByText('1')).toBeDefined();
    });

    it('should show Usuários button when onOpenUserManager is provided', () => {
        render(<Header {...defaultProps} onOpenUserManager={vi.fn()} />);
        expect(screen.getAllByText('Usuários').length).toBeGreaterThan(0);
    });

    it('should show Setores button when onOpenSectorManager is provided', () => {
        render(<Header {...defaultProps} onOpenSectorManager={vi.fn()} />);
        expect(screen.getAllByText('Setores').length).toBeGreaterThan(0);
    });

    it('should show Alertas button when onOpenAlertManager is provided', () => {
        render(<Header {...defaultProps} onOpenAlertManager={vi.fn()} />);
        expect(screen.getAllByText('Alertas').length).toBeGreaterThan(0);
    });

    it('should NOT show admin buttons when callbacks not provided', () => {
        render(<Header {...defaultProps} />);
        expect(screen.queryByText('Usuários')).toBeNull();
        expect(screen.queryByText('Setores')).toBeNull();
    });

    it('should display active global alerts', () => {
        const alerts = [
            { id: 'a1', message: 'Sistema fora do ar', type: 'CRITICAL' as const, created_at: '2026-01-01', expires_at: '2026-12-31', created_by: 'admin' }
        ];
        render(<Header {...defaultProps} activeAlerts={alerts} />);
        expect(screen.getByText('Sistema fora do ar')).toBeDefined();
    });
});
