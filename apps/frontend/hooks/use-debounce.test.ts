import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useDebounce } from './use-debounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('a', 400));
    expect(result.current).toBe('a');
  });

  it('only updates after the delay has elapsed', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 400),
      { initialProps: { value: 'a' } },
    );

    rerender({ value: 'b' });
    expect(result.current).toBe('a'); // ainda não passou o tempo

    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(result.current).toBe('b');
  });
});
