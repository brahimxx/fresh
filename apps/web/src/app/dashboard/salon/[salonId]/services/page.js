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
  Tag,
  DollarSign,
  Layers
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

import {
  useServices,
  useCategories,
  useDeleteService,
  useDeleteCategory,
} from "@/hooks/use-services";
import { useDiscounts } from "@/hooks/use-discounts";
import { ServiceFormDialog } from "@/components/services/service-form";
import { CategoryFormDialog } from "@/components/services/category-form";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { useSalon } from "@/providers/salon-provider";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
};

export default function ServicesPage({ params }) {
  const resolvedParams = use(params);
  const salonId = resolvedParams.salonId;
  const { salon } = useSalon();

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

  const services = useMemo(() => Array.isArray(servicesData) ? servicesData : (servicesData?.data || []), [servicesData]);
  const categories = useMemo(() => Array.isArray(categoriesData) ? categoriesData : (categoriesData?.data || []), [categoriesData]);
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
    return formatCurrency(Number(price), salon?.currency);
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

    const hasFulfillmentDefined = service.canPhysical !== undefined || service.canMobile !== undefined || service.canVirtual !== undefined || service.can_physical !== undefined || service.can_mobile !== undefined || service.can_virtual !== undefined;
    const canPhysical = hasFulfillmentDefined ? !!(service.canPhysical ?? service.can_physical) : true;
    const canMobile = !!(service.canMobile ?? service.can_mobile);
    const canVirtual = !!(service.canVirtual ?? service.can_virtual);

    return (
      <div
        key={service.id}
        className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-5 hover:bg-muted/30 transition-colors border-b border-border/50 last:border-0 bg-background/50"
      >
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-bold text-[15px] text-foreground group-hover:text-primary transition-colors">
              {service.name}
            </span>
          </div>
          {service.description ? (
            <p className="text-[13px] text-muted-foreground line-clamp-2 max-w-2xl font-medium leading-relaxed">
              {service.description}
            </p>
          ) : (
            <p className="text-[13px] text-muted-foreground/40 italic font-medium">
              Awaiting description
            </p>
          )}
        </div>

        <div className="flex items-center sm:justify-end gap-6 shrink-0 mt-2 sm:mt-0">
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            {canPhysical && (
              <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px] uppercase font-bold tracking-wider px-2 py-0 border-0 h-5">In-Salon</Badge>
            )}
            {canMobile && (
              <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] uppercase font-bold tracking-wider px-2 py-0 border-0 h-5">Mobile</Badge>
            )}
            {canVirtual && (
              <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] uppercase font-bold tracking-wider px-2 py-0 border-0 h-5">Virtual</Badge>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground font-bold bg-muted/40 px-2.5 py-1.5 rounded-lg border border-border/50">
            <Clock className="h-3.5 w-3.5 shrink-0 opacity-50" />
            <span>{formatDuration(service.duration)}</span>
          </div>

          <div className="w-24 text-right flex flex-col items-end justify-center">
            {discountedPrice !== null &&
            discountedPrice < Number(service.price) ? (
              <>
                <span className="text-xs text-muted-foreground line-through decoration-destructive/60 font-medium">
                  {formatPrice(service.price)}
                </span>
                <span className="text-[15px] text-emerald-600 dark:text-emerald-400 font-extrabold bg-emerald-500/10 px-2 py-0.5 rounded-md mt-0.5">
                  {formatPrice(discountedPrice)}
                </span>
              </>
            ) : (
              <span className="font-extrabold text-[15px] text-foreground">
                {formatPrice(service.price)}
              </span>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-9 w-9 p-0 rounded-xl bg-muted/30 hover:bg-muted text-muted-foreground opacity-50 group-hover:opacity-100 transition-all data-[state=open]:opacity-100"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[180px] rounded-2xl">
              <DropdownMenuItem
                onClick={() => {
                  setEditService(service);
                  setSelectedCategoryId(service.category_id);
                  setServiceFormDialogOpen(true);
                }}
                className="font-medium gap-2"
              >
                <Pencil className="h-4 w-4 text-primary" /> Edit Parameters
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="font-medium gap-2 text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                onClick={() =>
                  setDeleteItem({
                    type: "service",
                    id: service.id,
                    name: service.name,
                  })
                }
              >
                <Trash2 className="h-4 w-4" /> Terminate Service
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
        className="rounded-3xl border border-border/50 shadow-sm bg-background/60 backdrop-blur-xl overflow-hidden"
      >
        <CollapsibleTrigger asChild>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 sm:px-8 py-6 cursor-pointer bg-muted/5 hover:bg-muted/10 transition-colors group border-b border-transparent data-[state=open]:border-border/50">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-2xl bg-background border border-border/50 shadow-sm flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold tracking-tight">
                    {category.name}
                  </h2>
                  <Badge
                    variant="secondary"
                    className="bg-primary/10 text-primary font-bold uppercase tracking-wider text-[10px] px-2 py-0 border-0 h-5"
                  >
                    {categoryServices.length}{" "}
                    {categoryServices.length === 1 ? "Module" : "Modules"}
                  </Badge>
                </div>
                {category.description && (
                  <p className="text-[13px] font-medium text-muted-foreground mt-1 max-w-2xl">
                    {category.description}
                  </p>
                )}
              </div>
            </div>

            <div
              className="flex items-center gap-3 pl-14 sm:pl-0"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant="outline"
                size="sm"
                className="h-10 px-4 rounded-xl shadow-sm border-border/50 font-bold hover:bg-primary/5 hover:text-primary hover:border-primary/20 transition-all text-xs"
                onClick={() => handleAddService(category.id)}
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Add Service
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                     variant="ghost"
                     className="h-10 w-10 p-0 rounded-xl bg-background shadow-sm border border-border/50 hover:bg-muted text-muted-foreground transition-all focus:ring-0"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[180px] rounded-2xl">
                  <DropdownMenuItem
                    onClick={() => {
                      setEditCategory(category);
                      setCategoryFormDialogOpen(true);
                    }}
                    className="font-medium gap-2"
                  >
                    <Pencil className="h-4 w-4 text-primary" /> Edit Category
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="font-medium gap-2 text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                    onClick={() =>
                      setDeleteItem({
                        type: "category",
                        id: category.id,
                        name: category.name,
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" /> Terminate Block
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CollapsibleTrigger>
        <AnimatePresence>
          {isExpanded && (
            <CollapsibleContent forceMount asChild>
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden flex flex-col"
              >
                {categoryServices.length > 0 ? (
                  categoryServices.map(renderServiceItem)
                ) : (
                  <div className="py-12 text-center shrink-0">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                      <Scissors className="h-8 w-8 text-muted-foreground opacity-30" />
                    </div>
                    <p className="text-[15px] font-bold">
                      Empty Segment
                    </p>
                    <p className="text-[13px] font-medium text-muted-foreground mt-1 mb-4">
                      No service modules exist in this category.
                    </p>
                    <Button
                      variant="link"
                      className="font-bold text-primary"
                      onClick={() => handleAddService(category.id)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Initialize Service
                    </Button>
                  </div>
                )}
              </motion.div>
            </CollapsibleContent>
          )}
        </AnimatePresence>
      </Collapsible>
    );
  };

  return (
    <div className="space-y-8">
      {/* Decorative Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-8 sm:p-10 flex flex-col md:flex-row md:items-end justify-between gap-6 group"
      >
        <div className="absolute top-0 right-10 p-8 opacity-5 pointer-events-none transition-transform duration-1000 group-hover:scale-125 group-hover:rotate-12 translate-y-[-20%]">
          <Scissors className="w-64 h-64 text-primary" strokeWidth={1} />
        </div>
        
        <div className="relative z-10 flex flex-col gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-background/80 backdrop-blur-md border border-primary/20 text-xs font-semibold text-primary w-fit">
            <Layers className="w-3.5 h-3.5" />
            <span>Offerings Management</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight max-w-2xl">
            Service Menu
          </h1>
          <p className="text-muted-foreground text-lg font-medium max-w-xl">
            Structure your business capabilities. Set parameters, durations, and financial value across your offerings.
          </p>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row gap-3 shrink-0">
          <Button
            variant="outline"
            className="flex-1 sm:flex-none h-12 px-6 rounded-xl border-border/50 bg-background/50 backdrop-blur-md hover:bg-background shadow-sm text-[15px]"
            onClick={() => {
              setCategoryFormDialogOpen(true);
              setEditCategory(null);
            }}
          >
            <FolderPlus className="h-5 w-5 mr-2 text-muted-foreground" />
             New Category
          </Button>
          <Button
            className="flex-1 sm:flex-none h-12 px-6 rounded-xl shadow-md text-[15px]"
            onClick={() => handleAddService(null)}
          >
            <Plus className="h-5 w-5 mr-2" />
            New Service
          </Button>
        </div>
      </motion.div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-8"
      >
        {/* Analytics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <motion.div variants={itemVariants} className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm overflow-hidden relative group hover:bg-background transition-colors duration-500">
            <div className="absolute -right-6 -top-6 text-primary/5 transition-transform duration-700 group-hover:scale-125 group-hover:-rotate-12 pointer-events-none">
              <Scissors className="w-32 h-32" strokeWidth={1} />
            </div>
            <div className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Offerings</h3>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Scissors className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div className="relative z-10 mt-2">
              <div className="text-3xl font-extrabold tracking-tight">{services?.length || 0}</div>
              <p className="text-xs font-semibold text-muted-foreground mt-1">Available modules</p>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm overflow-hidden relative group hover:bg-background transition-colors duration-500">
             <div className="absolute -right-6 -top-6 text-blue-500/5 transition-transform duration-700 group-hover:scale-125 group-hover:rotate-12 pointer-events-none">
              <Tag className="w-32 h-32" strokeWidth={1} />
            </div>
            <div className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Segment Groups</h3>
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Tag className="h-4 w-4 text-blue-500" />
              </div>
            </div>
            <div className="relative z-10 mt-2">
              <div className="text-3xl font-extrabold tracking-tight">{categories?.length || 0}</div>
              <p className="text-xs font-semibold text-muted-foreground mt-1">Active categories</p>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm overflow-hidden relative group hover:bg-background transition-colors duration-500">
             <div className="absolute -right-6 -top-6 text-emerald-500/5 transition-transform duration-700 group-hover:scale-125 group-hover:-rotate-12 pointer-events-none">
              <DollarSign className="w-32 h-32" strokeWidth={1} />
            </div>
            <div className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Average Price</h3>
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-emerald-500" />
              </div>
            </div>
             <div className="relative z-10 mt-2">
              <div className="text-3xl font-extrabold tracking-tight text-foreground">
                {services?.length > 0
                  ? formatCurrency((services.reduce((sum, s) => sum + Number(s.price || 0), 0) / services.length), salon?.currency)
                  : "—"}
              </div>
              <p className="text-xs font-semibold text-muted-foreground mt-1">Financial average</p>
            </div>
          </motion.div>
        </div>

        {isLoading ? (
          <div className="space-y-6 pt-4">
            <Skeleton className="h-24 w-full rounded-3xl" />
            <Skeleton className="h-40 w-full rounded-3xl" />
            <Skeleton className="h-24 w-full rounded-3xl" />
          </div>
        ) : (
          <motion.div variants={itemVariants} className="space-y-6 pt-2">
            {categories && categories.map(renderCategoryBlock)}

            {/* Standalone Uncategorized Block */}
            {uncategorizedServices.length > 0 && (
              <div className="rounded-3xl border border-border/50 shadow-sm bg-background/60 backdrop-blur-xl overflow-hidden">
                <div className="px-6 sm:px-8 py-6 bg-muted/5 border-b border-border/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold tracking-tight text-muted-foreground">
                      Uncategorized Modules
                    </h2>
                    <Badge
                      variant="secondary"
                      className="bg-muted text-muted-foreground font-bold uppercase tracking-wider text-[10px] px-2 py-0 border-border/50 h-5"
                    >
                      {uncategorizedServices.length}{" "}
                      {uncategorizedServices.length === 1
                        ? "item"
                        : "items"}
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
                <div className="rounded-3xl border border-dashed border-border/50 p-16 flex flex-col items-center justify-center text-center bg-muted/5 shadow-sm">
                  <div className="h-24 w-24 bg-background rounded-full border border-border/50 shadow-sm flex items-center justify-center mb-6">
                    <Scissors className="h-10 w-10 text-muted-foreground opacity-50" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2 tracking-tight">
                    Build Your Catalog
                  </h2>
                  <p className="text-muted-foreground font-medium max-w-md mb-8">
                    Start by generating section groups like &quot;Haircuts&quot; or
                    &quot;Coloring&quot;, then map individual pricing items underneath.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button
                      variant="outline"
                      size="lg"
                      className="rounded-xl h-12 px-8 font-bold border-border/50 text-[15px]"
                      onClick={() => setCategoryFormDialogOpen(true)}
                    >
                      Initialize Category
                    </Button>
                    <Button 
                      size="lg" 
                      className="rounded-xl h-12 px-8 font-bold shadow-md text-[15px]"
                      onClick={() => handleAddService(null)}
                    >
                      Launch First Service
                    </Button>
                  </div>
                </div>
              )}
          </motion.div>
        )}
      </motion.div>

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
        <AlertDialogContent className="shadow-2xl border-border/50 rounded-3xl max-w-md">
          <AlertDialogHeader>
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6 text-red-600 dark:text-red-500" />
            </div>
            <AlertDialogTitle className="text-2xl font-bold text-red-600 dark:text-red-500">
              Terminate {deleteItem?.type}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[15px] font-medium text-foreground tracking-tight leading-relaxed">
              Are you sure you want to permanently erase{" "}
              <strong>{deleteItem?.name}</strong>?
              {deleteItem?.type === "category" &&
                " All dependent services mapped to this category will instantly become uncategorized."}
              <br />
              <br />
              <span className="text-muted-foreground text-[13px]">
                This is a database destructive action and cannot be undone.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-2 sm:gap-0">
            <AlertDialogCancel className="rounded-xl h-11 font-bold">Abort</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600 rounded-xl h-11 font-bold shadow-md"
              onClick={handleDeleteConfirm}
            >
              Confirm Termination
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
