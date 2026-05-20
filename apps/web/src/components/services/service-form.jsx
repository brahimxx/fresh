"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Users, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  useCreateService,
  useUpdateService,
  useService,
} from "@/hooks/use-services";
import { useStaff } from "@/hooks/use-staff";
import { useSalon } from "@/providers/salon-provider";

var serviceSchema = z.object({
  name: z.string().min(1, "Service name is required"),
  description: z.string().optional(),
  duration: z.coerce.number().min(5, "Duration must be at least 5 minutes"),
  price: z.coerce.number().min(0, "Price must be 0 or more"),
  category_id: z.string().optional(),
  buffer_before: z.coerce.number().min(0).optional(),
  buffer_after: z.coerce.number().min(0).optional(),
  can_physical: z.boolean().default(true),
  can_mobile: z.boolean().default(false),
  can_virtual: z.boolean().default(false),
  mobile_price_override: z.preprocess(
    function (val) {
      if (val === "" || val === undefined || val === null) return null;
      var num = Number(val);
      return Number.isFinite(num) ? num : null;
    },
    z.number().min(0).nullable()
  ),
  virtual_price_override: z.preprocess(
    function (val) {
      if (val === "" || val === undefined || val === null) return null;
      var num = Number(val);
      return Number.isFinite(num) ? num : null;
    },
    z.number().min(0).nullable()
  ),
});

var DURATION_OPTIONS = [
  { value: "15", label: "15 min" },
  { value: "30", label: "30 min" },
  { value: "45", label: "45 min" },
  { value: "60", label: "1 hour" },
  { value: "75", label: "1h 15min" },
  { value: "90", label: "1h 30min" },
  { value: "120", label: "2 hours" },
  { value: "150", label: "2h 30min" },
  { value: "180", label: "3 hours" },
];

export function ServiceFormDialog({
  open,
  onOpenChange,
  service,
  categoryId,
  salonId,
  categories,
}) {
  var createService = useCreateService();
  var updateService = useUpdateService();
  var isEditing = !!service;
  var { salon } = useSalon();

  // Staff assignment
  var [selectedStaffIds, setSelectedStaffIds] = useState([]);
  // Track which service ID we have already seeded staff for so the
  // population effect runs exactly once per open, not on every render.
  var seededServiceIdRef = useRef(null);
  var { data: allStaff } = useStaff(salonId);
  // Only fetch service detail when editing — pass null when creating so
  // the query stays disabled without creating a new options object each render.
  var { data: serviceDetail } = useService(isEditing ? service.id : null);

  var form = useForm({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: "",
      description: "",
      duration: 60,
      price: 0,
      category_id: "none",
      buffer_before: 0,
      buffer_after: 0,
      can_physical: true,
      can_mobile: false,
      can_virtual: false,
      mobile_price_override: "",
      virtual_price_override: "",
    },
  });

  // Reset form when dialog opens/closes or service changes
  useEffect(
    function () {
      if (open) {
        var defaultPhysical = !!(salon?.can_physical ?? salon?.is_physical ?? true);
        var defaultMobile = !!(salon?.can_mobile || salon?.is_mobile);
        var defaultVirtual = !!(salon?.can_virtual || salon?.is_virtual);

        if (service) {
          // Legacy check: If all false or not set, default to physical
          var hasFulfillment =
            service.canPhysical !== undefined || 
            service.canMobile !== undefined || 
            service.canVirtual !== undefined || 
            service.can_physical !== undefined;
            
          form.reset({
            name: service.name || "",
            description: service.description || "",
            duration: service.duration || service.duration_minutes || 60,
            price: service.price || 0,
            category_id:
              service.category_id || service.categoryId
                ? String(service.category_id || service.categoryId)
                : "none",
            buffer_before:
              service.buffer_before ||
              service.bufferTime ||
              service.buffer_time_minutes ||
              0,
            buffer_after: service.buffer_after || 0,
            can_physical: hasFulfillment ? !!(service.canPhysical ?? service.can_physical) : defaultPhysical,
            can_mobile: hasFulfillment ? !!(service.canMobile ?? service.can_mobile) : defaultMobile && !defaultPhysical,
            can_virtual: hasFulfillment ? !!(service.canVirtual ?? service.can_virtual) : defaultVirtual && !defaultPhysical && !defaultMobile,
          });
        } else {
          var initPhysical = defaultPhysical;
          var initMobile = !defaultPhysical ? defaultMobile : false;
          var initVirtual = !defaultPhysical && !defaultMobile ? defaultVirtual : false;

          form.reset({
            name: "",
            description: "",
            duration: 60,
            price: 0,
            category_id: categoryId ? String(categoryId) : "none",
            buffer_before: 0,
            buffer_after: 0,
            can_physical: initPhysical,
            can_mobile: initMobile,
            can_virtual: initVirtual,
          });
          setSelectedStaffIds([]);
          seededServiceIdRef.current = null;
        }
      } else {
        // Dialog closed — reset the seed tracker so re-opening works correctly
        seededServiceIdRef.current = null;
      }
    },
    [open, service, categoryId, salon],
  );

  // Pre-populate assigned staff exactly once per service open.
  // The ref guard prevents this from re-running every time TanStack Query
  // returns a new serviceDetail object reference on re-render.
  useEffect(
    function () {
      if (
        open &&
        isEditing &&
        serviceDetail?.staff &&
        seededServiceIdRef.current !== service.id
      ) {
        seededServiceIdRef.current = service.id;
        setSelectedStaffIds(
          serviceDetail.staff.map(function (s) {
            return s.id;
          }),
        );
      }
    },
    [open, isEditing, serviceDetail, service],
  );

  // Pre-populate price override fields when serviceDetail loads (async).
  // The initial form.reset uses the list-level `service` prop which may not
  // include override values — serviceDetail from the detail API does.
  useEffect(
    function () {
      if (open && isEditing && serviceDetail) {
        var mobileOverride = serviceDetail.mobilePriceOverride ?? serviceDetail.mobile_price_override ?? "";
        var virtualOverride = serviceDetail.virtualPriceOverride ?? serviceDetail.virtual_price_override ?? "";
        form.setValue("mobile_price_override", mobileOverride === null ? "" : mobileOverride);
        form.setValue("virtual_price_override", virtualOverride === null ? "" : virtualOverride);
      }
    },
    [open, isEditing, serviceDetail],
  );

  function toggleStaff(staffId) {
    setSelectedStaffIds(function (prev) {
      return prev.includes(staffId)
        ? prev.filter(function (id) {
            return id !== staffId;
          })
        : [...prev, staffId];
    });
  }

  // Auto-deselect staff who become incompatible whenever fulfillment options change.
  var watchedPhysical = form.watch("can_physical");
  var watchedMobile = form.watch("can_mobile");
  var watchedVirtual = form.watch("can_virtual");
  useEffect(
    function () {
      if (!allStaff || allStaff.length === 0) return;
      var compatibleIds = getCompatibleStaffIds(
        allStaff,
        watchedPhysical,
        watchedMobile,
        watchedVirtual,
      );
      setSelectedStaffIds(function (prev) {
        var next = prev.filter(function (id) {
          return compatibleIds.includes(id);
        });
        // Only update state if something actually changed to avoid infinite loops
        return next.length !== prev.length ? next : prev;
      });
    },
    [watchedPhysical, watchedMobile, watchedVirtual, allStaff],
  );

  // Compute which staff are compatible with the CURRENT fulfillment selection.
  // Staff is compatible if they share AT LEAST ONE mode with the service (OR/intersection).
  // e.g. a service with can_physical+can_mobile should accept staff who are physical-only.
  function getCompatibleStaffIds(staffList, canPhysical, canMobile, canVirtual) {
    if (!staffList) return [];
    return staffList
      .filter(function (member) {
        // If no mode is selected yet, all staff are eligible (don't block the form)
        if (!canPhysical && !canMobile && !canVirtual) return true;
        // Compatible = staff supports at least one of the same modes as the service
        return (
          (canPhysical && member.canPhysical) ||
          (canMobile   && member.canMobile)   ||
          (canVirtual  && member.canVirtual)
        );
      })
      .map(function (m) { return m.id; });
  }

  function onSubmit(data) {
    if (!hasMultipleFulfillmentModes) {
      data.can_physical = salonSupportsPhysical;
      data.can_mobile = salonSupportsMobile;
      data.can_virtual = salonSupportsVirtual;
    } else if (!data.can_physical && !data.can_mobile && !data.can_virtual) {
      form.setError("root.fulfillment", {
        type: "manual",
        message: "Select at least one service availability option",
      });
      return;
    }

    // Safety net: strip any selected staff who are incompatible with the final modes
    var compatibleIds = getCompatibleStaffIds(
      allStaff,
      data.can_physical,
      data.can_mobile,
      data.can_virtual,
    );
    var safeStaffIds = selectedStaffIds.filter(function (id) {
      return compatibleIds.includes(id);
    });

    var payload = {
      ...data,
      salon_id: salonId,
      category_id:
        data.category_id && data.category_id !== "none"
          ? Number(data.category_id)
          : null,
      // API expects camelCase; form schema uses snake_case
      canPhysical: data.can_physical,
      canMobile: data.can_mobile,
      canVirtual: data.can_virtual,
      // Ensure override values are null when the corresponding mode is not active
      mobile_price_override: data.can_mobile ? (data.mobile_price_override ?? null) : null,
      virtual_price_override: data.can_virtual ? (data.virtual_price_override ?? null) : null,
    };

    if (isEditing) {
      updateService.mutate(
        { id: service.id, data: { ...payload, staffIds: safeStaffIds } },
        {
          onSuccess: function () {
            onOpenChange(false);
            form.reset();
          },
        },
      );
    } else {
      createService.mutate(
        { ...payload, staff_ids: safeStaffIds },
        {
          onSuccess: function () {
            onOpenChange(false);
            form.reset();
            setSelectedStaffIds([]);
          },
        },
      );
    }
  }

  var isSubmitting = createService.isPending || updateService.isPending;
  var salonSupportsPhysical = !!(salon?.can_physical ?? salon?.is_physical ?? true);
  var salonSupportsMobile = !!(salon?.can_mobile || salon?.is_mobile);
  var salonSupportsVirtual = !!(salon?.can_virtual || salon?.is_virtual);
  var supportedModes = [salonSupportsPhysical, salonSupportsMobile, salonSupportsVirtual].filter(Boolean);
  var hasMultipleFulfillmentModes = supportedModes.length > 1;

  var primaryCategory =
    salon?.salonCategories?.find(function (c) {
      return c.isPrimary;
    })?.name || salon?.category;
  var TEMPLATES = {
    "Hair Salon": ["Women's Haircut", "Men's Haircut", "Balayage", "Blowout"],
    Barbershop: ["Men's Fade", "Beard Trim", "Skin Fade", "Hot Towel Shave"],
    "Nail Salon": ["Acrylics", "Gel Manicure", "Pedicure", "Dip Powder"],
    Esthetician: ["Facial", "Eyebrow Wax", "Brazilian Wax", "Lash Extensions"],
    Massage: [
      "Swedish Massage",
      "Deep Tissue",
      "Hot Stone Therapy",
      "Couples Massage",
    ],
  };
  var quickSuggestions = TEMPLATES[primaryCategory] || [
    "Haircut",
    "Manicure",
    "Facial",
  ];

  function applySuggestion(name) {
    form.setValue("name", name, { shouldValidate: true, shouldDirty: true });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Service" : "Add Service"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="overflow-y-auto max-h-[65vh] pr-1">
              <div className="space-y-4 py-1">
                <FormField
                  control={form.control}
                  name="name"
                  render={function ({ field }) {
                    return (
                      <FormItem>
                        <FormLabel>Service Name *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Women's Haircut"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                        {!isEditing && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {quickSuggestions.map(function (sug) {
                              return (
                                <button
                                  type="button"
                                  key={sug}
                                  onClick={function () {
                                    return applySuggestion(sug);
                                  }}
                                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold focus:outline-none border border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 cursor-pointer"
                                >
                                  {sug}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={function ({ field }) {
                    return (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Brief description of the service..."
                            rows={2}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="category_id"
                  render={function ({ field }) {
                    return (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">No Category</SelectItem>
                            {categories.map(function (cat) {
                              return (
                                <SelectItem key={cat.id} value={String(cat.id)}>
                                  {cat.name}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="duration"
                    render={function ({ field }) {
                      return (
                        <FormItem>
                          <FormLabel>Duration *</FormLabel>
                          <Select
                            value={String(field.value)}
                            onValueChange={function (v) {
                              field.onChange(Number(v));
                            }}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {DURATION_OPTIONS.map(function (opt) {
                                return (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

                  <FormField
                    control={form.control}
                    name="price"
                    render={function ({ field }) {
                      return (
                        <FormItem>
                          <FormLabel>Price (EUR) *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="buffer_before"
                    render={function ({ field }) {
                      return (
                        <FormItem>
                          <FormLabel>Buffer Before (min)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="5"
                              placeholder="0"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Prep time before
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

                  <FormField
                    control={form.control}
                    name="buffer_after"
                    render={function ({ field }) {
                      return (
                        <FormItem>
                          <FormLabel>Buffer After (min)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="5"
                              placeholder="0"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Cleanup time after
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                </div>

                {/* ── Fulfillment Options (only if salon has multiple) ───────────── */}
                {hasMultipleFulfillmentModes && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          Service Availability
                        </span>
                      </div>
                      <div className="flex gap-4">
                        {salonSupportsPhysical && (
                          <FormField
                            control={form.control}
                            name="can_physical"
                            render={function ({ field }) {
                              return (
                                <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal cursor-pointer">
                                    In-Salon
                                  </FormLabel>
                                </FormItem>
                              );
                            }}
                          />
                        )}

                        {salonSupportsMobile && (
                          <FormField
                            control={form.control}
                            name="can_mobile"
                            render={function ({ field }) {
                              return (
                                <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal cursor-pointer">
                                    Mobile
                                  </FormLabel>
                                </FormItem>
                              );
                            }}
                          />
                        )}

                        {salonSupportsVirtual && (
                          <FormField
                            control={form.control}
                            name="can_virtual"
                            render={function ({ field }) {
                              return (
                                <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal cursor-pointer">
                                    Virtual
                                  </FormLabel>
                                </FormItem>
                              );
                            }}
                          />
                        )}
                      </div>
                      {form.formState.errors.root?.fulfillment && (
                        <p className="text-[0.8rem] font-medium text-destructive">
                          {form.formState.errors.root.fulfillment.message}
                        </p>
                      )}
                    </div>
                  </>
                )}

                {/* ── Price Overrides (conditional on fulfillment + salon) ── */}
                {salonSupportsMobile && watchedMobile && (
                  <FormField
                    control={form.control}
                    name="mobile_price_override"
                    render={function ({ field }) {
                      return (
                        <FormItem>
                          <FormLabel>Mobile Price (EUR)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="Leave empty to use base price"
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Override price when booked as mobile. Empty = base price.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                )}

                {salonSupportsVirtual && watchedVirtual && (
                  <FormField
                    control={form.control}
                    name="virtual_price_override"
                    render={function ({ field }) {
                      return (
                        <FormItem>
                          <FormLabel>Virtual Price (EUR)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="Leave empty to use base price"
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Override price when booked as virtual. Empty = base price.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                )}

                {/* ── Staff Assignment ─────────────────────────────────── */}
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Assigned Staff</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {selectedStaffIds.length > 0
                        ? selectedStaffIds.length + " selected"
                        : "optional"}
                    </span>
                  </div>
                  {!allStaff || allStaff.length === 0 ? (
                    <p className="text-xs text-muted-foreground pl-1">
                      No team members yet — add staff first.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 gap-1.5">
                      {allStaff.map(function (member) {
                        var currentPhysical = hasMultipleFulfillmentModes ? form.watch("can_physical") : salonSupportsPhysical;
                        var currentMobile = hasMultipleFulfillmentModes ? form.watch("can_mobile") : salonSupportsMobile;
                        var currentVirtual = hasMultipleFulfillmentModes ? form.watch("can_virtual") : salonSupportsVirtual;
                        
                        // Staff is compatible if they share AT LEAST ONE mode with the service.
                        // If nothing is selected yet, don't disable anyone.
                        var nothingSelected = !currentPhysical && !currentMobile && !currentVirtual;
                        var isCompatible =
                          nothingSelected ||
                          (
                            (currentPhysical && member.canPhysical) ||
                            (currentMobile   && member.canMobile)   ||
                            (currentVirtual  && member.canVirtual)
                          );

                        var isSelected = selectedStaffIds.includes(member.id);
                        return (
                          <div
                            key={member.id}
                            className={[
                              "flex items-center gap-3 rounded-md px-3 py-2 border transition-colors",
                              isCompatible ? "hover:bg-accent/50 cursor-pointer" : "opacity-50 cursor-not-allowed bg-muted/30"
                            ].join(" ")}
                            onClick={function (e) {
                              e.stopPropagation();
                              if (isCompatible) {
                                toggleStaff(member.id);
                              }
                            }}
                          >
                            {/* Plain CSS indicator — no Radix Presence, no animation conflict */}
                            <div
                              className={[
                                "h-4 w-4 shrink-0 rounded-sm border",
                                isSelected
                                  ? "bg-primary border-primary flex items-center justify-center"
                                  : "border-input bg-background",
                              ].join(" ")}
                            >
                              {isSelected && (
                                <Check
                                  className="h-3 w-3 text-primary-foreground"
                                  strokeWidth={3}
                                />
                              )}
                            </div>
                            <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                              {(member.firstName ||
                                member.first_name ||
                                "?")[0].toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium leading-none truncate">
                                {member.firstName || member.first_name}{" "}
                                {member.lastName || member.last_name}
                              </p>
                              {member.role && (
                                <div className="flex items-center gap-2 mt-0.5">
                                  <p className="text-xs text-muted-foreground capitalize">
                                    {member.role}
                                  </p>
                                  {!isCompatible && (
                                    <span className="text-[10px] font-semibold bg-destructive/10 text-destructive px-1.5 py-0.5 rounded uppercase tracking-wider">
                                      Incompatible Fulfillment
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={function () {
                  onOpenChange(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {isEditing ? "Save Changes" : "Add Service"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
