'use client';

/**
 * Browser-printable receipt route (Task 15.1, Requirement 18).
 *
 * Renders a print-optimised receipt for a single payment. The page is a
 * client component because it relies on TanStack Query hooks (`useSalon`,
 * `usePaymentDetail`) and on `window.print()` to trigger the browser print
 * dialog automatically once both resources are loaded successfully
 * (Requirements 18.1, 18.2).
 *
 * Line items: the detail endpoint (`/api/payments/[id]`) currently exposes
 * an aggregated breakdown (`services_amount`, `products_amount`,
 * `discount_amount`, `gift_card_amount`, `tip_amount`, `amount`,
 * `refunded_amount`). Per the task notes, we render those aggregates as
 * the line items here and leave the per-line-item drill-down (joining
 * `booking_services` / `booking_products` for `{ name, quantity, unit
 * price, line total }`) as future work — it would require either extending
 * the detail endpoint or a second fetch. The print stylesheet still
 * supports a multi-page header repeat for receipts that grow beyond 20
 * line items once the drill-down arrives.
 *
 * Currency: every monetary value goes through `formatCurrency(amount,
 * salon.currency)` (Requirement 18.4, 19.2).
 *
 * Error handling: 404 / 403 from the detail endpoint (or a missing salon
 * row) renders an inline `<DataError>` and suppresses `window.print()`
 * (Requirement 18.8).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';

import { useSalon } from '@/providers/salon-provider';
import { usePaymentDetail, PAYMENT_METHODS } from '@/hooks/use-payments';
import { formatCurrency } from '@/lib/format';
import { DataError } from '@/components/ui/data-error';
import { Skeleton } from '@/components/ui/skeleton';

// Aggregate breakdown rows are rendered as virtual "line items". Once the
// per-line-item drill-down lands, this constant moves to a real list of
// booking_services / booking_products rows.
var LINE_ITEM_PAGE_LIMIT = 20;

function getMethodLabel(method) {
  var found = PAYMENT_METHODS.find(function (m) { return m.value === method; });
  return found ? found.label : method || '—';
}

function num(value) {
  if (value === null || value === undefined) return 0;
  var n = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Determine whether a payment-fetch error is a 404 or a 403. The handler
 * collapses cross-salon access to NOT_FOUND (Req 4.6) so both surface as a
 * 404 to the client. We treat 401 as an error too since middleware should
 * already redirect, but the page is defensive.
 */
function isNotAuthorized(err) {
  if (!err) return false;
  return err.status === 404 || err.status === 403 || err.status === 401;
}

/**
 * Compose a printable single-line salon address. Empty parts are skipped so
 * we never render double commas or trailing whitespace.
 */
function composeAddress(salon) {
  if (!salon) return '';
  var parts = [salon.address, salon.city, salon.state, salon.zip_code, salon.country]
    .map(function (s) { return (s || '').trim(); })
    .filter(Boolean);
  return parts.join(', ');
}

export default function ReceiptPage() {
  var params = useParams();
  var salonId = params?.salonId;
  var paymentId = params?.paymentId;

  var salonCtx = useSalon();
  var salon = salonCtx?.salon || null;
  var salonLoading = salonCtx?.isLoading;
  var salonError = salonCtx?.error || null;
  var currency = salon?.currency;

  var paymentQuery = usePaymentDetail(paymentId);
  var payment = paymentQuery.data || null;
  var paymentLoading = paymentQuery.isLoading;
  var paymentError = paymentQuery.error || null;

  // Track whether we've already triggered the browser print dialog so
  // re-renders (e.g. focus/blur, query refetch on window focus) don't fire
  // it twice.
  var didPrintRef = useRef(false);
  var [printScheduled, setPrintScheduled] = useState(false);

  var hasFatalError = isNotAuthorized(paymentError) || !!salonError;

  useEffect(function () {
    if (hasFatalError) return; // Req 18.8 — never print on 404/403
    if (didPrintRef.current) return;
    if (!salon || !payment) return;
    if (typeof window === 'undefined') return;

    setPrintScheduled(true);
    // Req 18.2 — fire window.print() within 500 ms of both resources loading.
    var timer = window.setTimeout(function () {
      didPrintRef.current = true;
      try {
        window.print();
      } catch (_) {
        // window.print() throws in some embedded contexts (e.g. test env);
        // swallow so the page still renders the receipt visually.
      }
    }, 250);

    return function () { window.clearTimeout(timer); };
  }, [hasFatalError, salon, payment]);

  // ---------------------------------------------------------------------
  // Aggregate-breakdown line items (Requirement 18.3).
  //
  // Until the per-line-item drill-down ships, services and products surface
  // as a single row each carrying the aggregate amount. They are still
  // grouped under "Services" and "Products" headings so the layout matches
  // the spec'd shape `{ name, quantity, unit price, line total }`.
  // ---------------------------------------------------------------------
  var groups = useMemo(function () {
    if (!payment) return { services: [], products: [] };
    var services = [];
    var products = [];
    var servicesAmount = num(payment.services_amount);
    var productsAmount = num(payment.products_amount);
    if (servicesAmount > 0) {
      services.push({
        name: 'Services',
        quantity: 1,
        unit_price: servicesAmount,
        line_total: servicesAmount,
      });
    }
    if (productsAmount > 0) {
      products.push({
        name: 'Products',
        quantity: 1,
        unit_price: productsAmount,
        line_total: productsAmount,
      });
    }
    return { services: services, products: products };
  }, [payment]);

  // ---------------------------------------------------------------------
  // Fatal error branch — rendered before any window.print() fires (Req 18.8)
  // ---------------------------------------------------------------------
  if (hasFatalError) {
    var notAuth = isNotAuthorized(paymentError);
    return (
      <div className="receipt-shell mx-auto max-w-2xl p-6">
        <DataError
          title={notAuth ? 'Receipt unavailable' : 'Failed to load receipt'}
          message={
            notAuth
              ? "This payment doesn't exist or you don't have permission to view it."
              : 'Something went wrong while loading the receipt. Please try again.'
          }
          error={paymentError || salonError}
        />
      </div>
    );
  }

  // ---------------------------------------------------------------------
  // Loading skeleton — also covers the gap before window.print() fires.
  // ---------------------------------------------------------------------
  if (salonLoading || paymentLoading || !salon || !payment) {
    return (
      <div className="receipt-shell mx-auto max-w-2xl p-6 space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="space-y-2 pt-6">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------
  // Real receipt
  // ---------------------------------------------------------------------
  var clientName = payment.client_name || 'Walk-in Guest';
  var clientEmail = payment.client_email || null;
  var bookingId = payment.booking_id;
  var method = payment.method;
  var status = payment.status;

  var createdAtDate = payment.created_at ? new Date(payment.created_at) : null;
  var createdAtLabel =
    createdAtDate && !Number.isNaN(createdAtDate.getTime())
      ? format(createdAtDate, 'MMM d, yyyy HH:mm')
      : '—';

  var subtotal = num(payment.subtotal);
  var discountAmount = num(payment.discount_amount);
  var discountCode = payment.discount_code || null;
  var giftCardAmount = num(payment.gift_card_amount);
  var tipAmount = num(payment.tip_amount);
  var totalAmount = num(payment.amount);
  var refundedAmount = num(payment.refunded_amount);

  var addressLine = composeAddress(salon);

  var totalLineItems = groups.services.length + groups.products.length;

  // Header repeated on each printed page once line items exceed the
  // single-page limit (Req 18.7). The CSS `display: table-header-group`
  // trick on `<thead>` makes the browser repeat the printed header.
  var repeatHeader = totalLineItems > LINE_ITEM_PAGE_LIMIT;

  return (
    <div className="receipt-shell mx-auto max-w-2xl p-6 print:p-0 print:max-w-none">
      {/* Status hint while we wait for window.print() to fire (hidden in print) */}
      {printScheduled && (
        <p className="receipt-no-print text-xs text-muted-foreground mb-4">
          Preparing print dialog…
        </p>
      )}

      <table className="w-full border-collapse">
        {/* Repeated header */}
        <thead className={repeatHeader ? 'receipt-header-repeat' : undefined}>
          <tr>
            <th colSpan={4} className="text-left pb-4 align-top">
              <div className="text-2xl font-semibold leading-tight">
                {salon.name}
              </div>
              {addressLine && (
                <div className="text-sm text-muted-foreground mt-1">
                  {addressLine}
                </div>
              )}
              {salon.phone && (
                <div className="text-sm text-muted-foreground">
                  {salon.phone}
                </div>
              )}
            </th>
          </tr>
        </thead>

        <tbody>
          {/* Receipt meta */}
          <tr>
            <td colSpan={4} className="pt-2 pb-4">
              <div className="grid grid-cols-2 gap-y-1 gap-x-6 text-sm">
                <div>
                  <span className="text-muted-foreground">Receipt #</span>{' '}
                  <span className="font-medium">#{payment.id}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Booking #</span>{' '}
                  <span className="font-medium">#{bookingId}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Date</span>{' '}
                  <span className="font-medium">{createdAtLabel}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Method</span>{' '}
                  <span className="font-medium">{getMethodLabel(method)}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Client</span>{' '}
                  <span className="font-medium">{clientName}</span>
                  {clientEmail && (
                    <span className="text-muted-foreground"> · {clientEmail}</span>
                  )}
                </div>
              </div>
            </td>
          </tr>

          {/* Column headings for the line-item table */}
          <tr className="border-y border-border">
            <th className="text-left text-xs uppercase tracking-wide text-muted-foreground py-2">
              Item
            </th>
            <th className="text-right text-xs uppercase tracking-wide text-muted-foreground py-2">
              Qty
            </th>
            <th className="text-right text-xs uppercase tracking-wide text-muted-foreground py-2">
              Unit
            </th>
            <th className="text-right text-xs uppercase tracking-wide text-muted-foreground py-2">
              Total
            </th>
          </tr>

          {/* Services group */}
          {groups.services.length > 0 && (
            <tr>
              <td colSpan={4} className="pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Services
              </td>
            </tr>
          )}
          {groups.services.map(function (item, idx) {
            return (
              <tr key={'svc-' + idx} className="border-b border-border/40">
                <td className="py-2">{item.name}</td>
                <td className="py-2 text-right tabular-nums">{item.quantity}</td>
                <td className="py-2 text-right tabular-nums">
                  {formatCurrency(item.unit_price, currency)}
                </td>
                <td className="py-2 text-right tabular-nums">
                  {formatCurrency(item.line_total, currency)}
                </td>
              </tr>
            );
          })}

          {/* Products group */}
          {groups.products.length > 0 && (
            <tr>
              <td colSpan={4} className="pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Products
              </td>
            </tr>
          )}
          {groups.products.map(function (item, idx) {
            return (
              <tr key={'prd-' + idx} className="border-b border-border/40">
                <td className="py-2">{item.name}</td>
                <td className="py-2 text-right tabular-nums">{item.quantity}</td>
                <td className="py-2 text-right tabular-nums">
                  {formatCurrency(item.unit_price, currency)}
                </td>
                <td className="py-2 text-right tabular-nums">
                  {formatCurrency(item.line_total, currency)}
                </td>
              </tr>
            );
          })}

          {/* Aggregate rows — discount / gift card / tip omitted when null or 0
              (Req 18.3 last clause). Subtotal is shown only when non-zero too. */}
          {subtotal > 0 && (
            <tr>
              <td colSpan={3} className="pt-3 text-right text-sm text-muted-foreground">
                Subtotal
              </td>
              <td className="pt-3 text-right tabular-nums">
                {formatCurrency(subtotal, currency)}
              </td>
            </tr>
          )}

          {discountAmount > 0 && (
            <tr>
              <td colSpan={3} className="text-right text-sm text-muted-foreground">
                Discount{discountCode ? ' (' + discountCode + ')' : ''}
              </td>
              <td className="text-right tabular-nums">
                -{formatCurrency(discountAmount, currency)}
              </td>
            </tr>
          )}

          {giftCardAmount > 0 && (
            <tr>
              <td colSpan={3} className="text-right text-sm text-muted-foreground">
                Gift card
              </td>
              <td className="text-right tabular-nums">
                -{formatCurrency(giftCardAmount, currency)}
              </td>
            </tr>
          )}

          {tipAmount > 0 && (
            <tr>
              <td colSpan={3} className="text-right text-sm text-muted-foreground">
                Tip
              </td>
              <td className="text-right tabular-nums">
                {formatCurrency(tipAmount, currency)}
              </td>
            </tr>
          )}

          {/* Total paid */}
          <tr className="border-t border-border">
            <td colSpan={3} className="pt-3 text-right text-base font-semibold">
              Total paid
            </td>
            <td className="pt-3 text-right text-base font-semibold tabular-nums">
              {formatCurrency(totalAmount, currency)}
            </td>
          </tr>

          {refundedAmount > 0 && (
            <tr>
              <td colSpan={3} className="text-right text-sm text-red-600">
                Refunded
              </td>
              <td className="text-right tabular-nums text-red-600">
                -{formatCurrency(refundedAmount, currency)}
              </td>
            </tr>
          )}

          {/* Status footer */}
          <tr>
            <td colSpan={4} className="pt-6 text-center text-xs text-muted-foreground">
              Status: {status} · Thank you for your visit
            </td>
          </tr>
        </tbody>
      </table>

      {/* Print stylesheet — hides app chrome / sidebar (Req 18.5), pins A4
          page geometry (Req 18.5), and repeats the table header on every
          printed page when the line-item count exceeds the per-page limit
          (Req 18.7). styled-jsx scopes `.receipt-shell`/`.receipt-no-print`
          to this page; the `:global(...)` selectors target layout chrome
          rendered by parent layouts that the user wouldn't want on paper. */}
      <style jsx global>{`
        @media print {
          /* Hide app chrome (header, sidebar, navigation, dialogs, toasts) */
          :global(header),
          :global(nav),
          :global(aside),
          :global([data-sidebar]),
          :global([role="navigation"]),
          :global([role="dialog"]),
          :global([role="alertdialog"]),
          :global(.no-print),
          .receipt-no-print {
            display: none !important;
          }

          /* Reset page background and remove animations for a clean sheet */
          :global(html),
          :global(body) {
            background: #ffffff !important;
            color: #000000 !important;
          }
          :global(*),
          :global(*::before),
          :global(*::after) {
            animation: none !important;
            transition: none !important;
            box-shadow: none !important;
          }

          .receipt-shell {
            margin: 0 auto;
            padding: 0;
            max-width: none;
            color: #000;
          }

          /* Repeat the salon-name / address header on every printed page
             when there are more than 20 line items. */
          .receipt-header-repeat {
            display: table-header-group;
          }
        }

        @page {
          size: A4;
          margin: 12mm;
        }
      `}</style>
    </div>
  );
}
