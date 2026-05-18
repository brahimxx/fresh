'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { formatCurrency } from '@/lib/format';

// Re-export for backward compatibility
export { formatCurrency };

// Query key factory for payments
export var paymentKeys = {
  all: ['payments'],
  lists: function() { return [...paymentKeys.all, 'list']; },
  list: function(salonId, filters) { return [...paymentKeys.lists(), salonId, filters]; },
  details: function() { return [...paymentKeys.all, 'detail']; },
  detail: function(id) { return [...paymentKeys.details(), id]; },
  dailyTotals: function(salonId, range) {
    return [...paymentKeys.all, 'daily-totals', salonId, range];
  },
  checkout: function(bookingId) { return [...paymentKeys.all, 'checkout', bookingId]; },
};

// ---------------------------------------------------------------------------
// usePayments — list endpoint
// ---------------------------------------------------------------------------
//
// Canonical snake_case filters / row shape (Req 13.1). The consumer receives
// `{ data: rows, meta }` so pagination metadata is preserved. No camelCase
// fallbacks: rows are the snake_case shape returned by `/api/payments`.
//
// `placeholderData: keepPreviousData` keeps the previous page rendered while
// the new query key resolves, so filter/page changes feel responsive
// (Req 16.4 parity for the list view).
export function usePayments(salonId, options) {
  return useQuery({
    queryKey: paymentKeys.list(salonId, options),
    queryFn: function() {
      var params = new URLSearchParams();
      if (salonId) params.append('salon_id', salonId);
      if (options?.status) params.append('status', options.status);
      if (options?.method) params.append('method', options.method);
      if (options?.start_date) params.append('start_date', options.start_date);
      if (options?.end_date) params.append('end_date', options.end_date);
      if (options?.search) params.append('search', options.search);
      if (options?.has_refund) params.append('has_refund', options.has_refund);
      if (options?.sort) params.append('sort', options.sort);
      if (options?.page) params.append('page', options.page);
      if (options?.limit) params.append('limit', options.limit);
      return api.get('/payments?' + params.toString());
    },
    select: function(response) {
      // API: success({ data: rows, meta }) → response = { success, data: { data, meta } }
      var inner = response?.data;
      if (inner && Array.isArray(inner.data)) {
        return { data: inner.data, meta: inner.meta || null };
      }
      if (Array.isArray(inner)) {
        return { data: inner, meta: null };
      }
      if (Array.isArray(response)) {
        return { data: response, meta: null };
      }
      return { data: [], meta: null };
    },
    placeholderData: keepPreviousData,
    enabled: !!salonId,
  });
}

// ---------------------------------------------------------------------------
// usePaymentDetail — single payment with full breakdown (Req 13.2)
// ---------------------------------------------------------------------------
export function usePaymentDetail(paymentId) {
  return useQuery({
    queryKey: paymentKeys.detail(paymentId),
    queryFn: function() {
      return api.get('/payments/' + paymentId);
    },
    select: function(response) {
      // API: success(paymentRow) → response = { success, data: paymentRow }
      return response?.data ?? null;
    },
    enabled: !!paymentId,
  });
}

// Back-compat alias — existing call sites import `usePayment`. The canonical
// name is `usePaymentDetail` (per design.md hook map).
export var usePayment = usePaymentDetail;

// ---------------------------------------------------------------------------
// useDailyTotals — chart series for /api/payments/daily-totals (Req 16.1, 16.3)
// ---------------------------------------------------------------------------
//
// Date-range changes change the query key, which triggers an immediate refetch
// (no debounce, no `staleTime` window holding back the request) so the chart
// updates within 500 ms of the new range (Req 16.3, 16.6). The previous chart
// is hidden while the new response loads — that is enforced by the chart
// component itself (Task 13.1) reading `isFetching`, not by `keepPreviousData`
// here.
export function useDailyTotals(salonId, range) {
  var startDate = range?.start_date;
  var endDate = range?.end_date;
  return useQuery({
    queryKey: paymentKeys.dailyTotals(salonId, { start_date: startDate, end_date: endDate }),
    queryFn: function() {
      var params = new URLSearchParams();
      if (salonId) params.append('salon_id', salonId);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      return api.get('/payments/daily-totals?' + params.toString());
    },
    select: function(response) {
      // API: success(rows) → response = { success, data: [...] }
      var inner = response?.data;
      if (Array.isArray(inner)) return inner;
      if (Array.isArray(response)) return response;
      return [];
    },
    enabled: !!salonId && !!startDate && !!endDate,
    staleTime: 0,
    refetchOnMount: true,
  });
}

// ---------------------------------------------------------------------------
// Checkout-related queries (unchanged)
// ---------------------------------------------------------------------------
export function useCheckout(bookingId) {
  return useQuery({
    queryKey: paymentKeys.checkout(bookingId),
    queryFn: function() {
      return api.get('/checkout/' + bookingId);
    },
    enabled: !!bookingId,
  });
}

export function useCreatePaymentIntent() {
  return useMutation({
    mutationFn: function(data) {
      return api.post('/payments/intent', data);
    },
  });
}

export function useConfirmPayment() {
  var queryClient = useQueryClient();

  return useMutation({
    mutationFn: function(data) {
      return api.post('/payments/confirm', data);
    },
    onSuccess: function() {
      queryClient.invalidateQueries({ queryKey: paymentKeys.lists() });
    },
  });
}

export function useCreatePayment() {
  var queryClient = useQueryClient();

  return useMutation({
    mutationFn: function(data) {
      return api.post('/payments', data);
    },
    onSuccess: function() {
      queryClient.invalidateQueries({ queryKey: paymentKeys.lists() });
    },
  });
}

// ---------------------------------------------------------------------------
// useProcessRefund — POST /api/checkout/refund (Req 14.1)
// ---------------------------------------------------------------------------
//
// Body shape: `{ paymentId, amount, reason, notes }` — matches the
// Refund_API contract from Task 7.1. On success, invalidate the payments
// list and the affected detail entry so the new status / refunded_amount
// surface immediately.
export function useProcessRefund() {
  var queryClient = useQueryClient();

  return useMutation({
    mutationFn: function(data) {
      return api.post('/checkout/refund', data);
    },
    onSuccess: function(_data, variables) {
      queryClient.invalidateQueries({ queryKey: paymentKeys.lists() });
      // Daily totals depend on refunded_amount (Req 12.4) so refresh the chart.
      queryClient.invalidateQueries({ queryKey: [...paymentKeys.all, 'daily-totals'] });
      var paymentId = variables?.paymentId;
      if (paymentId) {
        queryClient.invalidateQueries({ queryKey: paymentKeys.detail(paymentId) });
      }
    },
  });
}

// ---------------------------------------------------------------------------
// Discount / gift-card helpers (unchanged)
// ---------------------------------------------------------------------------
export function useValidateDiscount() {
  return useMutation({
    mutationFn: function(data) {
      return api.post('/discounts/validate', data);
    },
  });
}

export function useCheckGiftCard() {
  return useMutation({
    mutationFn: function(data) {
      return api.post('/gift-cards/check', data);
    },
  });
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
export var PAYMENT_METHODS = [
  { value: 'card', label: 'Card', icon: 'CreditCard' },
  { value: 'cash', label: 'Cash', icon: 'Banknote' },
  { value: 'card_terminal', label: 'Card Terminal', icon: 'Smartphone' },
  { value: 'gift_card', label: 'Gift Card', icon: 'Gift' },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: 'Building' },
];

// Subset of PAYMENT_METHODS that the API accepts as filter values.
// The DB enum for payments.method is ('card', 'cash'); the other entries in
// PAYMENT_METHODS exist only for display labeling of historical/edge-case rows.
export var FILTERABLE_PAYMENT_METHODS = [
  { value: 'card', label: 'Card', icon: 'CreditCard' },
  { value: 'cash', label: 'Cash', icon: 'Banknote' },
];

// Canonical 4-value enum (Req 12.10). Legacy aliases left in for read-only
// rendering of historical rows; new writes only use the canonical keys.
export var PAYMENT_STATUSES = {
  pending: { label: 'Pending', color: 'bg-amber-50/50 text-amber-600 border-amber-200' },
  paid: { label: 'Paid', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
  refunded: { label: 'Refunded', color: 'bg-gray-500/10 text-gray-500 border-gray-500/20' },
  partially_refunded: { label: 'Partially Refunded', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  // Legacy aliases — kept to avoid runtime errors when reading historical rows
  // before the canonicalisation. New code paths reject these via INVALID_STATUS.
  completed: { label: 'Completed', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
  failed: { label: 'Failed', color: 'bg-red-500/10 text-red-500 border-red-500/20' },
  partial_refund: { label: 'Partial Refund', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
};
