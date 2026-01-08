'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Query keys factory
export var discountKeys = {
  all: ['discounts'],
  lists: function() { return [...discountKeys.all, 'list']; },
  list: function(salonId, filters) { return [...discountKeys.lists(), salonId, filters]; },
  details: function() { return [...discountKeys.all, 'detail']; },
  detail: function(salonId, id) { return [...discountKeys.details(), salonId, id]; },
};

// Discount types
export var DISCOUNT_TYPES = [
  { value: 'percentage', label: 'Percentage' },
  { value: 'fixed', label: 'Fixed Amount' },
];

// Discount statuses
export var DISCOUNT_STATUSES = {
  active: { label: 'Active', color: 'bg-green-100 text-green-800' },
  inactive: { label: 'Inactive', color: 'bg-gray-100 text-gray-800' },
  expired: { label: 'Expired', color: 'bg-red-100 text-red-800' },
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-800' },
};

// Get discount status based on dates
export function getDiscountStatus(discount) {
  if (!discount.is_active) return 'inactive';
  
  var now = new Date();
  var startDate = discount.start_date ? new Date(discount.start_date) : null;
  var endDate = discount.end_date ? new Date(discount.end_date) : null;
  
  if (startDate && startDate > now) return 'scheduled';
  if (endDate && endDate < now) return 'expired';
  
  return 'active';
}

// Generate random code
export function generateDiscountCode() {
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  var code = '';
  for (var i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// List discounts
export function useDiscounts(salonId, filters) {
  if (filters === undefined) filters = {};
  
  return useQuery({
    queryKey: discountKeys.list(salonId, filters),
    queryFn: async function() {
      var params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.type) params.append('type', filters.type);
      
      var url = '/api/discounts?salon_id=' + salonId;
      if (params.toString()) url += '&' + params.toString();
      
      var res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch discounts');
      var json = await res.json();
      return json.data || [];
    },
    enabled: !!salonId,
  });
}

// Get single discount
export function useDiscount(salonId, discountId) {
  return useQuery({
    queryKey: discountKeys.detail(salonId, discountId),
    queryFn: async function() {
      var res = await fetch('/api/discounts/' + discountId);
      if (!res.ok) throw new Error('Failed to fetch discount');
      var json = await res.json();
      return json.data;
    },
    enabled: !!salonId && !!discountId,
  });
}

// Create discount
export function useCreateDiscount() {
  var queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async function(data) {
      var res = await fetch('/api/discounts/' + data.salon_id, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        var error = await res.json();
        throw new Error(error.message || 'Failed to create discount');
      }
      return res.json();
    },
    onSuccess: function(_, variables) {
      queryClient.invalidateQueries({ queryKey: discountKeys.lists() });
    },
  });
}

// Update discount
export function useUpdateDiscount() {
  var queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async function(params) {
      var discountId = params.discountId;
      var data = params.data;
      
      var res = await fetch('/api/discounts/' + discountId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        var error = await res.json();
        throw new Error(error.message || 'Failed to update discount');
      }
      return res.json();
    },
    onSuccess: function() {
      queryClient.invalidateQueries({ queryKey: discountKeys.all });
    },
  });
}

// Delete discount
export function useDeleteDiscount() {
  var queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async function(discountId) {
      var res = await fetch('/api/discounts/' + discountId, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete discount');
      return res.json();
    },
    onSuccess: function() {
      queryClient.invalidateQueries({ queryKey: discountKeys.lists() });
    },
  });
}

// Toggle discount active status
export function useToggleDiscount() {
  var queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async function(params) {
      var discountId = params.discountId;
      var isActive = params.isActive;
      
      var res = await fetch('/api/discounts/' + discountId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: isActive }),
      });
      if (!res.ok) throw new Error('Failed to toggle discount');
      return res.json();
    },
    onSuccess: function() {
      queryClient.invalidateQueries({ queryKey: discountKeys.all });
    },
  });
}
