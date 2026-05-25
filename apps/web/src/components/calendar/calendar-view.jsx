"use client";

import React, { useRef, useState, useCallback, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  subDays,
} from "date-fns";

import { checkBidirectionalTravel, estimateTravelTimeFromDistance, SETUP_BUFFER_MINUTES } from "@/lib/travel";
import {
  useCalendarBookings,
  useRescheduleBooking,
  useConfirmBooking,
  useCancelBooking,
  useUpdateBooking,
  useCompleteBooking,
} from "@/hooks/use-bookings";
import { useStaff, getStaffColor } from "@/hooks/use-staff";
import { useServices } from "@/hooks/use-services";
import { useSalon } from "@/providers/salon-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DataError } from "@/components/ui/data-error";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChevronLeft,
  ChevronRight,
  Settings,
  CalendarPlus,
  Clock,
  CalendarDays,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Calendar,
  ClipboardList,
  Coins,
  Tag,
  Heart,
  Loader2,
} from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { DayView } from "./day-view";
import { WeekView } from "./week-view";
import { MonthView } from "./month-view";

import "@/styles/calendar.css";

function FilterSection({ title, icon, options, selected, onChange }) {
  const [isOpen, setIsOpen] = React.useState(false);
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border-b py-3">
      <CollapsibleTrigger className="flex items-center justify-between w-full text-left">
        <div className="flex items-center gap-3">
          {icon}
          <span className="font-medium">{title}</span>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-4 space-y-2">
        {options.map(opt => (
          <div key={opt.id} className="flex items-center space-x-2 py-1">
            <Checkbox id={`${title}-${opt.id}`} checked={selected.includes(opt.id)} onCheckedChange={() => onChange(opt.id)} />
            <Label htmlFor={`${title}-${opt.id}`} className="flex-1 font-normal cursor-pointer">{opt.label}</Label>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function CalendarView({ onDateClick, onEventClick, onNewBooking, onTimeOffClick }) {
  const calendarRef = useRef(null);
  const { salonId, salon } = useSalon();
  const { data: salonServicesData } = useServices(salonId);
  const salonServices = salonServicesData || [];

  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState("timeGridDay");
  const [hourHeight, setHourHeight] = useState(80);
  const [hoveredBookingId, setHoveredBookingId] = useState(null);

  const [filters, setFilters] = useState({
    status: [],
    type: [],
    paymentStatus: [],
    services: [],
    creationDate: { start: "", end: "" },
    staff: [],
  });
  const [draftFilters, setDraftFilters] = useState(filters);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  useEffect(() => {
    if (isFilterDrawerOpen) {
      setDraftFilters(filters);
    }
  }, [isFilterDrawerOpen, filters]);

  // Slot action menu (Add appointment / Add blocked time)
  const [slotMenu, setSlotMenu] = useState(null);
  const slotMenuRef = useRef(null);

  // Close slot menu when clicking outside or pressing Escape
  useEffect(() => {
    if (!slotMenu) return;
    function handleOutside(e) {
      if (slotMenuRef.current && !slotMenuRef.current.contains(e.target)) {
        setSlotMenu(null);
      }
    }
    function handleEscape(e) {
      if (e.key === "Escape") {
        setSlotMenu(null);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [slotMenu]);

  const confirmBooking = useConfirmBooking();
  const cancelBooking = useCancelBooking();
  const rescheduleBooking = useRescheduleBooking();
  const completeBooking = useCompleteBooking();

  const isDayView = currentView === "timeGridDay";
  const isWeekView = currentView === "timeGridWeek";

  // Calculate date range based on current view
  const dateRange = useMemo(() => {
    let start, end;
    if (currentView === "dayGridMonth") {
      start = startOfMonth(currentDate);
      end = endOfMonth(currentDate);
    } else if (currentView === "timeGridWeek") {
      start = startOfWeek(currentDate, { weekStartsOn: 1 });
      end = endOfWeek(currentDate, { weekStartsOn: 1 });
    } else {
      start = currentDate;
      end = currentDate;
    }
    return {
      start: format(start, "yyyy-MM-dd"),
      end: format(end, "yyyy-MM-dd"),
    };
  }, [currentDate, currentView]);

  // Fetch bookings
  const {
    data: bookings,
    isLoading: bookingsLoading,
    error: bookingsError,
    refetch: refetchBookings,
  } = useCalendarBookings(salonId, dateRange.start, dateRange.end);

  // Fetch staff
  const {
    data: staff,
    isLoading: staffLoading,
    error: staffError,
    refetch: refetchStaff,
  } = useStaff(salonId);

  // Build staff color map
  const staffColorMap = useMemo(() => {
    const map = {};
    if (staff && Array.isArray(staff)) {
      staff.forEach((member, index) => {
        const fallbackColor = getStaffColor(index);
        const hex = member.color || fallbackColor.hex;
        let name = fallbackColor.name;
        if (member.color) {
          for (let i = 0; i < 10; i++) {
            const c = getStaffColor(i);
            if (c.hex.toLowerCase() === member.color.toLowerCase()) {
              name = c.name;
              break;
            }
          }
        }
        map[member.id] = { hex, name };
      });
    }
    return map;
  }, [staff]);

  // Filter bookings
  const filteredBookings = useMemo(() => {
    if (!bookings || !Array.isArray(bookings)) return [];
    return bookings.filter((b) => {
      if (filters.staff.length > 0) {
        const hasStaff = b.services?.some((s) => filters.staff.includes(s.staffId || b.staffId || b.staff?.id)) || filters.staff.includes(b.staffId || b.staff?.id);
        if (!hasStaff) return false;
      }
      if (filters.status.length > 0) {
        if (!filters.status.includes(b.status)) return false;
      }
      if (filters.type.length > 0) {
        if (b.type === "time_off") {
          if (!filters.type.includes("time_off")) return false;
        } else {
          const fType = b.fulfillmentType || "physical";
          if (!filters.type.includes(fType)) return false;
        }
      }
      if (filters.paymentStatus.length > 0) {
        const pStatus = b.paymentStatus || "pending";
        if (!filters.paymentStatus.includes(pStatus)) return false;
      }
      if (filters.services.length > 0) {
        if (!b.services || !b.services.some((s) => filters.services.includes(String(s.service_id || s.id)))) return false;
      }
      if (filters.creationDate.start && filters.creationDate.end) {
        if (!b.createdAt) return false;
        const created = new Date(b.createdAt);
        const start = new Date(filters.creationDate.start);
        const end = new Date(filters.creationDate.end);
        end.setHours(23, 59, 59, 999);
        if (created < start || created > end) return false;
      }
      return true;
    });
  }, [bookings, filters]);

  // Convert bookings to FullCalendar events (for Month view)
  const events = useMemo(() => {
    if (!filteredBookings || !Array.isArray(filteredBookings)) return [];
    return filteredBookings.flatMap((booking) => {
      const clientName = booking.title || (booking.client
        ? booking.client.firstName + " " + booking.client.lastName
        : "Walk-in");

      const bookingEvents = [];

      if (booking.services && booking.services.length > 0) {
        booking.services.forEach((s, idx) => {
          const staffId = s.staffId || booking.staffId || booking.staff?.id;
          const staffColor = staffColorMap[staffId] || { name: "blue", hex: "#3b82f6" };
          const startTime = new Date((s.startDatetime || booking.start || booking.startDatetime || "").replace(" ", "T"));
          const endTime = new Date((s.endDatetime || booking.end || booking.endDatetime || "").replace(" ", "T"));
          const timeText = format(startTime, "HH:mm") + " – " + format(endTime, "HH:mm");

          let staffName = "";
          if (staff && Array.isArray(staff)) {
            const member = staff.find((st) => st.id === staffId);
            if (member) staffName = member.firstName + " " + member.lastName;
          }
          if (!staffName) staffName = booking.staffName || (booking.staff ? booking.staff.firstName + " " + booking.staff.lastName : "");

          bookingEvents.push({
            id: booking.id + "-" + idx,
            title: clientName + " (" + s.name + ")",
            start: (s.startDatetime || booking.start || booking.startDatetime || "").replace(" ", "T"),
            end: (s.endDatetime || booking.end || booking.endDatetime || "").replace(" ", "T"),
            backgroundColor: staffColor.hex,
            borderColor: staffColor.hex,
            extendedProps: {
              booking,
              staffColor: staffColor.name,
              status: booking.status,
              servicesText: s.name,
              timeText,
              staffName,
            },
          });
        });
      } else {
        const staffId = booking.staffId || booking.staff?.id;
        const staffColor = staffColorMap[staffId] || { name: "blue", hex: "#3b82f6" };
        const startTime = new Date((booking.start || booking.startDatetime || "").replace(" ", "T"));
        const endTime = new Date((booking.end || booking.endDatetime || "").replace(" ", "T"));
        const timeText = format(startTime, "HH:mm") + " – " + format(endTime, "HH:mm");
        bookingEvents.push({
          id: booking.id,
          title: clientName,
          start: (booking.start || booking.startDatetime || "").replace(" ", "T"),
          end: (booking.end || booking.endDatetime || "").replace(" ", "T"),
          backgroundColor: staffColor.hex,
          borderColor: staffColor.hex,
          extendedProps: {
            booking,
            staffColor: staffColor.name,
            status: booking.status,
            servicesText: "",
            timeText,
            staffName: booking.staffName || (booking.staff ? booking.staff.firstName + " " + booking.staff.lastName : ""),
          },
        });
      }

      if (booking.fulfillmentType === "mobile") {
        const travelTimeMins = booking.travelDistanceKm
          ? estimateTravelTimeFromDistance(booking.travelDistanceKm) + SETUP_BUFFER_MINUTES
          : (booking.travelBufferTime ? Math.floor(booking.travelBufferTime / 2) : 30);

        const bookingStartStr = booking.start || booking.startDatetime || "";
        const bookingEndStr = booking.end || booking.endDatetime || "";
        const bStart = new Date(bookingStartStr.replace(" ", "T"));
        const bEnd = new Date(bookingEndStr.replace(" ", "T"));

        const arrStart = new Date(bStart.getTime() - travelTimeMins * 60000);
        const depEnd = new Date(bEnd.getTime() + travelTimeMins * 60000);

        bookingEvents.push({
          id: booking.id + "-travel-arr",
          title: "🚗 Travel (" + travelTimeMins + "m)",
          start: format(arrStart, "yyyy-MM-dd'T'HH:mm:ss"),
          end: format(bStart, "yyyy-MM-dd'T'HH:mm:ss"),
          backgroundColor: "rgba(148, 163, 184, 0.2)",
          borderColor: "rgba(148, 163, 184, 0.5)",
          textColor: "#64748b",
          extendedProps: { isTravel: true },
        });
        bookingEvents.push({
          id: booking.id + "-travel-dep",
          title: "🚗 Travel (" + travelTimeMins + "m)",
          start: format(bEnd, "yyyy-MM-dd'T'HH:mm:ss"),
          end: format(depEnd, "yyyy-MM-dd'T'HH:mm:ss"),
          backgroundColor: "rgba(148, 163, 184, 0.2)",
          borderColor: "rgba(148, 163, 184, 0.5)",
          textColor: "#64748b",
          extendedProps: { isTravel: true },
        });
      }

      return bookingEvents;
    });
  }, [filteredBookings, staffColorMap, staff]);

  // Group bookings by staff (for Day view)
  const { bookingsByStaff, timeOffByStaff } = useMemo(() => {
    const groups = {};
    const timeOffGroups = {};
    if (staff && Array.isArray(staff)) {
      staff.forEach((member) => {
        groups[member.id] = [];
        timeOffGroups[member.id] = [];
      });
    }
    if (filteredBookings && Array.isArray(filteredBookings)) {
      filteredBookings.forEach((booking) => {
        if (booking.type === "time_off") {
          const toStaffId = booking.staffId || booking.staff?.id;
          if (toStaffId) {
            timeOffGroups[toStaffId] = timeOffGroups[toStaffId] || [];
            timeOffGroups[toStaffId].push(booking);
          }
          return;
        }

        if (booking.services && booking.services.length > 0) {
          booking.services.forEach((s, i) => {
            const staffId = s.staffId || booking.staffId || booking.staff?.id;
            const subBooking = Object.assign({}, booking, {
              subId: booking.id + "-" + i,
              startDatetime: s.startDatetime || booking.startDatetime || booking.start,
              endDatetime: s.endDatetime || booking.endDatetime || booking.end,
              start: s.startDatetime || booking.startDatetime || booking.start,
              end: s.endDatetime || booking.endDatetime || booking.end,
              services: [s],
              originalBooking: booking,
            });
            if (staffId) {
              groups[staffId] = groups[staffId] || [];
              groups[staffId].push(subBooking);
            }
          });
        } else {
          const staffId = booking.staffId || booking.staff?.id;
          if (staffId) {
            groups[staffId] = groups[staffId] || [];
            groups[staffId].push(booking);
          }
        }

        if (booking.fulfillmentType === "mobile") {
          const travelTimeMins = booking.travelDistanceKm
            ? estimateTravelTimeFromDistance(booking.travelDistanceKm) + SETUP_BUFFER_MINUTES
            : (booking.travelBufferTime ? Math.floor(booking.travelBufferTime / 2) : 30);

          const bookingStartStr = booking.start || booking.startDatetime || "";
          const bookingEndStr = booking.end || booking.endDatetime || "";
          const bookingStart = new Date(bookingStartStr.replace(" ", "T"));
          const bookingEnd = new Date(bookingEndStr.replace(" ", "T"));

          const arrStart = new Date(bookingStart.getTime() - travelTimeMins * 60000);
          const depEnd = new Date(bookingEnd.getTime() + travelTimeMins * 60000);

          let tStaffId = booking.staffId || booking.staff?.id;
          if (booking.services && booking.services.length > 0) {
            tStaffId = booking.services[0].staffId || tStaffId;
          }

          if (tStaffId && groups[tStaffId]) {
            groups[tStaffId].push({
              subId: booking.id + "-travel-arr",
              start: arrStart.toISOString(),
              end: bookingStart.toISOString(),
              startDatetime: arrStart.toISOString(),
              endDatetime: bookingStart.toISOString(),
              isTravel: true,
              travelTimeMins,
              originalBooking: booking,
            });
            groups[tStaffId].push({
              subId: booking.id + "-travel-dep",
              start: bookingEnd.toISOString(),
              end: depEnd.toISOString(),
              startDatetime: bookingEnd.toISOString(),
              endDatetime: depEnd.toISOString(),
              isTravel: true,
              travelTimeMins,
              originalBooking: booking,
            });
          }
        }
      });
    }
    return { bookingsByStaff: groups, timeOffByStaff: timeOffGroups };
  }, [filteredBookings, staff]);

  const weekDays = useMemo(() => {
    if (!isWeekView) return [];
    const days = [];
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    for (let i = 0; i < 7; i++) {
      days.push(addDays(start, i));
    }
    return days;
  }, [currentDate, isWeekView]);

  // Navigation handlers
  const handleViewChange = useCallback((view) => {
    setCurrentView(view);
  }, []);

  const handlePrev = useCallback(() => {
    if (isDayView) {
      setCurrentDate((d) => subDays(d, 1));
    } else if (isWeekView) {
      setCurrentDate((d) => subDays(d, 7));
    } else {
      const api = calendarRef.current?.getApi();
      if (api) { api.prev(); setCurrentDate(api.getDate()); }
    }
  }, [isDayView, isWeekView]);

  const handleNext = useCallback(() => {
    if (isDayView) {
      setCurrentDate((d) => addDays(d, 1));
    } else if (isWeekView) {
      setCurrentDate((d) => addDays(d, 7));
    } else {
      const api = calendarRef.current?.getApi();
      if (api) { api.next(); setCurrentDate(api.getDate()); }
    }
  }, [isDayView, isWeekView]);

  const handleToday = useCallback(() => {
    setCurrentDate(new Date());
    handleViewChange("timeGridDay");
  }, [handleViewChange]);

  // FullCalendar event drop handler (with travel check)
  const handleEventDrop = useCallback((arg) => {
    const booking = arg.event.extendedProps.booking;
    const newStart = arg.event.start;
    const newEnd = arg.event.end;

    if (booking.fulfillment_type === "mobile" || booking.fulfillmentType === "mobile") {
      const staffId = booking.staff_id || booking.staff?.id;
      const staffBookings = (bookings || []).filter((b) => {
        return b.id !== booking.id && (b.staff_id === staffId || b.staff?.id === staffId);
      });

      let prevBooking = null;
      let nextBooking = null;

      staffBookings.forEach((b) => {
        const bEnd = new Date(String(b.end_datetime || b.endDatetime || b.startDatetime).replace(" ", "T"));
        const bStart = new Date(String(b.start_datetime || b.startDatetime).replace(" ", "T"));
        if (bEnd <= newStart && (!prevBooking || bEnd > new Date(String(prevBooking.end_datetime || prevBooking.endDatetime).replace(" ", "T")))) {
          prevBooking = b;
        }
        if (bStart >= newEnd && (!nextBooking || bStart < new Date(String(nextBooking.start_datetime || nextBooking.startDatetime).replace(" ", "T")))) {
          nextBooking = b;
        }
      });

      const checkResult = checkBidirectionalTravel({
        prevLat: prevBooking?.fulfillment_type === "mobile" ? Number(prevBooking.service_lat) : null,
        prevLng: prevBooking?.fulfillment_type === "mobile" ? Number(prevBooking.service_lng) : null,
        prevEndTime: prevBooking ? new Date(String(prevBooking.end_datetime || prevBooking.endDatetime).replace(" ", "T")) : null,
        newLat: Number(booking.service_lat),
        newLng: Number(booking.service_lng),
        newStartTime: newStart,
        newEndTime: newEnd,
        nextLat: nextBooking?.fulfillment_type === "mobile" ? Number(nextBooking.service_lat) : null,
        nextLng: nextBooking?.fulfillment_type === "mobile" ? Number(nextBooking.service_lng) : null,
        nextStartTime: nextBooking ? new Date(String(nextBooking.start_datetime || nextBooking.startDatetime).replace(" ", "T")) : null,
        baseLat: salon ? Number(salon.latitude) : null,
        baseLng: salon ? Number(salon.longitude) : null,
        salonBufferTime: salon?.travel_buffer_time,
      });

      if (!checkResult.feasible) {
        const direction = !checkResult.arrivalFeasible ? "arrive at" : "depart from";
        const travelMins = !checkResult.arrivalFeasible ? checkResult.arrivalTravelMinutes : checkResult.departureTravelMinutes;
        const gapMins = !checkResult.arrivalFeasible ? checkResult.arrivalGapMinutes : checkResult.departureGapMinutes;
        if (!window.confirm(
          "Warning: Insufficient travel time detected.\n\n" +
          "Staff cannot " + direction + " location in time (need " + travelMins + " min, only " + Math.floor(gapMins) + " min available).\n\n" +
          "Do you want to override this warning and force the reschedule?"
        )) {
          arg.revert();
          return;
        }
      }
    }

    rescheduleBooking.mutate(
      { id: booking.id, data: { startDateTime: newStart.toISOString(), endDateTime: newEnd.toISOString() } },
      { onError: () => { arg.revert(); } },
    );
  }, [rescheduleBooking, bookings, salon]);

  // Format date range display
  const getDateRangeDisplay = useCallback(() => {
    if (currentView === "dayGridMonth") {
      return format(currentDate, "MMMM yyyy");
    } else if (currentView === "timeGridWeek") {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
      if (weekStart.getMonth() === weekEnd.getMonth()) {
        return format(weekStart, "MMM d") + " - " + format(weekEnd, "d, yyyy");
      }
      return format(weekStart, "MMM d") + " - " + format(weekEnd, "MMM d, yyyy");
    } else {
      return format(currentDate, "EEEE, MMMM d, yyyy");
    }
  }, [currentDate, currentView]);

  // Quick action handlers
  const handleEditBooking = useCallback((booking) => {
    if (onEventClick) onEventClick(booking);
  }, [onEventClick]);

  const handleConfirmBooking = useCallback((booking) => {
    confirmBooking.mutate(booking.id);
  }, [confirmBooking]);

  const handleCompleteBooking = useCallback((booking) => {
    completeBooking.mutate(booking.id);
  }, [completeBooking]);

  const router = useRouter();
  const handleCheckoutBooking = useCallback((booking) => {
    router.push("/dashboard/salon/" + salonId + "/checkout/" + booking.id);
  }, [router, salonId]);

  const handleCancelBookingAction = useCallback((booking) => {
    if (confirm("Are you sure you want to cancel this booking?")) {
      cancelBooking.mutate(booking.id);
    }
  }, [cancelBooking]);

  // Hover handler for cross-highlighting
  const handleHoverBooking = useCallback((id) => {
    setHoveredBookingId(id);
  }, []);

  if (bookingsError || staffError) {
    return (
      <DataError
        title="Failed to load calendar"
        message={bookingsError ? "Unable to fetch bookings" : "Unable to fetch staff members"}
        onRetry={bookingsError ? refetchBookings : refetchStaff}
        error={bookingsError || staffError}
      />
    );
  }

  let activeStaff = staff && Array.isArray(staff) ? staff : [];
  if (filters.staff.length > 0) {
    activeStaff = activeStaff.filter((s) => filters.staff.includes(s.id));
  }

  return (
    <div className="flex flex-col relative min-h-[500px]">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-4 border-b sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrev} aria-label="Previous">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold min-w-[240px] text-center">
            {getDateRangeDisplay()}
          </h2>
          <Button variant="outline" size="sm" onClick={handleNext} aria-label="Next">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* Staff filter popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="rounded-full h-9 px-4">
                {filters.staff.length > 0 ? filters.staff.length + " selected" : "All team"}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="end">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Filter by Team</span>
                  {filters.staff.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => setFilters((prev) => ({ ...prev, staff: [] }))}>
                      Clear
                    </Button>
                  )}
                </div>
                <ScrollArea className="h-48">
                  <div className="space-y-2">
                    {staff && Array.isArray(staff) && staff.map((member, index) => {
                      const color = member.color || getStaffColor(index).hex;
                      return (
                        <div key={member.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50">
                          <Checkbox
                            id={"staff-" + member.id}
                            checked={filters.staff.includes(member.id)}
                            onCheckedChange={() => {
                              setFilters((prev) => ({
                                ...prev,
                                staff: prev.staff.includes(member.id)
                                  ? prev.staff.filter((id) => id !== member.id)
                                  : [...prev.staff, member.id],
                              }));
                            }}
                          />
                          <div
                            className="w-4 h-4 rounded-full border-2 border-background shadow-sm flex-shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <Label htmlFor={"staff-" + member.id} className="cursor-pointer flex-1 font-medium">
                            {member.firstName} {member.lastName}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            </PopoverContent>
          </Popover>

          {/* Filter drawer */}
          <Sheet open={isFilterDrawerOpen} onOpenChange={setIsFilterDrawerOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-full h-9 w-9" aria-label="Open filters">
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[400px] sm:w-[540px] flex flex-col p-0">
              <SheetHeader className="p-6 pb-2">
                <SheetTitle className="text-xl">All filters</SheetTitle>
              </SheetHeader>
              <ScrollArea className="flex-1 px-6 py-4">
                <div className="space-y-4">
                  <FilterSection
                    title="Appointment status" icon={<CalendarDays className="w-5 h-5" />}
                    options={[{ id: "pending", label: "Pending" }, { id: "confirmed", label: "Confirmed" }, { id: "completed", label: "Completed" }, { id: "cancelled", label: "Cancelled" }, { id: "no-show", label: "No-Show" }]}
                    selected={draftFilters.status}
                    onChange={(id) => setDraftFilters((p) => ({ ...p, status: p.status.includes(id) ? p.status.filter((x) => x !== id) : [...p.status, id] }))}
                  />
                  <FilterSection
                    title="Type" icon={<ClipboardList className="w-5 h-5" />}
                    options={[{ id: "physical", label: "In-Salon" }, { id: "mobile", label: "Mobile" }, { id: "virtual", label: "Virtual" }, { id: "time_off", label: "Time Off" }]}
                    selected={draftFilters.type}
                    onChange={(id) => setDraftFilters((p) => ({ ...p, type: p.type.includes(id) ? p.type.filter((x) => x !== id) : [...p.type, id] }))}
                  />
                  <FilterSection
                    title="Payment status" icon={<Coins className="w-5 h-5" />}
                    options={[{ id: "pending", label: "Pending" }, { id: "partially_paid", label: "Partially Paid" }, { id: "paid", label: "Paid" }]}
                    selected={draftFilters.paymentStatus}
                    onChange={(id) => setDraftFilters((p) => ({ ...p, paymentStatus: p.paymentStatus.includes(id) ? p.paymentStatus.filter((x) => x !== id) : [...p.paymentStatus, id] }))}
                  />
                  <FilterSection
                    title="Services" icon={<Tag className="w-5 h-5" />}
                    options={(salonServices || []).map((s) => ({ id: String(s.id), label: s.name }))}
                    selected={draftFilters.services}
                    onChange={(id) => setDraftFilters((p) => ({ ...p, services: p.services.includes(id) ? p.services.filter((x) => x !== id) : [...p.services, id] }))}
                  />
                  <Collapsible className="border-b py-3">
                    <CollapsibleTrigger className="flex items-center justify-between w-full text-left">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-muted-foreground" />
                        <span className="font-medium">Appointment creation date</span>
                      </div>
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-4 space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label>From</Label>
                          <Input type="date" value={draftFilters.creationDate.start} onChange={(e) => setDraftFilters((p) => ({ ...p, creationDate: { ...p.creationDate, start: e.target.value } }))} />
                        </div>
                        <div className="space-y-1">
                          <Label>To</Label>
                          <Input type="date" value={draftFilters.creationDate.end} onChange={(e) => setDraftFilters((p) => ({ ...p, creationDate: { ...p.creationDate, end: e.target.value } }))} />
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                  <FilterSection
                    title="Requested team member" icon={<Heart className="w-5 h-5" />}
                    options={(staff || []).map((s) => ({ id: s.id, label: `${s.firstName} ${s.lastName}` }))}
                    selected={draftFilters.staff}
                    onChange={(id) => setDraftFilters((p) => ({ ...p, staff: p.staff.includes(id) ? p.staff.filter((x) => x !== id) : [...p.staff, id] }))}
                  />
                </div>
              </ScrollArea>
              <div className="p-6 border-t bg-background flex items-center gap-4">
                <Button variant="outline" className="flex-1 rounded-full" onClick={() => setDraftFilters({ status: [], type: [], paymentStatus: [], services: [], creationDate: { start: "", end: "" }, staff: [] })}>
                  Clear filters
                </Button>
                <Button className="flex-1 rounded-full" onClick={() => { setFilters(draftFilters); setIsFilterDrawerOpen(false); }}>
                  Apply
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          {/* View buttons */}
          <div className="flex border rounded-md" role="group" aria-label="Calendar view">
            <Button
              variant={currentView === "timeGridDay" ? "secondary" : "ghost"}
              size="sm"
              className="rounded-r-none"
              onClick={() => handleViewChange("timeGridDay")}
            >
              Day
            </Button>
            <Button
              variant={currentView === "timeGridWeek" ? "secondary" : "ghost"}
              size="sm"
              className="rounded-none border-x"
              onClick={() => handleViewChange("timeGridWeek")}
            >
              Week
            </Button>
            <Button
              variant={currentView === "dayGridMonth" ? "secondary" : "ghost"}
              size="sm"
              className="rounded-l-none"
              onClick={() => handleViewChange("dayGridMonth")}
            >
              Month
            </Button>
          </div>

          {/* Settings */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="ml-2 px-2.5" aria-label="Calendar settings">
                <Settings className="w-4 h-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto p-0">
              <SheetHeader className="px-6 pt-6 pb-6 border-b">
                <SheetTitle className="text-2xl">Calendar Settings</SheetTitle>
              </SheetHeader>
              <div className="px-6 py-6 space-y-8">
                <div className="space-y-3">
                  <Label>Zoom Level</Label>
                  <input
                    type="range"
                    min="80"
                    max="140"
                    step="20"
                    value={hourHeight}
                    onChange={(e) => setHourHeight(parseInt(e.target.value))}
                    className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
                    aria-label="Calendar zoom level"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground font-medium">
                    <span>Small</span>
                    <span>Med-Sm</span>
                    <span>Medium</span>
                    <span>Large</span>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Loading Overlay */}
      {(bookingsLoading || staffLoading) && (
        <div className="absolute inset-x-0 bottom-0 top-[69px] z-50 pointer-events-none">
          <div className="sticky top-1/2 -translate-y-1/2 w-fit mx-auto bg-background/80 backdrop-blur-sm border shadow-sm rounded-full p-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </div>
      )}

      {/* ===== DAY VIEW ===== */}
      {isDayView && (
        <DayView
          currentDate={currentDate}
          activeStaff={activeStaff}
          bookingsByStaff={bookingsByStaff}
          timeOffByStaff={timeOffByStaff}
          staffColorMap={staffColorMap}
          hourHeight={hourHeight}
          hoveredBookingId={hoveredBookingId}
          selectedSlot={slotMenu}
          onHoverBooking={handleHoverBooking}
          onEventClick={onEventClick}
          onTimeOffClick={onTimeOffClick}
          onSlotMenu={setSlotMenu}
        />
      )}

      {/* ===== WEEK VIEW ===== */}
      {isWeekView && (
        <WeekView
          currentDate={currentDate}
          weekDays={weekDays}
          staff={activeStaff}
          bookings={filteredBookings}
          timeOffByStaff={timeOffByStaff}
          staffColorMap={staffColorMap}
          hoveredBookingId={hoveredBookingId}
          onHoverBooking={handleHoverBooking}
          onEventClick={onEventClick}
          onTimeOffClick={onTimeOffClick}
          onSlotMenu={setSlotMenu}
          onSwitchToDay={(day) => {
            setCurrentDate(day);
            handleViewChange("timeGridDay");
          }}
          onEditBooking={handleEditBooking}
          onConfirmBooking={handleConfirmBooking}
          onCompleteBooking={handleCompleteBooking}
          onCheckoutBooking={handleCheckoutBooking}
          onCancelBooking={handleCancelBookingAction}
        />
      )}

      {/* ===== MONTH VIEW ===== */}
      {!isDayView && !isWeekView && (
        <MonthView
          currentDate={currentDate}
          currentView={currentView}
          events={events}
          hourHeight={hourHeight}
          calendarRef={calendarRef}
          onDateClick={(date) => {
            if (onDateClick) onDateClick(date);
            if (onNewBooking) onNewBooking({ date });
          }}
          onEventClick={onEventClick}
          onEventDrop={handleEventDrop}
        />
      )}

      {/* ===== Global Slot Action Menu ===== */}
      {slotMenu && (() => {
        const MENU_WIDTH = 220;
        const MENU_HEIGHT = 140;
        const GAP = 4;

        // Position to the right of the column, or left if no space
        let menuLeft;
        if (slotMenu.columnRight != null) {
          const rightSpace = window.innerWidth - slotMenu.columnRight;
          if (rightSpace >= MENU_WIDTH + GAP) {
            menuLeft = slotMenu.columnRight + GAP;
          } else {
            menuLeft = slotMenu.columnLeft - MENU_WIDTH - GAP;
          }
        } else {
          menuLeft = Math.min(slotMenu.x, window.innerWidth - MENU_WIDTH - 16);
        }

        // Vertically center on the slot
        let menuTop;
        if (slotMenu.slotCenterY != null) {
          menuTop = slotMenu.slotCenterY - (MENU_HEIGHT / 2);
        } else {
          menuTop = slotMenu.y;
        }
        // Clamp to viewport
        menuTop = Math.max(8, Math.min(menuTop, window.innerHeight - MENU_HEIGHT - 8));
        menuLeft = Math.max(8, menuLeft);

        return (
          <div
            ref={slotMenuRef}
            role="menu"
            aria-label="Slot actions"
            className="fixed z-[9999] min-w-[200px] bg-popover border border-border rounded-xl shadow-xl pb-1 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150"
            style={{
              left: menuLeft + "px",
              top: menuTop + "px",
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-muted px-3 pt-2 pb-1.5 border-b border-border/50">
              <div className="text-xs font-semibold text-foreground">
                {format(slotMenu.date, "EEE, MMM d")}
                {currentView === "timeGridDay" && (
                  <span className="text-muted-foreground font-normal ml-1">at {format(slotMenu.date, "HH:mm")}</span>
                )}
              </div>
            </div>
            {/* Options */}
            <div className="py-1">
              <button
                role="menuitem"
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/60 transition-colors text-left"
                onClick={() => {
                  setSlotMenu(null);
                  if (onNewBooking) onNewBooking({ date: slotMenu.date, staffId: slotMenu.staffId, type: "appointment" });
                }}
              >
                <CalendarPlus className="h-4 w-4 text-primary shrink-0" />
                <span>Add appointment</span>
              </button>
              <button
                role="menuitem"
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/60 transition-colors text-left"
                onClick={() => {
                  setSlotMenu(null);
                  if (onNewBooking) onNewBooking({ date: slotMenu.date, staffId: slotMenu.staffId, type: "block" });
                }}
              >
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">Add blocked time</span>
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
