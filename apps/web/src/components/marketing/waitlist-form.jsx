'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

import { useAddToWaitlist, PRIORITY_LEVELS } from '@/hooks/use-waitlist';
import { useServices } from '@/hooks/use-services';
import { useClients } from '@/hooks/use-clients';

var waitlistSchema = z.object({
  client_id: z.string().optional(),
  client_name: z.string().min(1, 'Client name is required'),
  client_email: z.string().email('Invalid email').optional().or(z.literal('')),
  client_phone: z.string().optional(),
  service_id: z.string().optional(),
  preferred_date: z.string().optional(),
  preferred_time: z.string().optional(),
  priority: z.string().default('normal'),
  notes: z.string().optional(),
});

export function WaitlistForm({ open, onOpenChange, salonId, onSuccess }) {
  var { toast } = useToast();
  var addToWaitlist = useAddToWaitlist();
  var { data: services } = useServices(salonId);
  var { data: clients } = useClients(salonId);
  
  var form = useForm({
    resolver: zodResolver(waitlistSchema),
    defaultValues: {
      client_id: '',
      client_name: '',
      client_email: '',
      client_phone: '',
      service_id: '',
      preferred_date: '',
      preferred_time: '',
      priority: 'normal',
      notes: '',
    },
  });
  
  // Reset form when dialog opens
  useEffect(function() {
    if (open) {
      form.reset({
        client_id: '',
        client_name: '',
        client_email: '',
        client_phone: '',
        service_id: '',
        preferred_date: '',
        preferred_time: '',
        priority: 'normal',
        notes: '',
      });
    }
  }, [open, form]);
  
  // Auto-fill client details when selecting existing client
  var clientId = form.watch('client_id');
  useEffect(function() {
    if (clientId && clients) {
      var client = clients.find(function(c) { return c.id === clientId; });
      if (client) {
        form.setValue('client_name', client.name || '');
        form.setValue('client_email', client.email || '');
        form.setValue('client_phone', client.phone || '');
      }
    }
  }, [clientId, clients, form]);
  
  function onSubmit(data) {
    var payload = {
      ...data,
      salon_id: salonId,
      status: 'waiting',
    };
    
    // Combine date and time if both provided
    if (data.preferred_date && data.preferred_time) {
      payload.preferred_date = data.preferred_date + 'T' + data.preferred_time;
    }
    
    addToWaitlist.mutate(payload, {
      onSuccess: function() {
        toast({ title: 'Added to waitlist' });
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
          <DialogTitle>Add to Waitlist</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Existing Client */}
            {clients && clients.length > 0 && (
              <FormField
                control={form.control}
                name="client_id"
                render={function({ field }) {
                  return (
                    <FormItem>
                      <FormLabel>Existing Client (optional)</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a client or enter new" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">New Client</SelectItem>
                          {clients.map(function(client) {
                            return (
                              <SelectItem key={client.id} value={client.id}>
                                {client.name}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            )}
            
            {/* Client Name */}
            <FormField
              control={form.control}
              name="client_name"
              render={function({ field }) {
                return (
                  <FormItem>
                    <FormLabel>Client Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="John Doe" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
            
            {/* Contact Info */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="client_email"
                render={function({ field }) {
                  return (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="email@example.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              <FormField
                control={form.control}
                name="client_phone"
                render={function({ field }) {
                  return (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="+1 234 567 8900" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>
            
            {/* Service */}
            <FormField
              control={form.control}
              name="service_id"
              render={function({ field }) {
                return (
                  <FormItem>
                    <FormLabel>Requested Service</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a service" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Any Service</SelectItem>
                        {(services || []).map(function(service) {
                          return (
                            <SelectItem key={service.id} value={service.id}>
                              {service.name}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
            
            {/* Preferred Date/Time */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="preferred_date"
                render={function({ field }) {
                  return (
                    <FormItem>
                      <FormLabel>Preferred Date</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              <FormField
                control={form.control}
                name="preferred_time"
                render={function({ field }) {
                  return (
                    <FormItem>
                      <FormLabel>Preferred Time</FormLabel>
                      <FormControl>
                        <Input {...field} type="time" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>
            
            {/* Priority */}
            <FormField
              control={form.control}
              name="priority"
              render={function({ field }) {
                return (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PRIORITY_LEVELS.map(function(level) {
                          return (
                            <SelectItem key={level.value} value={level.value}>
                              {level.label}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
            
            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={function({ field }) {
                return (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Any special requests or notes..."
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
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
              <Button type="submit" className="flex-1" disabled={addToWaitlist.isPending}>
                {addToWaitlist.isPending ? 'Adding...' : 'Add to Waitlist'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
