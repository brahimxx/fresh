'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import { api } from '@/lib/api-client';

// ─── Query key factory ─────────────────────────────────────────────────────
export var productKeys = {
  all: ['products'],
  lists: function () {
    return [...productKeys.all, 'list'];
  },
  list: function (salonId, filters) {
    return [...productKeys.lists(), salonId, filters || {}];
  },
  details: function () {
    return [...productKeys.all, 'detail'];
  },
  detail: function (id) {
    return [...productKeys.details(), id];
  },
  stats: function (salonId) {
    return [...productKeys.all, 'stats', salonId];
  },
  statsAll: function () {
    return [...productKeys.all, 'stats'];
  },
  stockHistory: function (productId, params) {
    return [...productKeys.all, 'stock-history', productId, params || {}];
  },
  stockHistoryFor: function (productId) {
    return [...productKeys.all, 'stock-history', productId];
  },
  lowStock: function (salonId) {
    return [...productKeys.all, 'low-stock', salonId];
  },
};

// ─── Internal helpers ──────────────────────────────────────────────────────

// Append a query param iff the value is meaningful (not null/undefined/'').
// Booleans and zero are passed through unchanged.
function appendParam(params, key, value) {
  if (value === undefined || value === null || value === '') return;
  params.append(key, value);
}

// Selector that normalises the listing envelope into `{ data, meta }`.
// The API returns `{ success, data: { data: [...], meta: {...} } }` after
// `api.get` parses the JSON body, so `response.data` is the inner pagination
// payload. We tolerate the older flat shape so callers do not break during
// the rollout window.
function selectListEnvelope(response) {
  var d = response && response.data;
  if (d && Array.isArray(d.data)) {
    return { data: d.data, meta: d.meta || null };
  }
  if (Array.isArray(d)) {
    return { data: d, meta: null };
  }
  if (Array.isArray(response)) {
    return { data: response, meta: null };
  }
  return { data: [], meta: null };
}

// ─── Listing ───────────────────────────────────────────────────────────────

/**
 * Fetch a paginated, server-filtered product list for a salon.
 *
 * Filters supported (all server-side):
 *   - search       string
 *   - category_id  positive int
 *   - stock        'in' | 'low' | 'out' | 'all'
 *   - is_active    boolean / 'true' / 'false'
 *   - sort         enum mapped server-side to ORDER BY
 *   - page         positive int (default 1)
 *   - limit        1..100 (default 25 server-side)
 *
 * Returns `{ data, meta }` where `meta` is `{ page, limit, total, totalPages }`
 * for the new envelope (older flat array responses are tolerated and surface
 * as `meta: null`).
 */
export function useProducts(salonId, filters) {
  return useQuery({
    queryKey: productKeys.list(salonId, filters),
    queryFn: function () {
      var params = new URLSearchParams();
      if (salonId) params.append('salon_id', salonId);
      if (filters) {
        appendParam(params, 'search', filters.search);
        appendParam(params, 'category_id', filters.category_id);
        appendParam(params, 'stock', filters.stock);
        appendParam(params, 'is_active', filters.is_active);
        appendParam(params, 'sort', filters.sort);
        appendParam(params, 'page', filters.page);
        appendParam(params, 'limit', filters.limit);
      }
      return api.get('/products?' + params.toString());
    },
    select: selectListEnvelope,
    enabled: !!salonId,
    // Keep the previous page's rows visible while the next page is in flight,
    // so paginated UIs avoid the "blink to skeleton" between requests.
    placeholderData: keepPreviousData,
  });
}

/** Fetch a single product detail. */
export function useProduct(productId) {
  return useQuery({
    queryKey: productKeys.detail(productId),
    queryFn: function () {
      return api.get('/products/' + productId);
    },
    enabled: !!productId,
  });
}

// ─── Stats (KPI cards) ─────────────────────────────────────────────────────

/**
 * Fetch the four product KPI aggregates for a salon. Cache key is keyed only
 * by salonId; mutation hooks below invalidate `productKeys.statsAll()` so the
 * card re-fetches after any create/update/delete.
 */
export function useProductStats(salonId) {
  return useQuery({
    queryKey: productKeys.stats(salonId),
    queryFn: function () {
      var params = new URLSearchParams();
      if (salonId) params.append('salon_id', salonId);
      return api.get('/products/stats?' + params.toString());
    },
    select: function (response) {
      return (response && response.data) || null;
    },
    enabled: !!salonId,
  });
}

// ─── Stock movement history ────────────────────────────────────────────────

/**
 * Fetch the paginated stock-movement history for a product.
 * Returns `{ data, meta }` like `useProducts`.
 */
export function useStockHistory(productId, options) {
  var page = (options && options.page) || 1;
  var limit = (options && options.limit) || 20;

  return useQuery({
    queryKey: productKeys.stockHistory(productId, { page: page, limit: limit }),
    queryFn: function () {
      var params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(limit));
      return api.get('/products/' + productId + '/stock?' + params.toString());
    },
    select: selectListEnvelope,
    enabled: !!productId,
    placeholderData: keepPreviousData,
  });
}

// ─── Mutations ─────────────────────────────────────────────────────────────

function invalidateProductCaches(qc, options) {
  qc.invalidateQueries({ queryKey: productKeys.lists() });
  qc.invalidateQueries({ queryKey: productKeys.statsAll() });
  if (options && options.id) {
    qc.invalidateQueries({ queryKey: productKeys.detail(options.id) });
  }
}

export function useCreateProduct() {
  var queryClient = useQueryClient();

  return useMutation({
    mutationFn: function (data) {
      return api.post('/products', data);
    },
    onSuccess: function () {
      invalidateProductCaches(queryClient);
    },
  });
}

export function useUpdateProduct() {
  var queryClient = useQueryClient();

  return useMutation({
    mutationFn: function (params) {
      return api.put('/products/' + params.id, params.data);
    },
    onSuccess: function (_data, variables) {
      invalidateProductCaches(queryClient, { id: variables && variables.id });
    },
  });
}

export function useDeleteProduct() {
  var queryClient = useQueryClient();

  return useMutation({
    mutationFn: function (id) {
      return api.delete('/products/' + id);
    },
    onSuccess: function () {
      invalidateProductCaches(queryClient);
    },
  });
}

/**
 * Adjust stock through the Stock_API. The body contract is:
 *   { id, mode: 'set'|'add'|'subtract', quantity: int >= 0,
 *     reason_code: manual code, reason_note?: string up to 500 chars }
 *
 * Invalidates the listing, the product detail, the stats card, and the
 * stock-history pages for the affected product so the UI stays consistent.
 */
export function useUpdateProductStock() {
  var queryClient = useQueryClient();

  return useMutation({
    mutationFn: function (params) {
      var body = {
        mode: params.mode,
        quantity: params.quantity,
        reason_code: params.reason_code,
      };
      // Only include reason_note when the caller actually provided one — the
      // server treats an explicit `null` and an absent key the same way, but
      // omitting it keeps the wire payload lean and matches the validator's
      // "optional" handling.
      if (params.reason_note !== undefined && params.reason_note !== null) {
        body.reason_note = params.reason_note;
      }
      return api.put('/products/' + params.id + '/stock', body);
    },
    onSuccess: function (_data, variables) {
      invalidateProductCaches(queryClient, { id: variables && variables.id });
      if (variables && variables.id) {
        queryClient.invalidateQueries({
          queryKey: productKeys.stockHistoryFor(variables.id),
        });
      }
    },
  });
}

// ─── Legacy: low-stock list ────────────────────────────────────────────────
// Pre-existing helper kept for callers that still rely on the dedicated
// low-stock endpoint shape. The KPI card now uses `useProductStats`.
export function useLowStockProducts(salonId, threshold) {
  return useQuery({
    queryKey: productKeys.lowStock(salonId),
    queryFn: function () {
      var params = new URLSearchParams();
      params.append('salon_id', salonId);
      params.append('low_stock', 'true');
      if (threshold) params.append('threshold', threshold);
      return api.get('/products?' + params.toString());
    },
    enabled: !!salonId,
  });
}

// ─── Stock status helper (UI badge) ────────────────────────────────────────
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

// NOTE: The legacy `PRODUCT_CATEGORIES` constant and the static
// `getCategoryLabel` lookup have been removed (Task 10.2). The dashboard
// reads `category_name` from each API row directly, and the category Select
// is bound to `useProductCategories(salonId)` — the per-salon source of
// truth — via `src/hooks/use-product-categories.js`.
