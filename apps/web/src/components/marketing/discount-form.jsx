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
                      <Input {...field} placeholder="e.g., Summer Sale 2026" />
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
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
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
                  var type = form.watch("type");
                  return (
                    <FormItem>
                      <FormLabel>Value</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            {type === "percentage" ? "%" : "$"}
                          </span>
                          <Input
                            type="number"
                            step={type === "percentage" ? "1" : "0.01"}
                            min="0"
                            max={type === "percentage" ? "100" : undefined}
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
            </div>

            {/* Min Purchase */}
            <FormField
              control={form.control}
              name="min_purchase"
              render={function ({ field }) {
                return (
                  <FormItem>
                    <FormLabel>Minimum Purchase (Optional)</FormLabel>
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
                    <FormDescription>Leave 0 for no minimum</FormDescription>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            {/* Max Uses */}
            <FormField
              control={form.control}
              name="max_uses"
              render={function ({ field }) {
                return (
                  <FormItem>
                    <FormLabel>Usage Limit (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        {...field}
                        value={field.value || ""}
                        onChange={function (e) {
                          var val = e.target.value;
                          field.onChange(val ? parseInt(val) : null);
                        }}
                        placeholder="Unlimited"
                      />
                    </FormControl>
                    <FormDescription>
                      Maximum number of times this code can be used
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

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
