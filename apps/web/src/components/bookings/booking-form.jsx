"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Search, Plus, User, Check, UserCog, MapPin, Clock, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDuration } from "@/lib/format";
import { calculateTravelFee } from "@/lib/geo";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
import { LocationModal } from "@/components/ui/location-modal";

import { useSalon } from "@/providers/salon-provider";
import { useServices } from "@/hooks/use-services";
import { useStaff, useAvailability } from "@/hooks/use-staff";
import { useClientSearch, useCreateClient } from "@/hooks/use-clients";
import { useCreateBooking, useRescheduleBooking } from "@/hooks/use-bookings";

var bookingSchema = z.object({
  clientId: z.string().optional(),
  clientName: z.string().optional(),
  clientEmail: z.string().email().optional().or(z.literal("")),
  clientPhone: z.string().optional(),
  serviceIds: z.array(z.string()).min(1, "Please select at least one service"),
  staffId: z.string().optional(),
  date: z.date({ required_error: "Please select a date" }),
  time: z.string().min(1, "Please select a time"),
  notes: z.string().optional(),
  fulfillmentType: z.enum(["physical", "mobile", "virtual"]).default("physical"),
  serviceLocationAddress: z.string().optional(),
});

export function BookingFormDialog({
  open,
  onOpenChange,
  initialDate,
  initialBooking,
  salonId: propSalonId,
}) {
  var { salonId: contextSalonId, salon } = useSalon();
  var salonId = propSalonId || contextSalonId;
  var salonCurrency = salon?.currency;
  var router = useRouter();
  var [goToCheckout, setGoToCheckout] = useState(false);
  var [clientSearch, setClientSearch] = useState("");
  var [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  var [selectedClient, setSelectedClient] = useState(null);
  var [showNewClient, setShowNewClient] = useState(false);
  var [timeError, setTimeError] = useState("");
  var [clientError, setClientError] = useState("");
  var [formError, setFormError] = useState("");
  var [isValidating, setIsValidating] = useState(false);
  var [staffAssignments, setStaffAssignments] = useState({});
  var [staffError, setStaffError] = useState("");
  var [travelWarning, setTravelWarning] = useState("");
  var [pendingBookingData, setPendingBookingData] = useState(null);
  // Mobile location state (captures real GPS coords via LocationModal)
  var [mobileCoords, setMobileCoords] = useState(null);
  var [locationModalOpen, setLocationModalOpen] = useState(false);
  // Real availability slots from the same API the widget uses
  var [availableSlots, setAvailableSlots] = useState([]);
  var [slotsLoading, setSlotsLoading] = useState(false);
  var [slotsError, setSlotsError] = useState("");

  var { data: services, isLoading: servicesLoading } = useServices(salonId);
  var { data: staff, isLoading: staffLoading } = useStaff(salonId);


  var { data: clients, isLoading: clientsLoading } = useClientSearch(
    clientSearch,
    salonId,
  );

  var isReschedule = !!initialBooking;
  var createBooking = useCreateBooking();
  var rescheduleBooking = useRescheduleBooking();
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
      fulfillmentType: "physical",
      serviceLocationAddress: "",
    },
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      // Use initialBooking start time if available, otherwise fallback to initialDate or now
      var baseDateStr = initialBooking 
        ? (initialBooking.startDatetime || initialBooking.start_datetime || initialBooking.startDateTime || initialBooking.start || initialBooking.startTime)
        : initialDate;
        
      var dateObj = baseDateStr ? new Date(typeof baseDateStr === 'string' ? baseDateStr.replace(' ', 'T') : baseDateStr) : new Date();
      
      if (isNaN(dateObj.getTime())) {
        dateObj = new Date();
      }

      var hours = dateObj.getHours();
      var minutes = dateObj.getMinutes();

      // Round to nearest 15-minute interval
      var roundedMinutes = Math.round(minutes / 15) * 15;
      var finalHours = roundedMinutes === 60 ? hours + 1 : hours;
      var finalMinutes = roundedMinutes === 60 ? 0 : roundedMinutes;

      var hoursStr = finalHours.toString().padStart(2, "0");
      var minutesStr = finalMinutes.toString().padStart(2, "0");
      var timeString = `${hoursStr}:${minutesStr}`;

      if (initialBooking) {
        // Pre-fill from initialBooking
        var clientId = String(initialBooking.client_id || initialBooking.clientId || initialBooking.client?.id || "");
        var lastName = initialBooking.client?.lastName || initialBooking.client_last_name || "";
        var firstName = initialBooking.client?.firstName || initialBooking.client_first_name || "";
        var clientName = initialBooking.client_name || initialBooking.clientName || "";
        if (!clientName && (firstName || lastName)) {
          clientName = `${firstName} ${lastName}`.trim();
        }

        var clientEmail = initialBooking.client?.email || initialBooking.client_email || initialBooking.clientEmail || "";
        var clientPhone = initialBooking.client?.phone || initialBooking.client_phone || initialBooking.clientPhone || "";

        var serviceIds = [];
        if (Array.isArray(initialBooking.services) && initialBooking.services.length > 0) {
          serviceIds = initialBooking.services.map(function(s) { return String(s.service_id || s.id); });
        } else if (initialBooking.service_id || initialBooking.serviceId) {
          serviceIds = [String(initialBooking.service_id || initialBooking.serviceId)];
        }
        
        var primaryStaffId = String(initialBooking.staff_id || initialBooking.staffId || initialBooking.staff?.id || "");

        // Build per-service staff assignments from initialBooking
        var assignments = {};
        if (Array.isArray(initialBooking.services) && initialBooking.services.length > 0) {
          initialBooking.services.forEach(function(svc) {
            var sid = String(svc.service_id || svc.id);
            assignments[sid] = String(svc.staffId || svc.staff_id || primaryStaffId || "ANYONE_VIRTUAL");
          });
        } else {
          serviceIds.forEach(function(sid) {
            assignments[sid] = primaryStaffId || "ANYONE_VIRTUAL";
          });
        }
        setStaffAssignments(assignments);

        form.reset({
          clientId: clientId,
          clientName: clientName,
          clientEmail: clientEmail,
          clientPhone: clientPhone,
          serviceIds: serviceIds,
          staffId: primaryStaffId,
          notes: initialBooking.notes || "",
          date: dateObj,
          time: timeString,
          fulfillmentType: initialBooking.fulfillmentType || initialBooking.fulfillment_type || "physical",
          serviceLocationAddress: initialBooking.serviceLocationAddress || initialBooking.service_location_address || "",
        });

        if (clientId) {
          setSelectedClient({
            id: clientId,
            firstName: firstName || clientName.split(" ")[0] || "Client",
            lastName: lastName || clientName.split(" ").slice(1).join(" ") || "",
            phone: clientPhone,
            email: clientEmail
          });
        } else {
          setSelectedClient(null);
        }
      } else {
        // Reset ALL fields
        form.reset({
          clientId: "",
          clientName: "",
          clientEmail: "",
          clientPhone: "",
          serviceIds: [],
          staffId: "",
          notes: "",
          date: dateObj,
          time: timeString,
          fulfillmentType: "physical",
          serviceLocationAddress: "",
        });
        setSelectedClient(null);
        setStaffAssignments({});
      }

      // Reset UI state
      setShowNewClient(false);
      setClientError("");
      setTimeError("");
      setFormError("");
      setStaffError("");
      
      if (initialBooking?.serviceLat && initialBooking?.serviceLng) {
        setMobileCoords({ lat: initialBooking.serviceLat, lng: initialBooking.serviceLng });
      } else {
        setMobileCoords(null);
      }
    }
  }, [open, initialDate, initialBooking, form]);

  var watchDate = form.watch("date");
  var watchServiceIds = form.watch("serviceIds") || [];
  var watchFulfillmentType = form.watch("fulfillmentType");

  // Fetch real availability slots whenever date, services, fulfillment, or mobile coords change
  useEffect(function () {
    if (!watchDate || watchServiceIds.length === 0 || !salonId) {
      setAvailableSlots([]);
      return;
    }
    // Build the services param: "serviceId:any" for each selected service
    var servicesParam = watchServiceIds.map(function (sid) { return sid + ":any"; }).join(",");
    var dateStr = format(watchDate, "yyyy-MM-dd");
    var qsParams = {
      date: dateStr,
      services: servicesParam,
      fulfillmentType: watchFulfillmentType || "physical",
    };
    
    if (initialBooking?.id) {
      qsParams.excludeBookingId = initialBooking.id;
    }
    
    var qs = new URLSearchParams(qsParams);
    
    // Add mobile location coords if available
    if (watchFulfillmentType === 'mobile' && mobileCoords?.lat && mobileCoords?.lng) {
      qs.set("userLat", String(mobileCoords.lat));
      qs.set("userLng", String(mobileCoords.lng));
    }
    setSlotsLoading(true);
    setSlotsError("");
    fetch("/api/widget/" + salonId + "/availability?" + qs.toString())
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.data?.closed) {
          setAvailableSlots([]);
          setSlotsError(data.data.message || "Salon is closed on this date.");
        } else {
          var slots = (data.data?.slots || []).map(function (s) {
            return s.startTime.substring(11, 16); // "HH:MM"
          });
          setAvailableSlots(slots);
          // Clear time if current selection is no longer in the new list
          var current = form.getValues("time");
          if (current && !slots.includes(current)) {
            form.setValue("time", "");
          }
        }
      })
      .catch(function () { setSlotsError("Could not load availability."); })
      .finally(function () { setSlotsLoading(false); });
  }, [watchDate, watchServiceIds.join(","), watchFulfillmentType, mobileCoords, salonId]);

  // Deselect services incompatible with the current fulfillment type
  useEffect(function () {
    if (!services || watchServiceIds.length === 0 || !watchFulfillmentType) return;
    var incompatible = watchServiceIds.filter(function (sid) {
      var svc = services.find(function (s) { return String(s.id) === sid; });
      if (!svc) return false;
      
      // 1. Check if the service itself supports the fulfillment type
      if (watchFulfillmentType === 'mobile' && !svc.canMobile) return true;
      if (watchFulfillmentType === 'physical' && !svc.canPhysical) return true;
      if (watchFulfillmentType === 'virtual' && !svc.canVirtual) return true;

      // 2. Check if there is at least one staff who can perform it AND supports the fulfillment type
      var capableStaff = getQualifiedStaffForService(svc.id);
      var hasStaffForFulfillment = capableStaff.some(function(member) {
        if (watchFulfillmentType === 'mobile') return member.canMobile;
        if (watchFulfillmentType === 'physical') return member.canPhysical;
        if (watchFulfillmentType === 'virtual') return member.canVirtual;
        return false;
      });

      if (!hasStaffForFulfillment) return true;

      return false;
    });
    if (incompatible.length > 0) {
      var next = watchServiceIds.filter(function (sid) { return !incompatible.includes(sid); });
      form.setValue('serviceIds', next, { shouldValidate: true });
      setStaffAssignments(function (prev) {
        var copy = Object.assign({}, prev);
        incompatible.forEach(function (sid) { delete copy[sid]; });
        return copy;
      });
    }
  }, [watchFulfillmentType, staff]);

  // Helper: get staff qualified for a specific service
  function getQualifiedStaffForService(serviceId) {
    if (!Array.isArray(staff) || !serviceId) return [];
    var sid = parseInt(serviceId, 10);
    return staff.filter(function (member) {
      var memberServiceIds = [];
      if (Array.isArray(member.service_ids)) {
        memberServiceIds = member.service_ids.map(Number);
      } else if (Array.isArray(member.services)) {
        memberServiceIds = member.services.map(function (s) { return s.id; });
      }
      return memberServiceIds.includes(sid);
    });
  }

  var { data: availabilityData } = useAvailability(salonId, {
    date: watchDate ? format(watchDate, "yyyy-MM-dd") : null,
    serviceId: watchServiceIds[0] || null,
  });
  
  // Extract closure status from availability data
  var isClosedDay = availabilityData?.closed || false;
  var closureMessage = availabilityData?.message || "";

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

  async function submitBooking(data, isOverride = false) {
    setTimeError("");
    setClientError("");
    setFormError("");
    setStaffError("");
    setTravelWarning("");
    setIsValidating(true);

    try {
      // Build start datetime as local time string — no UTC conversion (Algeria UTC+1).
      var timeParts = data.time.split(":");
      var startDate = new Date(data.date);
      startDate.setHours(parseInt(timeParts[0]), parseInt(timeParts[1]), 0, 0);

      // Validate every service has a staff assignment
      var missingStaff = data.serviceIds.filter(function(sid) {
        return !staffAssignments[sid];
      });
      if (missingStaff.length > 0) {
        setStaffError("Please assign a staff member to every service.");
        setIsValidating(false);
        return;
      }

      // ── RESCHEDULE MODE ──
      if (isReschedule) {
        var bookingId = initialBooking.id;
        try {
          await rescheduleBooking.mutateAsync({
            id: bookingId,
            data: {
              newStartTime: format(startDate, "yyyy-MM-dd'T'HH:mm:ss"),
              serviceIds: data.serviceIds,
              staffAssignments: staffAssignments,
              notes: data.notes || undefined,
              fulfillmentType: data.fulfillmentType,
              serviceLocationAddress: data.serviceLocationAddress || undefined,
              serviceLocationLat: (data.fulfillmentType === "mobile" && mobileCoords?.lat) ? mobileCoords.lat : undefined,
              serviceLocationLng: (data.fulfillmentType === "mobile" && mobileCoords?.lng) ? mobileCoords.lng : undefined,
            },
          });
          onOpenChange(false);
        } catch (rescheduleErr) {
          console.error("Reschedule error:", rescheduleErr);
          var msg = (rescheduleErr.message || "").toLowerCase();
          if (msg.includes("time slot") || msg.includes("not available")) {
            setTimeError("This time slot conflicts with another booking. Try a different time or staff member.");
          } else if (msg.includes("time off")) {
            setStaffError("A staff member has time off during this slot. Choose a different staff or time.");
          } else if (msg.includes("not working")) {
            setStaffError("A staff member is not working during this time. Choose a different staff or time.");
          } else if (msg.includes("cannot perform")) {
            setStaffError(rescheduleErr.message);
          } else if (msg.includes("no staff available") || msg.includes("no staff member")) {
            setStaffError(rescheduleErr.message);
          } else {
            setFormError(rescheduleErr.message || "Failed to reschedule booking.");
          }
        } finally {
          setIsValidating(false);
        }
        return;
      }

      // ── NEW BOOKING MODE ──
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

      // End time is computed server-side from DB service durations; never sent by client.
      var result = await createBooking.mutateAsync({
        salonId: salon.id,
        clientId: clientId,
        staffId: Object.values(staffAssignments)[0] || "ANYONE_VIRTUAL",
        serviceIds: data.serviceIds,
        staffAssignments: staffAssignments,
        startDatetime: format(startDate, "yyyy-MM-dd'T'HH:mm:ss"),
        source: "direct",
        notes: data.notes || undefined,
        fulfillmentType: data.fulfillmentType,
        serviceLocationAddress: data.serviceLocationAddress || undefined,
        // Pass real GPS coordinates so createSafeBooking can store service_lat/service_lng
        // and use them for travel-time calculations in future availability checks.
        serviceLocationLat: (data.fulfillmentType === "mobile" && mobileCoords?.lat) ? mobileCoords.lat : undefined,
        serviceLocationLng: (data.fulfillmentType === "mobile" && mobileCoords?.lng) ? mobileCoords.lng : undefined,
        forceOverride: isOverride,
      });

      onOpenChange(false);

      // Redirect to checkout if requested
      if (goToCheckout && result?.data?.id) {
        router.push("/dashboard/salon/" + salonId + "/checkout/" + result.data.id);
      }
      setGoToCheckout(false);
    } catch (error) {
      console.error("Booking error:", error);

      // api-client stores the parsed JSON body in error.data
      var code = error.code || error.data?.code;

      // Map every code that createSafeBooking (booking.js) or the route can throw
      // to the appropriate inline error field.
      if (code === "TRAVEL_NOT_FEASIBLE") {
        setTravelWarning(error.message || "Insufficient travel time detected.");
        setPendingBookingData(data);
      } else if (
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
        // Match reschedule endpoint errors by message (no error codes from that endpoint)
        var msg = error.message.toLowerCase();
        if (msg.includes("time slot") || msg.includes("not available")) {
          setTimeError("This time slot conflicts with another booking. Try a different time or staff member.");
        } else if (msg.includes("time off")) {
          setStaffError("A staff member has time off during this slot. Choose a different staff or time.");
        } else if (msg.includes("not working")) {
          setStaffError("A staff member is not working during this time. Choose a different staff or time.");
        } else if (msg.includes("cannot perform")) {
          setStaffError(error.message);
        } else if (msg.includes("no staff available")) {
          setStaffError(error.message);
        } else {
          setFormError(error.message);
        }
      } else {
        setFormError("Failed to save booking. Please try again.");
      }
    } finally {
      setIsValidating(false);
    }
  }

  function onSubmit(data) {
    submitBooking(data, false);
  }

  // Strict availability matching: only show actual available slots returned by the API
  var timeSlots = availableSlots;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0" side="right">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle className="text-2xl">{isReschedule ? "Reschedule Booking" : "New Booking"}</SheetTitle>
          <SheetDescription>
            {isReschedule
              ? `Change the date and time for booking #${initialBooking?.id}.`
              : "Create a new appointment for your client."}
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit, function (errors) {
            // Surface the first Zod validation error so the user knows what's wrong
            var firstError = Object.values(errors)[0];
            if (firstError?.message) setFormError(firstError.message);
          })}
          className="flex flex-col h-[calc(100%-5rem)]"
        >
          {/* General error banner */}
          {formError && (
            <div className="mx-6 mt-4 rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
              {formError}
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
{/* Client Selection */}
          <div className="space-y-2">
            <Label>Client</Label>
            {isReschedule ? (
              /* ── Reschedule: read-only client ── */
              <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-medium text-sm">
                  {form.watch("clientName") || "Client"}
                </span>
              </div>
            ) : (
              /* ── New Booking: full client picker ── */
              <>
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
                                  <span className="ml-auto text-muted-foreground text-xs truncate max-w-30">
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
              </>
            )}
          </div>

          {clientError && (
            <p className="text-sm text-destructive -mt-2">{clientError}</p>
          )}

          {/* Fulfillment Type */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Fulfillment Type</Label>
              <Select
                value={form.watch("fulfillmentType")}
                onValueChange={function (val) {
                  form.setValue("fulfillmentType", val);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="physical">In-Salon (Physical)</SelectItem>
                  <SelectItem value="mobile">Mobile (Client Location)</SelectItem>
                  <SelectItem value="virtual">Virtual (Online)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.watch("fulfillmentType") === "mobile" && (
              <div className="space-y-2">
                <Label>Client Address *</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    placeholder="Click to set client location..."
                    value={form.watch("serviceLocationAddress") || ""}
                    className="flex-1 cursor-pointer"
                    onClick={function () { setLocationModalOpen(true); }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={function () { setLocationModalOpen(true); }}
                  >
                    <MapPin className="h-4 w-4" />
                  </Button>
                </div>
                {mobileCoords && (
                  <p className="text-xs text-muted-foreground">
                    📍 Location captured — travel time will be calculated automatically.
                  </p>
                )}
                <LocationModal
                  open={locationModalOpen}
                  onOpenChange={setLocationModalOpen}
                  initialAddress={form.watch("serviceLocationAddress") || ""}
                  initialCoords={mobileCoords}
                  onLocationSubmit={function (address, lat, lng) {
                    form.setValue("serviceLocationAddress", address);
                    setMobileCoords({ lat: Number(lat), lng: Number(lng) });
                    setLocationModalOpen(false);
                  }}
                />
              </div>
            )}
          </div>

          {/* Date & Time */}
          <div className="space-y-4">
            {isClosedDay && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive font-medium flex gap-2">
                <span>🚫</span>
                <span>
                  {closureMessage || "The salon is closed on this date."}
                </span>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-10 justify-start text-left font-normal truncate",
                      (!watchServiceIds.length || !watchFulfillmentType) && "opacity-50 cursor-not-allowed"
                    )}
                    disabled={!watchServiceIds.length || !watchFulfillmentType}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                    <span className="truncate">
                    {form.watch("date")
                      ? format(form.watch("date"), "PPP")
                      : "Pick a date"}
                    </span>
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
              {slotsLoading ? (
                <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-muted/30">
                  <Clock className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Checking availability...</span>
                </div>
              ) : slotsError ? (
                <div className="text-sm text-destructive px-1">{slotsError}</div>
              ) : (
                <Select
                  value={form.watch("time")}
                  onValueChange={function (val) {
                    form.setValue("time", val);
                    setTimeError("");
                  }}
                  disabled={!watchServiceIds.length || !watchFulfillmentType || timeSlots.length === 0}
                >
                  <SelectTrigger className={timeError ? "border-destructive" : ""}>
                    <SelectValue placeholder={timeSlots.length === 0 && watchServiceIds.length > 0 && watchFulfillmentType ? "No slots available" : "Select time"} />
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
              )}
              {form.formState.errors.time && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.time.message}
                </p>
              )}
              {timeError && (
                <p className="text-sm text-destructive">{timeError}</p>
              )}
            </div>
            {(!watchServiceIds.length || !watchFulfillmentType) ? (
              <p className="col-span-2 text-xs text-muted-foreground italic mt-1">
                Select at least one service and a fulfillment type to check availability and choose a time.
              </p>
            ) : timeSlots.length === 0 && !slotsLoading && !slotsError ? (
              <div className="col-span-2 p-3 mt-2 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-sm rounded-lg flex gap-2">
                <span className="shrink-0 mt-0.5">⚠️</span>
                <p>
                  There are no available time slots on this date. Please select a different date, or adjust your selected services and fulfillment type.
                </p>
              </div>
            ) : null}
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

                      </div>
            <div className="space-y-4">
{/* Service Selection */}
          <div className="space-y-2">
            <Label>Services *</Label>
            {servicesLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : services && services.length > 0 ? (
              <>
                <ScrollArea className="h-52 rounded-md border">
                  <div className="p-1">
                    {services.filter(function (service) {
                      // 1. Service must support the fulfillment type
                      if (watchFulfillmentType === 'mobile' && !service.canMobile) return false;
                      if (watchFulfillmentType === 'physical' && !service.canPhysical) return false;
                      if (watchFulfillmentType === 'virtual' && !service.canVirtual) return false;

                      // 2. Hide services with no assigned staff
                      var ids = service.staffIds || service.staff_ids || [];
                      if (!Array.isArray(ids) || ids.length === 0) return false;

                      // 3. Must have at least one staff who can perform it AND supports the fulfillment type
                      var capableStaff = getQualifiedStaffForService(service.id);
                      var hasStaffForFulfillment = capableStaff.some(function(member) {
                        if (watchFulfillmentType === 'mobile') return member.canMobile;
                        if (watchFulfillmentType === 'physical') return member.canPhysical;
                        if (watchFulfillmentType === 'virtual') return member.canVirtual;
                        return false;
                      });

                      return hasStaffForFulfillment;
                    }).map(function (service) {
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
                            form.setValue('serviceIds', next, { shouldValidate: true });
                            if (isSelected) {
                              setStaffAssignments(function(prev) {
                                var copy = Object.assign({}, prev);
                                delete copy[sid];
                                return copy;
                              });
                            } else {
                              setStaffAssignments(function(prev) {
                                return Object.assign({}, prev, { [sid]: 'ANYONE_VIRTUAL' });
                              });
                            }
                            setStaffError('');
                          }}
                          className={cn(
                            'flex w-full items-center gap-3 rounded px-3 py-2 text-left text-sm transition-colors',
                            isSelected
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-accent hover:text-accent-foreground'
                          )}
                        >
                          <span className={cn(
                            'flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border',
                            isSelected ? 'border-primary-foreground bg-primary-foreground/20' : 'border-muted-foreground'
                          )}>
                            {isSelected && <Check className="h-3 w-3" />}
                          </span>
                          <span className="flex-1 font-medium">{service.name}</span>
                          <span className="shrink-0 text-xs opacity-75">
                            {formatDuration(service.duration_minutes || service.duration)}
                            {parseFloat(service.price) > 0
                              ? ` · ${formatCurrency(service.price, salonCurrency)}`
                              : ''}
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
                      <span className="font-medium">{formatDuration(totalMin)} · {formatCurrency(totalPrice, salonCurrency)}</span>
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

          {/* Per-Service Staff Assignments */}
          {watchServiceIds.length > 0 && (
            <div className="space-y-2">
              <Label>Staff Assignments *</Label>
              <div className="rounded-md border divide-y">
                {watchServiceIds.map(function (sid) {
                  var service = Array.isArray(services)
                    ? services.find(function (s) { return String(s.id) === sid; })
                    : null;
                  var qualified = getQualifiedStaffForService(sid);
                  var staffListForService = [
                    { id: "ANYONE_VIRTUAL", firstName: "Anyone", lastName: "Available" },
                    ...qualified,
                  ];
                  var currentAssignment = staffAssignments[sid] || "";

                  return (
                    <div key={sid} className="flex items-center gap-3 px-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {service ? service.name : `Service #${sid}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {service ? formatDuration(service.duration_minutes || service.duration) : ""}
                        </p>
                      </div>
                      <div className="shrink-0 w-44">
                        <Select
                          value={currentAssignment}
                          onValueChange={function (val) {
                            setStaffAssignments(function (prev) {
                              return Object.assign({}, prev, { [sid]: val });
                            });
                            setStaffError("");
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <div className="flex items-center gap-1.5 truncate">
                              <UserCog className="h-3 w-3 shrink-0" />
                              <SelectValue placeholder="Assign staff" />
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            {staffListForService.map(function (member) {
                              return (
                                <SelectItem key={member.id} value={String(member.id)}>
                                  {member.firstName} {member.lastName}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  );
                })}
              </div>
              {staffError && (
                <p className="text-sm text-destructive">{staffError}</p>
              )}
            </div>
          )}

          {/* Booking Summary */}
          {watchServiceIds.length > 0 && services && (
            <div className="rounded-md border bg-muted/20 p-3 space-y-2">
              <h4 className="font-medium text-sm">Booking Summary</h4>
              <div className="space-y-1">
                {watchServiceIds.map(function(sid) {
                  var svc = services.find(function(s) { return String(s.id) === sid; });
                  if (!svc) return null;
                  return (
                    <div key={sid} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{svc.name}</span>
                      <span>
                        {parseFloat(svc.price) > 0 ? formatCurrency(svc.price, salonCurrency) : 'Free'}
                      </span>
                    </div>
                  );
                })}
                {(function() {
                  var travelFee = 0;
                  if (watchFulfillmentType === 'mobile' && salon && mobileCoords) {
                    // Travel fee always uses salon coordinates (consistent with client-facing widget)
                    travelFee = calculateTravelFee(
                      salon.travel_fee_type,
                      salon.travel_fee_amount,
                      Number(salon.latitude),
                      Number(salon.longitude),
                      mobileCoords.lat,
                      mobileCoords.lng
                    );
                  }
                  if (travelFee > 0) {
                    return (
                      <div className="flex justify-between text-sm text-muted-foreground mt-1 pt-1 border-t border-dashed">
                        <span>Travel Fee</span>
                        <span>{formatCurrency(travelFee, salonCurrency)}</span>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
              <div className="pt-2 mt-2 border-t flex justify-between font-medium">
                <span>Total</span>
                <span>
                  {(function() {
                    var serviceTotal = watchServiceIds.reduce(function(acc, sid) {
                      var svc = services.find(function(s) { return String(s.id) === sid; });
                      return acc + (svc ? parseFloat(svc.price) : 0);
                    }, 0);
                    
                    var travelFee = 0;
                    if (watchFulfillmentType === 'mobile' && salon && mobileCoords) {
                      // Travel fee always uses salon coordinates (consistent with client-facing widget)
                      travelFee = calculateTravelFee(
                        salon.travel_fee_type,
                        salon.travel_fee_amount,
                        Number(salon.latitude),
                        Number(salon.longitude),
                        mobileCoords.lat,
                        mobileCoords.lng
                      );
                    }
                    
                    return formatCurrency(serviceTotal + travelFee, salonCurrency);
                  })()}
                </span>
              </div>
              <div className="text-xs text-muted-foreground text-right">
                Duration: {formatDuration(
                  watchServiceIds.reduce(function(acc, sid) {
                    var svc = services.find(function(s) { return String(s.id) === sid; });
                    return acc + (svc ? parseInt(svc.duration_minutes || svc.duration) : 0);
                  }, 0)
                )}
              </div>
            </div>
          )}

                      </div>
          </div>
          </div>

          <div className="sticky bottom-0 bg-background px-6 py-4 border-t space-y-3">
            {travelWarning && (
              <div className="rounded-md bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-sm text-amber-600 w-full flex flex-col gap-2">
                <span className="font-medium">⚠️ {travelWarning}</span>
                <span className="text-xs">Do you want to override this warning and force the booking?</span>
              </div>
            )}
            <div className="flex justify-end gap-2 w-full">
              <Button
                type="button"
                variant="outline"
                onClick={function () {
                  onOpenChange(false);
                }}
              >
                Cancel
              </Button>
              {travelWarning ? (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={createBooking.isPending || rescheduleBooking.isPending || isValidating}
                  onClick={function() { submitBooking(pendingBookingData, true); }}
                >
                  {(createBooking.isPending || rescheduleBooking.isPending || isValidating)
                    ? "Proceeding..."
                    : "Proceed Anyway"}
                </Button>
              ) : (
                <>
                  {!isReschedule && (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={createBooking.isPending || rescheduleBooking.isPending || isValidating}
                      onClick={function () {
                        setGoToCheckout(true);
                        form.handleSubmit(onSubmit, function (errors) {
                          var firstError = Object.values(errors)[0];
                          if (firstError?.message) setFormError(firstError.message);
                          setGoToCheckout(false);
                        })();
                      }}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      {(createBooking.isPending && goToCheckout) ? "Creating..." : "Checkout"}
                    </Button>
                  )}
                  <Button
                    type="submit"
                    disabled={createBooking.isPending || rescheduleBooking.isPending || isValidating}
                  >
                    {(createBooking.isPending || rescheduleBooking.isPending || isValidating)
                      ? (isReschedule ? "Rescheduling..." : "Creating...")
                      : (isReschedule ? "Reschedule" : "Save")}
                  </Button>
                </>
              )}
            </div>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
