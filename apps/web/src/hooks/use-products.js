'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

// Query key factory for products
export var productKeys = {
  all: ['products'],
  lists: function() { return [...productKeys.all, 'list']; },
  list: function(salonId, filters) { return [...productKeys.lists(), salonId, filters]; },
  details: function() { return [...productKeys.all, 'detail']; },
  detail: function(id) { return [...productKeys.details(), id]; },
  categories: function(salonId) { return [...productKeys.all, 'categories', salonId]; },
  lowStock: function(salonId) { return [...productKeys.all, 'low-stock', salonId]; },
};

// Fetch all products for a salon
export function useProducts(salonId, options) {
  return useQuery({
    queryKey: productKeys.list(salonId, options),
    queryFn: function() {
      var params = new URLSearchParams();
      if (salonId) params.append('salon_id', salonId);
      if (options?.category_id) params.append('category_id', options.category_id);
      if (options?.search) params.append('search', options.search);
      if (options?.in_stock !== undefined) params.append('in_stock', options.in_stock);
      return api.get('/products?' + params.toString());
    },
    select: function(response) {
      // API returns { success: true, data: { data: [...] } }
      // api.get returns the parsed JSON body
      var d = response?.data;
      if (Array.isArray(d)) return d;
      if (d && Array.isArray(d.data)) return d.data;
      if (Array.isArray(response)) return response;
      return [];
    },
    enabled: !!salonId,
  });
}

// Fetch single product
export function useProduct(productId) {
  return useQuery({
    queryKey: productKeys.detail(productId),
    queryFn: function() {
      return api.get('/products/' + productId);
    },
    enabled: !!productId,
  });
}

// Create product
export function useCreateProduct() {
  var queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: function(data) {
      return api.post('/products', data);
    },
    onSuccess: function() {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
}

// Update product
export function useUpdateProduct() {
  var queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: function(params) {
      return api.put('/products/' + params.id, params.data);
    },
    onSuccess: function(data, variables) {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      queryClient.invalidateQueries({ queryKey: productKeys.detail(variables.id) });
    },
  });
}

// Delete product
export function useDeleteProduct() {
  var queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: function(id) {
      return api.delete('/products/' + id);
    },
    onSuccess: function() {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
}

// Update product stock
export function useUpdateProductStock() {
  var queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: function(params) {
      return api.put('/products/' + params.id + '/stock', { quantity: params.quantity });
    },
    onSuccess: function(data, variables) {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      queryClient.invalidateQueries({ queryKey: productKeys.detail(variables.id) });
    },
  });
}

// Fetch low stock products
export function useLowStockProducts(salonId, threshold) {
  return useQuery({
    queryKey: productKeys.lowStock(salonId),
    queryFn: function() {
      var params = new URLSearchParams();
      params.append('salon_id', salonId);
      params.append('low_stock', 'true');
      if (threshold) params.append('threshold', threshold);
      return api.get('/products?' + params.toString());
    },
    enabled: !!salonId,
  });
}

// Product category constants
export var PRODUCT_CATEGORIES = [
  { value: 'hair_care', label: 'Hair Care' },
  { value: 'styling', label: 'Styling Products' },
  { value: 'color', label: 'Hair Color' },
  { value: 'skin_care', label: 'Skin Care' },
  { value: 'nail_care', label: 'Nail Care' },
  { value: 'tools', label: 'Tools & Equipment' },
  { value: 'accessories', label: 'Accessories' },
  { value: 'other', label: 'Other' },
];

// Stock status helper
export function getStockStatus(quantity, lowStockThreshold) {
  lowStockThreshold = lowStockThreshold || 5;
  if (quantity === 0) {
    return { status: 'out', label: 'Out of Stock', color: 'destructive' };
  }
  if (quantity <= lowStockThreshold) {
    return { status: 'low', label: 'Low Stock', color: 'warning' };
  }
  return { status: 'in', label: 'In Stock', color: 'success' };
}
