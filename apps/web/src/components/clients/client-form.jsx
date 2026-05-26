"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  MessageSquare,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useCreateClient, useUpdateClient } from "@/hooks/use-clients";
import { decodeId } from "@/lib/id";

// Validation: first_name and phone required, email optional
const clientSchema = z
  .object({
    first_name: z.string().min(1, "First name is required"),
    last_name: z.string().optional(),
    email: z.string().email("Enter a valid email").optional().or(z.literal("")),
    phone: z.string().min(1, "Phone number is required"),
    gender: z.enum(["male", "female", "other", "none", ""]).optional(),
    date_of_birth: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    postal_code: z.string().optional(),
    notes: z.string().optional(),
  });

export function ClientFormDialog({ open, onOpenChange, client, salonId }) {
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const isEditing = !!client;

  const form = useForm({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      gender: "",
      date_of_birth: "",
      address: "",
      city: "",
      postal_code: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (client) {
        form.reset({
          first_name: client.first_name || client.firstName || "",
          last_name: client.last_name || client.lastName || "",
          email: client.email || "",
          phone: client.phone || "",
          gender: client.gender || "",
          date_of_birth: client.date_of_birth || client.dateOfBirth || "",
          address: client.address || "",
          city: client.city || "",
          postal_code: client.postal_code || client.postalCode || "",
          notes: client.notes || "",
        });
      } else {
        form.reset({
          first_name: "",
          last_name: "",
          email: "",
          phone: "",
          gender: "",
          date_of_birth: "",
          address: "",
          city: "",
          postal_code: "",
          notes: "",
        });
      }
    }
  }, [open, client]);

  function onSubmit(data) {
    const payload = { ...data, salon_id: decodeId(salonId) };

    // Clean empty strings and 'none' gender
    Object.keys(payload).forEach((key) => {
      if (payload[key] === "" || payload[key] === "none") {
        delete payload[key];
      }
    });

    if (isEditing) {
      updateClient.mutate(
        { id: client.id, data: payload },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createClient.mutate(payload, {
        onSuccess: () => onOpenChange(false),
      });
    }
  }

  const isPending = createClient.isPending || updateClient.isPending;
  const errors = form.formState.errors;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/50">
            <SheetTitle className="text-xl font-bold">
              {isEditing ? "Edit Client" : "Add Client"}
            </SheetTitle>
            <SheetDescription>
              {isEditing
                ? "Update this client's information."
                : "Add a new client to your list. First name and phone number are required."}
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name" className="text-sm font-semibold">
                    First Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="first_name"
                    {...form.register("first_name")}
                    placeholder="Jane"
                    className={errors.first_name ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {errors.first_name && (
                    <p className="text-xs text-destructive font-medium">
                      {errors.first_name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name" className="text-sm font-semibold">
                    Last Name
                  </Label>
                  <Input
                    id="last_name"
                    {...form.register("last_name")}
                    placeholder="Smith"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Gender</Label>
                  <Select
                    value={form.watch("gender") || "none"}
                    onValueChange={(value) => form.setValue("gender", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not specified</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date_of_birth" className="text-sm font-semibold">
                    Birthday
                  </Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    {...form.register("date_of_birth")}
                  />
                </div>
              </div>
            </div>

            <Separator className="bg-border/50" />

            {/* Section: Contact */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground uppercase tracking-wider">
                <Phone className="h-3.5 w-3.5" />
                Contact
              </div>

              {/* Contact section */}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
                  <Input
                    id="email"
                    type="email"
                    {...form.register("email")}
                    placeholder="jane@example.com"
                    className={`pl-10 ${errors.email ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-destructive font-medium">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-semibold">
                  Phone <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
                  <Input
                    id="phone"
                    {...form.register("phone")}
                    placeholder="+33 6 12 34 56 78"
                    className={`pl-10 ${errors.phone ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  />
                </div>
                {errors.phone && (
                  <p className="text-xs text-destructive font-medium">
                    {errors.phone.message}
                  </p>
                )}
              </div>
            </div>

            <Separator className="bg-border/50" />

            {/* Section: Address */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground uppercase tracking-wider">
                <MapPin className="h-3.5 w-3.5" />
                Address
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="text-sm font-semibold">
                  Street Address
                </Label>
                <Input
                  id="address"
                  {...form.register("address")}
                  placeholder="123 Rue de la Paix"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-sm font-semibold">
                    City
                  </Label>
                  <Input
                    id="city"
                    {...form.register("city")}
                    placeholder="Paris"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postal_code" className="text-sm font-semibold">
                    Postal Code
                  </Label>
                  <Input
                    id="postal_code"
                    {...form.register("postal_code")}
                    placeholder="75001"
                  />
                </div>
              </div>
            </div>

            <Separator className="bg-border/50" />

            {/* Section: Notes */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground uppercase tracking-wider">
                <MessageSquare className="h-3.5 w-3.5" />
                Notes
              </div>

              <div className="space-y-2">
                <Textarea
                  id="notes"
                  {...form.register("notes")}
                  placeholder="Preferences, allergies, or anything useful to remember..."
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-border/50 px-6 py-4 flex items-center justify-end gap-3 bg-muted/5">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-xl min-w-[120px]"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : isEditing ? (
                "Save Changes"
              ) : (
                "Add Client"
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
