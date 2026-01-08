'use client';

import { useState } from 'react';
import { use } from 'react';
import { 
  Plus, 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  ChevronDown, 
  ChevronRight,
  Clock,
  GripVertical,
  FolderPlus
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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

import { useServices, useCategories, useDeleteService, useDeleteCategory } from '@/hooks/use-services';
import { ServiceFormDialog } from '@/components/services/service-form';
import { CategoryFormDialog } from '@/components/services/category-form';

export default function ServicesPage({ params }) {
  var resolvedParams = use(params);
  var salonId = resolvedParams.salonId;
  
  var [expandedCategories, setExpandedCategories] = useState({});
  var [serviceFormOpen, setServiceFormOpen] = useState(false);
  var [categoryFormOpen, setCategoryFormOpen] = useState(false);
  var [editService, setEditService] = useState(null);
  var [editCategory, setEditCategory] = useState(null);
  var [deleteItem, setDeleteItem] = useState(null);
  var [selectedCategoryId, setSelectedCategoryId] = useState(null);
  
  var { data: services, isLoading: servicesLoading } = useServices(salonId);
  var { data: categories, isLoading: categoriesLoading } = useCategories(salonId);
  var deleteService = useDeleteService();
  var deleteCategory = useDeleteCategory();
  
  var isLoading = servicesLoading || categoriesLoading;
  
  // Group services by category
  var servicesByCategory = {};
  var uncategorizedServices = [];
  
  if (services) {
    services.forEach(function(service) {
      if (service.category_id) {
        if (!servicesByCategory[service.category_id]) {
          servicesByCategory[service.category_id] = [];
        }
        servicesByCategory[service.category_id].push(service);
      } else {
        uncategorizedServices.push(service);
      }
    });
  }
  
  function toggleCategory(categoryId) {
    setExpandedCategories(function(prev) {
      var next = { ...prev };
      next[categoryId] = !prev[categoryId];
      return next;
    });
  }
  
  function handleAddService(categoryId) {
    setSelectedCategoryId(categoryId || null);
    setEditService(null);
    setServiceFormOpen(true);
  }
  
  function handleEditService(service) {
    setEditService(service);
    setSelectedCategoryId(service.category_id);
    setServiceFormOpen(true);
  }
  
  function handleEditCategory(category) {
    setEditCategory(category);
    setCategoryFormOpen(true);
  }
  
  function handleDeleteConfirm() {
    if (!deleteItem) return;
    
    if (deleteItem.type === 'service') {
      deleteService.mutate(deleteItem.id, {
        onSuccess: function() { setDeleteItem(null); },
      });
    } else if (deleteItem.type === 'category') {
      deleteCategory.mutate(deleteItem.id, {
        onSuccess: function() { setDeleteItem(null); },
      });
    }
  }
  
  function formatDuration(minutes) {
    if (!minutes) return '-';
    if (minutes < 60) return minutes + 'min';
    var hours = Math.floor(minutes / 60);
    var mins = minutes % 60;
    return hours + 'h' + (mins > 0 ? ' ' + mins + 'min' : '');
  }
  
  function formatPrice(price) {
    if (!price) return '-';
    return 'EUR ' + Number(price).toFixed(2);
  }
  
  function renderService(service) {
    return (
      <div 
        key={service.id}
        className="flex items-center gap-4 px-4 py-3 hover:bg-accent/50 border-b last:border-b-0"
      >
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{service.name}</p>
          {service.description && (
            <p className="text-sm text-muted-foreground truncate">{service.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{formatDuration(service.duration)}</span>
        </div>
        <div className="w-24 text-right font-medium">
          {formatPrice(service.price)}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={function() { handleEditService(service); }}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive"
              onClick={function() { setDeleteItem({ type: 'service', id: service.id, name: service.name }); }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }
  
  function renderCategory(category) {
    var categoryServices = servicesByCategory[category.id] || [];
    var isExpanded = expandedCategories[category.id] !== false;
    
    return (
      <Collapsible 
        key={category.id} 
        open={isExpanded}
        onOpenChange={function() { toggleCategory(category.id); }}
        className="border rounded-lg mb-4"
      >
        <CollapsibleTrigger asChild>
          <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-accent/50">
            <div className="text-muted-foreground">
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{category.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {categoryServices.length} service{categoryServices.length !== 1 ? 's' : ''}
                </Badge>
              </div>
              {category.description && (
                <p className="text-sm text-muted-foreground">{category.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2" onClick={function(e) { e.stopPropagation(); }}>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={function() { handleAddService(category.id); }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Service
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={function() { handleEditCategory(category); }}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Category
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-destructive"
                    onClick={function() { setDeleteItem({ type: 'category', id: category.id, name: category.name }); }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Category
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t">
            {categoryServices.length > 0 ? (
              categoryServices.map(renderService)
            ) : (
              <div className="px-4 py-6 text-center text-muted-foreground">
                <p className="text-sm">No services in this category</p>
                <Button 
                  variant="link" 
                  size="sm"
                  onClick={function() { handleAddService(category.id); }}
                >
                  Add the first service
                </Button>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Services</h1>
          <p className="text-muted-foreground">
            Manage your service menu and pricing
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={function() { setCategoryFormOpen(true); setEditCategory(null); }}>
            <FolderPlus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
          <Button onClick={function() { handleAddService(null); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Service
          </Button>
        </div>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Services</p>
          <p className="text-2xl font-bold">{services?.length || 0}</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Categories</p>
          <p className="text-2xl font-bold">{categories?.length || 0}</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Avg. Price</p>
          <p className="text-2xl font-bold">
            {services && services.length > 0 
              ? 'EUR ' + (services.reduce(function(sum, s) { return sum + Number(s.price || 0); }, 0) / services.length).toFixed(2)
              : '-'}
          </p>
        </div>
      </div>
      
      {/* Categories & Services */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (
        <div>
          {/* Render categories */}
          {categories && categories.map(renderCategory)}
          
          {/* Uncategorized services */}
          {uncategorizedServices.length > 0 && (
            <div className="border rounded-lg">
              <div className="px-4 py-3 border-b bg-muted/50">
                <span className="font-medium text-muted-foreground">Uncategorized</span>
              </div>
              {uncategorizedServices.map(renderService)}
            </div>
          )}
          
          {/* Empty state */}
          {(!categories || categories.length === 0) && (!services || services.length === 0) && (
            <div className="border rounded-lg p-12 text-center">
              <p className="text-muted-foreground mb-4">No services yet</p>
              <div className="flex items-center justify-center gap-2">
                <Button variant="outline" onClick={function() { setCategoryFormOpen(true); }}>
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Create Category
                </Button>
                <Button onClick={function() { handleAddService(null); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Service
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Service Form Dialog */}
      <ServiceFormDialog
        open={serviceFormOpen}
        onOpenChange={setServiceFormOpen}
        service={editService}
        categoryId={selectedCategoryId}
        salonId={salonId}
        categories={categories || []}
      />
      
      {/* Category Form Dialog */}
      <CategoryFormDialog
        open={categoryFormOpen}
        onOpenChange={setCategoryFormOpen}
        category={editCategory}
        salonId={salonId}
      />
      
      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteItem} onOpenChange={function(open) { if (!open) setDeleteItem(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteItem?.type === 'category' ? 'Category' : 'Service'}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteItem?.type === 'category' 
                ? 'This will delete the category "' + deleteItem?.name + '" and all its services. This action cannot be undone.'
                : 'This will permanently delete "' + deleteItem?.name + '". This action cannot be undone.'}
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
