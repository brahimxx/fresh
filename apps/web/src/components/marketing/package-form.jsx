"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Check } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

import {
  useCreatePackage,
  useUpdatePackage,
  formatCurrency,
} from "@/hooks/use-packages";
import { useServices } from "@/hooks/use-services";

var packageSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Price is required"),
  original_price: z.coerce.number().min(0).optional(),
  valid_for_days: z.coerce.number().min(1).optional().nullable(),
  is_active: z.boolean(),
});

export function PackageForm({ open, onOpenChange, salonId, pkg, onSuccess }) {
  var { toast } = useToast();
  var createPackage = useCreatePackage();
  var updatePackage = useUpdatePackage();

  var { data: services } = useServices(salonId);
  var [selectedServices, setSelectedServices] = useState([]);

  var isEditing = !!pkg;

  var form = useForm({
    resolver: zodResolver(packageSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      original_price: 0,
      valid_for_days: 30,
      is_active: true,
    },
  });

  // Reset form when pkg changes
  useEffect(
    function () {
      if (open) {
        if (pkg) {
          form.reset({
            name: pkg.name || "",
            description: pkg.description || "",
            price:
              Number(
                pkg.price || pkg.discounted_price || pkg.discountedPrice
              ) || 0,
            original_price:
              Number(pkg.original_price || pkg.originalPrice) || 0,
            valid_for_days:
              pkg.valid_for_days || pkg.validForDays || pkg.validity_days || 30,
            is_active: pkg.is_active !== false && pkg.isActive !== false,
          });
          setSelectedServices(pkg.service_ids || pkg.serviceIds || []);
        } else {
          form.reset({
            name: "",
            description: "",
            price: 0,
            original_price: 0,
            valid_for_days: 30,
            is_active: true,
          });
          setSelectedServices([]);
        }
      }
    },
    [open, pkg]
  );

  // Calculate original price from selected services
  var calculatedOriginalPrice = (services || [])
    .filter(function (s) {
      return selectedServices.includes(s.id);
    })
    .reduce(function (sum, s) {
      return sum + Number(s.price || 0);
    }, 0);

  function toggleService(serviceId) {
    setSelectedServices(function (prev) {
      if (prev.includes(serviceId)) {
        return prev.filter(function (id) {
          return id !== serviceId;
        });
      }
      return [...prev, serviceId];
    });
  }

  function onSubmit(data) {
    if (selectedServices.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one service",
        variant: "destructive",
      });
      return;
    }

    var payload = {
      ...data,
      salon_id: salonId,
      service_ids: selectedServices,
      original_price: data.original_price || calculatedOriginalPrice,
    };

    if (isEditing) {
      updatePackage.mutate(
        {
          packageId: pkg.id,
          data: payload,
        },
        {
          onSuccess: function () {
            toast({ title: "Package updated" });
            onSuccess && onSuccess();
          },
          onError: function (error) {
            toast({
              title: "Error",
              description: error.message,
              variant: "destructive",
            });
          },
        }
      );
    } else {
      createPackage.mutate(payload, {
        onSuccess: function () {
          toast({ title: "Package created" });
          onSuccess && onSuccess();
        },
        onError: function (error) {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          });
        },
      });
    }
  }

  var isPending = createPackage.isPending || updatePackage.isPending;
  var packagePrice = form.watch("price") || 0;
  var savingsAmount = calculatedOriginalPrice - packagePrice;
  var savingsPercentage =
    calculatedOriginalPrice > 0
      ? Math.round((savingsAmount / calculatedOriginalPrice) * 100)
      : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Package" : "Create Package"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4 pb-4">
                {/* Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={function ({ field }) {
                    return (
                      <FormItem>
                        <FormLabel>Package Name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g., Complete Hair Treatment"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={function ({ field }) {
                    return (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Describe what's included..."
                            rows={2}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                {/* Services Selection */}
                <div className="space-y-2">
                  <FormLabel>Services Included</FormLabel>
                  <div className="border rounded-lg max-h-48 overflow-y-auto">
                    {(services || []).length > 0 ? (
                      <div className="p-2 space-y-1">
                        {(services || []).map(function (service) {
                          var isSelected = selectedServices.includes(
                            service.id
                          );
                          return (
                            <div
                              key={service.id}
                              className={
                                "flex items-center justify-between p-2 rounded cursor-pointer transition-colors " +
                                (isSelected
                                  ? "bg-primary/10"
                                  : "hover:bg-muted")
                              }
                              onClick={function () {
                                toggleService(service.id);
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <Checkbox checked={isSelected} />
                                <span className="text-sm">{service.name}</span>
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {formatCurrency(service.price)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="p-4 text-sm text-muted-foreground text-center">
                        No services available
                      </p>
                    )}
                  </div>
                  {selectedServices.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {selectedServices.length} services selected • Original
                      value: {formatCurrency(calculatedOriginalPrice)}
                    </p>
                  )}
                </div>

                {/* Pricing */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={function ({ field }) {
                      return (
                        <FormItem>
                          <FormLabel>Package Price</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                $
                              </span>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                {...field}
                                className="pl-8"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

                  <FormField
                    control={form.control}
                    name="original_price"
                    render={function ({ field }) {
                      return (
                        <FormItem>
                          <FormLabel>Original Price</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                $
                              </span>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                {...field}
                                value={field.value || calculatedOriginalPrice}
                                className="pl-8"
                              />
                            </div>
                          </FormControl>
                          <FormDescription>
                            {savingsPercentage > 0 && (
                              <span className="text-green-600">
                                Customers save {savingsPercentage}%
                              </span>
                            )}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                </div>

                {/* Valid For */}
                <FormField
                  control={form.control}
                  name="valid_for_days"
                  render={function ({ field }) {
                    return (
                      <FormItem>
                        <FormLabel>Valid For (Days)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            {...field}
                            value={field.value || ""}
                            onChange={function (e) {
                              var val = e.target.value;
                              field.onChange(val ? parseInt(val) : null);
                            }}
                            placeholder="e.g., 30"
                          />
                        </FormControl>
                        <FormDescription>
                          How many days the package is valid after purchase
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                {/* Active */}
                <FormField
                  control={form.control}
                  name="is_active"
                  render={function ({ field }) {
                    return (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <FormLabel>Active</FormLabel>
                          <FormDescription>
                            Make this package available for purchase
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    );
                  }}
                />
              </div>
            </ScrollArea>

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={function () {
                  onOpenChange(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={isPending}>
                {isPending ? "Saving..." : isEditing ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
