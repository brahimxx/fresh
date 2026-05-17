'use client';

/**
 * Products page — refactored under task 12.1.
 *
 * What changed from the previous implementation:
 *   - Server-side filtering / pagination / sorting via useProducts(salonId, filters).
 *     The page no longer filters or counts client-side. Search, category, and
 *     stock filters are passed to the API as URL params.
 *   - KPI cards bound to useProductStats(salonId). Mutations invalidate the
 *     stats query under the hood (see use-products.js); on stats failure each
 *     card renders an inline error indicator.
 *   - Manage categories dialog (per-salon CRUD) reachable from the list header.
 *   - Export CSV action hits /api/products/export.csv with the active filters.
 *   - Currency: every formatCurrency call passes salon.currency. When
 *     salon.currency is missing we log a single console warning per page
 *     session and fall back to the lib default.
 *   - Affordance gating: Add / Edit / Delete / Update Stock are omitted from
 *     the DOM (not merely disabled) when products.manage resolves false. The
 *     <RequirePermission page="products" /> page guard stays intact.
 *   - category_name is rendered directly from each API row; the legacy
 *     PRODUCT_CATEGORIES constant has been removed from use-products.js.
 *   - Image rendering: square aspect, rounded corners (12 px in the row,
 *     16 px in the form preview which lives inside ProductFormDialog), Package
 *     icon placeholder when image_url is null, onError hides the broken <img>
 *     with no fallback icon.
 */

import { useEffect, useMemo, useState, use } from 'react';
import {
  AlertTriangle,
  Boxes,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Download,
  Filter,
  Folders,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { RequirePermission } from '@/components/layout/require-permission';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { useProducts, useProductStats, useDeleteProduct, getStockStatus } from '@/hooks/use-products';
import { useProductCategories } from '@/hooks/use-product-categories';
import { useDiscounts } from '@/hooks/use-discounts';
import { ProductFormDialog } from '@/components/products/product-form';
import { StockUpdateDialog } from '@/components/products/stock-update';
import { ManageCategoriesDialog } from '@/components/products/manage-categories';
import { useSalon } from '@/providers/salon-provider';
import { resolvePermission } from '@/lib/permissions';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

// Server-side default page size matches the API default.
const PAGE_SIZE = 25;

// Single warning per page session when salon.currency is missing
// (Requirement 19.5). Module-level so navigation between Products and Sales
// inside the same SPA session does not retrigger the warning on every render.
var __currencyWarningEmitted = false;
function warnMissingCurrencyOnce() {
  if (__currencyWarningEmitted) return;
  __currencyWarningEmitted = true;
  if (typeof console !== 'undefined' && typeof console.warn === 'function') {
    console.warn(
      '[Products] salon.currency is missing — falling back to the lib default (DZD).'
    );
  }
}

export default function ProductsPage({ params }) {
  return (
    <RequirePermission page="products">
      <ProductsContent params={params} />
    </RequirePermission>
  );
}

function ProductsContent({ params }) {
  var resolvedParams = use(params);
  var salonId = resolvedParams.salonId;

  var { salon, staffRole, customPermissions } = useSalon();

  // Currency: single warning per page session if missing (Req 19.5). The
  // lib default kicks in inside formatCurrency when we forward `undefined`.
  var hasCurrency = !!(salon && salon.currency);
  var currency = hasCurrency ? salon.currency : undefined;
  useEffect(
    function () {
      if (salon && !hasCurrency) warnMissingCurrencyOnce();
    },
    [salon, hasCurrency]
  );

  // Affordance gating (Req 21.2 / 21.4): in-page mutations are omitted from
  // the DOM when `products.manage` resolves false. Owners and admins always
  // pass via `resolvePermission`'s owner short-circuit (admins are mapped to
  // the 'owner' staff role by the SalonProvider). The page-level guard via
  // <RequirePermission page="products" /> stays in place above this content.
  var canManageProducts = useMemo(
    function () {
      return resolvePermission(staffRole, customPermissions, 'products.manage');
    },
    [staffRole, customPermissions]
  );

  // ── Filter state ──────────────────────────────────────────────────────
  // All four filters drive the server query through the URL params on the
  // listing endpoint (Req 8.7). No client-side filtering remains.
  var [searchQuery, setSearchQuery] = useState('');
  var [debouncedSearch, setDebouncedSearch] = useState('');
  var [categoryFilter, setCategoryFilter] = useState('all'); // 'all' or numeric id as string
  var [stockFilter, setStockFilter] = useState('all'); // 'all' | 'in' | 'low' | 'out'
  var [page, setPage] = useState(1);

  // Debounce search to keep keystrokes from spawning request floods.
  useEffect(
    function () {
      var t = setTimeout(function () { setDebouncedSearch(searchQuery); }, 300);
      return function () { clearTimeout(t); };
    },
    [searchQuery]
  );

  // Reset back to page 1 whenever an effective filter changes.
  useEffect(
    function () { setPage(1); },
    [debouncedSearch, categoryFilter, stockFilter]
  );

  // Build the filter object the hook forwards to the listing endpoint.
  var listFilters = useMemo(
    function () {
      var f = { page: page, limit: PAGE_SIZE };
      if (debouncedSearch) f.search = debouncedSearch;
      if (categoryFilter !== 'all') f.category_id = categoryFilter;
      if (stockFilter !== 'all') f.stock = stockFilter;
      return f;
    },
    [page, debouncedSearch, categoryFilter, stockFilter]
  );

  // ── Data ──────────────────────────────────────────────────────────────
  var listQuery = useProducts(salonId, listFilters);
  var statsQuery = useProductStats(salonId);
  var categoriesQuery = useProductCategories(salonId);
  var { data: discounts } = useDiscounts(salonId, { status: 'active' });

  var products = (listQuery.data && listQuery.data.data) || [];
  var meta = (listQuery.data && listQuery.data.meta) || null;
  var totalPages = meta ? meta.totalPages : 0;
  var isLoading = listQuery.isLoading;

  // ── Dialog state ──────────────────────────────────────────────────────
  var [productFormOpen, setProductFormOpen] = useState(false);
  var [stockUpdateOpen, setStockUpdateOpen] = useState(false);
  var [manageCategoriesOpen, setManageCategoriesOpen] = useState(false);
  var [editProduct, setEditProduct] = useState(null);
  var [stockProduct, setStockProduct] = useState(null);
  var [deleteProductTarget, setDeleteProductTarget] = useState(null);
  var deleteProductMutation = useDeleteProduct();

  // ── Action handlers ───────────────────────────────────────────────────
  function handleAddProduct() {
    if (!canManageProducts) return;
    setEditProduct(null);
    setProductFormOpen(true);
  }
  function handleEditProduct(product) {
    if (!canManageProducts) return;
    setEditProduct(product);
    setProductFormOpen(true);
  }
  function handleUpdateStock(product) {
    if (!canManageProducts) return;
    setStockProduct(product);
    setStockUpdateOpen(true);
  }
  function handleDeleteConfirm() {
    if (!canManageProducts || !deleteProductTarget) return;
    deleteProductMutation.mutate(deleteProductTarget.id, {
      onSuccess: function () { setDeleteProductTarget(null); },
    });
  }

  // CSV export: build the URL with the same filters the listing uses, so the
  // user always exports what they currently see (Req 17.1). We hit the route
  // directly through the browser so the response streams to disk.
  function handleExportCsv() {
    var qs = new URLSearchParams();
    if (salonId) qs.append('salon_id', salonId);
    if (debouncedSearch) qs.append('search', debouncedSearch);
    if (categoryFilter !== 'all') qs.append('category_id', categoryFilter);
    if (stockFilter !== 'all') qs.append('stock', stockFilter);
    var url = '/api/products/export.csv?' + qs.toString();
    if (typeof window !== 'undefined') {
      window.location.assign(url);
    }
  }

  // Best discounted price used by the price column. Reads `category_name` and
  // numeric `id` directly from the API row (snake_case canonical shape).
  function getDiscountedPrice(product) {
    if (!discounts || discounts.length === 0) return null;
    var bestPrice = null;
    var basePrice = Number(product.price);
    var productId = Number(product.id);

    for (var i = 0; i < discounts.length; i++) {
      var discount = discounts[i];
      if (!Number(discount.appliesToProducts) && !Number(discount.applies_to_products)) continue;

      var specificProducts = discount.specificProducts || discount.specific_products || [];
      if (specificProducts.length > 0) {
        var found = false;
        for (var j = 0; j < specificProducts.length; j++) {
          if (Number(specificProducts[j]) === productId) {
            found = true;
            break;
          }
        }
        if (!found) continue;
      }

      var newPrice;
      if (discount.type === 'percentage') {
        var amountOff = basePrice * (Number(discount.value) / 100);
        if (discount.maxDiscount && amountOff > Number(discount.maxDiscount)) {
          amountOff = Number(discount.maxDiscount);
        }
        newPrice = basePrice - amountOff;
      } else {
        newPrice = Math.max(0, basePrice - Number(discount.value));
      }

      if (bestPrice === null || newPrice < bestPrice) bestPrice = newPrice;
    }
    return bestPrice;
  }

  // KPI card renderer — bound to useProductStats. On error each card shows an
  // inline error indicator instead of stale numbers (Req 9.5).
  function StatValue(props) {
    if (statsQuery.isLoading) {
      return <Skeleton className="h-8 w-24 rounded-md" />;
    }
    if (statsQuery.error) {
      return (
        <span
          className="inline-flex items-center gap-1.5 text-sm font-bold text-red-600 dark:text-red-400"
          role="alert"
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          Stats unavailable
        </span>
      );
    }
    return <p className={props.className}>{props.children}</p>;
  }

  var totalProducts = (statsQuery.data && statsQuery.data.totalProducts) || 0;
  var lowStockCount = (statsQuery.data && statsQuery.data.lowStockCount) || 0;
  var outOfStockCount = (statsQuery.data && statsQuery.data.outOfStockCount) || 0;
  var totalValue = (statsQuery.data && statsQuery.data.totalInventoryValue) || 0;

  // Pagination guards — disabled at the edges so click / keyboard / touch
  // are ignored (Req 8.12). The Button primitive renders the disabled prop as
  // `aria-disabled` plus pointer-events: none, which covers all three input
  // modalities.
  var hasFilters =
    !!debouncedSearch || categoryFilter !== 'all' || stockFilter !== 'all';
  var prevDisabled = page <= 1;
  var nextDisabled = totalPages === 0 || page >= totalPages;

  function gotoPrev() {
    if (prevDisabled) return;
    setPage(function (p) { return Math.max(1, p - 1); });
  }
  function gotoNext() {
    if (nextDisabled) return;
    setPage(function (p) { return p + 1; });
  }

  return (
    <div className="space-y-8">
      {/* Decorative Hero */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-8 sm:p-10 flex flex-col md:flex-row md:items-end justify-between gap-6 group"
      >
        <div className="absolute top-0 right-10 p-8 opacity-5 pointer-events-none transition-transform duration-1000 group-hover:scale-125 group-hover:rotate-12 translate-y-[-20%]">
          <Boxes className="w-64 h-64 text-primary" strokeWidth={1} />
        </div>

        <div className="relative z-10 flex flex-col gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-background/80 backdrop-blur-md border border-primary/20 text-xs font-semibold text-primary w-fit">
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Retail & Stock</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight max-w-2xl">
            Inventory System
          </h1>
          <p className="text-muted-foreground text-lg font-medium max-w-xl">
            Track product levels, monitor retail value, and define your POS catalog.
          </p>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row gap-3 shrink-0">
          <Button
            variant="outline"
            onClick={handleExportCsv}
            className="flex-1 sm:flex-none h-12 px-6 rounded-xl border-border/50 bg-background/50 backdrop-blur-md hover:bg-background shadow-sm text-[15px]"
          >
            <Download className="h-5 w-5 mr-2 text-muted-foreground" />
            Export CSV
          </Button>
          {canManageProducts && (
            <Button
              className="flex-1 sm:flex-none h-12 px-6 rounded-xl shadow-md text-[15px]"
              onClick={handleAddProduct}
            >
              <Plus className="h-5 w-5 mr-2" />
              New Product
            </Button>
          )}
        </div>
      </motion.div>

      {/* Analytics Row — bound to useProductStats */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <motion.div
          variants={itemVariants}
          className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm overflow-hidden relative group hover:bg-background transition-colors duration-500"
        >
          <div className="absolute -right-6 -top-6 text-primary/5 transition-transform duration-700 group-hover:scale-125 group-hover:-rotate-12 pointer-events-none">
            <Package className="w-32 h-32" strokeWidth={1} />
          </div>
          <div className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Products</h3>
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Package className="h-4 w-4 text-primary" />
            </div>
          </div>
          <div className="relative z-10 mt-2">
            <StatValue className="text-3xl font-extrabold tracking-tight">{totalProducts}</StatValue>
            <p className="text-xs font-semibold text-muted-foreground mt-1">Active variants</p>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm overflow-hidden relative group hover:bg-background transition-colors duration-500"
        >
          <div
            className={`absolute -right-6 -top-6 transition-transform duration-700 group-hover:scale-125 group-hover:rotate-12 pointer-events-none ${
              lowStockCount > 0 ? 'text-yellow-500/5' : 'text-emerald-500/5'
            }`}
          >
            <AlertTriangle className="w-32 h-32" strokeWidth={1} />
          </div>
          <div className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Low Stock</h3>
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                lowStockCount > 0 ? 'bg-yellow-500/10' : 'bg-emerald-500/10'
              }`}
            >
              <AlertTriangle
                className={`h-4 w-4 ${
                  lowStockCount > 0 ? 'text-yellow-500' : 'text-emerald-500'
                }`}
              />
            </div>
          </div>
          <div className="relative z-10 mt-2">
            <StatValue className="text-3xl font-extrabold tracking-tight">{lowStockCount}</StatValue>
            <p className="text-xs font-semibold text-muted-foreground mt-1">Approaching limit</p>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm overflow-hidden relative group hover:bg-background transition-colors duration-500"
        >
          <div
            className={`absolute -right-6 -top-6 transition-transform duration-700 group-hover:scale-125 group-hover:-rotate-12 pointer-events-none ${
              outOfStockCount > 0 ? 'text-red-500/5' : 'text-emerald-500/5'
            }`}
          >
            <AlertTriangle className="w-32 h-32" strokeWidth={1} />
          </div>
          <div className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Out of Stock</h3>
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                outOfStockCount > 0 ? 'bg-red-500/10' : 'bg-emerald-500/10'
              }`}
            >
              <AlertTriangle
                className={`h-4 w-4 ${
                  outOfStockCount > 0 ? 'text-red-500' : 'text-emerald-500'
                }`}
              />
            </div>
          </div>
          <div className="relative z-10 mt-2">
            <StatValue className="text-3xl font-extrabold tracking-tight">{outOfStockCount}</StatValue>
            <p className="text-xs font-semibold text-muted-foreground mt-1">Empty inventory</p>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm overflow-hidden relative group hover:bg-background transition-colors duration-500"
        >
          <div className="absolute -right-6 -top-6 text-emerald-500/5 transition-transform duration-700 group-hover:scale-125 group-hover:-rotate-12 pointer-events-none">
            <DollarSign className="w-32 h-32" strokeWidth={1} />
          </div>
          <div className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Inventory Value</h3>
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </div>
          </div>
          <div className="relative z-10 mt-2">
            <StatValue className="text-3xl font-extrabold tracking-tight text-foreground">
              {formatCurrency(totalValue, currency)}
            </StatValue>
            <p className="text-xs font-semibold text-muted-foreground mt-1">Total projected</p>
          </div>
        </motion.div>
      </motion.div>

      {/* Products Matrix */}
      <motion.div
        variants={itemVariants}
        initial="hidden"
        animate="show"
        className="bg-background/60 backdrop-blur-xl rounded-3xl border border-border/50 shadow-sm overflow-hidden flex flex-col"
      >
        {/* Filter Bar (server-side) */}
        <div className="p-5 sm:px-8 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/5">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
            <Input
              placeholder="Search catalog, scan SKU or brand..."
              value={searchQuery}
              onChange={function (e) { setSearchQuery(e.target.value); }}
              className="pl-10 h-11 bg-background rounded-xl border-border/50 focus-visible:ring-primary/50 shadow-sm font-medium"
              maxLength={100}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-44 h-11 bg-background rounded-xl border-border/50 shadow-sm font-semibold text-[13px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/50 shadow-lg">
                <SelectItem value="all" className="font-medium rounded-lg">
                  All Categories
                </SelectItem>
                {(categoriesQuery.data || []).map(function (cat) {
                  return (
                    <SelectItem
                      key={cat.id}
                      value={String(cat.id)}
                      className="font-medium rounded-lg"
                    >
                      {cat.name}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger className="w-full sm:w-40 h-11 bg-background rounded-xl border-border/50 shadow-sm font-semibold text-[13px]">
                <SelectValue placeholder="Stock" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/50 shadow-lg">
                <SelectItem value="all" className="font-medium rounded-lg">All Stock</SelectItem>
                <SelectItem value="in" className="font-medium text-emerald-600 rounded-lg">In Stock</SelectItem>
                <SelectItem value="low" className="font-medium text-yellow-600 rounded-lg">Low Stock</SelectItem>
                <SelectItem value="out" className="font-medium text-red-600 rounded-lg">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
            {canManageProducts && (
              <Button
                variant="outline"
                onClick={function () { setManageCategoriesOpen(true); }}
                className="h-11 rounded-xl border-border/50 bg-background shadow-sm font-semibold text-[13px]"
              >
                <Folders className="h-4 w-4 mr-2 text-muted-foreground" />
                Manage categories
              </Button>
            )}
          </div>
        </div>

        {/* Table Area */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 space-y-4">
              <Skeleton className="h-16 w-full rounded-2xl" />
              <Skeleton className="h-16 w-full rounded-2xl" />
              <Skeleton className="h-16 w-full rounded-2xl" />
            </div>
          ) : products.length > 0 ? (
            <Table className="px-4">
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border/50 [&_th]:h-14">
                  <TableHead className="pl-8 text-xs font-bold uppercase tracking-wider text-muted-foreground w-[350px]">
                    Product Profile
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Category
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Logistics (SKU)
                  </TableHead>
                  <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Retail Price
                  </TableHead>
                  <TableHead className="text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Unit Stock
                  </TableHead>
                  {canManageProducts && (
                    <TableHead className="w-[80px] pr-8 text-right"></TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {products.map(function (product, i) {
                    var stockQty = Number(product.stock_quantity) || 0;
                    var lowThreshold = Number(product.low_stock_threshold) || 5;
                    var stockStatus = getStockStatus(stockQty, lowThreshold);

                    return (
                      <ProductRow
                        key={product.id}
                        product={product}
                        index={i}
                        stockQty={stockQty}
                        stockStatus={stockStatus}
                        currency={currency}
                        getDiscountedPrice={getDiscountedPrice}
                        canManageProducts={canManageProducts}
                        onEdit={handleEditProduct}
                        onUpdateStock={handleUpdateStock}
                        onDelete={setDeleteProductTarget}
                      />
                    );
                  })}
                </AnimatePresence>
              </TableBody>
            </Table>
          ) : (
            <div className="p-16 flex flex-col items-center justify-center text-center">
              <div className="h-24 w-24 bg-muted/30 rounded-full flex items-center justify-center mb-6">
                <Package className="h-10 w-10 text-muted-foreground opacity-50" />
              </div>
              <p className="text-xl font-bold tracking-tight mb-2">
                {hasFilters ? 'Zero Matrix Results' : 'Empty Inventory'}
              </p>
              <p className="text-muted-foreground font-medium max-w-sm mb-6">
                {hasFilters
                  ? 'No retail items matched your query constraints. Try widening your parameters.'
                  : 'Start cataloging your warehouse levels to maintain inventory accuracy.'}
              </p>
              {!hasFilters && canManageProducts && (
                <Button
                  size="lg"
                  className="rounded-xl font-bold shadow-md h-12"
                  onClick={handleAddProduct}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Log First Item
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Pagination control (Req 8.9, 8.12) */}
        {meta && meta.total > 0 && (
          <div className="px-5 sm:px-8 py-4 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/5">
            <p className="text-xs font-semibold text-muted-foreground">
              Page <span className="text-foreground">{page}</span> of{' '}
              <span className="text-foreground">{Math.max(1, totalPages)}</span>
              <span className="ml-2 opacity-60">· {meta.total} total</span>
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={prevDisabled}
                aria-disabled={prevDisabled}
                onClick={gotoPrev}
                className="h-9 rounded-xl"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={nextDisabled}
                aria-disabled={nextDisabled}
                onClick={gotoNext}
                className="h-9 rounded-xl"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Product Form Dialog (omitted entirely when user can't manage) */}
      {canManageProducts && (
        <ProductFormDialog
          open={productFormOpen}
          onOpenChange={setProductFormOpen}
          product={editProduct}
          salonId={salonId}
        />
      )}

      {/* Stock Update Dialog */}
      {canManageProducts && (
        <StockUpdateDialog
          open={stockUpdateOpen}
          onOpenChange={setStockUpdateOpen}
          product={stockProduct}
        />
      )}

      {/* Manage Categories Dialog */}
      {canManageProducts && (
        <ManageCategoriesDialog
          open={manageCategoriesOpen}
          onOpenChange={setManageCategoriesOpen}
          salonId={salonId}
        />
      )}

      {/* Delete Confirmation */}
      {canManageProducts && (
        <AlertDialog
          open={!!deleteProductTarget}
          onOpenChange={function (open) { if (!open) setDeleteProductTarget(null); }}
        >
          <AlertDialogContent className="shadow-2xl border-border/50 rounded-3xl max-w-md">
            <AlertDialogHeader>
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6 text-red-600 dark:text-red-500" />
              </div>
              <AlertDialogTitle className="text-2xl font-bold text-red-600 dark:text-red-500">
                Delist Product?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-[15px] font-medium text-foreground tracking-tight leading-relaxed">
                Are you sure you want to permanently erase{' '}
                <strong>&quot;{deleteProductTarget && deleteProductTarget.name}&quot;</strong>{' '}
                from your catalog?
                <br />
                <br />
                <span className="text-muted-foreground text-[13px] mt-2 block">
                  This will destroy historical inventory tracking. This action cannot be reversed.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-8 gap-2 sm:gap-0">
              <AlertDialogCancel className="rounded-xl h-11 font-bold">Abort</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-red-600 hover:bg-red-700 focus:ring-red-600 rounded-xl h-11 font-bold shadow-md"
              >
                Confirm Delisting
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

// ─── Row component ─────────────────────────────────────────────────────────
// Pulled out so the broken-image hide flag (Req 7.6) lives in row-local state
// instead of a parent-level set keyed by id.

function ProductRow(props) {
  var product = props.product;
  var stockQty = props.stockQty;
  var stockStatus = props.stockStatus;
  var currency = props.currency;
  var canManageProducts = props.canManageProducts;

  var [imageBroken, setImageBroken] = useState(false);
  // Reset the broken flag whenever the URL changes — a fresh URL gets a fresh
  // load attempt, otherwise editing a product never re-renders its image.
  useEffect(function () { setImageBroken(false); }, [product.image_url]);

  var hasImage = !!product.image_url && !imageBroken;
  var discountedPrice = props.getDiscountedPrice(product);

  return (
    <motion.tr
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: props.index * 0.05 }}
      className="group hover:bg-muted/5 border-border/50 transition-colors [&_td]:py-5"
    >
      <TableCell className="pl-8 align-top">
        <div className="flex items-start gap-4">
          {/* Square aspect, rounded corners (12 px row, Req 7.4); Package icon
              placeholder when image_url is null (Req 7.5); onError hides the
              broken element with no fallback icon (Req 7.6). */}
          <div className="h-12 w-12 aspect-square rounded-xl bg-muted/40 border border-border/50 shadow-sm overflow-hidden flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
            {product.image_url ? (
              imageBroken ? null : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.image_url}
                  alt={product.name || ''}
                  className="h-full w-full object-cover"
                  onError={function () { setImageBroken(true); }}
                />
              )
            ) : (
              <Package className="h-5 w-5" />
            )}
          </div>
          <div>
            <p className="font-extrabold text-[15px] leading-tight text-foreground group-hover:text-primary transition-colors">
              {product.name}
            </p>
            {product.brand ? (
              <p className="text-[13px] font-semibold text-muted-foreground mt-1">
                {product.brand}
              </p>
            ) : (
              <p className="text-[13px] font-medium text-muted-foreground/40 italic mt-1">
                Generic
              </p>
            )}
          </div>
        </div>
      </TableCell>

      {/* Category — rendered directly from the API row (Req 6.9, 6.12) */}
      <TableCell className="align-top">
        <div className="mt-1">
          {product.category_name ? (
            <Badge
              variant="secondary"
              className="bg-primary/5 text-primary font-bold uppercase tracking-wider text-[10px] px-2.5 py-0.5 border-primary/10"
            >
              {product.category_name}
            </Badge>
          ) : (
            <span className="text-[12px] font-medium text-muted-foreground/40 italic">
              Uncategorised
            </span>
          )}
        </div>
      </TableCell>

      <TableCell className="align-top">
        <div className="text-[13px] font-bold font-mono text-muted-foreground mt-1">
          {product.sku || (
            <span className="italic opacity-50 font-sans font-medium">Unassigned</span>
          )}
        </div>
      </TableCell>

      <TableCell className="text-right align-top">
        <div className="mt-1">
          {discountedPrice !== null && discountedPrice < Number(product.price) ? (
            <div className="flex flex-col items-end">
              <span className="text-xs font-semibold text-muted-foreground line-through decoration-destructive/60">
                {formatCurrency(product.price, currency)}
              </span>
              <span className="text-[15px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md mt-0.5">
                {formatCurrency(discountedPrice, currency)}
              </span>
            </div>
          ) : (
            <span className="font-extrabold text-[15px]">
              {formatCurrency(product.price, currency)}
            </span>
          )}
        </div>
      </TableCell>

      <TableCell className="text-center align-top">
        <div className="flex items-center justify-center gap-3 mt-1">
          <Badge
            variant="outline"
            className={cn(
              'font-extrabold text-[13px] px-3 py-1 rounded-lg border-0',
              stockStatus.status === 'out'
                ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                : stockStatus.status === 'low'
                ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            )}
          >
            {stockQty}
          </Badge>
          {canManageProducts && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2.5 rounded-lg text-xs font-bold text-muted-foreground hover:bg-muted/80 shadow-sm border border-transparent shadow-none hover:shadow-sm hover:border-border/50 hover:text-foreground opacity-50 group-hover:opacity-100 transition-all"
              onClick={function () { props.onUpdateStock(product); }}
            >
              Log
            </Button>
          )}
        </div>
      </TableCell>

      {canManageProducts && (
        <TableCell className="text-right align-top pr-8">
          <div className="mt-1 inline-flex">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-9 w-9 p-0 rounded-xl bg-muted/30 hover:bg-muted text-muted-foreground opacity-50 group-hover:opacity-100 transition-all data-[state=open]:opacity-100 focus:ring-0"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[180px] rounded-2xl">
                <DropdownMenuItem
                  onClick={function () { props.onEdit(product); }}
                  className="font-medium gap-2"
                >
                  <Pencil className="h-4 w-4 text-primary" />
                  Edit Dimensions
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={function () { props.onUpdateStock(product); }}
                  className="font-medium gap-2"
                >
                  <Package className="h-4 w-4" />
                  Log Shipment
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="font-medium gap-2 text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                  onClick={function () { props.onDelete(product); }}
                >
                  <Trash2 className="h-4 w-4" />
                  Delist Entry
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </TableCell>
      )}
    </motion.tr>
  );
}
