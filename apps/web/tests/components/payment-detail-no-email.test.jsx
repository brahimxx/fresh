/**
 * Component test for PaymentDetailDialog — no Email Receipt affordance
 * (Task 17.8).
 *
 * Validates Requirement 18.6: the "Email Receipt" button has been removed
 * from `<PaymentDetailDialog>`. The dialog must expose a "Print Receipt"
 * action and nothing matching /email/i.
 *
 * Strategy:
 *   - Mock `next/navigation`'s `useRouter` so the dialog can render outside
 *     the App Router.
 *   - Mock `@/providers/salon-provider`'s `useSalon` so the component sees
 *     a salon + salonId without bootstrapping the provider.
 *   - Mock `@/hooks/use-payments`'s `usePaymentDetail` (and re-export the
 *     `PAYMENT_METHODS` / `PAYMENT_STATUSES` constants the component uses
 *     for icon and status-badge resolution) so no network call fires.
 *   - Render the dialog open with a representative payment row and assert
 *     that no button accessible-name matches /email/i.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Module mocks — declared before the component import for vi.mock hoisting.
// ---------------------------------------------------------------------------

// next/navigation — the dialog uses `useRouter().push` for Print Receipt.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// @/providers/salon-provider — drive a salon with currency so formatCurrency works.
const useSalonMock = vi.fn();
vi.mock('@/providers/salon-provider', () => ({
  useSalon: () => useSalonMock(),
}));

// @/hooks/use-payments — drive the detail query state and re-export the
// constants the component reads for method icon and status badge.
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
  PAYMENT_STATUSES: {
    pending: { label: 'Pending', color: '' },
    paid: { label: 'Paid', color: '' },
    refunded: { label: 'Refunded', color: '' },
    partially_refunded: { label: 'Partially refunded', color: '' },
  },
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const SALON = {
  id: 1,
  name: 'Glow Studio',
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
describe('PaymentDetailDialog — Email Receipt removed (Req 18.6)', () => {
  let PaymentDetailDialog;

  beforeEach(async () => {
    useSalonMock.mockReset();
    usePaymentDetailMock.mockReset();

    useSalonMock.mockReturnValue({
      salon: SALON,
      salonId: 1,
      isLoading: false,
      error: null,
    });
    usePaymentDetailMock.mockReturnValue({
      data: PAYMENT,
      isLoading: false,
      error: null,
    });

    const mod = await import('@/components/sales/payment-detail');
    PaymentDetailDialog = mod.PaymentDetailDialog;
  });

  afterEach(() => {
    cleanup();
    vi.resetModules();
  });

  it('does not render any button whose accessible name contains "email"', () => {
    render(
      <PaymentDetailDialog
        open={true}
        onOpenChange={() => {}}
        payment={PAYMENT}
      />,
    );

    // Sanity: the dialog actually rendered (Print Receipt is the canonical
    // action so its presence proves the action area is mounted).
    expect(
      screen.getByRole('button', { name: /print receipt/i }),
    ).not.toBeNull();

    // Req 18.6: no "Email Receipt" — and, more strictly, no email-related
    // button at all should remain on this surface.
    expect(screen.queryByRole('button', { name: /email/i })).toBeNull();
    expect(
      screen.queryByRole('button', { name: /email receipt/i }),
    ).toBeNull();
  });

  it('renders the same way when only the listing row is available (detail still loading)', () => {
    // Force the detail query into a loading state so the component falls
    // back to the listing payment prop. The Email Receipt button must
    // remain absent on that path too.
    usePaymentDetailMock.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    render(
      <PaymentDetailDialog
        open={true}
        onOpenChange={() => {}}
        payment={PAYMENT}
      />,
    );

    expect(screen.queryByRole('button', { name: /email/i })).toBeNull();
  });
});
