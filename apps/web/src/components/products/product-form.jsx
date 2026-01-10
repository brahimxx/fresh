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

import { useCreateProduct, useUpdateProduct, PRODUCT_CATEGORIES } from '@/hooks/use-products';

var productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  brand: z.string().optional(),
  sku: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  price: z.coerce.number().min(0, 'Price must be 0 or more'),
  cost_price: z.coerce.number().min(0).optional(),
  stock_quantity: z.coerce.number().min(0, 'Stock must be 0 or more'),
  low_stock_threshold: z.coerce.number().min(0).optional(),
});

export function ProductFormDialog({ 
  open, 
  onOpenChange, 
  product, 
  salonId 
}) {
  var createProduct = useCreateProduct();
  var updateProduct = useUpdateProduct();
  var isEditing = !!product;
  
  var form = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      brand: '',
      sku: '',
      category: '',
      price: 0,
      cost_price: 0,
      stock_quantity: 0,
      low_stock_threshold: 5,
    },
  });
  
  useEffect(function() {
    if (open) {
      if (product) {
        form.reset({
          name: product.name || '',
          description: product.description || '',
          brand: product.brand || '',
          sku: product.sku || '',
          category: product.category || product.category_id || '',
          price: product.price || 0,
          cost_price: product.cost_price || product.costPrice || 0,
          stock_quantity: product.stock_quantity || product.stockQuantity || 0,
          low_stock_threshold: product.low_stock_threshold || product.lowStockThreshold || 5,
        });
      } else {
        form.reset({
          name: '',
          description: '',
          brand: '',
          sku: '',
          category: '',
          price: 0,
          cost_price: 0,
          stock_quantity: 0,
          low_stock_threshold: 5,
        });
      }
    }
  }, [open, product]);
  
  function onSubmit(data) {
    var payload = {
      ...data,
      salon_id: salonId,
    };
    
    if (isEditing) {
      updateProduct.mutate(
        { id: product.id, data: payload },
        {
          onSuccess: function() {
            onOpenChange(false);
            form.reset();
          },
        }
      );
    } else {
      createProduct.mutate(payload, {
        onSuccess: function() {
          onOpenChange(false);
          form.reset();
        },
      });
    }
  }
  
  var isSubmitting = createProduct.isPending || updateProduct.isPending;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Product' : 'Add Product'}
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
                    <FormLabel>Product Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Shampoo Pro 250ml" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="brand"
                render={function({ field }) {
                  return (
                    <FormItem>
                      <FormLabel>Brand</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., L'Oréal" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              
              <FormField
                control={form.control}
                name="sku"
                render={function({ field }) {
                  return (
                    <FormItem>
                      <FormLabel>SKU</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., SHP-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>
            
            <FormField
              control={form.control}
              name="category"
              render={function({ field }) {
                return (
                  <FormItem>
                    <FormLabel>Category *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PRODUCT_CATEGORIES.map(function(cat) {
                          return (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
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
              name="description"
              render={function({ field }) {
                return (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Product description..." 
                        rows={2}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={function({ field }) {
                  return (
                    <FormItem>
                      <FormLabel>Selling Price (EUR) *</FormLabel>
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
              
              <FormField
                control={form.control}
                name="cost_price"
                render={function({ field }) {
                  return (
                    <FormItem>
                      <FormLabel>Cost Price (EUR)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          min="0"
                          placeholder="0.00" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        For profit tracking
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="stock_quantity"
                render={function({ field }) {
                  return (
                    <FormItem>
                      <FormLabel>Stock Quantity *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0"
                          placeholder="0" 
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
                name="low_stock_threshold"
                render={function({ field }) {
                  return (
                    <FormItem>
                      <FormLabel>Low Stock Alert</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0"
                          placeholder="5" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Alert when stock falls below
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
                {isEditing ? 'Save Changes' : 'Add Product'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
