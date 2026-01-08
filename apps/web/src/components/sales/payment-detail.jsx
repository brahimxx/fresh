'use client';

import { format } from 'date-fns';
import { 
  CreditCard, 
  Banknote, 
  User, 
  Calendar, 
  Receipt, 
  Tag,
  Gift,
  Printer,
  Mail
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

import { formatCurrency, PAYMENT_METHODS, PAYMENT_STATUSES } from '@/hooks/use-payments';

export function PaymentDetailDialog({ open, onOpenChange, payment }) {
  if (!payment) return null;
  
  function getMethodIcon(method) {
    if (method === 'card' || method === 'card_terminal') {
      return CreditCard;
    }
    return Banknote;
  }
  
  function getMethodLabel(method) {
    var found = PAYMENT_METHODS.find(function(m) { return m.value === method; });
    return found ? found.label : method;
  }
  
  function getStatusBadge(status) {
    var config = PAYMENT_STATUSES[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
    return (
      <Badge variant="outline" className={config.color}>
        {config.label}
      </Badge>
    );
  }
  
  var MethodIcon = getMethodIcon(payment.method);
  
  // Calculate breakdown
  var servicesTotal = Number(payment.services_amount || 0);
  var productsTotal = Number(payment.products_amount || 0);
  var subtotal = Number(payment.subtotal || servicesTotal + productsTotal);
  var discount = Number(payment.discount_amount || 0);
  var giftCardAmount = Number(payment.gift_card_amount || 0);
  var tip = Number(payment.tip_amount || 0);
  var total = Number(payment.amount || 0);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Payment Details</span>
            {getStatusBadge(payment.status)}
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
              <p className="font-medium">#{payment.booking_id}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Date & Time</p>
              <p className="font-medium">
                {format(new Date(payment.created_at), 'MMM d, yyyy HH:mm')}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Payment Method</p>
              <div className="flex items-center gap-2 font-medium">
                <MethodIcon className="h-4 w-4" />
                {getMethodLabel(payment.method)}
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
              <p className="font-medium">{payment.client_name || 'Walk-in Customer'}</p>
              {payment.client_email && (
                <p className="text-sm text-muted-foreground">{payment.client_email}</p>
              )}
            </div>
          </div>
          
          <Separator />
          
          {/* Amount Breakdown */}
          <div className="space-y-2">
            <h4 className="font-medium">Payment Breakdown</h4>
            
            {servicesTotal > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Services</span>
                <span>{formatCurrency(servicesTotal)}</span>
              </div>
            )}
            
            {productsTotal > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Products</span>
                <span>{formatCurrency(productsTotal)}</span>
              </div>
            )}
            
            {discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  Discount
                  {payment.discount_code && (
                    <span className="text-xs">({payment.discount_code})</span>
                  )}
                </span>
                <span className="text-green-600">-{formatCurrency(discount)}</span>
              </div>
            )}
            
            {giftCardAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Gift className="h-3 w-3" />
                  Gift Card
                </span>
                <span className="text-green-600">-{formatCurrency(giftCardAmount)}</span>
              </div>
            )}
            
            {tip > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tip</span>
                <span>{formatCurrency(tip)}</span>
              </div>
            )}
            
            <Separator />
            
            <div className="flex justify-between font-medium">
              <span>Total Paid</span>
              <span className="text-lg">{formatCurrency(total)}</span>
            </div>
            
            {payment.status === 'refunded' && payment.refunded_amount && (
              <div className="flex justify-between text-sm text-red-600">
                <span>Refunded</span>
                <span>-{formatCurrency(payment.refunded_amount)}</span>
              </div>
            )}
          </div>
          
          {/* Stripe Info */}
          {payment.stripe_payment_intent_id && (
            <>
              <Separator />
              <div className="text-sm">
                <p className="text-muted-foreground">Stripe Payment Intent</p>
                <p className="font-mono text-xs break-all">
                  {payment.stripe_payment_intent_id}
                </p>
              </div>
            </>
          )}
          
          {/* Actions */}
          <Separator />
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1">
              <Printer className="h-4 w-4 mr-2" />
              Print Receipt
            </Button>
            <Button variant="outline" className="flex-1">
              <Mail className="h-4 w-4 mr-2" />
              Email Receipt
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
