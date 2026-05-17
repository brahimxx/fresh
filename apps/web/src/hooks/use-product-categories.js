'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { productKeys } from '@/hooks/use-products';

// Query key factory for product categories
export var productCategoryKeys = {
  all: ['product-categories'],
  lists: function () { return [...productCategoryKeys.all, 'list']; },
  list: function (salonId) { return [...productCategoryKeys.lists(), salonId]; },
};

// Fetch all product categories for a salon
export function useProductCategories(salonId) {
  return useQuery({
    queryKey: productCategoryKeys.list(salonId),
    queryFn: function () {
      var params = new URLSearchParams();
      if (salonId) params.append('salon_id', salonId);
      return api.get('/product-categories?' + params.toString());
    },
    select: function (response) {
      // API returns { success: true, data: [...] }
      var d = response?.data;
      if (Array.isArray(d)) return d;
      if (Array.isArray(response)) return response;
      return [];
    },
    enabled: !!salonId,
  });
}

// Create a product category
export function useCreateProductCategory() {
  var queryClient = useQueryClient();

  return useMutation({
    mutationFn: function (data) {
      return api.post('/product-categories', data);
    },
    onSuccess: function (data, variables) {
      queryClient.invalidateQueries({ queryKey: productCategoryKeys.lists() });
      // Refresh products so any joined category_name reflects the new row
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

// Update a product category (rename / reorder)
export function useUpdateProductCategory() {
  var queryClient = useQueryClient();

  return useMutation({
    mutationFn: function (params) {
      return api.put('/product-categories/' + params.id, params.data);
    },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: productCategoryKeys.lists() });
      // Renames change category_name on joined product rows
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

// Soft-delete a product category. The API also nulls products.category_id
// for every product referencing this category in the same transaction, so
// the products listing must be invalidated to reflect that.
export function useDeleteProductCategory() {
  var queryClient = useQueryClient();

  return useMutation({
    mutationFn: function (id) {
      return api.delete('/product-categories/' + id);
    },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: productCategoryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}
