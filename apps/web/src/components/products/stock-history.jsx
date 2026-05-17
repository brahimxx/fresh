'use client';

/**
 * StockHistory — paginated list of `product_stock_movements` rows for a single product.
 *
 * The component is rendered in two modes (Requirement 4.4):
 *   1. Inline panel (`<StockHistory productId={...} />`) — embedded inside the
 *      Stock Update dialog so adjustments and the audit trail sit side by side.
 *   2. Drawer / Sheet (`<StockHistorySheet open onOpenChange product={...} />`) —
 *      a stand-alone right-edge sheet reachable from the product list row action.
 *
 * Columns rendered match the design contract (Requirement 4.4):
 *   timestamp · actor · change_type · signed delta · before · after · reason_code · reason_note
 *
 * Sale-driven and refund-driven rows are visually decorated with a tinted row
 * background and an icon, and are intentionally read-only — only the checkout
 * and refund flows insert those rows (Stock_Reason_Code 'sale'/'refund' are
 * rejected by the manual Stock_API). The component does not expose any edit /
 * delete affordance: `useStockHistory` is read-only by construction.
 */

import { useState } from 'react';
import { format, isValid, parseISO } from 'date-fns';
import {
  History,
  ArrowUpRight,
  ArrowDownRight,
  Equal,
  ShoppingCart,
  RotateCcw,
  PackagePlus,
  PackageMinus,
  Pencil,
  Trash2,
  Wrench,
  User as UserIcon,
  Loader2,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { InlineError, getErrorMessage } from '@/components/ui/data-error';
import { cn } from '@/lib/utils';

import { useStockHistory } from '@/hooks/use-products';

// ─── Static lookup tables ──────────────────────────────────────────────────
//
// The maps below are intentionally small and declared at module scope so they
// can be tree-shaken and so a missing reason_code from the API (e.g. a future
// addition) falls back gracefully on the `default` row instead of throwing.

var CHANGE_TYPE_META = {
  set: { label: 'Set', Icon: Equal, tone: 'text-muted-foreground' },
  add: { label: 'Add', Icon: ArrowUpRight, tone: 'text-emerald-600 dark:text-emerald-400' },
  subtract: {
    label: 'Subtract',
    Icon: ArrowDownRight,
    tone: 'text-rose-600 dark:text-rose-400',
  },
};

var REASON_CODE_META = {
  manual_set: { label: 'Manual set', Icon: Pencil, variant: 'secondary' },
  manual_adjustment: { label: 'Manual adjustment', Icon: Wrench, variant: 'secondary' },
  restock: { label: 'Restock', Icon: PackagePlus, variant: 'secondary' },
  waste: { label: 'Waste', Icon: Trash2, variant: 'secondary' },
  correction: { label: 'Correction', Icon: Wrench, variant: 'secondary' },
  // Sale and refund rows are written exclusively by the checkout / refund
  // flow and are surfaced here read-only. We mark them with a non-secondary
  // badge variant so they're easy to spot at a glance.
  sale: { label: 'Sale', Icon: ShoppingCart, variant: 'default' },
  refund: { label: 'Refund', Icon: RotateCcw, variant: 'destructive' },
};

function isSystemRow(reasonCode) {
  return reasonCode === 'sale' || reasonCode === 'refund';
}

// ─── Cell formatters ───────────────────────────────────────────────────────

function formatTimestamp(value) {
  if (!value) return '—';
  // The API returns ISO 8601 UTC strings; `parseISO` handles the trailing
  // `Z` correctly, while a bare `new Date(string)` is implementation defined.
  var dt = typeof value === 'string' ? parseISO(value) : new Date(value);
  if (!isValid(dt)) return '—';
  return format(dt, 'MMM d, yyyy · HH:mm');
}

function formatSignedDelta(delta) {
  if (delta == null || isNaN(Number(delta))) return '0';
  var n = Number(delta);
  if (n > 0) return '+' + n;
  // `String(n)` already includes the leading minus for negative values, and
  // returns `'0'` for zero — no sign annotation needed there.
  return String(n);
}

function deltaTone(delta) {
  var n = Number(delta);
  if (n > 0) return 'text-emerald-600 dark:text-emerald-400';
  if (n < 0) return 'text-rose-600 dark:text-rose-400';
  return 'text-muted-foreground';
}

// ─── Internal sub-components ───────────────────────────────────────────────

function ChangeTypeCell({ changeType }) {
  var meta = CHANGE_TYPE_META[changeType] || {
    label: changeType || '—',
    Icon: Equal,
    tone: 'text-muted-foreground',
  };
  var Icon = meta.Icon;
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-sm', meta.tone)}>
      <Icon className="h-3.5 w-3.5" />
      <span>{meta.label}</span>
    </span>
  );
}

function ReasonCodeCell({ reasonCode }) {
  var meta = REASON_CODE_META[reasonCode] || {
    label: reasonCode || 'unknown',
    Icon: History,
    variant: 'outline',
  };
  var Icon = meta.Icon;
  return (
    <Badge variant={meta.variant} className="font-normal">
      <Icon className="h-3 w-3" />
      <span>{meta.label}</span>
    </Badge>
  );
}

function ActorCell({ name }) {
  if (!name) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        <UserIcon className="h-3.5 w-3.5" />
        <span>System</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="truncate max-w-[12rem]" title={name}>
        {name}
      </span>
    </span>
  );
}

// ─── Loading / empty / error states ───────────────────────────────────────

function HistorySkeleton() {
  // Three skeleton rows is enough to communicate a table is loading without
  // dominating the dialog footprint when the result set is small.
  var rows = [0, 1, 2];
  return (
    <div className="space-y-2 p-2" aria-busy="true" aria-live="polite">
      {rows.map(function (i) {
        return (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 flex-1" />
          </div>
        );
      })}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
      <History className="h-6 w-6" />
      <p className="text-sm">No stock movements recorded yet.</p>
      <p className="text-xs">
        Adjustments, sales, and refunds will appear here in chronological order.
      </p>
    </div>
  );
}

// ─── Main inline component ────────────────────────────────────────────────

/**
 * Inline stock history panel.
 *
 * Props:
 *   - productId: number — required
 *   - pageSize:  number — optional, default 20 (1..100 enforced server-side)
 *   - className: string — optional wrapper class
 *
 * Pagination is local state. The hook keeps previous-page rows visible while
 * the next page is in flight (via `placeholderData: keepPreviousData`), so the
 * table never blinks to a skeleton between page changes.
 */
export function StockHistory({ productId, pageSize, className }) {
  var limit = pageSize || 20;
  var [page, setPage] = useState(1);

  var query = useStockHistory(productId, { page: page, limit: limit });

  var rows = (query.data && query.data.data) || [];
  var meta = (query.data && query.data.meta) || null;
  var totalPages = (meta && meta.totalPages) || 0;
  var total = (meta && meta.total) || 0;

  function goPrev() {
    setPage(function (p) {
      return Math.max(1, p - 1);
    });
  }
  function goNext() {
    setPage(function (p) {
      return totalPages > 0 ? Math.min(totalPages, p + 1) : p + 1;
    });
  }

  var prevDisabled = page <= 1 || query.isLoading;
  var nextDisabled =
    query.isLoading || (totalPages > 0 ? page >= totalPages : rows.length < limit);

  // ── Render ───────────────────────────────────────────────────────────────

  if (query.isError) {
    return (
      <div className={cn('rounded-md border bg-card p-3', className)}>
        <InlineError
          message={getErrorMessage(query.error) || 'Could not load stock history'}
          onRetry={function () {
            query.refetch();
          }}
        />
      </div>
    );
  }

  return (
    <div className={cn('rounded-md border bg-card', className)}>
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Stock history</h3>
          {meta && total > 0 ? (
            <span className="text-xs text-muted-foreground">
              {total} movement{total === 1 ? '' : 's'}
            </span>
          ) : null}
        </div>
        {query.isFetching && !query.isLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        ) : null}
      </div>

      <ScrollArea className="max-h-[360px]">
        {query.isLoading ? (
          <HistorySkeleton />
        ) : rows.length === 0 ? (
          <EmptyState />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[12rem]">Timestamp</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Change</TableHead>
                <TableHead className="text-right">Δ</TableHead>
                <TableHead className="text-right">Before</TableHead>
                <TableHead className="text-right">After</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="min-w-[14rem]">Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(function (m) {
                var system = isSystemRow(m.reason_code);
                return (
                  <TableRow
                    key={m.id}
                    aria-readonly={system ? 'true' : undefined}
                    className={cn(
                      // Sale rows get a faint primary tint, refunds a faint
                      // destructive tint, so the audit trail visually
                      // distinguishes automated movements from manual ones.
                      m.reason_code === 'sale' &&
                        'bg-primary/5 hover:bg-primary/10',
                      m.reason_code === 'refund' &&
                        'bg-destructive/5 hover:bg-destructive/10'
                    )}
                  >
                    <TableCell className="text-xs text-muted-foreground">
                      {formatTimestamp(m.created_at)}
                    </TableCell>
                    <TableCell>
                      <ActorCell name={m.performed_by_name} />
                    </TableCell>
                    <TableCell>
                      <ChangeTypeCell changeType={m.change_type} />
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right font-medium tabular-nums',
                        deltaTone(m.delta)
                      )}
                    >
                      {formatSignedDelta(m.delta)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {m.quantity_before}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {m.quantity_after}
                    </TableCell>
                    <TableCell>
                      <ReasonCodeCell reasonCode={m.reason_code} />
                    </TableCell>
                    <TableCell
                      className="text-xs text-muted-foreground max-w-[20rem] truncate"
                      title={m.reason_note || ''}
                    >
                      {m.reason_note || (system ? '—' : '')}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </ScrollArea>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-2 border-t px-3 py-2 text-xs text-muted-foreground">
          <span>
            Page {page}
            {totalPages > 0 ? ' of ' + totalPages : ''}
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={goPrev}
              disabled={prevDisabled}
              aria-disabled={prevDisabled}
            >
              Previous
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={goNext}
              disabled={nextDisabled}
              aria-disabled={nextDisabled}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ─── Drawer wrapper ────────────────────────────────────────────────────────

/**
 * Stand-alone drawer wrapper around `<StockHistory />`. Used by the product
 * list row action when stock history needs to be reviewed without opening the
 * full Stock Update dialog.
 *
 * Props:
 *   - open / onOpenChange — drawer state (controlled)
 *   - product            — `{ id, name, sku?, brand? }`-shaped row
 */
export function StockHistorySheet({ open, onOpenChange, product }) {
  // Guard: don't fetch until the sheet is opened with a product. The
  // underlying `useStockHistory` hook already short-circuits on a falsy
  // productId, but this also avoids rendering an empty header pre-open.
  var productId = product && product.id;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl flex flex-col gap-0 p-0"
      >
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Stock history
          </SheetTitle>
          <SheetDescription>
            {product ? product.name : 'Movement log'}
            {product && product.sku ? (
              <span className="ml-1 text-xs">· {product.sku}</span>
            ) : null}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-hidden p-4">
          {productId ? (
            <StockHistory productId={productId} />
          ) : (
            <EmptyState />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default StockHistory;
