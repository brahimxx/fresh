'use client';

import { useState } from 'react';
import { Mail, MessageSquare, Send } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';

import { useNotifyWaitlist } from '@/hooks/use-waitlist';

export function NotifyDialog({ open, onOpenChange, entry, onSuccess }) {
  var { toast } = useToast();
  var notifyWaitlist = useNotifyWaitlist();
  
  var [method, setMethod] = useState('email');
  var [message, setMessage] = useState(
    'Great news! An appointment slot has become available for the service you requested. ' +
    'Please contact us or visit our booking page to secure your spot.'
  );
  
  function handleNotify() {
    if (!entry) return;
    
    notifyWaitlist.mutate({
      waitlistId: entry.id,
      data: {
        method: method,
        message: message,
      },
    }, {
      onSuccess: function() {
        toast({ 
          title: 'Client notified',
          description: method === 'email' ? 'Email sent successfully' : 'SMS sent successfully',
        });
        onSuccess && onSuccess();
      },
      onError: function(error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      },
    });
  }
  
  if (!entry) return null;
  
  var hasEmail = !!entry.client_email;
  var hasPhone = !!entry.client_phone;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Notify Client</DialogTitle>
          <DialogDescription>
            Send a notification to {entry.client_name} about available slots.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Notification Method */}
          <div className="space-y-2">
            <Label>Notification Method</Label>
            <RadioGroup value={method} onValueChange={setMethod}>
              <div className="flex gap-4">
                <div 
                  className={
                    'flex-1 border rounded-lg p-4 cursor-pointer transition-colors ' +
                    (method === 'email' ? 'border-primary bg-primary/5' : '') +
                    (!hasEmail ? ' opacity-50 cursor-not-allowed' : '')
                  }
                  onClick={function() { if (hasEmail) setMethod('email'); }}
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="email" id="email" disabled={!hasEmail} />
                    <Mail className="h-4 w-4" />
                    <Label htmlFor="email" className="cursor-pointer">Email</Label>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {hasEmail ? entry.client_email : 'No email available'}
                  </p>
                </div>
                <div 
                  className={
                    'flex-1 border rounded-lg p-4 cursor-pointer transition-colors ' +
                    (method === 'sms' ? 'border-primary bg-primary/5' : '') +
                    (!hasPhone ? ' opacity-50 cursor-not-allowed' : '')
                  }
                  onClick={function() { if (hasPhone) setMethod('sms'); }}
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="sms" id="sms" disabled={!hasPhone} />
                    <MessageSquare className="h-4 w-4" />
                    <Label htmlFor="sms" className="cursor-pointer">SMS</Label>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {hasPhone ? entry.client_phone : 'No phone available'}
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>
          
          {/* Service Info */}
          {entry.service_name && (
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-sm">
                <span className="text-muted-foreground">Requested service: </span>
                <span className="font-medium">{entry.service_name}</span>
              </p>
              {entry.preferred_date && (
                <p className="text-sm mt-1">
                  <span className="text-muted-foreground">Preferred date: </span>
                  <span className="font-medium">
                    {new Date(entry.preferred_date).toLocaleDateString()}
                  </span>
                </p>
              )}
            </div>
          )}
          
          {/* Message */}
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              value={message}
              onChange={function(e) { setMessage(e.target.value); }}
              rows={4}
              placeholder="Enter your notification message..."
            />
            {method === 'sms' && (
              <p className="text-sm text-muted-foreground">
                {message.length}/160 characters
              </p>
            )}
          </div>
          
          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={function() { onOpenChange(false); }}
            >
              Cancel
            </Button>
            <Button 
              className="flex-1"
              onClick={handleNotify}
              disabled={notifyWaitlist.isPending || (!hasEmail && method === 'email') || (!hasPhone && method === 'sms')}
            >
              {notifyWaitlist.isPending ? (
                'Sending...'
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Notification
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
