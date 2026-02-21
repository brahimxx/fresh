"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Search, Plus, User } from "lucide-react";

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
  serviceId: z.string().min(1, "Please select a service"),
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

  // Debug logging
  useEffect(() => {
    if (services) {
      console.log("BookingForm: Loaded services:", services);
      if (Array.isArray(services) && services.length === 0) {
        console.warn("No services loaded");
      }
    }
  }, [services]);
  useEffect(() => {
    if (staff) {
      console.log("BookingForm: Loaded staff:", staff);
      if (Array.isArray(staff) && staff.length === 0) {
        console.warn("No staff loaded");
      }
    }
  }, [staff]);
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
      serviceId: "",
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
      form.resetField("serviceId");
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
  var watchServiceId = form.watch("serviceId");

  // Filter staff by selected service
  var filteredStaff =
    Array.isArray(staff) && watchServiceId
      ? staff.filter(function (member) {
          // Convert watchServiceId to number for comparison
          const serviceIdNum = parseInt(watchServiceId, 10);
          if (Array.isArray(member.service_ids)) {
            return member.service_ids.includes(serviceIdNum);
          }
          if (Array.isArray(member.services)) {
            return member.services.some(function (s) {
              return s.id === serviceIdNum;
            });
          }
          // Don't show staff without service assignments
          return false;
        })
      : Array.isArray(staff)
        ? staff
        : [];

  // Don't fallback to showing all staff - if no staff can do the service, show empty
  var showAllStaff = false;

  var { data: availability } = useAvailability(salonId, {
    date: watchDate ? format(watchDate, "yyyy-MM-dd") : null,
    serviceId: watchServiceId,
  });

  // Reset staff when service changes
  useEffect(() => {
    if (watchServiceId) {
      form.setValue("staffId", "");
    }
  }, [watchServiceId]);

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

      // Get service duration
      var service = Array.isArray(services)
        ? services.find(function (s) {
            return String(s.id) === String(data.serviceId);
          })
        : null;
      var duration = service ? service.duration : 30;

      // Calculate end time
      var timeParts = data.time.split(":");
      var startDate = new Date(data.date);
      startDate.setHours(parseInt(timeParts[0]), parseInt(timeParts[1]), 0, 0);
      var endDate = new Date(startDate.getTime() + duration * 60000);

      await createBooking.mutateAsync({
        salonId: salonId,
        clientId: clientId,
        staffId: data.staffId,
        serviceIds: [data.serviceId], // Convert single serviceId to array
        // Format as local time (no Z / no UTC conversion).
        // Using toISOString() here would shift the hour to UTC and store
        // the wrong time in the database for UTC+1 Algeria.
        startDatetime: format(startDate, "yyyy-MM-dd'T'HH:mm:ss"),
        endDatetime: format(endDate, "yyyy-MM-dd'T'HH:mm:ss"),
        notes: data.notes || undefined,
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Booking error:", error);

      // api-client stores the parsed JSON body in error.data
      var code = error.code || error.data?.code;

      // Handle specific error codes with friendly inline messages
      if (code === "STAFF_UNAVAILABLE") {
        setTimeError(
          error.message ||
            "The selected staff member is not working at this time",
        );
      } else if (code === "STAFF_ON_LEAVE") {
        setTimeError(
          "The selected staff member is on time off during this period",
        );
      } else if (
        code === "CONFLICT" ||
        error.message?.includes("not available")
      ) {
        setTimeError(
          "This time slot is already booked. Please choose another time.",
        );
      } else if (code === "STAFF_SERVICE_MISMATCH") {
        setFormError("The selected staff cannot perform this service.");
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
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {selectedClient.firstName || selectedClient.first_name}{" "}
                    {selectedClient.lastName || selectedClient.last_name}
                  </span>
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
                  placeholder="Client name"
                  {...form.register("clientName")}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Email (optional)"
                    type="email"
                    {...form.register("clientEmail")}
                  />
                  <Input
                    placeholder="Phone (optional)"
                    {...form.register("clientPhone")}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={function () {
                    setShowNewClient(false);
                    setClientError("");
                  }}
                >
                  Search existing client
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search clients..."
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
                            return (
                              <button
                                key={client.id}
                                type="button"
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                                onMouseDown={function (e) {
                                  // Prevent input blur before selection registers
                                  e.preventDefault();
                                  handleClientSelect(client);
                                }}
                              >
                                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span className="font-medium">
                                  {client.firstName || client.first_name}{" "}
                                  {client.lastName || client.last_name}
                                </span>
                                {client.email && (
                                  <span className="ml-auto text-muted-foreground text-xs truncate">
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
                  New Client or Walk-in
                </Button>
              </div>
            )}
          </div>

          {clientError && (
            <p className="text-sm text-destructive -mt-2">{clientError}</p>
          )}

          {/* Service Selection */}
          <div className="space-y-2">
            <Label>Service *</Label>
            {servicesLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select
                value={form.watch("serviceId")}
                onValueChange={function (val) {
                  form.setValue("serviceId", val);
                  console.log("Service selected:", val);
                }}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      services && services.length === 0
                        ? "No services available"
                        : "Select a service"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="h-48">
                    {services && services.length > 0 ? (
                      services.map(function (service) {
                        return (
                          <SelectItem
                            key={service.id}
                            value={String(service.id)}
                          >
                            <div className="flex justify-between items-center w-full">
                              <span>{service.name}</span>
                              <span className="text-muted-foreground text-sm ml-2">
                                {service.duration}min - {service.price} EUR
                              </span>
                            </div>
                          </SelectItem>
                        );
                      })
                    ) : (
                      <div className="p-2 text-muted-foreground text-sm">
                        No services available
                      </div>
                    )}
                  </ScrollArea>
                </SelectContent>
              </Select>
            )}
            {form.formState.errors.serviceId && (
              <p className="text-sm text-destructive">
                {form.formState.errors.serviceId.message}
              </p>
            )}
          </div>

          {/* Staff Selection */}
          <div className="space-y-2">
            <Label>Staff Member *</Label>
            {staffLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select
                value={form.watch("staffId")}
                onValueChange={function (val) {
                  form.setValue("staffId", val);
                }}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      filteredStaff.length === 0
                        ? "No staff available for this service"
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
                    <div className="p-2 text-muted-foreground text-sm">
                      No staff available for this service
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
