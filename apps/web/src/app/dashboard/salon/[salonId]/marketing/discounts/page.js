'use client';

import { useState } from 'react';
import { use } from 'react';
import { format } from 'date-fns';
import { 
  Plus,
  Search,
  Tag,
  Percent,
  DollarSign,
  Copy,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Calendar
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { useToast } from '@/hooks/use-toast';

import { 
  useDiscounts, 
  useDeleteDiscount, 
  useToggleDiscount,
  DISCOUNT_STATUSES,
  getDiscountStatus 
} from '@/hooks/use-discounts';
import { DiscountForm } from '@/components/marketing/discount-form';

export default function DiscountsPage({ params }) {
  var resolvedParams = use(params);
  var salonId = resolvedParams.salonId;
  var { toast } = useToast();
  
  var [searchQuery, setSearchQuery] = useState('');
  var [statusFilter, setStatusFilter] = useState('all');
  var [showForm, setShowForm] = useState(false);
  var [editingDiscount, setEditingDiscount] = useState(null);
  var [deleteDiscount, setDeleteDiscount] = useState(null);
  
  var { data: discounts, isLoading } = useDiscounts(salonId, {
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });
  var deleteDiscountMutation = useDeleteDiscount();
  var toggleDiscount = useToggleDiscount();
  
  // Filter by search
  var filteredDiscounts = discounts || [];
  if (searchQuery) {
    var query = searchQuery.toLowerCase();
    filteredDiscounts = filteredDiscounts.filter(function(d) {
      return d.code.toLowerCase().includes(query) ||
             (d.name && d.name.toLowerCase().includes(query));
    });
  }
  
  // Stats
  var activeCount = (discounts || []).filter(function(d) {
    return getDiscountStatus(d) === 'active';
  }).length;
  
  var totalUsage = (discounts || []).reduce(function(sum, d) {
    return sum + Number(d.times_used || 0);
  }, 0);
  
  function handleCopyCode(code) {
    navigator.clipboard.writeText(code);
    toast({
      title: 'Copied!',
      description: 'Discount code copied to clipboard',
    });
  }
  
  function handleToggle(discount) {
    var newStatus = !discount.is_active;
    toggleDiscount.mutate({
      discountId: discount.id,
      isActive: newStatus,
    }, {
      onSuccess: function() {
        toast({
          title: newStatus ? 'Discount activated' : 'Discount deactivated',
        });
      },
    });
  }
  
  function handleDelete() {
    if (!deleteDiscount) return;
    
    deleteDiscountMutation.mutate(deleteDiscount.id, {
      onSuccess: function() {
        toast({ title: 'Discount deleted' });
        setDeleteDiscount(null);
      },
    });
  }
  
  function getStatusBadge(discount) {
    var status = getDiscountStatus(discount);
    var config = DISCOUNT_STATUSES[status];
    return (
      <Badge variant="outline" className={config.color}>
        {config.label}
      </Badge>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Discount Codes</h1>
          <p className="text-muted-foreground">
            Create and manage promotional discounts
          </p>
        </div>
        <Button onClick={function() { setShowForm(true); setEditingDiscount(null); }}>
          <Plus className="h-4 w-4 mr-2" />
          Create Discount
        </Button>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Tag className="h-4 w-4" />
            <span className="text-sm">Total Discounts</span>
          </div>
          <p className="text-2xl font-bold">{(discounts || []).length}</p>
        </div>
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <ToggleRight className="h-4 w-4" />
            <span className="text-sm">Active</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{activeCount}</p>
        </div>
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Percent className="h-4 w-4" />
            <span className="text-sm">Total Uses</span>
          </div>
          <p className="text-2xl font-bold">{totalUsage}</p>
        </div>
      </div>
      
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by code or name..."
            value={searchQuery}
            onChange={function(e) { setSearchQuery(e.target.value); }}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : filteredDiscounts.length > 0 ? (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Valid Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDiscounts.map(function(discount) {
                return (
                  <TableRow key={discount.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="bg-muted px-2 py-1 rounded font-mono text-sm">
                          {discount.code}
                        </code>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6"
                          onClick={function() { handleCopyCode(discount.code); }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      {discount.name && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {discount.name}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {discount.type === 'percentage' ? (
                          <>
                            <Percent className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{discount.value}%</span>
                          </>
                        ) : (
                          <>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">${discount.value}</span>
                          </>
                        )}
                      </div>
                      {discount.min_purchase > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Min: ${discount.min_purchase}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <span>{discount.times_used || 0}</span>
                      {discount.max_uses && (
                        <span className="text-muted-foreground"> / {discount.max_uses}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {discount.start_date || discount.end_date ? (
                        <div className="text-sm">
                          {discount.start_date && (
                            <p>{format(new Date(discount.start_date), 'MMM d, yyyy')}</p>
                          )}
                          {discount.end_date && (
                            <p className="text-muted-foreground">
                              to {format(new Date(discount.end_date), 'MMM d, yyyy')}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No expiry</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(discount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Switch
                          checked={discount.is_active}
                          onCheckedChange={function() { handleToggle(discount); }}
                        />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={function() { 
                              setEditingDiscount(discount); 
                              setShowForm(true); 
                            }}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={function() { handleCopyCode(discount.code); }}>
                              <Copy className="h-4 w-4 mr-2" />
                              Copy Code
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={function() { setDeleteDiscount(discount); }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="border rounded-lg p-12 text-center">
          <Tag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium mb-1">No discount codes</h3>
          <p className="text-muted-foreground mb-4">
            Create your first discount code to attract customers
          </p>
          <Button onClick={function() { setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Create Discount
          </Button>
        </div>
      )}
      
      {/* Form Dialog */}
      <DiscountForm
        open={showForm}
        onOpenChange={setShowForm}
        salonId={salonId}
        discount={editingDiscount}
        onSuccess={function() { setShowForm(false); setEditingDiscount(null); }}
      />
      
      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDiscount} onOpenChange={function(open) { if (!open) setDeleteDiscount(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Discount</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the discount code "{deleteDiscount?.code}"? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
