'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/format';

// Re-export for backward compatibility
export { formatCurrency };

// Query keys factory
export var giftCardKeys = {
  all: ['gift-cards'],
  lists: function() { return [...giftCardKeys.all, 'list']; },
  list: function(salonId, filters) { return [...giftCardKeys.lists(), salonId, filters]; },
  details: function() { return [...giftCardKeys.all, 'detail']; },
  detail: function(salonId, id) { return [...giftCardKeys.details(), salonId, id]; },
};

// Gift card statuses — styled to match the booking page status badges
export var GIFT_CARD_STATUSES = {
  pending: { label: 'Pending Payment', color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200/50' },
  active: { label: 'Active', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200/50' },
  redeemed: { label: 'Redeemed', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200/50' },
  expired: { label: 'Expired', color: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-200/50' },
  cancelled: { label: 'Cancelled', color: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-200/50' },
};

// Get gift card status
export function getGiftCardStatus(giftCard) {
  if (giftCard.status === 'cancelled') return 'cancelled';
  if (giftCard.status === 'pending') return 'pending';
  
  var balance = Number(giftCard.balance || giftCard.remaining_balance || giftCard.remainingBalance || 0);
  if (balance <= 0) return 'redeemed';
  
  if (giftCard.expires_at || giftCard.expiresAt) {
    var expiryDate = new Date(giftCard.expires_at || giftCard.expiresAt);
    if (expiryDate < new Date()) return 'expired';
  }
  
  return 'active';
}

// Generate random gift card code
export function generateGiftCardCode() {
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  var segments = [];
  for (var s = 0; s < 4; s++) {
    var segment = '';
    for (var i = 0; i < 4; i++) {
      segment += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    segments.push(segment);
  }
  return segments.join('-');
}



// List gift cards
export function useGiftCards(salonId, filters) {
  if (filters === undefined) filters = {};
  
  return useQuery({
    queryKey: giftCardKeys.list(salonId, filters),
    queryFn: async function() {
      var params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      
      var url = '/api/gift-cards?salon_id=' + salonId;
      if (params.toString()) url += '&' + params.toString();
      
      var res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch gift cards');
      var json = await res.json();
      var raw = json.data?.giftCards || json.data?.gift_cards || json.data?.data || (Array.isArray(json.data) ? json.data : []);
      // Normalize field names so the UI can use consistent keys regardless
      // of which API endpoint shape is returned.
      return raw.map(function(card) {
        return {
          ...card,
          // Canonical UI field names
          initial_value: Number(card.initial_value || card.initialBalance || card.initial_balance || 0),
          balance: Number(card.balance || card.remainingBalance || card.remaining_balance || 0),
          // Keep snake_case versions too for components that use them
          initial_balance: Number(card.initial_balance || card.initialBalance || card.initial_value || 0),
          remaining_balance: Number(card.remaining_balance || card.remainingBalance || card.balance || 0),
          recipient_name: card.recipient_name || card.recipientName || null,
          recipient_email: card.recipient_email || card.recipientEmail || null,
          expires_at: card.expires_at || card.expiresAt || null,
          created_at: card.created_at || card.createdAt || null,
        };
      });
    },
    enabled: !!salonId,
  });
}

// Get single gift card
export function useGiftCard(salonId, giftCardId) {
  return useQuery({
    queryKey: giftCardKeys.detail(salonId, giftCardId),
    queryFn: async function() {
      var res = await fetch('/api/gift-cards/' + giftCardId);
      if (!res.ok) throw new Error('Failed to fetch gift card');
      var json = await res.json();
      return json.data;
    },
    enabled: !!salonId && !!giftCardId,
  });
}

// Check gift card balance
export function useCheckGiftCard() {
  return useMutation({
    mutationFn: async function(code) {
      var res = await fetch('/api/gift-cards/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code }),
      });
      if (!res.ok) {
        var error = await res.json();
        throw new Error(error.message || 'Gift card not found');
      }
      return res.json();
    },
  });
}

// Create gift card
export function useCreateGiftCard() {
  var queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async function(data) {
      var res = await fetch('/api/gift-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        var error = await res.json();
        throw new Error(error.message || 'Failed to create gift card');
      }
      return res.json();
    },
    onSuccess: function() {
      queryClient.invalidateQueries({ queryKey: giftCardKeys.lists() });
    },
  });
}

// Update gift card
export function useUpdateGiftCard() {
  var queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async function(params) {
      var giftCardId = params.giftCardId;
      var data = params.data;
      
      var res = await fetch('/api/gift-cards/' + giftCardId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        var error = await res.json();
        throw new Error(error.message || 'Failed to update gift card');
      }
      return res.json();
    },
    onSuccess: function() {
      queryClient.invalidateQueries({ queryKey: giftCardKeys.all });
    },
  });
}

// Cancel gift card
export function useCancelGiftCard() {
  var queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async function(giftCardId) {
      var res = await fetch('/api/gift-cards/' + giftCardId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      if (!res.ok) throw new Error('Failed to cancel gift card');
      return res.json();
    },
    onSuccess: function() {
      queryClient.invalidateQueries({ queryKey: giftCardKeys.all });
    },
  });
}
