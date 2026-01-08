'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useProcessRefund, formatCurrency } from '@/hooks/use-payments';

var REFUND_REASONS = [
  { value: 'customer_request', label: 'Customer Request' },
  { value: 'service_issue', label: 'Service Issue' },
  { value: 'product_issue', label: 'Product Issue' },
  { value: 'duplicate_charge', label: 'Duplicate Charge' },
  { value: 'fraud', label: 'Fraudulent Transaction' },
  { value: 'other', label: 'Other' },
];

export function RefundDialog({ open, onOpenChange, payment, onSuccess }) {
  var [refundType, setRefundType] = useState('full');
  var [refundAmount, setRefundAmount] = useState('');
  var [reason, setReason] = useState('');
  var [notes, setNotes] = useState('');
  
  var processRefund = useProcessRefund();
  
  if (!payment) return null;
  
  var maxRefundAmount = Number(payment.amount) - Number(payment.refunded_amount || 0);
  
  function handleRefund() {
    var amount = refundType === 'full' ? maxRefundAmount : Number(refundAmount);
    
    if (amount <= 0 || amount > maxRefundAmount) {
      return;
    }
    
    processRefund.mutate({
      paymentId: payment.id,
      amount: amount,
      reason: reason,
      notes: notes,
    }, {
      onSuccess: function() {
        setRefundType('full');
        setRefundAmount('');
        setReason('');
        setNotes('');
        onSuccess && onSuccess();
      }
    });
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Process Refund
          </DialogTitle>
          <DialogDescription>
            Issue a refund for payment #{payment.id}. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Payment Summary */}
          <div className="bg-muted rounded-lg p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Original Amount</span>
              <span className="font-medium">{formatCurrency(payment.amount)}</span>
            </div>
            {payment.refunded_amount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Already Refunded</span>
                <span>-{formatCurrency(payment.refunded_amount)}</span>
              </div>
            )}
            <div className="flex justify-between font-medium pt-1 border-t">
              <span>Available to Refund</span>
              <span>{formatCurrency(maxRefundAmount)}</span>
            </div>
          </div>
          
          {/* Refund Type */}
          <div className="space-y-2">
            <Label>Refund Amount</Label>
            <Select value={refundType} onValueChange={setRefundType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">
                  Full Refund ({formatCurrency(maxRefundAmount)})
                </SelectItem>
                <SelectItem value="partial">Partial Refund</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Partial Amount Input */}
          {refundType === 'partial' && (
            <div className="space-y-2">
              <Label>Amount to Refund</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={maxRefundAmount}
                  value={refundAmount}
                  onChange={function(e) { setRefundAmount(e.target.value); }}
                  className="pl-7"
                  placeholder="0.00"
                />
              </div>
              {Number(refundAmount) > maxRefundAmount && (
                <p className="text-sm text-red-600">
                  Amount exceeds maximum refundable amount
                </p>
              )}
            </div>
          )}
          
          {/* Reason */}
          <div className="space-y-2">
            <Label>Reason for Refund</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {REFUND_REASONS.map(function(r) {
                  return (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          
          {/* Notes */}
          <div className="space-y-2">
            <Label>Additional Notes (Optional)</Label>
            <Textarea
              value={notes}
              onChange={function(e) { setNotes(e.target.value); }}
              placeholder="Add any additional details about this refund..."
              rows={3}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={function() { onOpenChange(false); }}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleRefund}
            disabled={
              processRefund.isPending || 
              !reason ||
              (refundType === 'partial' && (!refundAmount || Number(refundAmount) <= 0 || Number(refundAmount) > maxRefundAmount))
            }
          >
            {processRefund.isPending ? 'Processing...' : 'Process Refund'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
