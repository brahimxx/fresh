'use client';

import { useState } from 'react';
import { use } from 'react';
import { 
  Plus,
  Search,
  Package,
  Edit,
  Trash2,
  Users,
  DollarSign,
  Percent,
  MoreVertical
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
  usePackages, 
  useDeletePackage,
  useUpdatePackage,
  PACKAGE_STATUSES,
  formatCurrency,
  calculateSavings 
} from '@/hooks/use-packages';
import { PackageForm } from '@/components/marketing/package-form';

export default function PackagesPage({ params }) {
  var resolvedParams = use(params);
  var salonId = resolvedParams.salonId;
  var { toast } = useToast();
  
  var [searchQuery, setSearchQuery] = useState('');
  var [showForm, setShowForm] = useState(false);
  var [editingPackage, setEditingPackage] = useState(null);
  var [deletePackage, setDeletePackage] = useState(null);
  
  var { data: packages, isLoading } = usePackages(salonId);
  var deletePackageMutation = useDeletePackage();
  var updatePackage = useUpdatePackage();
  
  // Filter by search
  var filteredPackages = packages || [];
  if (searchQuery) {
    var query = searchQuery.toLowerCase();
    filteredPackages = filteredPackages.filter(function(p) {
      return p.name.toLowerCase().includes(query);
    });
  }
  
  // Stats
  var activeCount = (packages || []).filter(function(p) {
    return p.is_active;
  }).length;
  
  var totalSold = (packages || []).reduce(function(sum, p) {
    return sum + Number(p.times_sold || 0);
  }, 0);
  
  var totalRevenue = (packages || []).reduce(function(sum, p) {
    return sum + (Number(p.price || 0) * Number(p.times_sold || 0));
  }, 0);
  
  function handleToggle(pkg) {
    updatePackage.mutate({
      packageId: pkg.id,
      data: { is_active: !pkg.is_active },
    }, {
      onSuccess: function() {
        toast({
          title: pkg.is_active ? 'Package deactivated' : 'Package activated',
        });
      },
    });
  }
  
  function handleDelete() {
    if (!deletePackage) return;
    
    deletePackageMutation.mutate(deletePackage.id, {
      onSuccess: function() {
        toast({ title: 'Package deleted' });
        setDeletePackage(null);
      },
    });
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Service Packages</h1>
          <p className="text-muted-foreground">
            Create bundled service packages with special pricing
          </p>
        </div>
        <Button onClick={function() { setShowForm(true); setEditingPackage(null); }}>
          <Plus className="h-4 w-4 mr-2" />
          Create Package
        </Button>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Package className="h-4 w-4" />
            <span className="text-sm">Total Packages</span>
          </div>
          <p className="text-2xl font-bold">{(packages || []).length}</p>
        </div>
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Package className="h-4 w-4" />
            <span className="text-sm">Active</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{activeCount}</p>
        </div>
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Users className="h-4 w-4" />
            <span className="text-sm">Total Sold</span>
          </div>
          <p className="text-2xl font-bold">{totalSold}</p>
        </div>
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <DollarSign className="h-4 w-4" />
            <span className="text-sm">Revenue</span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
        </div>
      </div>
      
      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search packages..."
          value={searchQuery}
          onChange={function(e) { setSearchQuery(e.target.value); }}
          className="pl-9"
        />
      </div>
      
      {/* Packages Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      ) : filteredPackages.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPackages.map(function(pkg) {
            var savings = calculateSavings(pkg);
            
            return (
              <Card key={pkg.id} className={!pkg.is_active ? 'opacity-60' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{pkg.name}</CardTitle>
                      {pkg.description && (
                        <CardDescription className="mt-1 line-clamp-2">
                          {pkg.description}
                        </CardDescription>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={function() { 
                          setEditingPackage(pkg); 
                          setShowForm(true); 
                        }}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={function() { setDeletePackage(pkg); }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Services included */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {pkg.services_count || 0} services included
                    </p>
                    {pkg.services && pkg.services.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {pkg.services.slice(0, 3).map(function(s, i) {
                          return (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {s.name || s}
                            </Badge>
                          );
                        })}
                        {pkg.services.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{pkg.services.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Pricing */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{formatCurrency(pkg.price)}</span>
                    {pkg.original_price > pkg.price && (
                      <span className="text-muted-foreground line-through">
                        {formatCurrency(pkg.original_price)}
                      </span>
                    )}
                    {savings.percentage > 0 && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        <Percent className="h-3 w-3 mr-1" />
                        Save {savings.percentage}%
                      </Badge>
                    )}
                  </div>
                  
                  {/* Valid for */}
                  {pkg.valid_for_days && (
                    <p className="text-sm text-muted-foreground">
                      Valid for {pkg.valid_for_days} days after purchase
                    </p>
                  )}
                </CardContent>
                <CardFooter className="pt-0 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {pkg.times_sold || 0} sold
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {pkg.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <Switch
                      checked={pkg.is_active}
                      onCheckedChange={function() { handleToggle(pkg); }}
                    />
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="border rounded-lg p-12 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium mb-1">No packages</h3>
          <p className="text-muted-foreground mb-4">
            Create service packages to offer bundled deals
          </p>
          <Button onClick={function() { setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Create Package
          </Button>
        </div>
      )}
      
      {/* Form Dialog */}
      <PackageForm
        open={showForm}
        onOpenChange={setShowForm}
        salonId={salonId}
        pkg={editingPackage}
        onSuccess={function() { setShowForm(false); setEditingPackage(null); }}
      />
      
      {/* Delete Confirmation */}
      <AlertDialog open={!!deletePackage} onOpenChange={function(open) { if (!open) setDeletePackage(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Package</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletePackage?.name}&quot;? 
              This will not affect already purchased packages.
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
