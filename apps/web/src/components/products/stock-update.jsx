'use client';

import { useState, useEffect } from 'react';
import { Loader2, Plus, Minus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useUpdateProductStock } from '@/hooks/use-products';

export function StockUpdateDialog({ 
  open, 
  onOpenChange, 
  product 
}) {
  var [mode, setMode] = useState('set');
  var [quantity, setQuantity] = useState(0);
  var updateStock = useUpdateProductStock();
  
  useEffect(function() {
    if (open && product) {
      setMode('set');
      setQuantity(product.stock_quantity || 0);
    }
  }, [open, product]);
  
  function handleSubmit() {
    if (!product) return;
    
    var newQuantity = quantity;
    if (mode === 'add') {
      newQuantity = (product.stock_quantity || 0) + quantity;
    } else if (mode === 'subtract') {
      newQuantity = Math.max(0, (product.stock_quantity || 0) - quantity);
    }
    
    updateStock.mutate(
      { id: product.id, quantity: newQuantity },
      {
        onSuccess: function() {
          onOpenChange(false);
        },
      }
    );
  }
  
  function incrementQuantity() {
    setQuantity(function(q) { return q + 1; });
  }
  
  function decrementQuantity() {
    setQuantity(function(q) { return Math.max(0, q - 1); });
  }
  
  if (!product) return null;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Update Stock</DialogTitle>
          <DialogDescription>
            {product.name}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="text-center text-sm text-muted-foreground">
            Current stock: <span className="font-medium text-foreground">{product.stock_quantity}</span>
          </div>
          
          <div className="space-y-2">
            <Label>Update Mode</Label>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="set">Set to exact amount</SelectItem>
                <SelectItem value="add">Add to stock</SelectItem>
                <SelectItem value="subtract">Subtract from stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>
              {mode === 'set' ? 'New Quantity' : mode === 'add' ? 'Add Amount' : 'Subtract Amount'}
            </Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={decrementQuantity}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                type="number"
                min="0"
                value={quantity}
                onChange={function(e) { setQuantity(Math.max(0, parseInt(e.target.value) || 0)); }}
                className="text-center"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={incrementQuantity}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {mode !== 'set' && (
            <div className="text-center text-sm">
              New stock will be: <span className="font-medium">
                {mode === 'add' 
                  ? (product.stock_quantity || 0) + quantity
                  : Math.max(0, (product.stock_quantity || 0) - quantity)
                }
              </span>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={function() { onOpenChange(false); }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={updateStock.isPending}
          >
            {updateStock.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Update Stock
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
