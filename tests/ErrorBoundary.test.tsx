import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import ErrorBoundary from '../components/ErrorBoundary';

// Component that throws on demand
function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
    if (shouldThrow) {
        throw new Error('Test error: something broke');
    }
    return <div>Working fine</div>;
}

describe('ErrorBoundary', () => {
    // Suppress React error boundary console.error noise in tests
    const originalConsoleError = console.error;
    beforeAll(() => {
        console.error = vi.fn();
    });
    afterAll(() => {
        console.error = originalConsoleError;
    });

    it('should render children when no error', () => {
        render(
            <ErrorBoundary>
                <div>Hello World</div>
            </ErrorBoundary>
        );

        expect(screen.getByText('Hello World')).toBeDefined();
    });

    it('should render error UI when child throws', () => {
        render(
            <ErrorBoundary>
                <ThrowingComponent shouldThrow={true} />
            </ErrorBoundary>
        );

        expect(screen.getByText('Algo deu errado')).toBeDefined();
        expect(screen.getByText(/Ocorreu um erro inesperado/)).toBeDefined();
    });

    it('should show error details in non-production', () => {
        render(
            <ErrorBoundary>
                <ThrowingComponent shouldThrow={true} />
            </ErrorBoundary>
        );

        expect(screen.getByText(/Test error: something broke/)).toBeDefined();
    });

    it('should render custom fallback if provided', () => {
        render(
            <ErrorBoundary fallback={<div>Custom Error Page</div>}>
                <ThrowingComponent shouldThrow={true} />
            </ErrorBoundary>
        );

        expect(screen.getByText('Custom Error Page')).toBeDefined();
    });

    it('should have Tentar Novamente and Recarregar buttons', () => {
        render(
            <ErrorBoundary>
                <ThrowingComponent shouldThrow={true} />
            </ErrorBoundary>
        );

        expect(screen.getByText('Tentar Novamente')).toBeDefined();
        expect(screen.getByText('Recarregar')).toBeDefined();
    });
});
