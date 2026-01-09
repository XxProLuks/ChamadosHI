import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useState, useEffect } from 'react';

// Test for useDebounce hook pattern
const useDebounce = <T,>(value: T, delay: number): T => {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => clearTimeout(handler);
    }, [value, delay]);

    return debouncedValue;
};

describe('useDebounce Hook', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should return initial value immediately', () => {
        const { result } = renderHook(() => useDebounce('initial', 500));
        expect(result.current).toBe('initial');
    });

    it('should debounce value updates', async () => {
        const { result, rerender } = renderHook(
            ({ value }) => useDebounce(value, 500),
            { initialProps: { value: 'first' } }
        );

        expect(result.current).toBe('first');

        // Update value
        rerender({ value: 'second' });

        // Value should not change immediately
        expect(result.current).toBe('first');

        // Advance timers
        act(() => {
            vi.advanceTimersByTime(500);
        });

        // Now value should be updated
        expect(result.current).toBe('second');
    });

    it('should cancel pending updates when value changes rapidly', async () => {
        const { result, rerender } = renderHook(
            ({ value }) => useDebounce(value, 500),
            { initialProps: { value: 'a' } }
        );

        rerender({ value: 'b' });
        act(() => { vi.advanceTimersByTime(200); });

        rerender({ value: 'c' });
        act(() => { vi.advanceTimersByTime(200); });

        rerender({ value: 'd' });

        // Should still be 'a' because 500ms hasn't passed
        expect(result.current).toBe('a');

        act(() => { vi.advanceTimersByTime(500); });

        // Should be 'd' (the final value)
        expect(result.current).toBe('d');
    });
});
