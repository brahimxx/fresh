'use client';

import { useState } from 'react';
import { Search, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { formatCurrency } from '@/hooks/use-payments';
import { PRODUCT_CATEGORIES } from '@/hooks/use-products';

export function AddProductDialog({ 
  open, 
  onOpenChange, 
  products,
  onAdd 
}) {
  var [searchQuery, setSearchQuery] = useState('');
  
  var filteredProducts = products.filter(function(product) {
    if (!searchQuery) return true;
    var query = searchQuery.toLowerCase();
    return (product.name && product.name.toLowerCase().includes(query)) ||
           (product.brand && product.brand.toLowerCase().includes(query)) ||
           (product.sku && product.sku.toLowerCase().includes(query));
  });
  
  // Only show products with stock
  var availableProducts = filteredProducts.filter(function(p) {
    return p.stock_quantity > 0;
  });
  
  function getCategoryLabel(value) {
    var found = PRODUCT_CATEGORIES.find(function(c) { return c.value === value; });
    return found ? found.label : value;
  }
  
  function handleAdd(product) {
    onAdd(product);
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Add Product</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={function(e) { setSearchQuery(e.target.value); }}
              className="pl-9"
            />
          </div>
          
          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {availableProducts.length > 0 ? (
              availableProducts.map(function(product) {
                return (
                  <div 
                    key={product.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 cursor-pointer"
                    onClick={function() { handleAdd(product); }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {product.brand ? product.brand + ' • ' : ''}
                        {getCategoryLabel(product.category)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(product.price)}</p>
                        <p className="text-xs text-muted-foreground">
                          {product.stock_quantity} in stock
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? 'No products match your search' : 'No products available'}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
