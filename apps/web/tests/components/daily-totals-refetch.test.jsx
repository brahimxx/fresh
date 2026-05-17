/**
 * Component test for `useDailyTotals` refetch latency (Task 17.7).
 *
 * Covers Requirements 16.3 and 16.6:
 *   - 16.3: Changing the date range re-fetches `/api/payments/daily-totals`
 *     within 500 ms of the new range being applied.
 *   - 16.6: The hook keys on the date range so a range change always
 *     produces a new request, never a cached stale result.
 *
 * Strategy:
 *   - Mock `@/lib/api-client` so `api.get` is a `vi.fn()` returning a
 *     resolved envelope. We assert on the call list to detect refetches.
 *   - Render a tiny `<Probe />` component (which calls the hook) inside a
 *     fresh `QueryClientProvider`. Using a real QueryClient keeps the
 *     query-key → refetch behaviour faithful to production.
 *   - Use `vi.useFakeTimers()` and `vi.advanceTimersByTimeAsync(...)` so
 *     the 500 ms wording from the requirement is enforced deterministically.
 *     `advanceTimersByTimeAsync` flushes the microtask queue between ticks,
 *     which lets React-Query's internal promise plumbing resolve.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ---------------------------------------------------------------------------
// Module mocks — declared before importing the hook so vi.mock hoisting works.
// ---------------------------------------------------------------------------

vi.mock('@/lib/api-client', () => ({
  api: {
    get: vi.fn(() => Promise.resolve({ success: true, data: [] })),
  },
}));

import { api } from '@/lib/api-client';
import { useDailyTotals } from '@/hooks/use-payments';

// ---------------------------------------------------------------------------
// Test harness
// ---------------------------------------------------------------------------

function Probe(props) {
  useDailyTotals(props.salonId, {
    start_date: props.startDate,
    end_date: props.endDate,
  });
  return null;
}

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        // Keep GC immediate so the previous query's cache entry doesn't
        // satisfy the next render with a stale value.
        gcTime: 0,
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useDailyTotals — refetch on date-range change within 500 ms (Req 16.3, 16.6)', () => {
  let queryClient;

  beforeEach(() => {
    vi.useFakeTimers();
    api.get.mockClear();
    api.get.mockImplementation(() =>
      Promise.resolve({ success: true, data: [] })
    );
    queryClient = makeClient();
  });

  afterEach(() => {
    cleanup();
    queryClient.clear();
    vi.useRealTimers();
  });

  it('triggers a new fetch with the new range within 500 ms of the range changing', async () => {
    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <Probe salonId={1} startDate="2026-06-01" endDate="2026-06-07" />
      </QueryClientProvider>
    );

    // Let React-Query schedule and dispatch the initial query. The hook is
    // enabled because salonId + both dates are present.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });

    expect(api.get).toHaveBeenCalledTimes(1);
    const initialUrl = api.get.mock.calls[0][0];
    expect(initialUrl).toContain('/payments/daily-totals');
    expect(initialUrl).toContain('start_date=2026-06-01');
    expect(initialUrl).toContain('end_date=2026-06-07');

    // Snapshot the call count, then change the date range.
    const callsBeforeChange = api.get.mock.calls.length;

    rerender(
      <QueryClientProvider client={queryClient}>
        <Probe salonId={1} startDate="2026-07-01" endDate="2026-07-31" />
      </QueryClientProvider>
    );

    // Advance just under the 500 ms deadline. A correctly-keyed query
    // re-runs essentially immediately (the queryKey changed), well inside
    // this window. We use 499 ms to make the "within 500 ms" wording
    // from Req 16.3 explicit.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(499);
    });

    expect(api.get.mock.calls.length).toBeGreaterThan(callsBeforeChange);

    const lastUrl = api.get.mock.calls[api.get.mock.calls.length - 1][0];
    expect(lastUrl).toContain('/payments/daily-totals');
    expect(lastUrl).toContain('start_date=2026-07-01');
    expect(lastUrl).toContain('end_date=2026-07-31');
    // And — crucially — the new request does NOT carry the old range.
    expect(lastUrl).not.toContain('start_date=2026-06-01');
    expect(lastUrl).not.toContain('end_date=2026-06-07');
  });

  it('does not refetch when the date range is unchanged across a re-render', async () => {
    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <Probe salonId={1} startDate="2026-06-01" endDate="2026-06-07" />
      </QueryClientProvider>
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });

    expect(api.get).toHaveBeenCalledTimes(1);

    // Re-render with the same range — same query key, no new request.
    rerender(
      <QueryClientProvider client={queryClient}>
        <Probe salonId={1} startDate="2026-06-01" endDate="2026-06-07" />
      </QueryClientProvider>
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(api.get).toHaveBeenCalledTimes(1);
  });
});
