'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Query keys factory
export var packageKeys = {
  all: ['packages'],
  lists: function() { return [...packageKeys.all, 'list']; },
  list: function(salonId, filters) { return [...packageKeys.lists(), salonId, filters]; },
  details: function() { return [...packageKeys.all, 'detail']; },
  detail: function(salonId, id) { return [...packageKeys.details(), salonId, id]; },
};

// Package statuses
export var PACKAGE_STATUSES = {
  active: { label: 'Active', color: 'bg-green-100 text-green-800' },
  inactive: { label: 'Inactive', color: 'bg-gray-100 text-gray-800' },
  sold_out: { label: 'Sold Out', color: 'bg-red-100 text-red-800' },
};

// Format currency
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount || 0);
}

// Calculate package savings
export function calculateSavings(pkg) {
  var originalPrice = Number(pkg.original_price || 0);
  var packagePrice = Number(pkg.price || 0);
  
  if (originalPrice <= 0) return { amount: 0, percentage: 0 };
  
  var savingsAmount = originalPrice - packagePrice;
  var savingsPercentage = (savingsAmount / originalPrice) * 100;
  
  return {
    amount: savingsAmount,
    percentage: Math.round(savingsPercentage),
  };
}

// List packages
export function usePackages(salonId, filters) {
  if (filters === undefined) filters = {};
  
  return useQuery({
    queryKey: packageKeys.list(salonId, filters),
    queryFn: async function() {
      var params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      
      var url = '/api/packages?salon_id=' + salonId;
      if (params.toString()) url += '&' + params.toString();
      
      var res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch packages');
      var json = await res.json();
      return json.data || [];
    },
    enabled: !!salonId,
  });
}

// Get single package
export function usePackage(salonId, packageId) {
  return useQuery({
    queryKey: packageKeys.detail(salonId, packageId),
    queryFn: async function() {
      var res = await fetch('/api/packages/' + packageId);
      if (!res.ok) throw new Error('Failed to fetch package');
      var json = await res.json();
      return json.data;
    },
    enabled: !!salonId && !!packageId,
  });
}

// Create package
export function useCreatePackage() {
  var queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async function(data) {
      var res = await fetch('/api/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        var error = await res.json();
        throw new Error(error.message || 'Failed to create package');
      }
      return res.json();
    },
    onSuccess: function() {
      queryClient.invalidateQueries({ queryKey: packageKeys.lists() });
    },
  });
}

// Update package
export function useUpdatePackage() {
  var queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async function(params) {
      var packageId = params.packageId;
      var data = params.data;
      
      var res = await fetch('/api/packages/' + packageId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        var error = await res.json();
        throw new Error(error.message || 'Failed to update package');
      }
      return res.json();
    },
    onSuccess: function() {
      queryClient.invalidateQueries({ queryKey: packageKeys.all });
    },
  });
}

// Delete package
export function useDeletePackage() {
  var queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async function(packageId) {
      var res = await fetch('/api/packages/' + packageId, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete package');
      return res.json();
    },
    onSuccess: function() {
      queryClient.invalidateQueries({ queryKey: packageKeys.lists() });
    },
  });
}

// Purchase package for client
export function usePurchasePackage() {
  var queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async function(params) {
      var packageId = params.packageId;
      var clientId = params.clientId;
      var paymentMethod = params.paymentMethod;
      
      var res = await fetch('/api/packages/' + packageId + '/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          client_id: clientId,
          payment_method: paymentMethod,
        }),
      });
      if (!res.ok) {
        var error = await res.json();
        throw new Error(error.message || 'Failed to purchase package');
      }
      return res.json();
    },
    onSuccess: function() {
      queryClient.invalidateQueries({ queryKey: packageKeys.all });
    },
  });
}
