"use client";

import { useEffect } from "react";
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

import { useCreateStaff, useUpdateStaff, STAFF_ROLES } from "@/hooks/use-staff";

var staffSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  role: z.string().min(1, "Role is required"),
  title: z.string().optional(),
  bio: z.string().optional(),
  is_active: z.boolean().default(true),
  can_physical: z.boolean().default(true),
  can_mobile: z.boolean().default(false),
  can_virtual: z.boolean().default(false),
});

export function StaffFormDialog({ open, onOpenChange, staff, salonId }) {
  var createStaff = useCreateStaff();
  var updateStaff = useUpdateStaff();
  var isEditing = !!staff;

  var form = useForm({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      role: "staff",
      title: "",
      bio: "",
      is_active: true,
      can_physical: true,
      can_mobile: false,
      can_virtual: false,
    },
  });

  // Reset form when dialog opens/closes or staff changes
  useEffect(
    function () {
      if (open) {
        if (staff) {
          // Handle both formats - API returns firstName/lastName, form uses name
          var staffName =
            staff.name ||
            (
              (staff.firstName || staff.first_name || "") +
              " " +
              (staff.lastName || staff.last_name || "")
            ).trim();
          form.reset({
            name: staffName,
            email: staff.email || "",
            phone: staff.phone || "",
            role: staff.role || "staff",
            title: staff.title || "",
            bio: staff.bio || "",
            is_active: staff.isActive !== undefined ? staff.isActive : (staff.is_active !== undefined ? staff.is_active : true),
            can_physical: staff.canPhysical !== undefined ? staff.canPhysical : (staff.can_physical !== undefined ? staff.can_physical : true),
            can_mobile: staff.canMobile !== undefined ? staff.canMobile : (staff.can_mobile !== undefined ? staff.can_mobile : false),
            can_virtual: staff.canVirtual !== undefined ? staff.canVirtual : (staff.can_virtual !== undefined ? staff.can_virtual : false),
          });
        } else {
          form.reset({
            name: "",
            email: "",
            phone: "",
            role: "staff",
            title: "",
            bio: "",
            is_active: true,
            can_physical: true,
            can_mobile: false,
            can_virtual: false,
          });
        }
      }
    },
    [open, staff]
  );

  function onSubmit(data) {
    var payload = {
      ...data,
      salon_id: salonId,
      email: data.email || null,
      isActive: data.is_active,
      canPhysical: data.can_physical,
      canMobile: data.can_mobile,
      canVirtual: data.can_virtual,
    };

    if (isEditing) {
      updateStaff.mutate(
        { id: staff.id, data: payload },
        {
          onSuccess: function () {
            onOpenChange(false);
            form.reset();
          },
        }
      );
    } else {
      createStaff.mutate(payload, {
        onSuccess: function () {
          onOpenChange(false);
          form.reset();
        },
      });
    }
  }

  var isSubmitting = createStaff.isPending || updateStaff.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Team Member" : "Add Team Member"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={function ({ field }) {
                return (
                  <FormItem>
                    <FormLabel>Full Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Sarah Johnson" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={function ({ field }) {
                  return (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="email@example.com"
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
                name="phone"
                render={function ({ field }) {
                  return (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="+33 6 12 34 56 78" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>

            <FormField
              control={form.control}
              name="role"
              render={function ({ field }) {
                return (
                  <FormItem>
                    <FormLabel>Role *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STAFF_ROLES.map(function (role) {
                          return (
                            <SelectItem key={role.value} value={role.value}>
                              {role.label}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-xs">
                      Determines permissions and visibility
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <FormField
              control={form.control}
              name="title"
              render={function ({ field }) {
                return (
                  <FormItem>
                    <FormLabel>Job Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Senior Stylist" {...field} />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Displayed to clients when booking
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <FormField
              control={form.control}
              name="bio"
              render={function ({ field }) {
                return (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Brief bio for clients to see..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <div className="space-y-3 pt-2">
              <FormLabel className="text-sm font-semibold">Fulfillment Capabilities</FormLabel>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="can_physical"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0 rounded-md border p-3">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer text-sm">
                        In-Salon
                      </FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="can_mobile"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0 rounded-md border p-3">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer text-sm">
                        Mobile
                      </FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="can_virtual"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0 rounded-md border p-3">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer text-sm">
                        Virtual
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {isEditing && (
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 mt-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Active Status
                      </FormLabel>
                      <FormDescription>
                        Turn off to hide this staff member from the salon schedule and marketplace.
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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {isEditing ? "Save Changes" : "Add Member"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
