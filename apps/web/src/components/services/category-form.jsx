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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

import { useCreateCategory, useUpdateCategory } from '@/hooks/use-services';

var categorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  description: z.string().optional(),
});

export function CategoryFormDialog({ 
  open, 
  onOpenChange, 
  category, 
  salonId 
}) {
  var createCategory = useCreateCategory();
  var updateCategory = useUpdateCategory();
  var isEditing = !!category;
  
  var form = useForm({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });
  
  // Reset form when dialog opens/closes or category changes
  useEffect(function() {
    if (open) {
      if (category) {
        form.reset({
          name: category.name || '',
          description: category.description || '',
        });
      } else {
        form.reset({
          name: '',
          description: '',
        });
      }
    }
  }, [open, category, form]);
  
  function onSubmit(data) {
    var payload = {
      ...data,
      salon_id: salonId,
    };
    
    if (isEditing) {
      updateCategory.mutate(
        { id: category.id, data: payload },
        {
          onSuccess: function() {
            onOpenChange(false);
            form.reset();
          },
        }
      );
    } else {
      createCategory.mutate(payload, {
        onSuccess: function() {
          onOpenChange(false);
          form.reset();
        },
      });
    }
  }
  
  var isSubmitting = createCategory.isPending || updateCategory.isPending;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Category' : 'Create Category'}
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
                    <FormLabel>Category Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Hair Styling" {...field} />
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
                        placeholder="Optional description for this category..." 
                        rows={2}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
            
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
                {isEditing ? 'Save Changes' : 'Create Category'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
