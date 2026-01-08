'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

// Query key factory for payments
export var paymentKeys = {
  all: ['payments'],
  lists: function() { return [...paymentKeys.all, 'list']; },
  list: function(salonId, filters) { return [...paymentKeys.lists(), salonId, filters]; },
  details: function() { return [...paymentKeys.all, 'detail']; },
  detail: function(id) { return [...paymentKeys.details(), id]; },
  checkout: function(bookingId) { return [...paymentKeys.all, 'checkout', bookingId]; },
};

// Fetch all payments for a salon
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
      if (options?.page) params.append('page', options.page);
      if (options?.limit) params.append('limit', options.limit);
      return api.get('/payments?' + params.toString());
    },
    enabled: !!salonId,
  });
}

// Fetch single payment
export function usePayment(paymentId) {
  return useQuery({
    queryKey: paymentKeys.detail(paymentId),
    queryFn: function() {
      return api.get('/payments/' + paymentId);
    },
    enabled: !!paymentId,
  });
}

// Fetch checkout data for a booking
export function useCheckout(bookingId) {
  return useQuery({
    queryKey: paymentKeys.checkout(bookingId),
    queryFn: function() {
      return api.get('/checkout/' + bookingId);
    },
    enabled: !!bookingId,
  });
}

// Create payment intent (Stripe)
export function useCreatePaymentIntent() {
  return useMutation({
    mutationFn: function(data) {
      return api.post('/payments/intent', data);
    },
  });
}

// Confirm payment
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

// Create manual payment (cash, card terminal, etc.)
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

// Process refund
export function useProcessRefund() {
  var queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: function(data) {
      return api.post('/checkout/refund', data);
    },
    onSuccess: function(data, variables) {
      queryClient.invalidateQueries({ queryKey: paymentKeys.lists() });
      if (variables.payment_id) {
        queryClient.invalidateQueries({ queryKey: paymentKeys.detail(variables.payment_id) });
      }
    },
  });
}

// Validate discount code
export function useValidateDiscount() {
  return useMutation({
    mutationFn: function(data) {
      return api.post('/discounts/validate', data);
    },
  });
}

// Check gift card balance
export function useCheckGiftCard() {
  return useMutation({
    mutationFn: function(data) {
      return api.post('/gift-cards/check', data);
    },
  });
}

// Payment method constants
export var PAYMENT_METHODS = [
  { value: 'card', label: 'Card', icon: 'CreditCard' },
  { value: 'cash', label: 'Cash', icon: 'Banknote' },
  { value: 'card_terminal', label: 'Card Terminal', icon: 'Smartphone' },
  { value: 'gift_card', label: 'Gift Card', icon: 'Gift' },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: 'Building' },
];

// Payment status constants
export var PAYMENT_STATUSES = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800' },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-800' },
  refunded: { label: 'Refunded', color: 'bg-gray-100 text-gray-800' },
  partial_refund: { label: 'Partial Refund', color: 'bg-orange-100 text-orange-800' },
};

// Format currency
export function formatCurrency(amount, currency) {
  currency = currency || 'EUR';
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency: currency,
  }).format(amount || 0);
}
