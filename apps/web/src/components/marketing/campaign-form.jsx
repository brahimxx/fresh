'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, MessageSquare } from 'lucide-react';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

import { 
  useCreateCampaign, 
  useUpdateCampaign, 
  CAMPAIGN_TYPES,
  AUDIENCE_TYPES 
} from '@/hooks/use-campaigns';

var campaignSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['email', 'sms']),
  subject: z.string().optional(),
  message: z.string().min(1, 'Message is required'),
  audience_type: z.string().min(1, 'Please select an audience'),
});

export function CampaignForm({ open, onOpenChange, salonId, campaign, onSuccess }) {
  var { toast } = useToast();
  var createCampaign = useCreateCampaign();
  var updateCampaign = useUpdateCampaign();
  
  var isEditing = !!campaign;
  
  var form = useForm({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: '',
      type: 'email',
      subject: '',
      message: '',
      audience_type: 'all',
    },
  });
  
  var campaignType = form.watch('type');
  
  // Reset form when campaign changes
  useEffect(function() {
    if (campaign) {
      form.reset({
        name: campaign.name || '',
        type: campaign.type || 'email',
        subject: campaign.subject || '',
        message: campaign.message || '',
        audience_type: campaign.audience_type || 'all',
      });
    } else {
      form.reset({
        name: '',
        type: 'email',
        subject: '',
        message: '',
        audience_type: 'all',
      });
    }
  }, [campaign, form]);
  
  function onSubmit(data) {
    var payload = {
      ...data,
      salon_id: salonId,
      status: 'draft',
    };
    
    if (isEditing) {
      updateCampaign.mutate({
        campaignId: campaign.id,
        data: payload,
      }, {
        onSuccess: function() {
          toast({ title: 'Campaign updated' });
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
    } else {
      createCampaign.mutate(payload, {
        onSuccess: function() {
          toast({ title: 'Campaign created' });
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
  }
  
  var isPending = createCampaign.isPending || updateCampaign.isPending;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Campaign' : 'Create Campaign'}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4 pb-4">
                {/* Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={function({ field }) {
                    return (
                      <FormItem>
                        <FormLabel>Campaign Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Summer Promotion" />
                        </FormControl>
                        <FormDescription>
                          Internal name for this campaign
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
                
                {/* Type */}
                <FormField
                  control={form.control}
                  name="type"
                  render={function({ field }) {
                    return (
                      <FormItem>
                        <FormLabel>Campaign Type</FormLabel>
                        <div className="grid grid-cols-2 gap-4">
                          <div
                            className={
                              'border rounded-lg p-4 cursor-pointer transition-colors ' +
                              (field.value === 'email' ? 'border-primary bg-primary/5' : 'hover:bg-muted')
                            }
                            onClick={function() { field.onChange('email'); }}
                          >
                            <Mail className={
                              'h-6 w-6 mb-2 ' +
                              (field.value === 'email' ? 'text-primary' : 'text-muted-foreground')
                            } />
                            <p className="font-medium">Email</p>
                            <p className="text-sm text-muted-foreground">
                              Rich HTML content
                            </p>
                          </div>
                          <div
                            className={
                              'border rounded-lg p-4 cursor-pointer transition-colors ' +
                              (field.value === 'sms' ? 'border-primary bg-primary/5' : 'hover:bg-muted')
                            }
                            onClick={function() { field.onChange('sms'); }}
                          >
                            <MessageSquare className={
                              'h-6 w-6 mb-2 ' +
                              (field.value === 'sms' ? 'text-primary' : 'text-muted-foreground')
                            } />
                            <p className="font-medium">SMS</p>
                            <p className="text-sm text-muted-foreground">
                              Text messages
                            </p>
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
                
                {/* Subject (Email only) */}
                {campaignType === 'email' && (
                  <FormField
                    control={form.control}
                    name="subject"
                    render={function({ field }) {
                      return (
                        <FormItem>
                          <FormLabel>Subject Line</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Don't miss our summer deals!" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                )}
                
                {/* Audience */}
                <FormField
                  control={form.control}
                  name="audience_type"
                  render={function({ field }) {
                    return (
                      <FormItem>
                        <FormLabel>Target Audience</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select audience" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {AUDIENCE_TYPES.map(function(audience) {
                              return (
                                <SelectItem key={audience.value} value={audience.value}>
                                  {audience.label}
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
                
                {/* Message */}
                <FormField
                  control={form.control}
                  name="message"
                  render={function({ field }) {
                    return (
                      <FormItem>
                        <FormLabel>
                          {campaignType === 'email' ? 'Email Body' : 'SMS Message'}
                        </FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder={
                              campaignType === 'email' 
                                ? 'Write your email content...'
                                : 'Write your SMS message (max 160 characters)...'
                            }
                            rows={campaignType === 'email' ? 8 : 4}
                          />
                        </FormControl>
                        {campaignType === 'sms' && (
                          <FormDescription>
                            {field.value?.length || 0}/160 characters
                          </FormDescription>
                        )}
                        <FormDescription>
                          Use placeholders: {'{{first_name}}'}, {'{{salon_name}}'}, {'{{booking_link}}'}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </div>
            </ScrollArea>
            
            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1"
                onClick={function() { onOpenChange(false); }}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={isPending}>
                {isPending ? 'Saving...' : isEditing ? 'Update' : 'Save as Draft'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
