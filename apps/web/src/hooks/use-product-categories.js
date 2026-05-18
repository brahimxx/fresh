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
    onMutate: async function (id) {
      // Cancel in-flight fetches so they don't overwrite our optimistic update.
      await queryClient.cancelQueries({ queryKey: productCategoryKeys.lists() });

      // Snapshot for rollback.
      var previousLists = queryClient.getQueriesData({ queryKey: productCategoryKeys.lists() });

      // Optimistically remove the category from every cached list.
      queryClient.setQueriesData({ queryKey: productCategoryKeys.lists() }, function (old) {
        if (!old) return old;
        // The select function normalises to an array, but the raw cache holds
        // the pre-select response shape. Handle both.
        if (Array.isArray(old)) {
          return old.filter(function (c) { return c.id !== id; });
        }
        if (old.data && Array.isArray(old.data)) {
          return { ...old, data: old.data.filter(function (c) { return c.id !== id; }) };
        }
        return old;
      });

      return { previousLists: previousLists };
    },
    onError: function (_err, _id, context) {
      // Rollback on failure.
      if (context && context.previousLists) {
        context.previousLists.forEach(function (entry) {
          queryClient.setQueryData(entry[0], entry[1]);
        });
      }
    },
    onSettled: function () {
      queryClient.invalidateQueries({ queryKey: productCategoryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}
