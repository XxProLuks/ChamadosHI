import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { Skeleton, SkeletonCard, SkeletonTicketCard, SkeletonList, SkeletonTable } from '../components/Skeleton';

describe('Skeleton Components', () => {
    describe('Skeleton', () => {
        it('renders with default props', () => {
            const { container } = render(<Skeleton />);
            const skeleton = container.querySelector('[role="status"]');
            expect(skeleton).toBeTruthy();
            expect(skeleton?.getAttribute('aria-label')).toBe('Carregando...');
        });

        it('applies variant classes correctly', () => {
            const { container, rerender } = render(<Skeleton variant="circular" />);
            expect(container.querySelector('.rounded-full')).toBeTruthy();

            rerender(<Skeleton variant="rounded" />);
            expect(container.querySelector('.rounded-2xl')).toBeTruthy();

            rerender(<Skeleton variant="text" />);
            expect(container.querySelector('.rounded')).toBeTruthy();
        });

        it('applies animation classes correctly', () => {
            const { container, rerender } = render(<Skeleton animation="pulse" />);
            expect(container.querySelector('.animate-pulse')).toBeTruthy();

            rerender(<Skeleton animation="none" />);
            expect(container.querySelector('.animate-pulse')).toBeFalsy();
        });

        it('accepts custom className', () => {
            const { container } = render(<Skeleton className="custom-class" />);
            expect(container.querySelector('.custom-class')).toBeTruthy();
        });
    });

    describe('SkeletonCard', () => {
        it('renders a card skeleton', () => {
            const { container } = render(<SkeletonCard />);
            expect(container.querySelector('.rounded-3xl')).toBeTruthy();
        });
    });

    describe('SkeletonTicketCard', () => {
        it('renders a ticket card skeleton', () => {
            const { container } = render(<SkeletonTicketCard />);
            expect(container.firstChild).toBeTruthy();
        });
    });

    describe('SkeletonList', () => {
        it('renders default 3 cards', () => {
            const { container } = render(<SkeletonList />);
            const cards = container.querySelectorAll('.rounded-3xl');
            expect(cards.length).toBe(3);
        });

        it('renders custom count of cards', () => {
            const { container } = render(<SkeletonList count={5} />);
            const cards = container.querySelectorAll('.rounded-3xl');
            expect(cards.length).toBe(5);
        });
    });

    describe('SkeletonTable', () => {
        it('renders default 5 rows and 4 columns', () => {
            const { container } = render(<SkeletonTable />);
            const allRows = container.querySelectorAll('.flex.gap-4');
            expect(allRows.length).toBe(6); // 1 header + 5 rows
        });
    });
});
