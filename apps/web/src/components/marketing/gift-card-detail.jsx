'use client';

import { format } from 'date-fns';
import { Gift, User, Calendar, DollarSign, Mail, Copy, Printer } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

import { GIFT_CARD_STATUSES, getGiftCardStatus, formatCurrency } from '@/hooks/use-gift-cards';

export function GiftCardDetail({ open, onOpenChange, giftCard }) {
  var { toast } = useToast();
  
  if (!giftCard) return null;
  
  var status = getGiftCardStatus(giftCard);
  var statusConfig = GIFT_CARD_STATUSES[status];
  
  function handleCopyCode() {
    navigator.clipboard.writeText(giftCard.code);
    toast({
      title: 'Copied!',
      description: 'Gift card code copied to clipboard',
    });
  }
  
  var usedAmount = Number(giftCard.initial_value) - Number(giftCard.balance);
  var usagePercentage = (usedAmount / Number(giftCard.initial_value)) * 100;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Gift Card Details</span>
            <Badge variant="outline" className={statusConfig.color}>
              {statusConfig.label}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Code */}
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-6 text-white text-center">
            <Gift className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm opacity-80 mb-1">Gift Card Code</p>
            <div className="flex items-center justify-center gap-2">
              <code className="text-xl font-mono font-bold tracking-wider">
                {giftCard.code}
              </code>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-white hover:bg-white/20"
                onClick={handleCopyCode}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Balance */}
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-1">Current Balance</p>
            <p className="text-4xl font-bold">{formatCurrency(giftCard.balance)}</p>
            {usedAmount > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                {formatCurrency(usedAmount)} used of {formatCurrency(giftCard.initial_value)}
              </p>
            )}
            
            {/* Progress Bar */}
            <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 transition-all"
                style={{ width: (100 - usagePercentage) + '%' }}
              />
            </div>
          </div>
          
          <Separator />
          
          {/* Details */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Original Value
              </span>
              <span className="font-medium">{formatCurrency(giftCard.initial_value)}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Created
              </span>
              <span className="font-medium">
                {format(new Date(giftCard.created_at), 'MMM d, yyyy')}
              </span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Expires
              </span>
              <span className="font-medium">
                {giftCard.expires_at 
                  ? format(new Date(giftCard.expires_at), 'MMM d, yyyy')
                  : 'Never'}
              </span>
            </div>
          </div>
          
          {/* Recipient */}
          {(giftCard.recipient_name || giftCard.recipient_email) && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Recipient
                </h4>
                {giftCard.recipient_name && (
                  <p className="text-sm">{giftCard.recipient_name}</p>
                )}
                {giftCard.recipient_email && (
                  <p className="text-sm text-muted-foreground">{giftCard.recipient_email}</p>
                )}
              </div>
            </>
          )}
          
          {/* Message */}
          {giftCard.message && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium mb-2">Message</h4>
                <p className="text-sm text-muted-foreground italic">
                  &quot;{giftCard.message}&quot;
                </p>
              </div>
            </>
          )}
          
          <Separator />
          
          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            {giftCard.recipient_email && (
              <Button variant="outline" className="flex-1">
                <Mail className="h-4 w-4 mr-2" />
                Resend Email
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
