"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { RefreshCw, Calendar as CalendarIcon } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";

import {
  useCreateDiscount,
  useUpdateDiscount,
  DISCOUNT_TYPES,
  generateDiscountCode,
} from "@/hooks/use-discounts";
import { useServices } from "@/hooks/use-services";
import { useProducts } from "@/hooks/use-products";

var discountSchema = z.object({
  code: z.string().min(1, "Code is required").max(20),
  name: z.string().optional(),
  type: z.enum(["percentage", "fixed"]),
  value: z.coerce.number().min(0.01, "Value must be greater than 0"),
  min_purchase: z.coerce.number().min(0).optional(),
  max_uses: z.coerce.number().min(0).optional().nullable(),
  start_date: z.date().optional().nullable(),
  end_date: z.date().optional().nullable(),
  is_active: z.boolean(),
  applies_to_services: z.boolean().default(true),
  applies_to_products: z.boolean().default(true),
  specific_services: z.array(z.coerce.number()).optional().default([]),
  specific_products: z.array(z.coerce.number()).optional().default([]),
});

export function DiscountForm({
  open,
  onOpenChange,
  salonId,
  discount,
  onSuccess,
}) {
  var { toast } = useToast();
  var createDiscount = useCreateDiscount();
  var updateDiscount = useUpdateDiscount();

  var { data: services } = useServices(salonId);
  var { data: products } = useProducts(salonId);

  var isEditing = !!discount;

  var form = useForm({
    resolver: zodResolver(discountSchema),
    defaultValues: {
      code: "",
      name: "",
      type: "percentage",
      value: 10,
      min_purchase: 0,
      max_uses: null,
      start_date: null,
      end_date: null,
      is_active: true,
      applies_to_services: true,
      applies_to_products: true,
      specific_services: [],
      specific_products: [],
    },
  });

  // Reset form when discount changes
  useEffect(
    function () {
      if (open) {
        if (discount) {
          form.reset({
            code: discount.code || "",
            name: discount.name || "",
            type: discount.type || "percentage",
            value: Number(discount.value) || 10,
            min_purchase:
              Number(discount.min_purchase || discount.minPurchase) || 0,
            max_uses: discount.max_uses || discount.maxUses || null,
            start_date:
              discount.start_date || discount.startDate
                ? new Date(discount.start_date || discount.startDate)
                : null,
            end_date:
              discount.end_date || discount.endDate
                ? new Date(discount.end_date || discount.endDate)
                : null,
            is_active:
              discount.is_active !== false && discount.isActive !== false,
            applies_to_services:
              discount.applies_to_services !== false && discount.appliesToServices !== false,
            applies_to_products:
              discount.applies_to_products !== false && discount.appliesToProducts !== false,
            specific_services: discount.specificServices || discount.specific_services || [],
            specific_products: discount.specificProducts || discount.specific_products || [],
          });
        } else {
          form.reset({
            code: "",
            name: "",
            type: "percentage",
            value: 10,
            min_purchase: 0,
            max_uses: null,
            start_date: null,
            end_date: null,
            is_active: true,
            applies_to_services: true,
            applies_to_products: true,
            specific_services: [],
            specific_products: [],
          });
        }
      }
    },
    [open, discount]
  );

  function handleGenerateCode() {
    var code = generateDiscountCode();
    form.setValue("code", code);
  }

  function onSubmit(data) {
    var payload = {
      ...data,
      salon_id: salonId,
      start_date: data.start_date
        ? format(data.start_date, "yyyy-MM-dd")
        : null,
      end_date: data.end_date ? format(data.end_date, "yyyy-MM-dd") : null,
    };

    if (isEditing) {
      updateDiscount.mutate(
        {
          discountId: discount.id,
          data: payload,
        },
        {
          onSuccess: function () {
            toast({ title: "Discount updated" });
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
      createDiscount.mutate(payload, {
        onSuccess: function () {
          toast({ title: "Discount created" });
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

  var isPending = createDiscount.isPending || updateDiscount.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Discount" : "Create Discount"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <ScrollArea className="h-[60vh] pr-4">
              <div className="space-y-4">
                {/* Code */}
                <FormField
                  control={form.control}
                  name="code"
                  render={function ({ field }) {
                    return (
                      <FormItem>
                        <FormLabel>Discount Code</FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="e.g., SUMMER20"
                              className="font-mono uppercase"
                              onChange={function (e) {
                                field.onChange(e.target.value.toUpperCase());
                              }}
                            />
                          </FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={handleGenerateCode}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                {/* Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={function ({ field }) {
                    return (
                      <FormItem>
                        <FormLabel>Name (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Summer Special 20%" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                {/* Type and Value */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={function ({ field }) {
                      return (
                        <FormItem>
                          <FormLabel>Type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {DISCOUNT_TYPES.map(function (type) {
                                return (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
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
                    name="value"
                    render={function ({ field }) {
                      return (
                        <FormItem>
                          <FormLabel>Value</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-2.5 text-muted-foreground">
                                {form.watch("type") === "percentage" ? "%" : "€"}
                              </span>
                              <Input {...field} type="number" className="pl-8" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                </div>

                {/* Min Purchase & Max Uses */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="min_purchase"
                    render={function ({ field }) {
                      return (
                        <FormItem>
                          <FormLabel>Min Purchase (€)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

                  <FormField
                    control={form.control}
                    name="max_uses"
                    render={function ({ field }) {
                      return (
                        <FormItem>
                          <FormLabel>Max Uses</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              value={field.value || ""}
                              placeholder="Unlimited"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="start_date"
                    render={function ({ field }) {
                      return (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className="w-full justify-start font-normal"
                                >
                                  <CalendarIcon className="h-4 w-4 mr-2" />
                                  {field.value
                                    ? format(field.value, "MMM d, yyyy")
                                    : "Select"}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

                  <FormField
                    control={form.control}
                    name="end_date"
                    render={function ({ field }) {
                      return (
                        <FormItem>
                          <FormLabel>End Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className="w-full justify-start font-normal"
                                >
                                  <CalendarIcon className="h-4 w-4 mr-2" />
                                  {field.value
                                    ? format(field.value, "MMM d, yyyy")
                                    : "Select"}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="applies_to_services"
                  render={function ({ field }) {
                    return (
                      <FormItem className="flex flex-col rounded-lg border p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <FormLabel>Applies to Services</FormLabel>
                            <FormDescription>
                              Allow this discount to be used on services
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </div>
                        {field.value && services && services.length > 0 && (
                          <div className="mt-4 border-t pt-4">
                            <FormLabel className="mb-2 block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Specific Services (Leave empty for all)
                            </FormLabel>
                            <ScrollArea className="h-30 rounded-md border p-2">
                              <div className="space-y-4">
                                {services.map((svc) => (
                                  <FormField
                                    key={svc.id}
                                    control={form.control}
                                    name="specific_services"
                                    render={({ field: svcField }) => {
                                      return (
                                        <FormItem
                                          key={svc.id}
                                          className="flex flex-row items-start space-x-3 space-y-0"
                                        >
                                          <FormControl>
                                            <Checkbox
                                              checked={svcField.value?.includes(svc.id)}
                                              onCheckedChange={(checked) => {
                                                return checked
                                                  ? svcField.onChange([...svcField.value, svc.id])
                                                  : svcField.onChange(
                                                      svcField.value?.filter(
                                                        (value) => value !== svc.id
                                                      )
                                                    )
                                              }}
                                            />
                                          </FormControl>
                                          <FormLabel className="text-sm font-normal">
                                            {svc.name}
                                          </FormLabel>
                                        </FormItem>
                                      )
                                    }}
                                  />
                                ))}
                              </div>
                            </ScrollArea>
                          </div>
                        )}
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="applies_to_products"
                  render={function ({ field }) {
                    return (
                      <FormItem className="flex flex-col rounded-lg border p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <FormLabel>Applies to Products</FormLabel>
                            <FormDescription>
                              Allow this discount to be used on products
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </div>
                        {field.value && products && products.length > 0 && (
                          <div className="mt-4 border-t pt-4">
                            <FormLabel className="mb-2 block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Specific Products (Leave empty for all)
                            </FormLabel>
                            <ScrollArea className="h-30 rounded-md border p-2">
                              <div className="space-y-4">
                                {products.map((prd) => (
                                  <FormField
                                    key={prd.id}
                                    control={form.control}
                                    name="specific_products"
                                    render={({ field: prdField }) => {
                                      return (
                                        <FormItem
                                          key={prd.id}
                                          className="flex flex-row items-start space-x-3 space-y-0"
                                        >
                                          <FormControl>
                                            <Checkbox
                                              checked={prdField.value?.includes(prd.id)}
                                              onCheckedChange={(checked) => {
                                                return checked
                                                  ? prdField.onChange([...prdField.value, prd.id])
                                                  : prdField.onChange(
                                                      prdField.value?.filter(
                                                        (value) => value !== prd.id
                                                      )
                                                    )
                                              }}
                                            />
                                          </FormControl>
                                          <FormLabel className="text-sm font-normal">
                                            {prd.name}
                                          </FormLabel>
                                        </FormItem>
                                      )
                                    }}
                                  />
                                ))}
                              </div>
                            </ScrollArea>
                          </div>
                        )}
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
                            Enable this discount code for customers
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
            <div className="flex gap-2 pt-4">
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
