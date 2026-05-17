"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Switch } from "@/components/ui/switch";
import { ImageInput } from "@/components/ui/image-input";

import { useCreateProduct, useUpdateProduct } from "@/hooks/use-products";
import { useProductCategories } from "@/hooks/use-product-categories";
import { useSalon } from "@/providers/salon-provider";
import { formatCurrency } from "@/lib/format";

// ─── Schema ────────────────────────────────────────────────────────────────
// Brand: 1–120 characters after trim; empty string and null collapse to null
// (Requirement 5.2, 5.5). We accept the empty string at the form layer and
// the API will persist SQL NULL.
var productSchema = z.object({
  name: z.string().trim().min(1, "Product name is required"),
  description: z.string().optional(),
  brand: z
    .string()
    .optional()
    .refine(
      function (v) {
        if (v == null || v === "") return true;
        var trimmed = v.trim();
        return trimmed.length >= 1 && trimmed.length <= 120;
      },
      { message: "Brand must be 1–120 characters" }
    ),
  sku: z.string().optional(),
  // category_id is the per-salon numeric id (Requirement 6.8). We carry it as
  // a string in the form because the Select primitive expects string values,
  // and coerce back to a number / null on submit.
  category_id: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be 0 or more"),
  cost_price: z.coerce.number().min(0).optional(),
  stock_quantity: z.coerce.number().min(0, "Stock must be 0 or more"),
  low_stock_threshold: z.coerce.number().min(0).optional(),
  is_active: z.boolean().default(true),
  // image_url: stored as the string URL returned by /api/upload, or null when
  // the user clears the image. The form holds whatever the upload widget
  // emits; the parent passes it through to the API verbatim.
  image_url: z.union([z.string(), z.null()]).optional(),
});

// Helper: normalise whatever shape the row uses into the form's category_id.
// Older rows stored a hardcoded string slug under `category`; the new rows
// store a numeric `category_id`. Form values are strings (Select primitive
// constraint), so we render an empty string when no category is bound.
function pickCategoryId(product) {
  if (!product) return "";
  if (product.category_id != null) return String(product.category_id);
  if (typeof product.category === "number") return String(product.category);
  return "";
}

export function ProductFormDialog({ open, onOpenChange, product, salonId }) {
  var createProduct = useCreateProduct();
  var updateProduct = useUpdateProduct();
  var isEditing = !!product;
  var { salon } = useSalon();
  var currency = (salon && salon.currency) || undefined;
  // Strip digits/punctuation/whitespace from `formatCurrency(0, currency)` to
  // get the bare currency symbol or code. Used purely as a column-label hint
  // next to "Selling Price" / "Cost Price"; the form fields themselves accept
  // raw numbers. Falling through to "DZD" mirrors the lib default
  // (Requirement 19.5).
  var currencyCode =
    formatCurrency(0, currency).replace(/[\d.,\s]/g, "") || "DZD";

  // Per-salon categories (Requirement 6.8). The Select renders directly from
  // this list; the hardcoded constant is gone (Task 11.4).
  var categoriesQuery = useProductCategories(salonId);
  var categories = categoriesQuery.data || [];

  // Track an in-flight image upload so the Save button can be disabled
  // (Requirement 7.9). The flag lives outside react-hook-form because it is
  // pure UI state — never persisted, never validated.
  var [isUploadingImage, setIsUploadingImage] = useState(false);

  var form = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      brand: "",
      sku: "",
      category_id: "",
      price: 0,
      cost_price: 0,
      stock_quantity: 0,
      low_stock_threshold: 5,
      is_active: true,
      image_url: null,
    },
  });

  useEffect(
    function () {
      if (!open) return;
      setIsUploadingImage(false);
      if (product) {
        form.reset({
          name: product.name || "",
          description: product.description || "",
          brand: product.brand || "",
          sku: product.sku || "",
          category_id: pickCategoryId(product),
          price: product.price || 0,
          cost_price: product.cost_price || product.costPrice || 0,
          stock_quantity:
            product.stock_quantity || product.stockQuantity || 0,
          low_stock_threshold:
            product.low_stock_threshold || product.lowStockThreshold || 5,
          is_active:
            product.isActive !== undefined
              ? product.isActive
              : product.is_active !== undefined
              ? product.is_active
              : true,
          image_url:
            product.image_url !== undefined ? product.image_url : null,
        });
      } else {
        form.reset({
          name: "",
          description: "",
          brand: "",
          sku: "",
          category_id: "",
          price: 0,
          cost_price: 0,
          stock_quantity: 0,
          low_stock_threshold: 5,
          is_active: true,
          image_url: null,
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open, product]
  );

  function onSubmit(data) {
    // Brand: trim, empty → null so the API persists SQL NULL (Requirement 5.5).
    var brandValue = null;
    if (typeof data.brand === "string") {
      var trimmed = data.brand.trim();
      brandValue = trimmed.length === 0 ? null : trimmed;
    }

    // Category: form holds the id as a string ("" when none). Convert to
    // numeric id, or null when cleared (Requirement 6.8).
    var categoryId = null;
    if (data.category_id !== undefined && data.category_id !== "") {
      var parsed = Number(data.category_id);
      if (Number.isFinite(parsed)) categoryId = parsed;
    }

    var payload = {
      name: data.name,
      description: data.description || null,
      brand: brandValue,
      sku: data.sku || null,
      category_id: categoryId,
      price: data.price,
      cost_price: data.cost_price,
      stock_quantity: data.stock_quantity,
      low_stock_threshold: data.low_stock_threshold,
      is_active: data.is_active,
      isActive: data.is_active,
      // image_url: pass through verbatim. `null` here means "clear it" — the
      // API translates that to SQL NULL (Requirement 7.7).
      image_url: data.image_url === undefined ? null : data.image_url,
      salon_id: salonId,
    };

    if (isEditing) {
      updateProduct.mutate(
        { id: product.id, data: payload },
        {
          onSuccess: function () {
            onOpenChange(false);
            form.reset();
          },
        }
      );
    } else {
      createProduct.mutate(payload, {
        onSuccess: function () {
          onOpenChange(false);
          form.reset();
        },
      });
    }
  }

  var isSubmitting = createProduct.isPending || updateProduct.isPending;
  // Save button is disabled while an upload is in flight (Requirement 7.9).
  var saveDisabled = isSubmitting || isUploadingImage;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Product" : "Add Product"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* ── Image ──────────────────────────────────────────────── */}
            <FormField
              control={form.control}
              name="image_url"
              render={function ({ field }) {
                return (
                  <FormItem>
                    <FormLabel>Product Image</FormLabel>
                    <FormControl>
                      <ImageInput
                        value={field.value}
                        onChange={field.onChange}
                        onUploadingChange={setIsUploadingImage}
                        type="products"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      PNG or JPG up to 5 MB. Clear and save to remove.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <FormField
              control={form.control}
              name="name"
              render={function ({ field }) {
                return (
                  <FormItem>
                    <FormLabel>Product Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Shampoo Pro 250ml" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="brand"
                render={function ({ field }) {
                  return (
                    <FormItem>
                      <FormLabel>Brand</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., L'Oréal"
                          maxLength={120}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Up to 120 characters
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="sku"
                render={function ({ field }) {
                  return (
                    <FormItem>
                      <FormLabel>SKU</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., SHP-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>

            {/* ── Category (per-salon, dynamic) ──────────────────────── */}
            <FormField
              control={form.control}
              name="category_id"
              render={function ({ field }) {
                var disabled = categoriesQuery.isLoading || categories.length === 0;
                var placeholder = categoriesQuery.isLoading
                  ? "Loading categories…"
                  : categories.length === 0
                  ? "No categories yet — create one in Manage categories"
                  : "Select category";
                return (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      value={field.value || ""}
                      onValueChange={field.onChange}
                      disabled={disabled}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={placeholder} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
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

            <FormField
              control={form.control}
              name="description"
              render={function ({ field }) {
                return (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Product description..."
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={function ({ field }) {
                  return (
                    <FormItem>
                      <FormLabel>
                        Selling Price ({currencyCode}) *
                      </FormLabel>
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

              <FormField
                control={form.control}
                name="cost_price"
                render={function ({ field }) {
                  return (
                    <FormItem>
                      <FormLabel>
                        Cost Price ({currencyCode})
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        For profit tracking
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="stock_quantity"
                render={function ({ field }) {
                  return (
                    <FormItem>
                      <FormLabel>Stock Quantity *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
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
                name="low_stock_threshold"
                render={function ({ field }) {
                  return (
                    <FormItem>
                      <FormLabel>Low Stock Alert</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="5"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Alert when stock falls below
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>

            {isEditing && (
              <div className="pb-4">
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Active Status
                        </FormLabel>
                        <FormDescription>
                          Turn off to hide this product from availability and marketplace.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={function () {
                  onOpenChange(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saveDisabled}>
                {(isSubmitting || isUploadingImage) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {isUploadingImage
                  ? "Uploading…"
                  : isEditing
                  ? "Save Changes"
                  : "Add Product"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
