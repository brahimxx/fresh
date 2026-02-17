'use client';

import { useState } from 'react';
import { use } from 'react';
import { 
  Plus, 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  Package,
  AlertTriangle,
  Search,
  Filter
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { useProducts, useDeleteProduct, PRODUCT_CATEGORIES, getStockStatus } from '@/hooks/use-products';
import { formatCurrency } from '@/hooks/use-payments';
import { ProductFormDialog } from '@/components/products/product-form';
import { StockUpdateDialog } from '@/components/products/stock-update';

export default function ProductsPage({ params }) {
  var resolvedParams = use(params);
  var salonId = resolvedParams.salonId;
  
  var [searchQuery, setSearchQuery] = useState('');
  var [categoryFilter, setCategoryFilter] = useState('all');
  var [stockFilter, setStockFilter] = useState('all');
  var [productFormOpen, setProductFormOpen] = useState(false);
  var [stockUpdateOpen, setStockUpdateOpen] = useState(false);
  var [editProduct, setEditProduct] = useState(null);
  var [stockProduct, setStockProduct] = useState(null);
  var [deleteProduct, setDeleteProduct] = useState(null);
  
  var { data: products, isLoading } = useProducts(salonId);
  var deleteProductMutation = useDeleteProduct();
  
  // Filter products
  var filteredProducts = products || [];
  
  if (searchQuery) {
    var query = searchQuery.toLowerCase();
    filteredProducts = filteredProducts.filter(function(p) {
      return (p.name && p.name.toLowerCase().includes(query)) ||
             (p.sku && p.sku.toLowerCase().includes(query)) ||
             (p.brand && p.brand.toLowerCase().includes(query));
    });
  }
  
  if (categoryFilter !== 'all') {
    filteredProducts = filteredProducts.filter(function(p) {
      return p.category === categoryFilter;
    });
  }
  
  if (stockFilter === 'low') {
    filteredProducts = filteredProducts.filter(function(p) {
      return p.stock_quantity <= (p.low_stock_threshold || 5) && p.stock_quantity > 0;
    });
  } else if (stockFilter === 'out') {
    filteredProducts = filteredProducts.filter(function(p) {
      return p.stock_quantity === 0;
    });
  }
  
  function getCategoryLabel(value) {
    var found = PRODUCT_CATEGORIES.find(function(c) { return c.value === value; });
    return found ? found.label : value;
  }
  
  function handleAddProduct() {
    setEditProduct(null);
    setProductFormOpen(true);
  }
  
  function handleEditProduct(product) {
    setEditProduct(product);
    setProductFormOpen(true);
  }
  
  function handleUpdateStock(product) {
    setStockProduct(product);
    setStockUpdateOpen(true);
  }
  
  function handleDeleteConfirm() {
    if (!deleteProduct) return;
    
    deleteProductMutation.mutate(deleteProduct.id, {
      onSuccess: function() { setDeleteProduct(null); },
    });
  }
  
  // Calculate stats
  var totalProducts = products?.length || 0;
  var lowStockCount = products?.filter(function(p) { 
    return p.stock_quantity <= (p.low_stock_threshold || 5) && p.stock_quantity > 0; 
  }).length || 0;
  var outOfStockCount = products?.filter(function(p) { return p.stock_quantity === 0; }).length || 0;
  var totalValue = products?.reduce(function(sum, p) { 
    return sum + (Number(p.price || 0) * Number(p.stock_quantity || 0)); 
  }, 0) || 0;
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-muted-foreground">
            Manage your product inventory
          </p>
        </div>
        <Button onClick={handleAddProduct}>
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Products</p>
          <p className="text-2xl font-bold">{totalProducts}</p>
        </div>
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Low Stock</p>
            {lowStockCount > 0 && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
          </div>
          <p className="text-2xl font-bold">{lowStockCount}</p>
        </div>
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Out of Stock</p>
            {outOfStockCount > 0 && <AlertTriangle className="h-4 w-4 text-red-500" />}
          </div>
          <p className="text-2xl font-bold">{outOfStockCount}</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Inventory Value</p>
          <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
        </div>
      </div>
      
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={function(e) { setSearchQuery(e.target.value); }}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {PRODUCT_CATEGORIES.map(function(cat) {
              return (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <Select value={stockFilter} onValueChange={setStockFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Stock" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stock</SelectItem>
            <SelectItem value="low">Low Stock</SelectItem>
            <SelectItem value="out">Out of Stock</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Products Table */}
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : filteredProducts.length > 0 ? (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-center">Stock</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map(function(product) {
                var stockStatus = getStockStatus(product.stock_quantity, product.low_stock_threshold);
                
                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        {product.brand && (
                          <p className="text-sm text-muted-foreground">{product.brand}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getCategoryLabel(product.category)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {product.sku || '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(product.price)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className={
                          stockStatus.status === 'out' ? 'text-red-600 font-medium' :
                          stockStatus.status === 'low' ? 'text-yellow-600 font-medium' :
                          ''
                        }>
                          {product.stock_quantity}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={function() { handleUpdateStock(product); }}
                        >
                          Update
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={function() { handleEditProduct(product); }}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={function() { handleUpdateStock(product); }}>
                            <Package className="h-4 w-4 mr-2" />
                            Update Stock
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={function() { setDeleteProduct(product); }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="border rounded-lg p-12 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">
            {searchQuery || categoryFilter !== 'all' || stockFilter !== 'all'
              ? 'No products match your filters'
              : 'No products yet'}
          </p>
          {!searchQuery && categoryFilter === 'all' && stockFilter === 'all' && (
            <Button onClick={handleAddProduct}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Product
            </Button>
          )}
        </div>
      )}
      
      {/* Product Form Dialog */}
      <ProductFormDialog
        open={productFormOpen}
        onOpenChange={setProductFormOpen}
        product={editProduct}
        salonId={salonId}
      />
      
      {/* Stock Update Dialog */}
      <StockUpdateDialog
        open={stockUpdateOpen}
        onOpenChange={setStockUpdateOpen}
        product={stockProduct}
      />
      
      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteProduct} onOpenChange={function(open) { if (!open) setDeleteProduct(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{deleteProduct?.name}&quot;. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
