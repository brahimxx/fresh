'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Query keys factory
export var giftCardKeys = {
  all: ['gift-cards'],
  lists: function() { return [...giftCardKeys.all, 'list']; },
  list: function(salonId, filters) { return [...giftCardKeys.lists(), salonId, filters]; },
  details: function() { return [...giftCardKeys.all, 'detail']; },
  detail: function(salonId, id) { return [...giftCardKeys.details(), salonId, id]; },
};

// Gift card statuses
export var GIFT_CARD_STATUSES = {
  active: { label: 'Active', color: 'bg-green-100 text-green-800' },
  redeemed: { label: 'Redeemed', color: 'bg-gray-100 text-gray-800' },
  expired: { label: 'Expired', color: 'bg-red-100 text-red-800' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800' },
};

// Get gift card status
export function getGiftCardStatus(giftCard) {
  if (giftCard.status === 'cancelled') return 'cancelled';
  
  var balance = Number(giftCard.balance || 0);
  if (balance <= 0) return 'redeemed';
  
  if (giftCard.expires_at) {
    var expiryDate = new Date(giftCard.expires_at);
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

// Format currency
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount || 0);
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
      return json.data || [];
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
