'use client';

/**
 * PaymentDetailDialog — sales detail view (Task 13.2).
 *
 * Reads canonical snake_case keys only (Requirement 13.4) and pulls the full
 * breakdown from the detail endpoint via `usePaymentDetail` (Requirement 13.2).
 * Currency is rendered via `formatCurrency(amount, salon.currency)` everywhere
 * (Requirements 19.2, 19.3). The "Print Receipt" button navigates to the
 * dedicated receipt route within 1 s using Next.js's `useRouter` (Requirement
 * 18.1); the "Email Receipt" affordance is intentionally absent (Requirement
 * 18.6).
 */

import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import {
  CreditCard,
  Banknote,
  User,
  Receipt,
  Tag,
  Gift,
  Printer,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

import {
  usePaymentDetail,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
} from '@/hooks/use-payments';
import { formatCurrency } from '@/lib/format';
import { useSalon } from '@/providers/salon-provider';

function getMethodIcon(method) {
  if (method === 'card' || method === 'card_terminal') return CreditCard;
  return Banknote;
}

function getMethodLabel(method) {
  var found = PAYMENT_METHODS.find(function (m) { return m.value === method; });
  return found ? found.label : method;
}

function getStatusBadge(status) {
  if (status === 'pending') {
    return (
      <Badge variant="outline" className="bg-amber-50/50 text-amber-600 border-amber-200">
        <div className="relative flex h-2 w-2 mr-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
        </div>
        Pending
      </Badge>
    );
  }

  var config = PAYMENT_STATUSES[status] || {
    label: status,
    color: 'bg-muted text-muted-foreground border-border',
  };
  return (
    <Badge variant="outline" className={config.color}>
      {config.label}
    </Badge>
  );
}

/**
 * Resolve a numeric breakdown value, preferring the detail-endpoint figure
 * (canonical, computed via `calculateBookingTotal`) and falling back to the
 * listing row only when detail is still loading.
 */
function pickNumber(detailValue, listValue) {
  if (detailValue !== undefined && detailValue !== null) return Number(detailValue) || 0;
  if (listValue !== undefined && listValue !== null) return Number(listValue) || 0;
  return 0;
}

export function PaymentDetailDialog({ open, onOpenChange, payment }) {
  var router = useRouter();
  var salonCtx = useSalon();
  var salon = salonCtx?.salon;
  var salonId = salonCtx?.salonId;
  var currency = salon?.currency;

  // Fetch the full breakdown (services/products/subtotal/discount/gift card/tip/...)
  // from /api/payments/[id]; the listing row only carries the surface fields.
  var paymentId = payment?.id ?? null;
  var detailQuery = usePaymentDetail(open ? paymentId : null);
  var detail = detailQuery.data || null;
  var isLoadingDetail = detailQuery.isLoading && !!paymentId && open;

  if (!payment) return null;

  // Snake_case keys only (Req 13.4). Detail endpoint is the source of truth
  // for the breakdown; listing fields back-fill identity/header rows.
  // Local variables stay in snake_case to mirror the API and to satisfy the
  // sales-surface camelCase guard (tests/smoke/sales-page-camelcase.smoke.test.js).
  var row = detail || payment;
  var status = row.status;
  var method = row.method;
  var created_at = row.created_at;
  var booking_id = row.booking_id;
  var client_name = row.client_name || 'Walk-in Guest';
  var client_email = row.client_email || null;
  var stripe_payment_intent_id = row.stripe_payment_intent_id || row.stripe_payment_id || null;

  // Breakdown rows from the detail endpoint (Req 13.2).
  var servicesAmount = pickNumber(detail?.services_amount, payment.services_amount);
  var productsAmount = pickNumber(detail?.products_amount, payment.products_amount);
  var subtotal = pickNumber(
    detail?.subtotal,
    payment.subtotal !== undefined ? payment.subtotal : servicesAmount + productsAmount,
  );
  var discountAmount = pickNumber(detail?.discount_amount, payment.discount_amount);
  var discountCode = (detail?.discount_code ?? payment.discount_code) || null;
  var giftCardAmount = pickNumber(detail?.gift_card_amount, payment.gift_card_amount);
  var tipAmount = pickNumber(detail?.tip_amount, payment.tip_amount);
  var totalAmount = pickNumber(detail?.amount, payment.amount);
  var refundedAmount = pickNumber(detail?.refunded_amount, payment.refunded_amount);

  var MethodIcon = getMethodIcon(method);

  var created_at_date = created_at ? new Date(created_at) : null;
  var created_at_label =
    created_at_date && !Number.isNaN(created_at_date.getTime())
      ? format(created_at_date, 'MMM d, yyyy HH:mm')
      : '—';

  function handlePrintReceipt() {
    if (!salonId || !paymentId) return;
    // Req 18.1: navigate to the dedicated print route within 1 s — a
    // synchronous `router.push` resolves immediately.
    router.push('/dashboard/salon/' + salonId + '/sales/' + paymentId + '/receipt');
    onOpenChange?.(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Payment Details</span>
            {getStatusBadge(status)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Payment Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Payment ID</p>
              <p className="font-medium">#{payment.id}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Booking ID</p>
              <p className="font-medium">#{booking_id}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Date & Time</p>
              <p className="font-medium">{created_at_label}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Payment Method</p>
              <div className="flex items-center gap-2 font-medium">
                <MethodIcon className="h-4 w-4" />
                {getMethodLabel(method)}
              </div>
            </div>
          </div>

          <Separator />

          {/* Client Info */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">{client_name}</p>
              {client_email && (
                <p className="text-sm text-muted-foreground">{client_email}</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Amount Breakdown — full rows from /api/payments/[id] (Req 13.2) */}
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Payment Breakdown
            </h4>

            {isLoadingDetail && !detail ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : (
              <>
                {servicesAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Services</span>
                    <span>{formatCurrency(servicesAmount, currency)}</span>
                  </div>
                )}

                {productsAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Products</span>
                    <span>{formatCurrency(productsAmount, currency)}</span>
                  </div>
                )}

                {subtotal > 0 && (servicesAmount > 0 || productsAmount > 0) && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(subtotal, currency)}</span>
                  </div>
                )}

                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      Discount
                      {discountCode && (
                        <span className="text-xs">({discountCode})</span>
                      )}
                    </span>
                    <span className="text-green-600">
                      -{formatCurrency(discountAmount, currency)}
                    </span>
                  </div>
                )}

                {giftCardAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Gift className="h-3 w-3" />
                      Gift Card
                    </span>
                    <span className="text-green-600">
                      -{formatCurrency(giftCardAmount, currency)}
                    </span>
                  </div>
                )}

                {tipAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tip</span>
                    <span>{formatCurrency(tipAmount, currency)}</span>
                  </div>
                )}

                <Separator />

                <div className="flex justify-between font-medium">
                  <span>Total Paid</span>
                  <span className="text-lg">
                    {formatCurrency(totalAmount, currency)}
                  </span>
                </div>

                {refundedAmount > 0 && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>Refunded</span>
                    <span>-{formatCurrency(refundedAmount, currency)}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Stripe Info */}
          {stripe_payment_intent_id && (
            <>
              <Separator />
              <div className="text-sm">
                <p className="text-muted-foreground">Stripe Payment Intent</p>
                <p className="font-mono text-xs break-all">
                  {stripe_payment_intent_id}
                </p>
              </div>
            </>
          )}

          {/* Actions — Email Receipt is intentionally absent (Req 18.6). */}
          <Separator />
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handlePrintReceipt}
              disabled={!salonId || !paymentId}
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Receipt
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
