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

import { useCreateStaff, useUpdateStaff, STAFF_ROLES } from "@/hooks/use-staff";

var staffSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  role: z.string().min(1, "Role is required"),
  title: z.string().optional(),
  bio: z.string().optional(),
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
          });
        } else {
          form.reset({
            name: "",
            email: "",
            phone: "",
            role: "staff",
            title: "",
            bio: "",
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
