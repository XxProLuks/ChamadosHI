import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import Auth from '../components/Auth';
import { supabase } from '../lib/supabase';

const mockSupabase = vi.mocked(supabase);

describe('Auth Component', () => {
    const mockOnSuccess = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render login form by default', () => {
        render(<Auth onSuccess={mockOnSuccess} />);
        expect(screen.getByText('Hospital de Ilhéus')).toBeDefined();
        expect(screen.getAllByText('Entrar').length).toBeGreaterThan(0);
        expect(screen.getByPlaceholderText('exemplo@hospital.com')).toBeDefined();
        expect(screen.getByPlaceholderText('••••••••')).toBeDefined();
    });

    it('should not show full name field in login mode', () => {
        render(<Auth onSuccess={mockOnSuccess} />);
        expect(screen.queryByPlaceholderText('Seu nome')).toBeNull();
    });

    it('should toggle to signup mode and show full name field', () => {
        render(<Auth onSuccess={mockOnSuccess} />);
        fireEvent.click(screen.getByText('Criar Conta'));
        expect(screen.getByPlaceholderText('Seu nome')).toBeDefined();
    });

    it('should call signInWithPassword on login submit', async () => {
        mockSupabase.auth.signInWithPassword = vi.fn().mockResolvedValue({ error: null });

        render(<Auth onSuccess={mockOnSuccess} />);

        fireEvent.change(screen.getByPlaceholderText('exemplo@hospital.com'), {
            target: { value: 'user@hospital.com' }
        });
        fireEvent.change(screen.getByPlaceholderText('••••••••'), {
            target: { value: 'password123' }
        });
        fireEvent.submit(screen.getByPlaceholderText('••••••••').closest('form')!);

        await waitFor(() => {
            expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
                email: 'user@hospital.com',
                password: 'password123'
            });
        });
    });

    it('should call signUp in signup mode', async () => {
        mockSupabase.auth.signUp = vi.fn().mockResolvedValue({ data: {}, error: null });

        render(<Auth onSuccess={mockOnSuccess} />);
        fireEvent.click(screen.getByText('Criar Conta'));

        fireEvent.change(screen.getByPlaceholderText('Seu nome'), {
            target: { value: 'João Silva' }
        });
        fireEvent.change(screen.getByPlaceholderText('exemplo@hospital.com'), {
            target: { value: 'joao@hospital.com' }
        });
        fireEvent.change(screen.getByPlaceholderText('••••••••'), {
            target: { value: 'pass123' }
        });
        fireEvent.submit(screen.getByPlaceholderText('••••••••').closest('form')!);

        await waitFor(() => {
            expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
                email: 'joao@hospital.com',
                password: 'pass123',
                options: { data: { full_name: 'João Silva' } }
            });
        });
    });

    it('should display error message on login failure', async () => {
        mockSupabase.auth.signInWithPassword = vi.fn().mockResolvedValue({
            error: { message: 'Credenciais inválidas' }
        });

        render(<Auth onSuccess={mockOnSuccess} />);

        fireEvent.change(screen.getByPlaceholderText('exemplo@hospital.com'), {
            target: { value: 'bad@email.com' }
        });
        fireEvent.change(screen.getByPlaceholderText('••••••••'), {
            target: { value: 'wrong' }
        });
        fireEvent.submit(screen.getByPlaceholderText('••••••••').closest('form')!);

        await waitFor(() => {
            expect(screen.getByText('Credenciais inválidas')).toBeDefined();
        });
    });

    it('should show success message after signup', async () => {
        mockSupabase.auth.signUp = vi.fn().mockResolvedValue({ data: {}, error: null });

        render(<Auth onSuccess={mockOnSuccess} />);
        fireEvent.click(screen.getByText('Criar Conta'));

        fireEvent.change(screen.getByPlaceholderText('Seu nome'), {
            target: { value: 'Test User' }
        });
        fireEvent.change(screen.getByPlaceholderText('exemplo@hospital.com'), {
            target: { value: 'test@hospital.com' }
        });
        fireEvent.change(screen.getByPlaceholderText('••••••••'), {
            target: { value: 'pass123' }
        });
        fireEvent.submit(screen.getByPlaceholderText('••••••••').closest('form')!);

        await waitFor(() => {
            expect(screen.getByText(/Conta criada com sucesso/)).toBeDefined();
        });
    });

    it('should call onSuccess after successful login', async () => {
        mockSupabase.auth.signInWithPassword = vi.fn().mockResolvedValue({ error: null });

        render(<Auth onSuccess={mockOnSuccess} />);

        fireEvent.change(screen.getByPlaceholderText('exemplo@hospital.com'), {
            target: { value: 'user@hospital.com' }
        });
        fireEvent.change(screen.getByPlaceholderText('••••••••'), {
            target: { value: 'password123' }
        });
        fireEvent.submit(screen.getByPlaceholderText('••••••••').closest('form')!);

        await waitFor(() => {
            expect(mockOnSuccess).toHaveBeenCalled();
        });
    });
});
