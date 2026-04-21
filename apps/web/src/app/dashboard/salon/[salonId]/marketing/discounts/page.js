"use client";

import { useState, use } from 'react';
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
  MoreHorizontal,
  Calendar,
  Ticket
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TableSkeleton } from '@/components/ui/loading-skeletons';
import { DataError } from '@/components/ui/data-error';
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
  const resolvedParams = use(params);
  const salonId = resolvedParams.salonId;
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState(null);
  const [deleteDiscount, setDeleteDiscount] = useState(null);

  const { data: discounts, isLoading, error, refetch } = useDiscounts(salonId, {
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });

  const deleteDiscountMutation = useDeleteDiscount(salonId);
  const toggleDiscount = useToggleDiscount(salonId);

  const filteredDiscounts = Object.values(discounts || {}).filter((discount) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (discount.code && discount.code.toLowerCase().includes(q)) ||
      (discount.name && discount.name.toLowerCase().includes(q))
    );
  });

  const activeCount = Object.values(discounts || {}).filter(
    (d) => getDiscountStatus(d) === 'active'
  ).length;

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    toast({ title: 'Code copied to clipboard' });
  };

  const handleEdit = (discount) => {
    setEditingDiscount(discount);
    setShowForm(true);
  };

  const handleToggle = (discount) => {
    const currentStatus = discount.isActive !== undefined ? discount.isActive : discount.is_active;
    const newStatus = !currentStatus;
    toggleDiscount.mutate(
      { discountId: discount.id, isActive: newStatus },
      {
        onSuccess: () => {
          toast({ title: newStatus ? 'Promo activated' : 'Promo deactivated' });
        },
      }
    );
  };

  const handleDelete = () => {
    if (!deleteDiscount) return;
    deleteDiscountMutation.mutate(deleteDiscount.id, {
      onSuccess: () => {
        toast({ title: 'Discount deleted' });
        setDeleteDiscount(null);
      },
    });
  };

  const getStatusBadge = (discount) => {
    const status = getDiscountStatus(discount);
    const config = DISCOUNT_STATUSES[status];
    return (
      <Badge variant="outline" className={config.color}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Discounts & Promos</h1>
          <p className="text-muted-foreground mt-1">
            Create coupon codes to share with your clients.
          </p>
        </div>
        <Button
          onClick={() => {
            setShowForm(true);
            setEditingDiscount(null);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Discount
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Discounts</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.values(discounts || {}).length}</div>
            <p className="text-xs text-muted-foreground mt-1">Total created promos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Now</CardTitle>
            <Ticket className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently redeemable codes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usage Limit</CardTitle>
            <ToggleRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Configurable</div>
            <p className="text-xs text-muted-foreground mt-1">Applies per individual</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border shadow-sm">
        {error ? (
          <div className="p-6">
            <DataError
              title="Failed to load discounts"
              message="Unable to fetch your promos. Please try again."
              onRetry={refetch}
              error={error}
            />
          </div>
        ) : (
          <>
            <div className="p-4 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b">
              <Tabs
                value={statusFilter}
                onValueChange={(val) => setStatusFilter(val)}
                className="w-full sm:w-auto"
              >
                <TabsList className="w-full sm:w-auto h-auto p-1 grid grid-cols-4 sm:flex">
                  <TabsTrigger value="all" className="text-xs sm:text-sm">All</TabsTrigger>
                  <TabsTrigger value="active" className="text-xs sm:text-sm">Active</TabsTrigger>
                  <TabsTrigger value="inactive" className="text-xs sm:text-sm">Inactive</TabsTrigger>
                  <TabsTrigger value="expired" className="text-xs sm:text-sm">Expired</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search codes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="p-6">
                  <TableSkeleton rows={4} columns={6} />
                </div>
              ) : filteredDiscounts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-6">Code & Title</TableHead>
                      <TableHead>Discount Value</TableHead>
                      <TableHead>Valid Dates</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right pr-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDiscounts.map((discount) => {
                      const isActive = discount.isActive !== undefined ? discount.isActive : discount.is_active;
                      return (
                        <TableRow key={discount.id} className="group">
                          <TableCell className="pl-6">
                            <div className="flex flex-col gap-1 items-start">
                              <div className="flex items-center gap-2">
                                <code className="bg-muted px-2 py-1 rounded font-mono text-sm font-semibold tracking-wider text-primary">
                                  {discount.code}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => handleCopyCode(discount.code)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                              {discount.name && (
                                <p className="text-sm font-medium text-muted-foreground mt-0.5">
                                  {discount.name}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 font-medium">
                              {discount.type === "percentage" ? (
                                <>
                                  <Percent className="h-4 w-4 text-blue-500" />
                                  <span>{discount.value}% OFF</span>
                                </>
                              ) : (
                                <>
                                  <DollarSign className="h-4 w-4 text-green-500" />
                                  <span>€{Number(discount.value).toFixed(2)} OFF</span>
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-sm">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              <span>
                                {discount.startDate || discount.start_date
                                  ? format(
                                      new Date(discount.startDate || discount.start_date),
                                      "MMM d, yyyy"
                                    )
                                  : "Always"}
                              </span>
                              {(discount.endDate || discount.end_date) && (
                                <>
                                  <span className="text-muted-foreground">-</span>
                                  <span>
                                    {format(
                                      new Date(discount.endDate || discount.end_date),
                                      "MMM d, yyyy"
                                    )}
                                  </span>
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={!!isActive}
                              onCheckedChange={() => handleToggle(discount)}
                              disabled={toggleDiscount.isPending}
                            />
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(discount)}
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Open menu</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-[160px]">
                                <DropdownMenuItem onClick={() => handleEdit(discount)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Discount
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setDeleteDiscount(discount)}
                                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
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
              ) : (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <div className="bg-muted/50 p-4 rounded-full mb-4">
                    <Tag className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold">No discounts found</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                    You haven&apos;t created any promotional codes yet. Add a discount to start attracting more bookings.
                  </p>
                  <Button
                    className="mt-6"
                    onClick={() => {
                      setShowForm(true);
                      setEditingDiscount(null);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Discount
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </Card>

      {/* Forms & Dialogs */}
      {showForm && (
        <DiscountForm
          salonId={salonId}
          discount={editingDiscount}
          onClose={() => {
            setShowForm(false);
            setEditingDiscount(null);
          }}
        />
      )}

      <AlertDialog
        open={!!deleteDiscount}
        onOpenChange={(open) => !open && setDeleteDiscount(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Discount</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the discount code{' '}
              <strong className="font-mono text-foreground">
                {deleteDiscount?.code}
              </strong>
              ? This action cannot be undone, and clients will no longer be able to use it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleteDiscountMutation.isPending}
            >
              {deleteDiscountMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
