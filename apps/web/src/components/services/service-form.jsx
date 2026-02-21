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

var serviceSchema = z.object({
  name: z.string().min(1, "Service name is required"),
  description: z.string().optional(),
  duration: z.coerce.number().min(5, "Duration must be at least 5 minutes"),
  price: z.coerce.number().min(0, "Price must be 0 or more"),
  category_id: z.string().optional(),
  buffer_before: z.coerce.number().min(0).optional(),
  buffer_after: z.coerce.number().min(0).optional(),
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
    },
  });

  // Reset form when dialog opens/closes or service changes
  useEffect(
    function () {
      if (open) {
        if (service) {
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
          });
        } else {
          form.reset({
            name: "",
            description: "",
            duration: 60,
            price: 0,
            category_id: categoryId ? String(categoryId) : "none",
            buffer_before: 0,
            buffer_after: 0,
          });
          setSelectedStaffIds([]);
          seededServiceIdRef.current = null;
        }
      } else {
        // Dialog closed — reset the seed tracker so re-opening works correctly
        seededServiceIdRef.current = null;
      }
    },
    [open, service, categoryId],
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

  function toggleStaff(staffId) {
    setSelectedStaffIds(function (prev) {
      return prev.includes(staffId)
        ? prev.filter(function (id) {
            return id !== staffId;
          })
        : [...prev, staffId];
    });
  }

  function onSubmit(data) {
    var payload = {
      ...data,
      salon_id: salonId,
      category_id:
        data.category_id && data.category_id !== "none"
          ? Number(data.category_id)
          : null,
    };

    if (isEditing) {
      updateService.mutate(
        { id: service.id, data: { ...payload, staffIds: selectedStaffIds } },
        {
          onSuccess: function () {
            onOpenChange(false);
            form.reset();
          },
        },
      );
    } else {
      createService.mutate(
        { ...payload, staff_ids: selectedStaffIds },
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
                        var isSelected = selectedStaffIds.includes(member.id);
                        return (
                          <div
                            key={member.id}
                            className="flex items-center gap-3 rounded-md px-3 py-2 border hover:bg-accent/50 cursor-pointer transition-colors"
                            onClick={function (e) {
                              e.stopPropagation();
                              toggleStaff(member.id);
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
                                <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                                  {member.role}
                                </p>
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
