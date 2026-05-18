'use client';

import { format, parseISO } from 'date-fns';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDailyTotals } from '@/hooks/use-payments';
import { formatCurrency, APP_CURRENCY } from '@/lib/format';
import { cn } from '@/lib/utils';

// Fixed chart height so the skeleton placeholder is identical in width and
// height to the rendered chart (Req 16.4 — no layout shift while loading or
// refetching).
var CHART_HEIGHT_CLASS = 'h-[280px]';

function safeFormatDate(value) {
  try {
    var d = typeof value === 'string' ? parseISO(value) : new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return format(d, 'MMM d');
  } catch (_e) {
    return String(value);
  }
}

function ChartTooltip(props) {
  var active = props.active;
  var payload = props.payload;
  var label = props.label;
  var currency = props.currency;
  if (!active || !payload || !payload.length) return null;

  var entry = payload[0];
  var revenue = Number(entry?.value || 0);
  var raw = entry?.payload || {};
  var transactions = Number(raw.transactions || 0);
  var refunded = Number(raw.refunded || 0);

  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-popover-foreground">{safeFormatDate(label)}</p>
      <p className="text-muted-foreground">
        Revenue: <span className="font-medium text-foreground">{formatCurrency(revenue, currency)}</span>
      </p>
      <p className="text-muted-foreground">
        Transactions: <span className="font-medium text-foreground">{transactions}</span>
      </p>
      {refunded > 0 && (
        <p className="text-muted-foreground">
          Refunded: <span className="font-medium text-foreground">{formatCurrency(refunded, currency)}</span>
        </p>
      )}
    </div>
  );
}

/**
 * DailyRevenueChart — Recharts line chart for daily revenue.
 *
 * Accepts data, loading, and error state as props so the parent page owns
 * the single `useDailyTotals` call and both the KPI cards and the chart
 * read from the same query response (no duplicate hook subscriptions).
 *
 * Props:
 *   • data        — array of `{ date, revenue, transactions, refunded }`
 *   • isLoading   — true while the initial fetch is in flight
 *   • isFetching  — true during any fetch (initial or background refetch)
 *   • isError     — true when the query failed
 *   • onRetry     — callback to re-run the query
 *   • currency    — salon currency code for formatting
 *   • className   — optional wrapper class
 *
 * Legacy prop-based fetching (salonId + startDate + endDate) is still
 * supported for backward compatibility — if `data` is not provided, the
 * component falls back to calling `useDailyTotals` internally.
 *
 * Behaviour (Task 13.1, Req 16.3 / 16.4 / 16.7):
 *   • Skeleton placeholder of identical width/height while loading/fetching
 *     (so the previous chart is hidden until the new response arrives).
 *   • Single retry button on error — re-runs the same query.
 *   • Tooltip values render via `formatCurrency(amount, salon.currency)`.
 */
export function DailyRevenueChart(props) {
  var currency = props.currency || APP_CURRENCY;
  var className = props.className;

  // Support two modes:
  // 1. Parent-driven (preferred): data/isLoading/isFetching/isError/onRetry passed as props
  // 2. Self-fetching (legacy): salonId + startDate + endDate passed, component calls the hook
  var parentDriven = props.data !== undefined || props.isLoading !== undefined;

  var salonId = props.salonId;
  var startDate = props.startDate || props.start_date;
  var endDate = props.endDate || props.end_date;

  var selfQuery = useDailyTotals(
    parentDriven ? null : salonId,
    parentDriven ? { start_date: null, end_date: null } : { start_date: startDate, end_date: endDate },
  );

  var data = parentDriven ? props.data : selfQuery.data;
  var isLoading = parentDriven ? !!props.isLoading : selfQuery.isLoading;
  var isFetching = parentDriven ? !!props.isFetching : selfQuery.isFetching;
  var isError = parentDriven ? !!props.isError : selfQuery.isError;
  var refetch = parentDriven ? props.onRetry : selfQuery.refetch;

  // Hide the previous chart while a new response is in flight (Req 16.4).
  // `isFetching` is true on initial load and on every background refetch
  // triggered by a date-range change, so the skeleton replaces the chart in
  // both cases.
  var showSkeleton = isLoading || isFetching;

  function renderBody() {
    if (showSkeleton) {
      return (
        <div className={cn('w-full', CHART_HEIGHT_CLASS)} aria-busy="true" aria-live="polite">
          <Skeleton className="h-full w-full" />
        </div>
      );
    }

    if (isError) {
      return (
        <div
          className={cn(
            'flex w-full flex-col items-center justify-center gap-3 rounded-md border border-dashed text-center',
            CHART_HEIGHT_CLASS
          )}
          role="alert"
        >
          <AlertTriangle className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            Could not load daily revenue.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={function () {
              refetch();
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            Retry
          </Button>
        </div>
      );
    }

    var rows = Array.isArray(data) ? data : [];
    if (rows.length === 0) {
      return (
        <div
          className={cn(
            'flex w-full items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground',
            CHART_HEIGHT_CLASS
          )}
        >
          No revenue data for the selected range.
        </div>
      );
    }

    return (
      <div className={cn('w-full', CHART_HEIGHT_CLASS)}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
            <XAxis
              dataKey="date"
              tickFormatter={safeFormatDate}
              axisLine={false}
              tickLine={false}
              tickMargin={10}
              minTickGap={24}
              fontSize={12}
            />
            <YAxis
              dataKey="revenue"
              axisLine={false}
              tickLine={false}
              tickFormatter={function (v) {
                return formatCurrency(v, currency);
              }}
              width={88}
              fontSize={12}
            />
            <Tooltip
              cursor={{ stroke: 'currentColor', strokeOpacity: 0.1 }}
              content={<ChartTooltip currency={currency} />}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return <div className={cn('w-full', className)}>{renderBody()}</div>;
}

export default DailyRevenueChart;
