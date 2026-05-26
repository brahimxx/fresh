"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, User, Phone, Mail, Briefcase, MapPin, Calendar } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
import { Skeleton } from "@/components/ui/skeleton";

import { useCreateStaff, useUpdateStaff, useStaffMember, STAFF_ROLES } from "@/hooks/use-staff";

const staffSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  phoneSecondary: z.string().optional(),
  role: z.string().min(1, "Role is required"),
  title: z.string().optional(),
  bio: z.string().optional(),
  country: z.string().optional(),
  birthday: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  employmentType: z.string().optional(),
  notes: z.string().optional(),
  is_active: z.boolean().default(true),
  is_visible: z.boolean().default(true),
  can_physical: z.boolean().default(true),
  can_mobile: z.boolean().default(false),
  can_virtual: z.boolean().default(false),
});

export function StaffFormDialog({ open, onOpenChange, staff, salonId }) {
  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff();
  const isEditing = !!staff;

  // Fetch full staff detail when editing
  const { data: fullStaff, isLoading: detailLoading } = useStaffMember(
    isEditing ? staff?.id : null,
    { enabled: isEditing && open }
  );

  const form = useForm({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      phoneSecondary: "",
      role: "staff",
      title: "",
      bio: "",
      country: "",
      birthday: "",
      startDate: "",
      endDate: "",
      employmentType: "employee",
      notes: "",
      is_active: true,
      is_visible: true,
      can_physical: true,
      can_mobile: false,
      can_virtual: false,
    },
  });

  // Reset form when dialog opens or full staff data loads
  useEffect(() => {
    if (!open) return;

    if (isEditing && fullStaff) {
      const staffName = ((fullStaff.firstName || "") + " " + (fullStaff.lastName || "")).trim();
      form.reset({
        name: staffName,
        email: fullStaff.email || "",
        phone: fullStaff.phone || "",
        phoneSecondary: fullStaff.phoneSecondary || "",
        role: fullStaff.role || "staff",
        title: fullStaff.title || "",
        bio: fullStaff.bio || "",
        country: fullStaff.country || "",
        birthday: fullStaff.birthday ? String(fullStaff.birthday).slice(0, 10) : "",
        startDate: fullStaff.startDate ? String(fullStaff.startDate).slice(0, 10) : "",
        endDate: fullStaff.endDate ? String(fullStaff.endDate).slice(0, 10) : "",
        employmentType: fullStaff.employmentType || "employee",
        notes: fullStaff.notes || "",
        is_active: fullStaff.isActive !== undefined ? !!fullStaff.isActive : true,
        is_visible: fullStaff.isVisible !== undefined ? !!fullStaff.isVisible : true,
        can_physical: fullStaff.canPhysical !== undefined ? !!fullStaff.canPhysical : true,
        can_mobile: fullStaff.canMobile !== undefined ? !!fullStaff.canMobile : false,
        can_virtual: fullStaff.canVirtual !== undefined ? !!fullStaff.canVirtual : false,
      });
    } else if (!isEditing) {
      form.reset({
        name: "",
        email: "",
        phone: "",
        phoneSecondary: "",
        role: "staff",
        title: "",
        bio: "",
        country: "",
        birthday: "",
        startDate: "",
        endDate: "",
        employmentType: "employee",
        notes: "",
        is_active: true,
        is_visible: true,
        can_physical: true,
        can_mobile: false,
        can_virtual: false,
      });
    }
  }, [open, fullStaff, isEditing]);

  function onSubmit(data) {
    const payload = {
      ...data,
      salon_id: salonId,
      email: data.email || null,
      phone: data.phone || null,
      phoneSecondary: data.phoneSecondary || null,
      country: data.country || null,
      birthday: data.birthday || null,
      startDate: data.startDate || null,
      endDate: data.endDate || null,
      employmentType: data.employmentType || null,
      notes: data.notes || null,
      isActive: data.is_active,
      isVisible: data.is_visible,
      canPhysical: data.can_physical,
      canMobile: data.can_mobile,
      canVirtual: data.can_virtual,
    };

    if (isEditing) {
      updateStaff.mutate(
        { id: staff.id, data: payload },
        { onSuccess: () => { onOpenChange(false); form.reset(); } }
      );
    } else {
      createStaff.mutate(payload, {
        onSuccess: () => { onOpenChange(false); form.reset(); },
      });
    }
  }

  const isSubmitting = createStaff.isPending || updateStaff.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
        {isEditing && detailLoading ? (
          <div className="p-6 space-y-6">
            <SheetHeader>
              <SheetTitle className="text-xl font-bold">Edit Team Member</SheetTitle>
              <SheetDescription>Loading member details...</SheetDescription>
            </SheetHeader>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
            {/* Header */}
            <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/50">
              <SheetTitle className="text-xl font-bold">
                {isEditing ? "Edit Team Member" : "Add Team Member"}
              </SheetTitle>
              <SheetDescription>
                {isEditing
                  ? "Update this team member's details."
                  : "Add a new member to your team. Name and role are required."}
              </SheetDescription>
            </SheetHeader>

            {/* Form Body */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {/* Section: Identity */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground uppercase tracking-wider">
                  <User className="h-3.5 w-3.5" />
                  Identity
                </div>

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold">
                        Full Name <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Sarah Johnson" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold">
                          Role <span className="text-destructive">*</span>
                        </FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {STAFF_ROLES.map((role) => (
                              <SelectItem key={role.value} value={role.value}>
                                {role.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold">Job Title</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Senior Stylist" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator className="bg-border/50" />

              {/* Section: Contact */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground uppercase tracking-wider">
                  <Phone className="h-3.5 w-3.5" />
                  Contact
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold">Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="email@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold">Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="+33 6 12 34 56 78" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="phoneSecondary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold">Secondary Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="Optional backup number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator className="bg-border/50" />

              {/* Section: Personal */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground uppercase tracking-wider">
                  <Calendar className="h-3.5 w-3.5" />
                  Personal
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold">Country</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., France" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="birthday"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold">Birthday</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold">Bio</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Brief bio visible to clients when booking..."
                          rows={3}
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator className="bg-border/50" />

              {/* Section: Employment */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground uppercase tracking-wider">
                  <Briefcase className="h-3.5 w-3.5" />
                  Employment
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold">Start Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold">End Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="employmentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold">Employment Type</FormLabel>
                      <Select value={field.value || "employee"} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="employee">Employee</SelectItem>
                          <SelectItem value="self_employed">Self-Employed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold">Internal Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Private notes (only visible to managers/owners)..."
                          rows={2}
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator className="bg-border/50" />

              {/* Section: Service Modes */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground uppercase tracking-wider">
                  <MapPin className="h-3.5 w-3.5" />
                  Service Modes
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <FormField
                    control={form.control}
                    name="can_physical"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-xl border border-border/50 p-4">
                        <div>
                          <FormLabel className="font-semibold text-sm">In-Salon</FormLabel>
                          <FormDescription className="text-xs">Can perform services at the salon</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="can_mobile"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-xl border border-border/50 p-4">
                        <div>
                          <FormLabel className="font-semibold text-sm">Mobile</FormLabel>
                          <FormDescription className="text-xs">Can travel to client locations</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="can_virtual"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-xl border border-border/50 p-4">
                        <div>
                          <FormLabel className="font-semibold text-sm">Virtual</FormLabel>
                          <FormDescription className="text-xs">Can do video-call appointments</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Visibility & Active Status */}
              <Separator className="bg-border/50" />
              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="is_visible"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-xl border border-border/50 p-4">
                      <div>
                        <FormLabel className="font-semibold text-sm">Visible to Clients</FormLabel>
                        <FormDescription className="text-xs">
                          Show in booking widget and marketplace
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {isEditing && (
                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-xl border border-border/50 p-4">
                        <div>
                          <FormLabel className="font-semibold text-sm">Active</FormLabel>
                          <FormDescription className="text-xs">
                            Inactive members are hidden from the schedule
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-border/50 px-6 py-4 flex items-center justify-end gap-3 bg-muted/5">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" className="rounded-xl min-w-[120px]" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : isEditing ? (
                  "Save Changes"
                ) : (
                  "Add Member"
                )}
              </Button>
            </div>
          </form>
        </Form>
        )}
      </SheetContent>
    </Sheet>
  );
}
