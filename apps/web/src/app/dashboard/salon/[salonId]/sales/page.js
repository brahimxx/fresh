'use client';

import { useState, useEffect, useMemo, use } from 'react';
import { RequirePermission } from '@/components/layout/require-permission';
import { format, subDays } from 'date-fns';
import {
  Search,
  Download,
  Eye,
  RotateCcw,
  CreditCard,
  Banknote,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  DollarSign,
  Receipt,
  RefreshCw,
  Wallet,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

import {
  usePayments,
  useDailyTotals,
  PAYMENT_METHODS,
  FILTERABLE_PAYMENT_METHODS,
  PAYMENT_STATUSES,
} from '@/hooks/use-payments';
import { formatCurrency } from '@/lib/format';
import { resolvePermission } from '@/lib/permissions';
import { PaymentDetailDialog } from '@/components/sales/payment-detail';
import { RefundDialog } from '@/components/sales/refund-dialog';
import { DailyRevenueChart } from '@/components/sales/daily-revenue-chart';
import { useSalon } from '@/providers/salon-provider';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Status filter — exactly five options, default "all" (Req 12.3, 12.8).
// Values map to the canonical 4-value enum on the server (Req 12.10).
// ---------------------------------------------------------------------------
var STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'partially_refunded', label: 'Partially refunded' },
];

var containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

var itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

var SESSION_CURRENCY_WARN_KEY = 'fresh:salon-currency-missing-warned';

// Server-side page size — matches the API default.
var PAGE_SIZE = 20;

export default function SalesPage({ params }) {
  return (
    <RequirePermission page="sales">
      <SalesContent params={params} />
    </RequirePermission>
  );
}

function SalesContent({ params }) {
  var resolvedParams = use(params);
  var salonId = resolvedParams.salonId;

  var salonCtx = useSalon();
  var salon = salonCtx?.salon;
  var staffRole = salonCtx?.staffRole;
  var customPermissions = salonCtx?.customPermissions;

  // Currency: pass `salon.currency` to every formatCurrency call (Req 19.2).
  // Warn once per session when missing (Req 19.5). Falling back to the global
  // APP_CURRENCY happens inside `formatCurrency` itself.
  var currency = salon?.currency;
  useEffect(
    function () {
      if (!salon) return;
      if (salon.currency) return;
      if (typeof window === 'undefined') return;
      try {
        if (window.sessionStorage.getItem(SESSION_CURRENCY_WARN_KEY)) return;
        window.sessionStorage.setItem(SESSION_CURRENCY_WARN_KEY, '1');
      } catch (_e) {
        // Ignore storage failures (private mode, etc.) — fall through to warn.
      }
      // eslint-disable-next-line no-console
      console.warn(
        '[sales] salon.currency is missing; falling back to APP_CURRENCY',
      );
    },
    [salon],
  );

  // Filter state — every filter is forwarded to the API; no client-side
  // filtering is performed (Req 11.x, 12.4).
  var [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  var [statusFilter, setStatusFilter] = useState('all');
  var [methodFilter, setMethodFilter] = useState('all');
  var [hasRefundFilter, setHasRefundFilter] = useState(false);
  var [searchQuery, setSearchQuery] = useState('');
  var [page, setPage] = useState(1);
  var [selectedPayment, setSelectedPayment] = useState(null);
  var [refundPayment, setRefundPayment] = useState(null);

  var startDate = format(dateRange.from, 'yyyy-MM-dd');
  var endDate = format(dateRange.to, 'yyyy-MM-dd');

  // Reset to page 1 whenever an effective filter changes.
  useEffect(
    function () { setPage(1); },
    [startDate, endDate, statusFilter, methodFilter, hasRefundFilter, searchQuery],
  );

  // Server-side filters (Req 11.x). `search` is forwarded; the page no longer
  // filters in JavaScript.
  var listFilters = useMemo(
    function () {
      return {
        start_date: startDate,
        end_date: endDate,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        method: methodFilter !== 'all' ? methodFilter : undefined,
        search: searchQuery ? searchQuery : undefined,
        has_refund: hasRefundFilter ? 'true' : undefined,
        page: page,
        limit: PAGE_SIZE,
      };
    },
    [startDate, endDate, statusFilter, methodFilter, hasRefundFilter, searchQuery, page],
  );

  var paymentsQuery = usePayments(salonId, listFilters);
  var paymentsResult = paymentsQuery.data || { data: [], meta: null };
  var payments = paymentsResult.data;
  var meta = paymentsResult.meta;
  var isLoading = paymentsQuery.isLoading;
  var refetch = paymentsQuery.refetch;

  // Pagination guards — disabled at the edges so click / keyboard / touch
  // are ignored (mirrors Products page pattern).
  var totalPages = meta ? meta.totalPages : 0;
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

  // Daily totals over the same date range — drives both the chart and the
  // KPI aggregates (Req 12.4–12.7, 16.3).
  var dailyTotalsQuery = useDailyTotals(salonId, {
    start_date: startDate,
    end_date: endDate,
  });
  var dailyTotals = Array.isArray(dailyTotalsQuery.data)
    ? dailyTotalsQuery.data
    : [];

  // KPI aggregation derived from the date-spine response (Req 12.4–12.7).
  // The server's daily-totals endpoint already projects:
  //   • revenue       = SUM(amount - COALESCE(refunded_amount, 0))
  //                     over status IN ('paid','partially_refunded')
  //   • transactions  = COUNT over the same set
  //   • refunded      = SUM(COALESCE(refunded_amount, 0)) over the window
  // Summing those across the inclusive range gives the page-wide KPIs without
  // re-fetching every paginated row.
  var kpi = useMemo(
    function () {
      var revenue = 0;
      var transactions = 0;
      var refunded = 0;
      for (var i = 0; i < dailyTotals.length; i++) {
        var row = dailyTotals[i] || {};
        revenue += Number(row.revenue || 0);
        transactions += Number(row.transactions || 0);
        refunded += Number(row.refunded || 0);
      }
      // Average ticket: 0 when count = 0 (no division, Req 12.7).
      var average = transactions > 0 ? revenue / transactions : 0;
      return {
        revenue: revenue,
        transactions: transactions,
        refunded: refunded,
        average: average,
      };
    },
    [dailyTotals],
  );

  // Affordance gating for the refund row-action. Owner / admin always allowed;
  // staff need `sales.manage` (Req 21.1, 21.3). The page-level guard
  // <RequirePermission page="sales"> stays in place for read access.
  var canManageSales = useMemo(
    function () {
      if (!staffRole) return false;
      return resolvePermission(staffRole, customPermissions, 'sales.manage');
    },
    [staffRole, customPermissions],
  );

  function isRefundable(payment) {
    if (!payment) return false;
    if (payment.status !== 'paid' && payment.status !== 'partially_refunded') {
      return false;
    }
    var remaining =
      Number(payment.amount || 0) - Number(payment.refunded_amount || 0);
    return remaining > 0;
  }

  // Build the export URL with the same filters the listing uses (Req 17.3).
  function handleExportCsv() {
    if (!salonId) return;
    var params = new URLSearchParams();
    params.append('salon_id', salonId);
    params.append('start_date', startDate);
    params.append('end_date', endDate);
    if (listFilters.status) params.append('status', listFilters.status);
    if (listFilters.method) params.append('method', listFilters.method);
    if (listFilters.search) params.append('search', listFilters.search);
    var url = '/api/payments/export.csv?' + params.toString();
    if (typeof window !== 'undefined') {
      window.location.assign(url);
    }
  }

  function getMethodIcon(method) {
    if (method === 'card' || method === 'card_terminal') {
      return CreditCard;
    }
    return Banknote;
  }

  function getMethodLabel(method) {
    var found = PAYMENT_METHODS.find(function (m) {
      return m.value === method;
    });
    return found ? found.label : method;
  }

  function getStatusBadge(status) {
    var config = PAYMENT_STATUSES[status] || { label: status };

    var modernColor = 'bg-primary/10 text-primary border-primary/20';
    if (status === 'paid') {
      modernColor =
        'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
    } else if (status === 'refunded') {
      modernColor =
        'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20';
    } else if (status === 'pending') {
      modernColor =
        'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    } else if (status === 'partially_refunded') {
      modernColor =
        'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20';
    }

    return (
      <Badge
        variant="outline"
        className={cn(
          'font-bold uppercase tracking-wider text-[10px] px-2.5 py-0.5',
          modernColor,
        )}
      >
        {config.label}
      </Badge>
    );
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
          <Wallet className="w-64 h-64 text-primary" strokeWidth={1} />
        </div>

        <div className="relative z-10 flex flex-col gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-background/80 backdrop-blur-md border border-primary/20 text-xs font-semibold text-primary w-fit">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Financial Command</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight max-w-2xl">
            Sales & Ledger
          </h1>
          <p className="text-muted-foreground text-lg font-medium max-w-xl">
            Monitor real-time cash flow, trace global transactions, and manage
            client refunds seamlessly.
          </p>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row gap-3 shrink-0">
          <Button
            variant="outline"
            onClick={function () {
              refetch();
            }}
            className="flex-1 sm:flex-none h-12 px-6 rounded-xl border-border/50 bg-background/50 backdrop-blur-md hover:bg-background shadow-sm text-[15px]"
          >
            <RefreshCw className="h-5 w-5 mr-2 text-muted-foreground" />
            Sync Ledger
          </Button>
          <Button
            onClick={handleExportCsv}
            className="flex-1 sm:flex-none h-12 px-6 rounded-xl shadow-md text-[15px]"
          >
            <Download className="h-5 w-5 mr-2" />
            Export CSV
          </Button>
        </div>
      </motion.div>

      {/* KPI Cards */}
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
          <div className="absolute -right-6 -top-6 text-emerald-500/5 transition-transform duration-700 group-hover:scale-125 group-hover:-rotate-12 pointer-events-none">
            <DollarSign className="w-32 h-32" strokeWidth={1} />
          </div>
          <div className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Gross Revenue
            </h3>
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </div>
          </div>
          <div className="relative z-10 mt-2">
            <p className="text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
              {formatCurrency(kpi.revenue, currency)}
            </p>
            <p className="text-xs font-semibold text-muted-foreground mt-1">
              Period total
            </p>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm overflow-hidden relative group hover:bg-background transition-colors duration-500"
        >
          <div className="absolute -right-6 -top-6 text-primary/5 transition-transform duration-700 group-hover:scale-125 group-hover:-rotate-12 pointer-events-none">
            <Receipt className="w-32 h-32" strokeWidth={1} />
          </div>
          <div className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Transactions
            </h3>
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Receipt className="h-4 w-4 text-primary" />
            </div>
          </div>
          <div className="relative z-10 mt-2">
            <p className="text-3xl font-extrabold tracking-tight text-foreground">
              {kpi.transactions}
            </p>
            <p className="text-xs font-semibold text-muted-foreground mt-1">
              Completed invoices
            </p>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm overflow-hidden relative group hover:bg-background transition-colors duration-500"
        >
          <div className="absolute -right-6 -top-6 text-blue-500/5 transition-transform duration-700 group-hover:scale-125 group-hover:rotate-12 pointer-events-none">
            <TrendingUp className="w-32 h-32" strokeWidth={1} />
          </div>
          <div className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Ticket Average
            </h3>
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </div>
          </div>
          <div className="relative z-10 mt-2">
            <p className="text-3xl font-extrabold tracking-tight text-foreground">
              {formatCurrency(kpi.average, currency)}
            </p>
            <p className="text-xs font-semibold text-muted-foreground mt-1">
              Per head checkout
            </p>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm overflow-hidden relative group hover:bg-background transition-colors duration-500"
        >
          <div className="absolute -right-6 -top-6 text-red-500/5 transition-transform duration-700 group-hover:scale-125 group-hover:-rotate-12 pointer-events-none">
            <RotateCcw className="w-32 h-32" strokeWidth={1} />
          </div>
          <div className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Capital Returned
            </h3>
            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
              <RotateCcw className="h-4 w-4 text-red-600" />
            </div>
          </div>
          <div className="relative z-10 mt-2">
            <p className="text-3xl font-extrabold tracking-tight text-red-600 dark:text-red-400">
              {formatCurrency(kpi.refunded, currency)}
            </p>
            <p className="text-xs font-semibold text-muted-foreground mt-1">
              Total refunds issued
            </p>
          </div>
        </motion.div>
      </motion.div>

      {/* Daily Revenue Chart — sits directly under the four KPI cards (Req 16.3). */}
      <motion.div
        variants={itemVariants}
        initial="hidden"
        animate="show"
        className="bg-background/60 backdrop-blur-xl rounded-3xl border border-border/50 shadow-sm p-6 sm:p-8"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold tracking-tight">
              Daily Revenue Trend
            </h2>
            <p className="text-sm font-medium text-muted-foreground mt-1">
              {format(dateRange.from, 'MMM d')} –{' '}
              {format(dateRange.to, 'MMM d, yyyy')}
            </p>
          </div>
        </div>
        <DailyRevenueChart
          data={dailyTotals}
          isLoading={dailyTotalsQuery.isLoading}
          isFetching={dailyTotalsQuery.isFetching}
          isError={dailyTotalsQuery.isError}
          onRetry={dailyTotalsQuery.refetch}
          currency={currency}
        />
      </motion.div>

      {/* Ledger Matrix */}
      <motion.div
        variants={itemVariants}
        initial="hidden"
        animate="show"
        className="bg-background/60 backdrop-blur-xl rounded-3xl border border-border/50 shadow-sm overflow-hidden flex flex-col"
      >
        {/* Filter Bar */}
        <div className="p-5 sm:px-8 border-b border-border/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-muted/5">
          <div className="relative w-full lg:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
            <Input
              placeholder="Search by client, invoice ID..."
              value={searchQuery}
              onChange={function (e) {
                setSearchQuery(e.target.value);
              }}
              className="pl-10 h-11 bg-background rounded-xl border-border/50 focus-visible:ring-primary/50 shadow-sm font-medium"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-11 bg-background rounded-xl border-border/50 shadow-sm font-semibold text-[13px] min-w-[220px] justify-start text-muted-foreground hover:text-foreground"
                >
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {format(dateRange.from, 'MMM d')} -{' '}
                  {format(dateRange.to, 'MMM d, yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto p-0 rounded-2xl overflow-hidden shadow-2xl border-border/50"
                align="end"
              >
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={function (range) {
                    if (range?.from && range?.to) {
                      setDateRange(range);
                    }
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-44 h-11 bg-background rounded-xl border-border/50 shadow-sm font-semibold text-[13px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/50 shadow-lg">
                {STATUS_OPTIONS.map(function (opt) {
                  return (
                    <SelectItem
                      key={opt.value}
                      value={opt.value}
                      className="font-medium rounded-lg"
                    >
                      {opt.label}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="w-full sm:w-44 h-11 bg-background rounded-xl border-border/50 shadow-sm font-semibold text-[13px]">
                <SelectValue placeholder="Method" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/50 shadow-lg">
                <SelectItem value="all" className="font-medium rounded-lg">
                  All Methods
                </SelectItem>
                {FILTERABLE_PAYMENT_METHODS.map(function (method) {
                  return (
                    <SelectItem
                      key={method.value}
                      value={method.value}
                      className="font-medium rounded-lg"
                    >
                      {method.label}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <Button
              variant={hasRefundFilter ? 'default' : 'outline'}
              onClick={function () { setHasRefundFilter(function (v) { return !v; }); }}
              className={cn(
                'h-11 rounded-xl shadow-sm font-semibold text-[13px] gap-2',
                hasRefundFilter
                  ? ''
                  : 'bg-background border-border/50 text-muted-foreground hover:text-foreground',
              )}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Has Refund
            </Button>
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
          ) : payments.length > 0 ? (
            <Table className="px-4">
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border/50 [&_th]:h-14">
                  <TableHead className="pl-8 text-xs font-bold uppercase tracking-wider text-muted-foreground w-[180px]">
                    Timestamp
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground min-w-[200px]">
                    Client Target
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Invoice Ref
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Gateway
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Condition
                  </TableHead>
                  <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Settlement
                  </TableHead>
                  <TableHead className="w-[100px] pr-8 text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {payments.map(function (payment, i) {
                    var MethodIcon = getMethodIcon(payment.method);
                    var createdAtDate = payment.created_at
                      ? new Date(payment.created_at)
                      : null;
                    var hasValidDate =
                      createdAtDate &&
                      !Number.isNaN(createdAtDate.getTime());
                    var refundable = canManageSales && isRefundable(payment);

                    return (
                      <motion.tr
                        key={payment.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="group hover:bg-muted/5 border-border/50 transition-colors [&_td]:py-4"
                      >
                        <TableCell className="pl-8 align-middle">
                          <div>
                            <p className="font-extrabold text-[14px] text-foreground">
                              {hasValidDate
                                ? format(createdAtDate, 'MMM d, yyyy')
                                : '—'}
                            </p>
                            <p className="text-[13px] font-semibold text-muted-foreground mt-0.5">
                              {hasValidDate
                                ? format(createdAtDate, 'HH:mm') + ' hrs'
                                : ''}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="align-middle">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-muted/40 border border-border/50 flex items-center justify-center">
                              <span className="font-bold text-[13px] text-muted-foreground group-hover:text-primary transition-colors">
                                {(payment.client_name || 'W')[0].toUpperCase()}
                              </span>
                            </div>
                            <span className="font-bold text-[15px] group-hover:text-primary transition-colors">
                              {payment.client_name || 'Walk-in Guest'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="align-middle">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/30 font-mono text-[13px] font-bold text-muted-foreground">
                            <span className="opacity-50">#</span>
                            {payment.booking_id || payment.id}
                          </div>
                        </TableCell>
                        <TableCell className="align-middle">
                          <div className="flex items-center gap-2 text-[14px] font-bold text-muted-foreground">
                            <MethodIcon className="h-4 w-4" />
                            <span>{getMethodLabel(payment.method)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="align-middle">
                          {getStatusBadge(payment.status)}
                        </TableCell>
                        <TableCell className="text-right align-middle">
                          <div className="flex flex-col items-end">
                            <span className="font-extrabold text-[15px]">
                              {formatCurrency(payment.amount, currency)}
                            </span>
                            {Number(payment.tip_amount || 0) > 0 && (
                              <span className="text-[12px] font-bold text-primary mt-0.5 bg-primary/10 px-1.5 rounded">
                                +{' '}
                                {formatCurrency(
                                  payment.tip_amount,
                                  currency,
                                )}{' '}
                                tip
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right align-middle pr-8">
                          <div className="flex items-center justify-end gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground"
                              onClick={function () {
                                setSelectedPayment(payment);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {refundable && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 rounded-xl hover:bg-red-500/10 hover:text-red-500 text-muted-foreground"
                                onClick={function () {
                                  setRefundPayment(payment);
                                }}
                                title="Issue Refund"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </TableBody>
            </Table>
          ) : (
            <div className="p-16 flex flex-col items-center justify-center text-center">
              <div className="h-24 w-24 bg-muted/30 rounded-full flex items-center justify-center mb-6">
                <Receipt className="h-10 w-10 text-muted-foreground opacity-50" />
              </div>
              <p className="text-xl font-bold tracking-tight mb-2">
                Blank Ledger
              </p>
              <p className="text-muted-foreground font-medium max-w-sm mb-6">
                No financial transactions correspond with the selected
                constraints. Try widening your date parameters.
              </p>
            </div>
          )}
        </div>

        {/* Pagination control */}
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

      {/* Payment Detail Dialog */}
      <PaymentDetailDialog
        open={!!selectedPayment}
        onOpenChange={function (open) {
          if (!open) setSelectedPayment(null);
        }}
        payment={selectedPayment}
      />

      {/* Refund Dialog — only mounted when the row-action is allowed (Req 21.1). */}
      {canManageSales && (
        <RefundDialog
          open={!!refundPayment}
          onOpenChange={function (open) {
            if (!open) setRefundPayment(null);
          }}
          payment={refundPayment}
          onSuccess={function () {
            setRefundPayment(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}
