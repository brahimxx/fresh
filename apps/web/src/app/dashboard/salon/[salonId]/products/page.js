'use client';

import { useState } from 'react';
import { RequirePermission } from '@/components/layout/require-permission';
import { use } from 'react';
import { 
  Plus, 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  Package,
  AlertTriangle,
  Search,
  Filter,
  Boxes,
  Tag,
  DollarSign,
  ShoppingCart
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
import { useDiscounts } from '@/hooks/use-discounts';
import { formatCurrency } from '@/hooks/use-payments';
import { ProductFormDialog } from '@/components/products/product-form';
import { StockUpdateDialog } from '@/components/products/stock-update';
import { useSalon } from '@/providers/salon-provider';
import { cn } from '@/lib/utils';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
};

export default function ProductsPage({ params }) {
  return (
    <RequirePermission page="products">
      <ProductsContent params={params} />
    </RequirePermission>
  );
}

function ProductsContent({ params }) {
  var resolvedParams = use(params);
  var salonId = resolvedParams.salonId;
  var { salon } = useSalon();
  var currency = salon?.currency || 'EUR';
  
  var [searchQuery, setSearchQuery] = useState('');
  var [categoryFilter, setCategoryFilter] = useState('all');
  var [stockFilter, setStockFilter] = useState('all');
  var [productFormOpen, setProductFormOpen] = useState(false);
  var [stockUpdateOpen, setStockUpdateOpen] = useState(false);
  var [editProduct, setEditProduct] = useState(null);
  var [stockProduct, setStockProduct] = useState(null);
  var [deleteProduct, setDeleteProduct] = useState(null);
  
  var { data: products, isLoading } = useProducts(salonId);
  var { data: discounts } = useDiscounts(salonId, { status: 'active' });
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
      return p.stockQuantity <= (p.lowStockThreshold || 5) && p.stockQuantity > 0;
    });
  } else if (stockFilter === 'out') {
    filteredProducts = filteredProducts.filter(function(p) {
      return p.stockQuantity === 0;
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
    return p.stockQuantity <= (p.lowStockThreshold || 5) && p.stockQuantity > 0; 
  }).length || 0;
  var outOfStockCount = products?.filter(function(p) { return p.stockQuantity === 0; }).length || 0;
  var totalValue = products?.reduce(function(sum, p) { 
    return sum + (Number(p.price || 0) * Number(p.stockQuantity || 0)); 
  }, 0) || 0;
  
  function getDiscountedPrice(product) {
    if (!discounts || discounts.length === 0) return null;
    var bestPrice = null;
    var basePrice = Number(product.price);
    var productId = Number(product.id);

    for (var i = 0; i < discounts.length; i++) {
      var discount = discounts[i];
      // Check if this discount applies to products at all
      if (!Number(discount.appliesToProducts) && !Number(discount.applies_to_products)) continue;
      
      // Check if this discount is restricted to specific products
      var specificProducts = discount.specificProducts || discount.specific_products || [];
      if (specificProducts.length > 0) {
        var found = false;
        for (var j = 0; j < specificProducts.length; j++) {
          if (Number(specificProducts[j]) === productId) {
            found = true;
            break;
          }
        }
        if (!found) continue;
      }

      var newPrice;
      if (discount.type === 'percentage') {
        var amountOff = basePrice * (Number(discount.value) / 100);
        if (discount.maxDiscount && amountOff > Number(discount.maxDiscount)) {
          amountOff = Number(discount.maxDiscount);
        }
        newPrice = basePrice - amountOff;
      } else {
        newPrice = Math.max(0, basePrice - Number(discount.value));
      }

      if (bestPrice === null || newPrice < bestPrice) {
        bestPrice = newPrice;
      }
    }
    return bestPrice;
  }
  
  return (
    <div className="space-y-8">
      {/* Decorative Hero */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-8 sm:p-10 flex flex-col md:flex-row md:items-end justify-between gap-6 group"
      >
        <div className="absolute top-0 right-10 p-8 opacity-5 pointer-events-none transition-transform duration-1000 group-hover:scale-125 group-hover:rotate-12 translate-y-[-20%]">
          <Boxes className="w-64 h-64 text-primary" strokeWidth={1} />
        </div>
        
        <div className="relative z-10 flex flex-col gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-background/80 backdrop-blur-md border border-primary/20 text-xs font-semibold text-primary w-fit">
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Retail & Stock</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight max-w-2xl">
            Inventory System
          </h1>
          <p className="text-muted-foreground text-lg font-medium max-w-xl">
            Track product levels, monitor retail value, and define your POS catalog.
          </p>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row gap-3 shrink-0">
           <Button
            variant="outline"
            className="flex-1 sm:flex-none h-12 px-6 rounded-xl border-border/50 bg-background/50 backdrop-blur-md hover:bg-background shadow-sm text-[15px]"
          >
            <Filter className="h-5 w-5 mr-2 text-muted-foreground" />
             Stock Reports
          </Button>
          <Button
            className="flex-1 sm:flex-none h-12 px-6 rounded-xl shadow-md text-[15px]"
            onClick={handleAddProduct}
          >
            <Plus className="h-5 w-5 mr-2" />
            New Product
          </Button>
        </div>
      </motion.div>

      {/* Analytics Row */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <motion.div variants={itemVariants} className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm overflow-hidden relative group hover:bg-background transition-colors duration-500">
          <div className="absolute -right-6 -top-6 text-primary/5 transition-transform duration-700 group-hover:scale-125 group-hover:-rotate-12 pointer-events-none">
            <Package className="w-32 h-32" strokeWidth={1} />
          </div>
          <div className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
             <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Products</h3>
             <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Package className="h-4 w-4 text-primary" />
             </div>
          </div>
          <div className="relative z-10 mt-2">
            <p className="text-3xl font-extrabold tracking-tight">{totalProducts}</p>
            <p className="text-xs font-semibold text-muted-foreground mt-1">Active variants</p>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm overflow-hidden relative group hover:bg-background transition-colors duration-500">
           <div className={`absolute -right-6 -top-6 transition-transform duration-700 group-hover:scale-125 group-hover:rotate-12 pointer-events-none ${lowStockCount > 0 ? "text-yellow-500/5" : "text-emerald-500/5"}`}>
            <AlertTriangle className="w-32 h-32" strokeWidth={1} />
          </div>
          <div className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
             <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Low Stock</h3>
             <div className={`w-10 h-10 rounded-full flex items-center justify-center ${lowStockCount > 0 ? "bg-yellow-500/10" : "bg-emerald-500/10"}`}>
                <AlertTriangle className={`h-4 w-4 ${lowStockCount > 0 ? "text-yellow-500" : "text-emerald-500"}`} />
             </div>
          </div>
          <div className="relative z-10 mt-2">
            <p className="text-3xl font-extrabold tracking-tight">{lowStockCount}</p>
            <p className="text-xs font-semibold text-muted-foreground mt-1">Approaching limit</p>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm overflow-hidden relative group hover:bg-background transition-colors duration-500">
           <div className={`absolute -right-6 -top-6 transition-transform duration-700 group-hover:scale-125 group-hover:-rotate-12 pointer-events-none ${outOfStockCount > 0 ? "text-red-500/5" : "text-emerald-500/5"}`}>
            <AlertTriangle className="w-32 h-32" strokeWidth={1} />
          </div>
          <div className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
             <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Out of Stock</h3>
             <div className={`w-10 h-10 rounded-full flex items-center justify-center ${outOfStockCount > 0 ? "bg-red-500/10" : "bg-emerald-500/10"}`}>
                <AlertTriangle className={`h-4 w-4 ${outOfStockCount > 0 ? "text-red-500" : "text-emerald-500"}`} />
             </div>
          </div>
          <div className="relative z-10 mt-2">
            <p className="text-3xl font-extrabold tracking-tight">{outOfStockCount}</p>
            <p className="text-xs font-semibold text-muted-foreground mt-1">Empty inventory</p>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm overflow-hidden relative group hover:bg-background transition-colors duration-500">
          <div className="absolute -right-6 -top-6 text-emerald-500/5 transition-transform duration-700 group-hover:scale-125 group-hover:-rotate-12 pointer-events-none">
            <DollarSign className="w-32 h-32" strokeWidth={1} />
          </div>
          <div className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
             <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Inventory Value</h3>
             <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-emerald-500" />
             </div>
          </div>
          <div className="relative z-10 mt-2">
            <p className="text-3xl font-extrabold tracking-tight text-foreground">{formatCurrency(totalValue, currency)}</p>
            <p className="text-xs font-semibold text-muted-foreground mt-1">Total projected</p>
          </div>
        </motion.div>
      </motion.div>
      
      {/* Products Matrix */}
      <motion.div variants={itemVariants} initial="hidden" animate="show" className="bg-background/60 backdrop-blur-xl rounded-3xl border border-border/50 shadow-sm overflow-hidden flex flex-col">
        {/* Filter Bar */}
        <div className="p-5 sm:px-8 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/5">
           <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
            <Input
              placeholder="Search catalog, scan SKU or brand..."
              value={searchQuery}
              onChange={function(e) { setSearchQuery(e.target.value); }}
              className="pl-10 h-11 bg-background rounded-xl border-border/50 focus-visible:ring-primary/50 shadow-sm font-medium"
            />
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-44 h-11 bg-background rounded-xl border-border/50 shadow-sm font-semibold text-[13px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/50 shadow-lg">
                <SelectItem value="all" className="font-medium rounded-lg">All Categories</SelectItem>
                {PRODUCT_CATEGORIES.map(function(cat) {
                  return (
                    <SelectItem key={cat.value} value={cat.value} className="font-medium rounded-lg">
                      {cat.label}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger className="w-full sm:w-40 h-11 bg-background rounded-xl border-border/50 shadow-sm font-semibold text-[13px]">
                <SelectValue placeholder="Stock" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/50 shadow-lg">
                <SelectItem value="all" className="font-medium rounded-lg">All Stock</SelectItem>
                <SelectItem value="low" className="font-medium text-yellow-600 rounded-lg">Low Stock</SelectItem>
                <SelectItem value="out" className="font-medium text-red-600 rounded-lg">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table Area */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 space-y-4">
              <Skeleton className="h-16 w-full rounded-2xl" />
              <Skeleton className="h-16 w-full rounded-2xl" />
              <Skeleton className="h-16 w-full rounded-2xl" />
            </div>
          ) : filteredProducts.length > 0 ? (
            <Table className="px-4">
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border/50 [&_th]:h-14">
                  <TableHead className="pl-8 text-xs font-bold uppercase tracking-wider text-muted-foreground w-[350px]">Product Profile</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Category</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Logistics (SKU)</TableHead>
                  <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">Retail Price</TableHead>
                  <TableHead className="text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">Unit Stock</TableHead>
                  <TableHead className="w-[80px] pr-8 text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {filteredProducts.map(function(product, i) {
                    var stockStatus = getStockStatus(product.stockQuantity, product.lowStockThreshold);
                    
                    return (
                      <motion.tr 
                        key={product.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="group hover:bg-muted/5 border-border/50 transition-colors [&_td]:py-5"
                      >
                        <TableCell className="pl-8 align-top">
                          <div className="flex items-start gap-4">
                             <div className="h-12 w-12 rounded-2xl bg-muted/40 border border-border/50 shadow-sm flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                                <Package className="h-5 w-5" />
                              </div>
                            <div>
                              <p className="font-extrabold text-[15px] leading-tight text-foreground group-hover:text-primary transition-colors">{product.name}</p>
                              {product.brand ? (
                                <p className="text-[13px] font-semibold text-muted-foreground mt-1">{product.brand}</p>
                              ) : (
                                <p className="text-[13px] font-medium text-muted-foreground/40 italic mt-1">Generic</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="mt-1">
                             <Badge variant="secondary" className="bg-primary/5 text-primary font-bold uppercase tracking-wider text-[10px] px-2.5 py-0.5 border-primary/10">
                              {getCategoryLabel(product.category)}
                             </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="text-[13px] font-bold font-mono text-muted-foreground mt-1">
                            {product.sku || (
                               <span className="italic opacity-50 font-sans font-medium">Unassigned</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right align-top">
                          <div className="mt-1">
                            {(() => {
                              const discountedPrice = getDiscountedPrice(product);
                              if (discountedPrice !== null && discountedPrice < Number(product.price)) {
                                return (
                                  <div className="flex flex-col items-end">
                                    <span className="text-xs font-semibold text-muted-foreground line-through decoration-destructive/60">{formatCurrency(product.price, currency)}</span>
                                    <span className="text-[15px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md mt-0.5">{formatCurrency(discountedPrice, currency)}</span>
                                  </div>
                                );
                              }
                              return (
                                 <span className="font-extrabold text-[15px]">
                                  {formatCurrency(product.price, currency)}
                                 </span>
                              );
                            })()}
                          </div>
                        </TableCell>
                        <TableCell className="text-center align-top">
                           <div className="flex items-center justify-center gap-3 mt-1">
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "font-extrabold text-[13px] px-3 py-1 rounded-lg border-0",
                                  stockStatus.status === 'out' ? 'bg-red-500/10 text-red-600 dark:text-red-400' :
                                  stockStatus.status === 'low' ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' :
                                  'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                )}
                              >
                                {product.stockQuantity}
                              </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2.5 rounded-lg text-xs font-bold text-muted-foreground hover:bg-muted/80 shadow-sm border border-transparent shadow-none hover:shadow-sm hover:border-border/50 hover:text-foreground opacity-50 group-hover:opacity-100 transition-all"
                              onClick={function() { handleUpdateStock(product); }}
                            >
                              Log
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-right align-top pr-8">
                           <div className="mt-1 inline-flex">
                             <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  className="h-9 w-9 p-0 rounded-xl bg-muted/30 hover:bg-muted text-muted-foreground opacity-50 group-hover:opacity-100 transition-all data-[state=open]:opacity-100 focus:ring-0"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-[180px] rounded-2xl">
                                <DropdownMenuItem onClick={function() { handleEditProduct(product); }} className="font-medium gap-2">
                                  <Pencil className="h-4 w-4 text-primary" />
                                  Edit Dimensions
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={function() { handleUpdateStock(product); }} className="font-medium gap-2">
                                  <Package className="h-4 w-4" />
                                  Log Shipment
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="font-medium gap-2 text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                                  onClick={function() { setDeleteProduct(product); }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delist Entry
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                           </div>
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </TableBody>
            </Table>
          ) : (
             <div className="p-16 flex flex-col items-center justify-center text-center">
              <div className="h-24 w-24 bg-muted/30 rounded-full flex items-center justify-center mb-6">
                 <Package className="h-10 w-10 text-muted-foreground opacity-50" />
              </div>
              <p className="text-xl font-bold tracking-tight mb-2">
                {searchQuery || categoryFilter !== 'all' || stockFilter !== 'all'
                  ? 'Zero Matrix Results'
                  : 'Empty Inventory'}
              </p>
              <p className="text-muted-foreground font-medium max-w-sm mb-6">
                {searchQuery || categoryFilter !== 'all' || stockFilter !== 'all'
                  ? 'No retail items matched your query constraints. Try widening your parameters.'
                  : 'Start cataloging your warehouse levels to maintain inventory accuracy.'}
              </p>
              {!searchQuery && categoryFilter === 'all' && stockFilter === 'all' && (
                <Button size="lg" className="rounded-xl font-bold shadow-md h-12" onClick={handleAddProduct}>
                  <Plus className="h-4 w-4 mr-2" />
                  Log First Item
                </Button>
              )}
            </div>
          )}
        </div>
      </motion.div>
      
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
         <AlertDialogContent className="shadow-2xl border-border/50 rounded-3xl max-w-md">
          <AlertDialogHeader>
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6 text-red-600 dark:text-red-500" />
            </div>
            <AlertDialogTitle className="text-2xl font-bold text-red-600 dark:text-red-500">
              Delist Product?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[15px] font-medium text-foreground tracking-tight leading-relaxed">
              Are you sure you want to permanently erase <strong>&quot;{deleteProduct?.name}&quot;</strong> from your catalog?
              <br/>
              <br/>
              <span className="text-muted-foreground text-[13px] mt-2 block">
                This will destroy historical inventory tracking. This action cannot be reversed.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-2 sm:gap-0">
             <AlertDialogCancel className="rounded-xl h-11 font-bold">Abort</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600 rounded-xl h-11 font-bold shadow-md"
            >
              Confirm Delisting
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
