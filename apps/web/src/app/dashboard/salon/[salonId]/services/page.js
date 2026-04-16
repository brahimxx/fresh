"use client";

import { useState, use, useMemo } from "react";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Clock,
  FolderPlus,
  Scissors,
  ArrowUpDown,
  Tag,
  DollarSign,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";

import {
  useServices,
  useCategories,
  useDeleteService,
  useDeleteCategory,
} from "@/hooks/use-services";
import { useDiscounts } from "@/hooks/use-discounts";
import { ServiceFormDialogDialog } from "@/components/services/service-form";
import { CategoryFormDialogDialog } from "@/components/services/category-form";

export default function ServicesPage({ params }) {
  const resolvedParams = use(params);
  const salonId = resolvedParams.salonId;

  const [expandedCategories, setExpandedCategories] = useState({});
  const [editCategory, setEditCategory] = useState(null);
  const [categoryFormOpen, setCategoryFormDialogOpen] = useState(false);
  const [editService, setEditService] = useState(null);
  const [serviceFormOpen, setServiceFormDialogOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);

  const { data: servicesData, isLoading: servicesLoading } =
    useServices(salonId);
  const { data: categoriesData, isLoading: categoriesLoading } =
    useCategories(salonId);
  const { data: discountsData } = useDiscounts({
    salon_id: salonId,
    is_active: 1,
  });

  const deleteService = useDeleteService();
  const deleteCategory = useDeleteCategory();

  const services = useMemo(() => servicesData?.data || [], [servicesData]);
  const categories = useMemo(
    () => categoriesData?.data || [],
    [categoriesData],
  );
  const discounts = useMemo(() => discountsData?.data || [], [discountsData]);

  const uncategorizedServices = services.filter((s) => !s.category_id);
  const isLoading = servicesLoading || categoriesLoading;

  // Set all categories expanded by default when loaded
  useMemo(() => {
    if (categories.length > 0 && Object.keys(expandedCategories).length === 0) {
      const initialExpanded = {};
      categories.forEach((cat) => {
        initialExpanded[cat.id] = true;
      });
      setExpandedCategories(initialExpanded);
    }
  }, [categories, expandedCategories]);

  const toggleCategory = (id) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleAddService = (categoryId) => {
    setSelectedCategoryId(categoryId || null);
    setEditService(null);
    setServiceFormDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!deleteItem) return;

    if (deleteItem.type === "service") {
      deleteService.mutate(deleteItem.id, {
        onSuccess: () => setDeleteItem(null),
      });
    } else if (deleteItem.type === "category") {
      deleteCategory.mutate(deleteItem.id, {
        onSuccess: () => setDeleteItem(null),
      });
    }
  };

  const formatDuration = (minutes) => {
    if (!minutes) return "-";
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins > 0 ? ` ${mins}m` : ""}`;
  };

  const formatPrice = (price) => {
    if (!price) return "-";
    return `$${Number(price).toFixed(2)}`;
  };

  const getDiscountedPrice = (service) => {
    if (!discounts || discounts.length === 0) return null;
    let bestPrice = null;
    const basePrice = Number(service.price);
    const serviceId = Number(service.id);

    for (let i = 0; i < discounts.length; i++) {
      var discount = discounts[i];
      if (
        !Number(discount.appliesToServices) &&
        !Number(discount.applies_to_services)
      )
        continue;

      var specificServices =
        discount.specificServices || discount.specific_services || [];
      if (specificServices.length > 0) {
        var found = false;
        for (var j = 0; j < specificServices.length; j++) {
          if (Number(specificServices[j]) === serviceId) {
            found = true;
            break;
          }
        }
        if (!found) continue;
      }

      var newPrice;
      if (discount.type === "percentage") {
        var amountOff = basePrice * (Number(discount.value) / 100);
        if (discount.maxDiscount && amountOff > Number(discount.maxDiscount)) {
          amountOff = Number(discount.maxDiscount);
        }
        newPrice = basePrice - amountOff;
      } else {
        newPrice = basePrice - Number(discount.value);
      }

      newPrice = Math.max(0, newPrice);
      if (bestPrice === null || newPrice < bestPrice) {
        bestPrice = newPrice;
      }
    }
    return bestPrice;
  };

  const renderServiceItem = (service) => {
    const discountedPrice = getDiscountedPrice(service);
    return (
      <div
        key={service.id}
        className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 hover:bg-muted/40 transition-colors border-b border-border last:border-b-0 bg-background"
      >
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
              {service.name}
            </span>
          </div>
          {service.description ? (
            <p className="text-sm text-muted-foreground line-clamp-2 max-w-2xl leading-relaxed">
              {service.description}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground/50 italic">
              No description
            </p>
          )}
        </div>

        <div className="flex items-center sm:justify-end gap-6 shrink-0 mt-2 sm:mt-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium bg-muted/30 px-2.5 py-1 rounded-md">
            <Clock className="h-4 w-4 shrink-0 opacity-70" />
            <span>{formatDuration(service.duration)}</span>
          </div>

          <div className="w-24 text-right flex flex-col items-end justify-center">
            {discountedPrice !== null &&
            discountedPrice < Number(service.price) ? (
              <>
                <span className="text-xs text-muted-foreground line-through decoration-destructive/60 font-medium">
                  {formatPrice(service.price)}
                </span>
                <span className="text-emerald-600 font-bold bg-emerald-50 px-1.5 rounded">
                  {formatPrice(discountedPrice)}
                </span>
              </>
            ) : (
              <span className="font-semibold text-foreground">
                {formatPrice(service.price)}
              </span>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 shadow-lg">
              <DropdownMenuItem
                onClick={() => {
                  setEditService(service);
                  setSelectedCategoryId(service.category_id);
                  setServiceFormDialogOpen(true);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" /> Edit Service
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 focus:text-red-700"
                onClick={() =>
                  setDeleteItem({
                    type: "service",
                    id: service.id,
                    name: service.name,
                  })
                }
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete Service
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  };

  const renderCategoryBlock = (category) => {
    const isExpanded = expandedCategories[category.id];
    const categoryServices = services.filter(
      (s) => s.category_id === category.id,
    );

    return (
      <Collapsible
        key={category.id}
        open={isExpanded}
        onOpenChange={() => toggleCategory(category.id)}
        className="rounded-xl border border-border shadow-sm bg-background overflow-hidden animate-in fade-in"
      >
        <CollapsibleTrigger asChild>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-5 cursor-pointer bg-muted/10 hover:bg-muted/20 transition-colors group">
            <div className="flex items-center gap-4">
              <div className="h-8 w-8 rounded-full bg-background border shadow-sm flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold tracking-tight">
                    {category.name}
                  </h2>
                  <Badge
                    variant="secondary"
                    className="bg-primary/5 text-primary hover:bg-primary/10 font-semibold text-xs border-primary/10"
                  >
                    {categoryServices.length}{" "}
                    {categoryServices.length === 1 ? "service" : "services"}
                  </Badge>
                </div>
                {category.description && (
                  <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
                    {category.description}
                  </p>
                )}
              </div>
            </div>

            <div
              className="flex items-center gap-2 pl-12 sm:pl-0"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant="outline"
                size="sm"
                className="h-8 shadow-sm"
                onClick={() => handleAddService(category.id)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Service
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shadow-sm border bg-background hover:bg-muted"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 shadow-lg">
                  <DropdownMenuItem
                    onClick={() => {
                      setEditCategory(category);
                      setCategoryFormDialogOpen(true);
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" /> Edit Category
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-600 focus:text-red-700"
                    onClick={() =>
                      setDeleteItem({
                        type: "category",
                        id: category.id,
                        name: category.name,
                      })
                    }
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Remove Section
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-border flex flex-col">
            {categoryServices.length > 0 ? (
              categoryServices.map(renderServiceItem)
            ) : (
              <div className="py-8 text-center bg-background shrink-0">
                <Scissors className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground font-medium">
                  No services in this category.
                </p>
                <Button
                  variant="link"
                  size="sm"
                  className="mt-1"
                  onClick={() => handleAddService(category.id)}
                >
                  Add your first service
                </Button>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-500 pb-10 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Services & Menu</h1>
          <p className="text-muted-foreground mt-1">
            Organize your offerings, durations, and pricing structure.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="shadow-sm gap-2 bg-background"
            onClick={() => {
              setCategoryFormDialogOpen(true);
              setEditCategory(null);
            }}
          >
            <FolderPlus className="h-4 w-4" />
            New Category
          </Button>
          <Button
            className="shadow-sm shadow-primary/20 gap-2"
            onClick={() => handleAddService(null)}
          >
            <Plus className="h-4 w-4" />
            New Service
          </Button>
        </div>
      </div>

      {/* Analytics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm border-border bg-gradient-to-br from-background to-muted/20">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Scissors className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Services
              </p>
              <h3 className="text-2xl font-bold tracking-tight">
                {services?.length || 0}
              </h3>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-border bg-gradient-to-br from-background to-muted/20">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
              <Tag className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Categories
              </p>
              <h3 className="text-2xl font-bold tracking-tight">
                {categories?.length || 0}
              </h3>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-border bg-gradient-to-br from-background to-muted/20">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
              <DollarSign className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Average Price
              </p>
              <h3 className="text-2xl font-bold tracking-tight">
                {services?.length > 0
                  ? `$${(services.reduce((sum, s) => sum + Number(s.price || 0), 0) / services.length).toFixed(2)}`
                  : "—"}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-6 pt-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : (
        <div className="space-y-6 pt-2">
          {categories && categories.map(renderCategoryBlock)}

          {/* Standalone Uncategorized Block */}
          {uncategorizedServices.length > 0 && (
            <div className="rounded-xl border border-border shadow-sm bg-background overflow-hidden animate-in fade-in">
              <div className="px-6 py-5 bg-muted/10 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold tracking-tight text-muted-foreground">
                    Uncategorized Services
                  </h2>
                  <Badge
                    variant="secondary"
                    className="bg-muted text-muted-foreground font-semibold text-xs border-border"
                  >
                    {uncategorizedServices.length}{" "}
                    {uncategorizedServices.length === 1
                      ? "service"
                      : "services"}
                  </Badge>
                </div>
              </div>
              <div className="flex flex-col">
                {uncategorizedServices.map(renderServiceItem)}
              </div>
            </div>
          )}

          {/* Empty Global State */}
          {(!categories || categories.length === 0) &&
            (!services || services.length === 0) && (
              <div className="rounded-xl border border-dashed border-border p-16 flex flex-col items-center justify-center text-center bg-muted/5 shadow-sm">
                <div className="h-20 w-20 bg-background rounded-full border shadow-sm flex items-center justify-center mb-6">
                  <Scissors className="h-10 w-10 text-muted-foreground/40" />
                </div>
                <h2 className="text-xl font-bold mb-2">
                  Build Your Service Menu
                </h2>
                <p className="text-muted-foreground max-w-md mb-8">
                  Start by creating categories like &quot;Haircuts&quot; or
                  &quot;Coloring&quot;, then add the individual services you
                  offer under each section.
                </p>
                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setCategoryFormDialogOpen(true)}
                  >
                    Create Category
                  </Button>
                  <Button size="lg" onClick={() => handleAddService(null)}>
                    Add First Service
                  </Button>
                </div>
              </div>
            )}
        </div>
      )}

      {/* Reusable Data Forms */}
      <ServiceFormDialog
        open={serviceFormOpen}
        onOpenChange={setServiceFormDialogOpen}
        salonId={salonId}
        service={editService}
        initialCategoryId={selectedCategoryId}
        categories={categories}
      />
      <CategoryFormDialog
        open={categoryFormOpen}
        onOpenChange={setCategoryFormDialogOpen}
        salonId={salonId}
        category={editCategory}
      />

      {/* Global Delete Confirm */}
      <AlertDialog
        open={!!deleteItem}
        onOpenChange={(open) => !open && setDeleteItem(null)}
      >
        <AlertDialogContent className="shadow-xl border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">
              Delete {deleteItem?.type}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base text-foreground">
              Are you sure you want to permanently delete{" "}
              <strong>{deleteItem?.name}</strong>?
              {deleteItem?.type === "category" &&
                " All services within this category will become uncategorized."}
              <br />
              <br />
              <span className="text-muted-foreground text-sm">
                This action cannot be reversed.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              onClick={handleDeleteConfirm}
            >
              Delete {deleteItem?.type}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
