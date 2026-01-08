'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, addYears } from 'date-fns';
import { RefreshCw, Calendar as CalendarIcon } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';

import { useCreateGiftCard, generateGiftCardCode } from '@/hooks/use-gift-cards';

var giftCardSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  initial_value: z.coerce.number().min(1, 'Value must be at least $1'),
  recipient_name: z.string().optional(),
  recipient_email: z.string().email().optional().or(z.literal('')),
  message: z.string().optional(),
  expires_at: z.date().optional().nullable(),
  send_email: z.boolean(),
});

var VALUE_PRESETS = [25, 50, 75, 100, 150, 200];

export function GiftCardForm({ open, onOpenChange, salonId, onSuccess }) {
  var { toast } = useToast();
  var createGiftCard = useCreateGiftCard();
  
  var form = useForm({
    resolver: zodResolver(giftCardSchema),
    defaultValues: {
      code: generateGiftCardCode(),
      initial_value: 50,
      recipient_name: '',
      recipient_email: '',
      message: '',
      expires_at: addYears(new Date(), 1),
      send_email: false,
    },
  });
  
  function handleGenerateCode() {
    var code = generateGiftCardCode();
    form.setValue('code', code);
  }
  
  function onSubmit(data) {
    var payload = {
      ...data,
      salon_id: salonId,
      balance: data.initial_value,
      expires_at: data.expires_at ? format(data.expires_at, 'yyyy-MM-dd') : null,
    };
    
    createGiftCard.mutate(payload, {
      onSuccess: function() {
        toast({ title: 'Gift card created' });
        form.reset({
          code: generateGiftCardCode(),
          initial_value: 50,
          recipient_name: '',
          recipient_email: '',
          message: '',
          expires_at: addYears(new Date(), 1),
          send_email: false,
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
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Gift Card</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Code */}
            <FormField
              control={form.control}
              name="code"
              render={function({ field }) {
                return (
                  <FormItem>
                    <FormLabel>Gift Card Code</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input 
                          {...field} 
                          className="font-mono"
                          readOnly
                        />
                      </FormControl>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="icon"
                        onClick={handleGenerateCode}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
            
            {/* Value */}
            <FormField
              control={form.control}
              name="initial_value"
              render={function({ field }) {
                return (
                  <FormItem>
                    <FormLabel>Value</FormLabel>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {VALUE_PRESETS.map(function(value) {
                          return (
                            <Button
                              key={value}
                              type="button"
                              variant={field.value === value ? 'default' : 'outline'}
                              size="sm"
                              onClick={function() { field.onChange(value); }}
                            >
                              ${value}
                            </Button>
                          );
                        })}
                      </div>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            $
                          </span>
                          <Input 
                            type="number" 
                            min="1" 
                            step="1"
                            {...field} 
                            className="pl-8"
                          />
                        </div>
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
            
            {/* Expiry */}
            <FormField
              control={form.control}
              name="expires_at"
              render={function({ field }) {
                return (
                  <FormItem>
                    <FormLabel>Expiration Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className="w-full justify-start font-normal"
                          >
                            <CalendarIcon className="h-4 w-4 mr-2" />
                            {field.value ? format(field.value, 'MMM d, yyyy') : 'No expiry'}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={function(date) { return date < new Date(); }}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      Leave empty for no expiration
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
            
            {/* Recipient Name */}
            <FormField
              control={form.control}
              name="recipient_name"
              render={function({ field }) {
                return (
                  <FormItem>
                    <FormLabel>Recipient Name (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., John Doe" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
            
            {/* Recipient Email */}
            <FormField
              control={form.control}
              name="recipient_email"
              render={function({ field }) {
                return (
                  <FormItem>
                    <FormLabel>Recipient Email (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="recipient@email.com" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
            
            {/* Message */}
            <FormField
              control={form.control}
              name="message"
              render={function({ field }) {
                return (
                  <FormItem>
                    <FormLabel>Personal Message (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Add a personal message..."
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
            
            {/* Send Email */}
            <FormField
              control={form.control}
              name="send_email"
              render={function({ field }) {
                var email = form.watch('recipient_email');
                return (
                  <FormItem className="flex items-start gap-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={!email}
                      />
                    </FormControl>
                    <div>
                      <FormLabel>Send gift card via email</FormLabel>
                      <FormDescription>
                        {email 
                          ? 'Gift card will be emailed to the recipient'
                          : 'Enter recipient email to enable'}
                      </FormDescription>
                    </div>
                  </FormItem>
                );
              }}
            />
            
            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1"
                onClick={function() { onOpenChange(false); }}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={createGiftCard.isPending}>
                {createGiftCard.isPending ? 'Creating...' : 'Create Gift Card'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
