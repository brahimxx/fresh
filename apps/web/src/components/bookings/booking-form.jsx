"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Search, Plus, User, Check } from "lucide-react";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

import { useSalon } from "@/providers/salon-provider";
import { useServices } from "@/hooks/use-services";
import { useStaff, useAvailability } from "@/hooks/use-staff";
import { useClientSearch, useCreateClient } from "@/hooks/use-clients";
import { useCreateBooking } from "@/hooks/use-bookings";

var bookingSchema = z.object({
  clientId: z.string().optional(),
  clientName: z.string().optional(),
  clientEmail: z.string().email().optional().or(z.literal("")),
  clientPhone: z.string().optional(),
  serviceIds: z.array(z.string()).min(1, "Please select at least one service"),
  staffId: z.string().min(1, "Please select a staff member"),
  date: z.date({ required_error: "Please select a date" }),
  time: z.string().min(1, "Please select a time"),
  notes: z.string().optional(),
});

export function BookingFormDialog({
  open,
  onOpenChange,
  initialDate,
  salonId: propSalonId,
}) {
  var { salonId: contextSalonId } = useSalon();
  var salonId = propSalonId || contextSalonId;
  var [clientSearch, setClientSearch] = useState("");
  var [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  var [selectedClient, setSelectedClient] = useState(null);
  var [showNewClient, setShowNewClient] = useState(false);
  var [timeError, setTimeError] = useState("");
  var [clientError, setClientError] = useState("");
  var [formError, setFormError] = useState("");
  var [isValidating, setIsValidating] = useState(false);

  var { data: services, isLoading: servicesLoading } = useServices(salonId);
  var { data: staff, isLoading: staffLoading } = useStaff(salonId);


  var { data: clients, isLoading: clientsLoading } = useClientSearch(
    clientSearch,
    salonId,
  );

  var createBooking = useCreateBooking();
  var createClient = useCreateClient();

  var form = useForm({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      clientId: "",
      clientName: "",
      clientEmail: "",
      clientPhone: "",
      serviceIds: [],
      staffId: "",
      date: initialDate || new Date(),
      time: "",
      notes: "",
    },
  });

  // Reset form when dialog opens with a new date/time
  useEffect(() => {
    if (open && initialDate) {
      const dateObj = new Date(initialDate);
      const hours = dateObj.getHours();
      const minutes = dateObj.getMinutes();

      // Round to nearest 15-minute interval
      const roundedMinutes = Math.round(minutes / 15) * 15;
      const finalHours = roundedMinutes === 60 ? hours + 1 : hours;
      const finalMinutes = roundedMinutes === 60 ? 0 : roundedMinutes;

      const hoursStr = finalHours.toString().padStart(2, "0");
      const minutesStr = finalMinutes.toString().padStart(2, "0");
      const timeString = `${hoursStr}:${minutesStr}`;

      // Reset basic fields
      form.resetField("clientId");
      form.resetField("clientName");
      form.resetField("clientEmail");
      form.resetField("clientPhone");
      form.setValue("serviceIds", []);
      form.resetField("staffId");
      form.resetField("notes");

      // Set date and time explicitly
      form.setValue("date", dateObj);
      form.setValue("time", timeString);

      // Clear client selection
      setSelectedClient(null);
      setShowNewClient(false);
      setClientError("");
      setTimeError("");
      setFormError("");
    }
  }, [open, initialDate, form]);

  var watchDate = form.watch("date");
  var watchServiceIds = form.watch("serviceIds") || [];

  // Filter staff: must be able to perform ALL selected services
  var filteredStaff =
    Array.isArray(staff) && watchServiceIds.length > 0
      ? staff.filter(function (member) {
          var memberServiceIds = [];
          if (Array.isArray(member.service_ids)) {
            memberServiceIds = member.service_ids.map(Number);
          } else if (Array.isArray(member.services)) {
            memberServiceIds = member.services.map(function (s) { return s.id; });
          }
          return watchServiceIds.every(function (id) {
            return memberServiceIds.includes(parseInt(id, 10));
          });
        })
      : Array.isArray(staff)
        ? staff
        : [];

  // Don't fallback to showing all staff - if no staff can do the service, show empty
  var showAllStaff = false;

  var { data: availability } = useAvailability(salonId, {
    date: watchDate ? format(watchDate, "yyyy-MM-dd") : null,
    serviceId: watchServiceIds[0] || null,
  });

  // Reset staff when services change
  useEffect(() => {
    form.setValue("staffId", "");
  }, [JSON.stringify(watchServiceIds)]);

  function handleClientSelect(client) {
    setSelectedClient(client);
    form.setValue("clientId", String(client.id));
    var firstName = client.firstName || client.first_name || "";
    var lastName = client.lastName || client.last_name || "";
    form.setValue("clientName", (firstName + " " + lastName).trim());
    setClientSearch("");
    setClientDropdownOpen(false);
    setClientError("");
  }

  function handleClearClient() {
    setSelectedClient(null);
    form.setValue("clientId", "");
    form.setValue("clientName", "");
    setClientError("");
  }

  async function onSubmit(data) {
    setTimeError("");
    setClientError("");
    setFormError("");
    setIsValidating(true);

    try {
      var clientId = data.clientId;

      // Guard: must have selected an existing client OR be in new-client mode with a name
      if (!clientId && !showNewClient) {
        setClientError("Please select an existing client or create a new one.");
        setIsValidating(false);
        return;
      }

      // Create new client if needed
      if (!clientId && showNewClient) {
        if (!data.clientPhone?.trim()) {
          setClientError("Phone number is required to create a new client.");
          setIsValidating(false);
          return;
        }
        if (!data.clientName?.trim()) {
          setClientError("Please enter a name for the new client.");
          setIsValidating(false);
          return;
        }

        try {
          var nameParts = data.clientName.trim().split(/\s+/);
          var newClient = await createClient.mutateAsync({
            salonId: salonId,
            firstName: nameParts[0],
            lastName: nameParts.slice(1).join(" ") || "",
            email: data.clientEmail || undefined,
            phone: data.clientPhone || undefined,
          });
          clientId = String(newClient.data.id);
        } catch (clientErr) {
          setClientError(
            clientErr.message || "Failed to create client. Please try again.",
          );
          setIsValidating(false);
          return;
        }
      }

      // Build start datetime as local time string — no UTC conversion (Algeria UTC+1).
      // End time is computed server-side from DB service durations; never sent by client.
      var timeParts = data.time.split(":");
      var startDate = new Date(data.date);
      startDate.setHours(parseInt(timeParts[0]), parseInt(timeParts[1]), 0, 0);

      await createBooking.mutateAsync({
        salonId: salonId,
        clientId: clientId,
        staffId: data.staffId,
        serviceIds: data.serviceIds,
        startDatetime: format(startDate, "yyyy-MM-dd'T'HH:mm:ss"),
        source: "direct",
        notes: data.notes || undefined,
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Booking error:", error);

      // api-client stores the parsed JSON body in error.data
      var code = error.code || error.data?.code;

      // Map every code that createSafeBooking (booking.js) or the route can throw
      // to the appropriate inline error field.
      if (
        code === "STAFF_NOT_WORKING" ||
        code === "OUTSIDE_WORKING_HOURS" ||
        code === "STAFF_UNAVAILABLE"
      ) {
        setTimeError(
          error.message || "The selected staff member is not working at this time",
        );
      } else if (code === "SERVICE_EXCEEDS_SHIFT") {
        setTimeError(
          error.message || "This service would extend past the staff member's working hours",
        );
      } else if (code === "STAFF_ON_LEAVE") {
        setTimeError(
          error.message || "The selected staff member is on approved time off during this period",
        );
      } else if (code === "BOOKING_CONFLICT" || code === "CONFLICT") {
        setTimeError(
          "This time slot is already booked. Please choose another time.",
        );
      } else if (code === "STAFF_SERVICE_MISMATCH") {
        setFormError(
          error.message || "The selected staff cannot perform one or more of the selected services.",
        );
      } else if (code === "CLIENT_NOT_FOUND") {
        setFormError(
          "Client not found. Please search and select a valid client.",
        );
      } else if (code === "DATETIME_TOO_FAR_IN_PAST") {
        setTimeError(
          "Booking start time cannot be more than 24 hours in the past.",
        );
      } else if (code === "INVALID_PRICE") {
        setFormError(
          error.message || "One of the selected services has an invalid price.",
        );
      } else if (error.message) {
        setFormError(error.message);
      } else {
        setFormError("Failed to create booking. Please try again.");
      }
    } finally {
      setIsValidating(false);
    }
  }

  // Generate time slots
  var timeSlots = [];
  for (var h = 7; h < 21; h++) {
    for (var m = 0; m < 60; m += 15) {
      var hour = h.toString().padStart(2, "0");
      var minute = m.toString().padStart(2, "0");
      timeSlots.push(hour + ":" + minute);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Booking</DialogTitle>
          <DialogDescription>
            Create a new appointment for your client.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit, function (errors) {
            // Surface the first Zod validation error so the user knows what's wrong
            var firstError = Object.values(errors)[0];
            if (firstError?.message) setFormError(firstError.message);
          })}
          className="space-y-4"
        >
          {/* General error banner */}
          {formError && (
            <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
              {formError}
            </div>
          )}
          {/* Client Selection */}
          <div className="space-y-2">
            <Label>Client</Label>
            {selectedClient ? (
              <div className="flex items-center justify-between p-3 border rounded-lg bg-accent/30">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-medium leading-tight">
                      {selectedClient.firstName || selectedClient.first_name}{" "}
                      {selectedClient.lastName || selectedClient.last_name}
                    </span>
                    {selectedClient.phone && (
                      <span className="text-xs text-muted-foreground">{selectedClient.phone}</span>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearClient}
                >
                  Change
                </Button>
              </div>
            ) : showNewClient ? (
              <div className="space-y-2">
                <Input
                  placeholder="Phone *"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  autoFocus
                  {...form.register("clientPhone")}
                />
                <Input
                  placeholder="Full name *"
                  {...form.register("clientName")}
                />
                <Input
                  placeholder="Email (optional)"
                  type="email"
                  autoComplete="email"
                  {...form.register("clientEmail")}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={function () {
                    setShowNewClient(false);
                    setClientError("");
                  }}
                >
                  ← Search existing client
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or phone..."
                    className="pl-10"
                    value={clientSearch}
                    onChange={function (e) {
                      var val = e.target.value;
                      setClientSearch(val);
                      setClientDropdownOpen(val.length >= 2);
                    }}
                    onFocus={function () {
                      if (clientSearch.length >= 2) setClientDropdownOpen(true);
                    }}
                    onBlur={function () {
                      // Delay so mousedown on a result item fires first
                      setTimeout(function () {
                        setClientDropdownOpen(false);
                      }, 150);
                    }}
                  />
                  {clientDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border bg-popover shadow-md">
                      {clientsLoading ? (
                        <div className="p-2">
                          <Skeleton className="h-8 w-full" />
                        </div>
                      ) : clients && clients.length > 0 ? (
                        <div className="max-h-48 overflow-y-auto py-1">
                          {clients.map(function (client) {
                            var displayName =
                              ((client.firstName || client.first_name || "") +
                                " " +
                                (client.lastName || client.last_name || "")).trim();
                            return (
                              <button
                                key={client.id}
                                type="button"
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                                onMouseDown={function (e) {
                                  e.preventDefault();
                                  handleClientSelect(client);
                                }}
                              >
                                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                                <div className="flex min-w-0 flex-1 flex-col">
                                  <span className="font-medium leading-tight">{displayName}</span>
                                  {client.phone && (
                                    <span className="text-xs text-muted-foreground">{client.phone}</span>
                                  )}
                                </div>
                                {client.email && (
                                  <span className="ml-auto text-muted-foreground text-xs truncate max-w-[120px]">
                                    {client.email}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-3 text-sm text-muted-foreground">
                          No clients found
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={function () {
                    setShowNewClient(true);
                    setClientError("");
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add New Client
                </Button>
              </div>
            )}
          </div>

          {clientError && (
            <p className="text-sm text-destructive -mt-2">{clientError}</p>
          )}

          {/* Service Selection */}
          <div className="space-y-2">
            <Label>Services *</Label>
            {servicesLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : services && services.length > 0 ? (
              <>
                <ScrollArea className="h-52 rounded-md border">
                  <div className="p-1">
                    {services.map(function (service) {
                      var sid = String(service.id);
                      var isSelected = watchServiceIds.includes(sid);
                      return (
                        <button
                          key={service.id}
                          type="button"
                          onClick={function () {
                            var next = isSelected
                              ? watchServiceIds.filter(function (x) { return x !== sid; })
                              : [...watchServiceIds, sid];
                            form.setValue("serviceIds", next, { shouldValidate: true });
                            form.setValue("staffId", "");
                          }}
                          className={cn(
                            "flex w-full items-center gap-3 rounded px-3 py-2 text-left text-sm transition-colors",
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-accent hover:text-accent-foreground"
                          )}
                        >
                          <span className={cn(
                            "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border",
                            isSelected ? "border-primary-foreground bg-primary-foreground/20" : "border-muted-foreground"
                          )}>
                            {isSelected && <Check className="h-3 w-3" />}
                          </span>
                          <span className="flex-1 font-medium">{service.name}</span>
                          <span className="shrink-0 text-xs opacity-75">
                            {service.duration_minutes || service.duration}min
                            {parseFloat(service.price) > 0
                              ? ` · ${Number(service.price).toLocaleString()} DZD`
                              : ""}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
                {watchServiceIds.length > 0 && (function () {
                  var sel = services.filter(function (s) { return watchServiceIds.includes(String(s.id)); });
                  var totalMin = sel.reduce(function (n, s) { return n + (s.duration_minutes || s.duration || 0); }, 0);
                  var totalPrice = sel.reduce(function (n, s) { return n + parseFloat(s.price || 0); }, 0);
                  return (
                    <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">
                      <span>{sel.length} service{sel.length > 1 ? "s" : ""} selected</span>
                      <span className="font-medium">{totalMin} min · {totalPrice.toLocaleString()} DZD</span>
                    </div>
                  );
                })()}
              </>
            ) : (
              <div className="rounded-md border px-3 py-4 text-sm text-muted-foreground">
                No services available
              </div>
            )}
            {form.formState.errors.serviceIds && (
              <p className="text-sm text-destructive">
                {form.formState.errors.serviceIds.message}
              </p>
            )}
          </div>

          {/* Staff Selection */}
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <Label>Staff Member *</Label>
              {watchServiceIds.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  Showing staff qualified for selected service{watchServiceIds.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
            {staffLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select
                value={form.watch("staffId")}
                onValueChange={function (val) {
                  form.setValue("staffId", val, { shouldValidate: true });
                }}
                disabled={watchServiceIds.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      watchServiceIds.length === 0
                        ? "Select services first"
                        : filteredStaff.length === 0
                          ? "No staff can perform all selected services"
                          : "Select staff member"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(filteredStaff) && filteredStaff.length > 0 ? (
                    filteredStaff.map(function (member) {
                      return (
                        <SelectItem key={member.id} value={String(member.id)}>
                          {member.firstName} {member.lastName}
                        </SelectItem>
                      );
                    })
                  ) : (
                    <div className="p-3 text-muted-foreground text-sm">
                      {watchServiceIds.length === 0
                        ? "Select services first"
                        : "No staff member can perform all selected services"}
                    </div>
                  )}
                </SelectContent>
              </Select>
            )}
            {form.formState.errors.staffId && (
              <p className="text-sm text-destructive">
                {form.formState.errors.staffId.message}
              </p>
            )}
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.watch("date")
                      ? format(form.watch("date"), "PPP")
                      : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={form.watch("date")}
                    onSelect={function (date) {
                      form.setValue("date", date);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Time *</Label>
              <Select
                value={form.watch("time")}
                onValueChange={function (val) {
                  form.setValue("time", val);
                  setTimeError(""); // Clear custom error when time changes
                }}
              >
                <SelectTrigger
                  className={timeError ? "border-destructive" : ""}
                >
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="h-48">
                    {timeSlots.map(function (slot) {
                      return (
                        <SelectItem key={slot} value={slot}>
                          {slot}
                        </SelectItem>
                      );
                    })}
                  </ScrollArea>
                </SelectContent>
              </Select>
              {form.formState.errors.time && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.time.message}
                </p>
              )}
              {timeError && (
                <p className="text-sm text-destructive">{timeError}</p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              placeholder="Any special requests or notes..."
              {...form.register("notes")}
            />
          </div>

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
            <Button
              type="submit"
              disabled={createBooking.isPending || isValidating}
            >
              {createBooking.isPending || isValidating
                ? "Creating..."
                : "Create Booking"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
