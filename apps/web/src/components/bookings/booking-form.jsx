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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
  var [selectedClient, setSelectedClient] = useState(null);
  var [showNewClient, setShowNewClient] = useState(false);

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
  var { data: clients, isLoading: clientsLoading } =
    useClientSearch(clientSearch);

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

  var watchDate = form.watch("date");
  var watchServiceId = form.watch("serviceId");

  // Filter staff by selected service
  var filteredStaff =
    Array.isArray(staff) && watchServiceId
      ? staff.filter(function (member) {
          // Debug: log staff member and their services
          console.log("Staff member:", member);
          if (Array.isArray(member.service_ids)) {
            return member.service_ids.includes(watchServiceId);
          }
          if (Array.isArray(member.services)) {
            return member.services.some(function (s) {
              return s.id === watchServiceId;
            });
          }
          // If neither, log warning
          console.warn("Staff member missing service_ids/services:", member);
          return true; // fallback: show all if no info
        })
      : Array.isArray(staff)
      ? staff
      : [];

  // If no staff after filtering, show all with a note
  var showAllStaff =
    filteredStaff.length === 0 &&
    watchServiceId &&
    Array.isArray(staff) &&
    staff.length > 0;
  if (showAllStaff) {
    filteredStaff = staff;
    console.warn("No staff found for service, showing all staff");
  }

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
    form.setValue("clientId", client.id);
    form.setValue("clientName", client.first_name + " " + client.last_name);
    setClientSearch("");
  }

  function handleClearClient() {
    setSelectedClient(null);
    form.setValue("clientId", "");
    form.setValue("clientName", "");
  }

  async function onSubmit(data) {
    try {
      var clientId = data.clientId;

      // Create new client if needed
      if (!clientId && showNewClient && data.clientName) {
        var nameParts = data.clientName.split(" ");
        var newClient = await createClient.mutateAsync({
          salonId: salonId,
          firstName: nameParts[0] || "",
          lastName: nameParts.slice(1).join(" ") || "",
          email: data.clientEmail || undefined,
          phone: data.clientPhone || undefined,
        });
        clientId = newClient.data.id;
      }

      // Get service duration
      var service = services.find(function (s) {
        return s.id === data.serviceId;
      });
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
        startDatetime: startDate.toISOString(),
        endDatetime: endDate.toISOString(),
        notes: data.notes || undefined,
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Booking error:", error);
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

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Client Selection */}
          <div className="space-y-2">
            <Label>Client</Label>
            {selectedClient ? (
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {selectedClient.first_name} {selectedClient.last_name}
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
                  }}
                >
                  Search existing client
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search clients..."
                        className="pl-10"
                        value={clientSearch}
                        onChange={function (e) {
                          setClientSearch(e.target.value);
                        }}
                      />
                    </div>
                  </PopoverTrigger>
                  {clientSearch.length >= 2 && (
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandList>
                          {clientsLoading ? (
                            <div className="p-2">
                              <Skeleton className="h-8 w-full" />
                            </div>
                          ) : clients && clients.length > 0 ? (
                            <CommandGroup>
                              {clients.map(function (client) {
                                return (
                                  <CommandItem
                                    key={client.id}
                                    onSelect={function () {
                                      handleClientSelect(client);
                                    }}
                                  >
                                    <User className="mr-2 h-4 w-4" />
                                    {client.first_name} {client.last_name}
                                    {client.email && (
                                      <span className="ml-2 text-muted-foreground text-sm">
                                        {client.email}
                                      </span>
                                    )}
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          ) : (
                            <CommandEmpty>No clients found</CommandEmpty>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  )}
                </Popover>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={function () {
                    setShowNewClient(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Client or Walk-in
                </Button>
              </div>
            )}
          </div>

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
                        ? "No staff available"
                        : showAllStaff
                        ? "Select staff member (showing all)"
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
                }}
              >
                <SelectTrigger>
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
            <Button type="submit" disabled={createBooking.isPending}>
              {createBooking.isPending ? "Creating..." : "Create Booking"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
