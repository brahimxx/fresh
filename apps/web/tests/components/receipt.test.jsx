/**
 * Component test for the browser-printable receipt route (Task 15.2).
 *
 * Covers Requirements 18.1, 18.2, 18.8:
 *   - 18.1: Print Receipt navigation lands on this page.
 *   - 18.2: A successful render fires `window.print()` within 500 ms once
 *     both salon and payment detail have loaded.
 *   - 18.8: A 404 / 403 from the payment detail endpoint renders an inline
 *     `<DataError>` and never calls `window.print()`.
 *
 * Strategy:
 *   - Mock `next/navigation`'s `useParams` (the page reads `salonId` and
 *     `paymentId` from it).
 *   - Mock `@/providers/salon-provider`'s `useSalon` and
 *     `@/hooks/use-payments`'s `usePaymentDetail` so we can drive the
 *     loading / success / error states from each test without real network
 *     calls or React-Query plumbing.
 *   - Spy on `window.print` so we can assert it is or isn't called.
 *   - Use `vi.useFakeTimers()` so the 250 ms `setTimeout` inside the
 *     receipt page's `useEffect` is deterministic and we can assert on the
 *     "within 500 ms" wording from Req 18.2.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Module mocks — declared before the page import so vi.mock hoisting works.
// ---------------------------------------------------------------------------

// next/navigation — the page reads { salonId, paymentId } via useParams.
vi.mock('next/navigation', () => ({
  useParams: () => ({ salonId: '1', paymentId: '42' }),
}));

// @/providers/salon-provider — we drive { salon, isLoading, error } per test.
const useSalonMock = vi.fn();
vi.mock('@/providers/salon-provider', () => ({
  useSalon: () => useSalonMock(),
}));

// @/hooks/use-payments — we drive { data, isLoading, error } per test, and
// re-export the PAYMENT_METHODS constant the page uses for the method label.
const usePaymentDetailMock = vi.fn();
vi.mock('@/hooks/use-payments', () => ({
  usePaymentDetail: (id) => usePaymentDetailMock(id),
  PAYMENT_METHODS: [
    { value: 'card', label: 'Card', icon: 'CreditCard' },
    { value: 'cash', label: 'Cash', icon: 'Banknote' },
    { value: 'card_terminal', label: 'Card Terminal', icon: 'Smartphone' },
    { value: 'gift_card', label: 'Gift Card', icon: 'Gift' },
    { value: 'bank_transfer', label: 'Bank Transfer', icon: 'Building' },
  ],
}));

// Page is imported dynamically inside each test (after the mocks are wired)
// to avoid module-resolution side-effects bleeding between tests.
const PAGE_PATH = '@/app/dashboard/salon/[salonId]/sales/[paymentId]/receipt/page';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const SALON = {
  id: 1,
  name: 'Glow Studio',
  address: '1 Main St',
  city: 'Springfield',
  state: 'IL',
  zip_code: '62701',
  country: 'USA',
  phone: '+1-555-0100',
  currency: 'USD',
};

const PAYMENT = {
  id: 42,
  booking_id: 100,
  client_name: 'Jane Doe',
  client_email: 'jane@example.com',
  services_amount: 100,
  products_amount: 25.5,
  subtotal: 125.5,
  discount_amount: 0,
  discount_code: null,
  gift_card_amount: 0,
  tip_amount: 0,
  amount: 125.5,
  refunded_amount: 0,
  status: 'paid',
  method: 'card',
  created_at: '2026-06-01T10:30:00Z',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('ReceiptPage — window.print() timing and 404/403 suppression', () => {
  let printSpy;
  let ReceiptPage;

  beforeEach(async () => {
    vi.useFakeTimers();
    printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    useSalonMock.mockReset();
    usePaymentDetailMock.mockReset();

    // Import once per test so any module-level state in the page resets.
    const mod = await import(PAGE_PATH);
    ReceiptPage = mod.default;
  });

  afterEach(() => {
    cleanup();
    printSpy.mockRestore();
    vi.useRealTimers();
    vi.resetModules();
  });

  it('fires window.print() within 500 ms when salon and payment load successfully (Req 18.1, 18.2)', () => {
    useSalonMock.mockReturnValue({
      salon: SALON,
      salonId: '1',
      isLoading: false,
      error: null,
    });
    usePaymentDetailMock.mockReturnValue({
      data: PAYMENT,
      isLoading: false,
      error: null,
    });

    render(<ReceiptPage />);

    // Print should not fire synchronously — it is scheduled via setTimeout.
    expect(printSpy).not.toHaveBeenCalled();

    // Advance just under the 500 ms deadline. The page schedules at 250 ms,
    // so 499 ms is well past it but still within the requirement window.
    act(() => {
      vi.advanceTimersByTime(499);
    });

    expect(printSpy).toHaveBeenCalledTimes(1);

    // Sanity: the receipt body actually rendered (so the print captures
    // real content, not the loading skeleton).
    expect(screen.getByText('Glow Studio')).not.toBeNull();
    expect(screen.getByText('Jane Doe')).not.toBeNull();
  });

  it('does not call window.print() when payment detail returns 404 (Req 18.8)', () => {
    useSalonMock.mockReturnValue({
      salon: SALON,
      salonId: '1',
      isLoading: false,
      error: null,
    });
    usePaymentDetailMock.mockReturnValue({
      data: null,
      isLoading: false,
      error: { status: 404, message: 'Not found' },
    });

    render(<ReceiptPage />);

    // Generously advance past the 500 ms deadline to prove no print is
    // ever scheduled on the error path.
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(printSpy).not.toHaveBeenCalled();
    // Inline DataError is rendered with the unauthorized title.
    expect(screen.getByText('Receipt unavailable')).not.toBeNull();
  });

  it('does not call window.print() when payment detail returns 403 (Req 18.8)', () => {
    useSalonMock.mockReturnValue({
      salon: SALON,
      salonId: '1',
      isLoading: false,
      error: null,
    });
    usePaymentDetailMock.mockReturnValue({
      data: null,
      isLoading: false,
      error: { status: 403, message: 'Forbidden' },
    });

    render(<ReceiptPage />);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(printSpy).not.toHaveBeenCalled();
    expect(screen.getByText('Receipt unavailable')).not.toBeNull();
  });

  it('does not call window.print() while data is still loading', () => {
    useSalonMock.mockReturnValue({
      salon: null,
      salonId: '1',
      isLoading: true,
      error: null,
    });
    usePaymentDetailMock.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    render(<ReceiptPage />);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(printSpy).not.toHaveBeenCalled();
  });
});
