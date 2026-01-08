'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useCreateService, useUpdateService } from '@/hooks/use-services';

var serviceSchema = z.object({
  name: z.string().min(1, 'Service name is required'),
  description: z.string().optional(),
  duration: z.coerce.number().min(5, 'Duration must be at least 5 minutes'),
  price: z.coerce.number().min(0, 'Price must be 0 or more'),
  category_id: z.string().optional(),
  buffer_before: z.coerce.number().min(0).optional(),
  buffer_after: z.coerce.number().min(0).optional(),
});

var DURATION_OPTIONS = [
  { value: '15', label: '15 min' },
  { value: '30', label: '30 min' },
  { value: '45', label: '45 min' },
  { value: '60', label: '1 hour' },
  { value: '75', label: '1h 15min' },
  { value: '90', label: '1h 30min' },
  { value: '120', label: '2 hours' },
  { value: '150', label: '2h 30min' },
  { value: '180', label: '3 hours' },
];

export function ServiceFormDialog({ 
  open, 
  onOpenChange, 
  service, 
  categoryId,
  salonId,
  categories 
}) {
  var createService = useCreateService();
  var updateService = useUpdateService();
  var isEditing = !!service;
  
  var form = useForm({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: '',
      description: '',
      duration: 60,
      price: 0,
      category_id: '',
      buffer_before: 0,
      buffer_after: 0,
    },
  });
  
  // Reset form when dialog opens/closes or service changes
  useEffect(function() {
    if (open) {
      if (service) {
        form.reset({
          name: service.name || '',
          description: service.description || '',
          duration: service.duration || 60,
          price: service.price || 0,
          category_id: service.category_id ? String(service.category_id) : '',
          buffer_before: service.buffer_before || 0,
          buffer_after: service.buffer_after || 0,
        });
      } else {
        form.reset({
          name: '',
          description: '',
          duration: 60,
          price: 0,
          category_id: categoryId ? String(categoryId) : '',
          buffer_before: 0,
          buffer_after: 0,
        });
      }
    }
  }, [open, service, categoryId, form]);
  
  function onSubmit(data) {
    var payload = {
      ...data,
      salon_id: salonId,
      category_id: data.category_id ? Number(data.category_id) : null,
    };
    
    if (isEditing) {
      updateService.mutate(
        { id: service.id, data: payload },
        {
          onSuccess: function() {
            onOpenChange(false);
            form.reset();
          },
        }
      );
    } else {
      createService.mutate(payload, {
        onSuccess: function() {
          onOpenChange(false);
          form.reset();
        },
      });
    }
  }
  
  var isSubmitting = createService.isPending || updateService.isPending;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Service' : 'Add Service'}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={function({ field }) {
                return (
                  <FormItem>
                    <FormLabel>Service Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Women's Haircut" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={function({ field }) {
                return (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Brief description of the service..." 
                        rows={2}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
            
            <FormField
              control={form.control}
              name="category_id"
              render={function({ field }) {
                return (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select 
                      value={field.value} 
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">No Category</SelectItem>
                        {categories.map(function(cat) {
                          return (
                            <SelectItem key={cat.id} value={String(cat.id)}>
                              {cat.name}
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
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="duration"
                render={function({ field }) {
                  return (
                    <FormItem>
                      <FormLabel>Duration *</FormLabel>
                      <Select 
                        value={String(field.value)} 
                        onValueChange={function(v) { field.onChange(Number(v)); }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {DURATION_OPTIONS.map(function(opt) {
                            return (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
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
              
              <FormField
                control={form.control}
                name="price"
                render={function({ field }) {
                  return (
                    <FormItem>
                      <FormLabel>Price (EUR) *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          min="0"
                          placeholder="0.00" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="buffer_before"
                render={function({ field }) {
                  return (
                    <FormItem>
                      <FormLabel>Buffer Before (min)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          step="5"
                          placeholder="0" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Prep time before
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              
              <FormField
                control={form.control}
                name="buffer_after"
                render={function({ field }) {
                  return (
                    <FormItem>
                      <FormLabel>Buffer After (min)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          step="5"
                          placeholder="0" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Cleanup time after
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={function() { onOpenChange(false); }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEditing ? 'Save Changes' : 'Add Service'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
