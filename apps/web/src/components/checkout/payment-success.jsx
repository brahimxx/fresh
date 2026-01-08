'use client';

import { CheckCircle, Printer, Mail } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';

import { formatCurrency } from '@/hooks/use-payments';

export function PaymentSuccessDialog({ 
  open, 
  amount,
  onComplete 
}) {
  return (
    <Dialog open={open} onOpenChange={function() {}}>
      <DialogContent className="max-w-sm text-center" hideClose>
        <div className="py-6 space-y-6">
          <div className="flex justify-center">
            <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
          </div>
          
          <div>
            <h2 className="text-2xl font-bold text-green-600">Payment Successful!</h2>
            <p className="text-3xl font-bold mt-2">{formatCurrency(amount)}</p>
          </div>
          
          <div className="flex justify-center gap-2">
            <Button variant="outline" size="sm">
              <Printer className="h-4 w-4 mr-1" />
              Print Receipt
            </Button>
            <Button variant="outline" size="sm">
              <Mail className="h-4 w-4 mr-1" />
              Email Receipt
            </Button>
          </div>
          
          <Button className="w-full" onClick={onComplete}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
