"use client";

import React, { useRef, useState, useCallback, useMemo, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CalendarSkeleton } from "@/components/ui/loading-skeletons";
import { DataError } from "@/components/ui/data-error";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight, Filter, Settings, CalendarPlus, Clock, CalendarDays, SlidersHorizontal, ChevronDown, ChevronUp, Calendar, ClipboardList, Globe, Coins, Tag, Heart, Loader2 } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { EventTooltip } from "./event-tooltip";
import { EventQuickActions } from "./event-quick-actions";

import "@/styles/calendar.css";

// Staff Day View constants
var START_HOUR = 0;
var END_HOUR = 24;
var TOTAL_HOURS = END_HOUR - START_HOUR;

function getTimePosition(dateStr, hourHeight) {
  var d = new Date(String(dateStr).replace(" ", "T"));
  return (d.getHours() + d.getMinutes() / 60) * hourHeight;
}

function getEventHeight(startStr, endStr, hourHeight) {
  var start = new Date(String(startStr).replace(" ", "T"));
  var end = new Date(String(endStr).replace(" ", "T"));
  var diffHours = (end - start) / (1000 * 60 * 60);
  return Math.max(diffHours * hourHeight, 20);
}

function layoutOverlappingEvents(events) {
  if (!events || events.length === 0) return [];
  var sorted = events.slice().sort(function (a, b) {
    var aStart = new Date(String(a.start || a.startDatetime || "").replace(" ", "T"));
    var bStart = new Date(String(b.start || b.startDatetime || "").replace(" ", "T"));
    return aStart - bStart;
  });
  var positioned = [];
  var columns = [];
  sorted.forEach(function (event) {
    var eventStart = new Date(String(event.start || event.startDatetime || "").replace(" ", "T"));
    var placed = false;
    for (var i = 0; i < columns.length; i++) {
      var lastInCol = columns[i][columns[i].length - 1];
      var lastEnd = new Date(String(lastInCol.end || lastInCol.endDatetime || "").replace(" ", "T"));
      if (eventStart >= lastEnd) {
        columns[i].push(event);
        positioned.push({ event: event, column: i });
        placed = true;
        break;
      }
    }
    if (!placed) {
      columns.push([event]);
      positioned.push({ event: event, column: columns.length - 1 });
    }
  });
  var totalColumns = columns.length || 1;
  return positioned.map(function (item) {
    return { event: item.event, column: item.column, totalColumns: totalColumns };
  });
}


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
  var calendarRef = useRef(null);
  var hasScrolledRef = useRef(false);
  var staffScrollRef = useRef(null);
  var { salonId, salon } = useSalon();
  var { data: salonServicesData } = useServices(salonId);
  var salonServices = salonServicesData || [];

  var [currentDate, setCurrentDate] = useState(new Date());
  var [currentView, setCurrentView] = useState("timeGridDay");
  var [selectedStaff, setSelectedStaff] = useState([]);
  var [hourHeight, setHourHeight] = useState(80);

  var [filters, setFilters] = useState({
    status: [],
    type: [],
    paymentStatus: [],
    services: [],
    creationDate: { start: "", end: "" },
    staff: []
  });
  var [draftFilters, setDraftFilters] = useState(filters);
  var [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  useEffect(() => {
    if (isFilterDrawerOpen) {
      setDraftFilters(filters);
    }
  }, [isFilterDrawerOpen, filters]);

  var HOUR_HEIGHT = hourHeight;

  // Slot action menu (Add appointment / Add blocked time)
  var [slotMenu, setSlotMenu] = useState(null); // { x, y, date, staffId }
  var slotMenuRef = useRef(null);

  // Close slot menu when clicking outside
  useEffect(function () {
    if (!slotMenu) return;
    function handleOutside(e) {
      if (slotMenuRef.current && !slotMenuRef.current.contains(e.target)) {
        setSlotMenu(null);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return function () { document.removeEventListener("mousedown", handleOutside); };
  }, [slotMenu]);

  var confirmBooking = useConfirmBooking();
  var cancelBooking = useCancelBooking();
  var updateBooking = useUpdateBooking();
  var rescheduleBooking = useRescheduleBooking();
  var completeBooking = useCompleteBooking();

  var isDayView = currentView === "timeGridDay";
  var isWeekView = currentView === "timeGridWeek";

  // Calculate date range based on current view
  var dateRange = useMemo(
    function () {
      var start, end;
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
    },
    [currentDate, currentView],
  );

  // Fetch bookings
  var {
    data: bookings,
    isLoading: bookingsLoading,
    error: bookingsError,
    refetch: refetchBookings,
  } = useCalendarBookings(salonId, dateRange.start, dateRange.end);

  // Fetch staff
  var {
    data: staff,
    isLoading: staffLoading,
    error: staffError,
    refetch: refetchStaff,
  } = useStaff(salonId);

  // Build staff color map
  var staffColorMap = useMemo(
    function () {
      var map = {};
      if (staff && Array.isArray(staff)) {
        staff.forEach(function (member, index) {
          var fallbackColor = getStaffColor(index);
          var hex = member.color || fallbackColor.hex;
          var name = fallbackColor.name;
          if (member.color) {
            for (var i = 0; i < 10; i++) {
              var c = getStaffColor(i);
              if (c.hex.toLowerCase() === member.color.toLowerCase()) {
                name = c.name;
                break;
              }
            }
          }
          map[member.id] = { hex: hex, name: name };
        });
      }
      return map;
    },
    [staff],
  );


  var filteredBookings = useMemo(() => {
    if (!bookings || !Array.isArray(bookings)) return [];
    return bookings.filter(b => {
      if (filters.staff && filters.staff.length > 0) {
        var hasStaff = b.services?.some(s => filters.staff.includes(s.staffId || b.staffId || b.staff?.id)) || filters.staff.includes(b.staffId || b.staff?.id);
        if (!hasStaff) return false;
      }
      if (filters.status && filters.status.length > 0) {
        if (!filters.status.includes(b.status)) return false;
      }
      if (filters.type && filters.type.length > 0) {
        if (b.type === "time_off") {
          if (!filters.type.includes("time_off")) return false;
        } else {
          var fType = b.fulfillmentType || "physical";
          if (!filters.type.includes(fType)) return false;
        }
      }
      if (filters.paymentStatus && filters.paymentStatus.length > 0) {
        var pStatus = b.paymentStatus || 'pending';
        if (!filters.paymentStatus.includes(pStatus)) return false;
      }
      if (filters.services && filters.services.length > 0) {
        if (!b.services || !b.services.some(s => filters.services.includes(String(s.service_id || s.id)))) return false;
      }
      if (filters.creationDate && filters.creationDate.start && filters.creationDate.end) {
        if (!b.createdAt) return false;
        var created = new Date(b.createdAt);
        var start = new Date(filters.creationDate.start);
        var end = new Date(filters.creationDate.end);
        end.setHours(23, 59, 59, 999);
        if (created < start || created > end) return false;
      }
      return true;
    });
  }, [bookings, filters]);

  // Convert bookings to FullCalendar events (for Week/Month)
  var events = useMemo(
    function () {
      if (!filteredBookings || !Array.isArray(filteredBookings)) return [];
      return filteredBookings
        .flatMap(function (booking) {
          var clientName = booking.title || (booking.client
            ? booking.client.firstName + " " + booking.client.lastName
            : "Walk-in");

          var bookingEvents = [];

          if (booking.services && booking.services.length > 0) {
            bookingEvents = booking.services
              .filter(function (s) {
                var sStaffId = s.staffId || booking.staffId || booking.staff?.id;
                if (!selectedStaff || selectedStaff.length === 0) return true;
                return selectedStaff.includes(sStaffId);
              })
              .map(function (s, idx) {
                var staffId = s.staffId || booking.staffId || booking.staff?.id;
                var staffColor = staffColorMap[staffId] || { name: "blue", hex: "#3b82f6" };
                var startTime = new Date((s.startDatetime || booking.start || booking.startDatetime || "").replace(" ", "T"));
                var endTime = new Date((s.endDatetime || booking.end || booking.endDatetime || "").replace(" ", "T"));
                var timeText = format(startTime, "HH:mm") + " – " + format(endTime, "HH:mm");
                var servicesText = s.name;

                var staffName = "";
                if (staff && Array.isArray(staff)) {
                  var member = staff.find(st => st.id === staffId);
                  if (member) staffName = member.firstName + " " + member.lastName;
                }
                if (!staffName) staffName = booking.staffName || (booking.staff ? booking.staff.firstName + " " + booking.staff.lastName : "");

                return {
                  id: booking.id + "-" + idx,
                  title: clientName + " (" + s.name + ")",
                  start: (s.startDatetime || booking.start || booking.startDatetime || "").replace(" ", "T"),
                  end: (s.endDatetime || booking.end || booking.endDatetime || "").replace(" ", "T"),
                  backgroundColor: staffColor.hex,
                  borderColor: staffColor.hex,
                  extendedProps: {
                    booking: booking,
                    staffColor: staffColor.name,
                    status: booking.status,
                    servicesText: servicesText,
                    timeText: timeText,
                    staffName: staffName,
                  },
                };
              });
          } else {
            // Fallback if no services exist
            var staffId = booking.staffId || booking.staff?.id;
            if (!selectedStaff || selectedStaff.length === 0 || selectedStaff.includes(staffId)) {
              var staffColor = staffColorMap[staffId] || { name: "blue", hex: "#3b82f6" };
              var servicesText = "";
              var startTime = new Date((booking.start || booking.startDatetime || "").replace(" ", "T"));
              var endTime = new Date((booking.end || booking.endDatetime || "").replace(" ", "T"));
              var timeText = format(startTime, "HH:mm") + " – " + format(endTime, "HH:mm");
              bookingEvents.push({
                id: booking.id,
                title: clientName,
                start: (booking.start || booking.startDatetime || "").replace(" ", "T"),
                end: (booking.end || booking.endDatetime || "").replace(" ", "T"),
                backgroundColor: staffColor.hex,
                borderColor: staffColor.hex,
                extendedProps: {
                  booking: booking,
                  staffColor: staffColor.name,
                  status: booking.status,
                  servicesText: servicesText,
                  timeText: timeText,
                  staffName: booking.staffName || (booking.staff
                    ? booking.staff.firstName + " " + booking.staff.lastName
                    : ""),
                },
              });
            }
          }

          if (booking.fulfillmentType === "mobile") {
            var travelTimeMins = booking.travelDistanceKm
              ? estimateTravelTimeFromDistance(booking.travelDistanceKm) + SETUP_BUFFER_MINUTES
              : (booking.travelBufferTime ? Math.floor(booking.travelBufferTime / 2) : 30);

            var bookingStartStr = booking.start || booking.startDatetime || "";
            var bookingEndStr = booking.end || booking.endDatetime || "";
            var bStart = new Date(bookingStartStr.replace(" ", "T"));
            var bEnd = new Date(bookingEndStr.replace(" ", "T"));

            var arrStart = new Date(bStart.getTime() - travelTimeMins * 60000);
            var depEnd = new Date(bEnd.getTime() + travelTimeMins * 60000);

            bookingEvents.push({
              id: booking.id + "-travel-arr",
              title: "🚗 Travel (" + travelTimeMins + "m)",
              start: format(arrStart, "yyyy-MM-dd'T'HH:mm:ss"),
              end: format(bStart, "yyyy-MM-dd'T'HH:mm:ss"),
              backgroundColor: "rgba(148, 163, 184, 0.2)",
              borderColor: "rgba(148, 163, 184, 0.5)",
              textColor: "#64748b",
              extendedProps: { isTravel: true }
            });

            bookingEvents.push({
              id: booking.id + "-travel-dep",
              title: "🚗 Travel (" + travelTimeMins + "m)",
              start: format(bEnd, "yyyy-MM-dd'T'HH:mm:ss"),
              end: format(depEnd, "yyyy-MM-dd'T'HH:mm:ss"),
              backgroundColor: "rgba(148, 163, 184, 0.2)",
              borderColor: "rgba(148, 163, 184, 0.5)",
              textColor: "#64748b",
              extendedProps: { isTravel: true }
            });
          }

          return bookingEvents;
        });
    },
    [filteredBookings, staffColorMap],
  );

  // Group bookings by staff (for Day view)
  // Also separately tracks time_off blocks per staff
  var { bookingsByStaff, timeOffByStaff } = useMemo(function () {
    var groups = {};
    var timeOffGroups = {};
    if (staff && Array.isArray(staff)) {
      staff.forEach(function (member) {
        groups[member.id] = [];
        timeOffGroups[member.id] = [];
      });
    }
    if (filteredBookings && Array.isArray(filteredBookings)) {
      filteredBookings.forEach(function (booking) {
        // ── Time-off blocks ─────────────────────────────────────────────
        if (booking.type === "time_off") {
          var toStaffId = booking.staffId || booking.staff?.id;
          if (toStaffId) {
            timeOffGroups[toStaffId] = timeOffGroups[toStaffId] || [];
            timeOffGroups[toStaffId].push(booking);
          }
          return; // don't add to the regular bookings groups
        }

        // ── Real bookings ────────────────────────────────────────────────
        if (booking.services && booking.services.length > 0) {
          booking.services.forEach(function (s, i) {
            var staffId = s.staffId || booking.staffId || booking.staff?.id;
            var subBooking = Object.assign({}, booking, {
              subId: booking.id + "-" + i,
              startDatetime: s.startDatetime || booking.startDatetime || booking.start,
              endDatetime: s.endDatetime || booking.endDatetime || booking.end,
              start: s.startDatetime || booking.startDatetime || booking.start,
              end: s.endDatetime || booking.endDatetime || booking.end,
              services: [s], // only this service
              originalBooking: booking
            });
            if (staffId && groups[staffId]) {
              groups[staffId].push(subBooking);
            } else if (staffId) {
              groups[staffId] = groups[staffId] || [];
              groups[staffId].push(subBooking);
            }
          });
        } else {
          var staffId = booking.staffId || booking.staff?.id;
          if (staffId && groups[staffId]) {
            groups[staffId].push(booking);
          } else if (staffId) {
            groups[staffId] = groups[staffId] || [];
            groups[staffId].push(booking);
          }
        }

        if (booking.fulfillmentType === "mobile") {
          var travelTimeMins = booking.travelDistanceKm
            ? estimateTravelTimeFromDistance(booking.travelDistanceKm) + SETUP_BUFFER_MINUTES
            : (booking.travelBufferTime ? Math.floor(booking.travelBufferTime / 2) : 30);

          var bookingStartStr = booking.start || booking.startDatetime || "";
          var bookingEndStr = booking.end || booking.endDatetime || "";
          var bookingStart = new Date(bookingStartStr.replace(" ", "T"));
          var bookingEnd = new Date(bookingEndStr.replace(" ", "T"));

          var arrStart = new Date(bookingStart.getTime() - travelTimeMins * 60000);
          var depEnd = new Date(bookingEnd.getTime() + travelTimeMins * 60000);

          var tStaffId = booking.staffId || booking.staff?.id;
          if (booking.services && booking.services.length > 0) {
            tStaffId = booking.services[0].staffId || tStaffId; // Primary staff
          }

          if (tStaffId && groups[tStaffId]) {
            groups[tStaffId].push({
              subId: booking.id + "-travel-arr",
              start: arrStart.toISOString(),
              end: bookingStart.toISOString(),
              startDatetime: arrStart.toISOString(),
              endDatetime: bookingStart.toISOString(),
              isTravel: true,
              travelTimeMins: travelTimeMins,
              originalBooking: booking
            });
            groups[tStaffId].push({
              subId: booking.id + "-travel-dep",
              start: bookingEnd.toISOString(),
              end: depEnd.toISOString(),
              startDatetime: bookingEnd.toISOString(),
              endDatetime: depEnd.toISOString(),
              isTravel: true,
              travelTimeMins: travelTimeMins,
              originalBooking: booking
            });
          }
        }
      });
    }
    return { bookingsByStaff: groups, timeOffByStaff: timeOffGroups };
  }, [filteredBookings, staff]);

  var weekDays = useMemo(function () {
    if (!isWeekView) return [];
    var days = [];
    var start = startOfWeek(currentDate, { weekStartsOn: 1 });
    for (var i = 0; i < 7; i++) {
      days.push(addDays(start, i));
    }
    return days;
  }, [currentDate, isWeekView]);

  // Navigation handlers
  var handlePrev = useCallback(function () {
    if (isDayView) {
      setCurrentDate(function (d) { return subDays(d, 1); });
    } else if (isWeekView) {
      setCurrentDate(function (d) { return subDays(d, 7); });
    } else {
      var api = calendarRef.current?.getApi();
      if (api) { api.prev(); setCurrentDate(api.getDate()); }
    }
  }, [isDayView, isWeekView]);

  var handleNext = useCallback(function () {
    if (isDayView) {
      setCurrentDate(function (d) { return addDays(d, 1); });
    } else if (isWeekView) {
      setCurrentDate(function (d) { return addDays(d, 7); });
    } else {
      var api = calendarRef.current?.getApi();
      if (api) { api.next(); setCurrentDate(api.getDate()); }
    }
  }, [isDayView, isWeekView]);

  var handleToday = useCallback(function () {
    setCurrentDate(new Date());
    handleViewChange("timeGridDay");
  }, [handleViewChange]);

  var handleViewChange = useCallback(function (view) {
    if (view !== "timeGridDay") {
      // Switching to week/month — need to tell FullCalendar
      setCurrentView(view);
      // FullCalendar will mount with the new view
    } else {
      setCurrentView(view);
    }
  }, []);

  // Sync FullCalendar view when switching to month view
  useEffect(function () {
    if (!isDayView && !isWeekView && calendarRef.current) {
      try {
        var api = calendarRef.current.getApi();
        if (api && api.view.type !== currentView) {
          api.changeView(currentView);
          api.gotoDate(currentDate);
        }
      } catch (e) { /* calendar not mounted yet */ }
    }
  }, [currentView, isDayView, isWeekView, currentDate]);

  // Event handlers for FullCalendar
  var handleDateClick = useCallback(
    function (arg) {
      if (onDateClick) onDateClick(arg.date);
      if (onNewBooking) onNewBooking({ date: arg.date });
    },
    [onDateClick, onNewBooking],
  );

  var handleEventClick = useCallback(
    function (arg) {
      var booking = arg.event.extendedProps.booking;
      if (onEventClick) onEventClick(booking);
    },
    [onEventClick],
  );

  var handleEventDrop = useCallback(
    function (arg) {
      var booking = arg.event.extendedProps.booking;
      var newStart = arg.event.start;
      var newEnd = arg.event.end;

      if (booking.fulfillment_type === "mobile" || booking.fulfillmentType === "mobile") {
        var staffId = booking.staff_id || booking.staff?.id;
        var staffBookings = (bookings || []).filter(function (b) {
          return b.id !== booking.id && (b.staff_id === staffId || b.staff?.id === staffId);
        });

        var prevBooking = null;
        var nextBooking = null;

        staffBookings.forEach(function (b) {
          var bEnd = new Date(String(b.end_datetime || b.endDatetime || b.startDatetime).replace(" ", "T"));
          var bStart = new Date(String(b.start_datetime || b.startDatetime).replace(" ", "T"));

          if (bEnd <= newStart && (!prevBooking || bEnd > new Date(String(prevBooking.end_datetime || prevBooking.endDatetime).replace(" ", "T")))) {
            prevBooking = b;
          }
          if (bStart >= newEnd && (!nextBooking || bStart < new Date(String(nextBooking.start_datetime || nextBooking.startDatetime).replace(" ", "T")))) {
            nextBooking = b;
          }
        });

        var checkResult = checkBidirectionalTravel({
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
          var direction = !checkResult.arrivalFeasible ? "arrive at" : "depart from";
          var travelMins = !checkResult.arrivalFeasible ? checkResult.arrivalTravelMinutes : checkResult.departureTravelMinutes;
          var gapMins = !checkResult.arrivalFeasible ? checkResult.arrivalGapMinutes : checkResult.departureGapMinutes;

          if (
            !window.confirm(
              "Warning: Insufficient travel time detected.\n\n" +
              "Staff cannot " + direction + " location in time (need " + travelMins + " min, only " + Math.floor(gapMins) + " min available).\n\n" +
              "Do you want to override this warning and force the reschedule?"
            )
          ) {
            arg.revert();
            return;
          }
        }
      }

      rescheduleBooking.mutate(
        {
          id: booking.id,
          data: { startDateTime: newStart.toISOString(), endDateTime: newEnd.toISOString() },
        },
        { onError: function () { arg.revert(); } },
      );
    },
    [rescheduleBooking, bookings, salon],
  );

  // Staff filter toggle
  var toggleStaffFilter = useCallback(function (staffId) {
    setSelectedStaff(function (prev) {
      if (prev.includes(staffId)) {
        return prev.filter(function (id) { return id !== staffId; });
      }
      return [...prev, staffId];
    });
  }, []);

  var clearStaffFilter = useCallback(function () { setSelectedStaff([]); }, []);

  // Format date range display
  var getDateRangeDisplay = useCallback(
    function () {
      if (currentView === "dayGridMonth") {
        return format(currentDate, "MMMM yyyy");
      } else if (currentView === "timeGridWeek") {
        var weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        var weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
        if (weekStart.getMonth() === weekEnd.getMonth()) {
          return format(weekStart, "MMM d") + " - " + format(weekEnd, "d, yyyy");
        }
        return format(weekStart, "MMM d") + " - " + format(weekEnd, "MMM d, yyyy");
      } else {
        return format(currentDate, "EEEE, MMMM d, yyyy");
      }
    },
    [currentDate, currentView],
  );

  // Quick action handlers
  var handleEditBooking = useCallback(function (booking) {
    if (onEventClick) onEventClick(booking);
  }, [onEventClick]);

  var handleConfirmBooking = useCallback(function (booking) {
    confirmBooking.mutate(booking.id);
  }, [confirmBooking]);

  var handleCompleteBooking = useCallback(function (booking) {
    completeBooking.mutate(booking.id);
  }, [completeBooking]);

  var handleCancelBookingAction = useCallback(function (booking) {
    if (confirm("Are you sure you want to cancel this booking?")) {
      cancelBooking.mutate(booking.id);
    }
  }, [cancelBooking]);

  // FullCalendar scroll to current time (Week view)
  useEffect(
    function () {
      if (isDayView || !calendarRef.current || !events) return;
      var api = calendarRef.current.getApi();
      var view = api.view;
      if (view.type.includes("timeGrid")) {
        hasScrolledRef.current = false;
        var scrollTimeout = setTimeout(function () {
          if (hasScrolledRef.current) return;
          var scrollerEl = calendarRef.current?.elRef?.current?.querySelector(".fc-scroller-liquid-absolute");
          if (scrollerEl && scrollerEl.scrollHeight > 0) {
            var now = new Date();
            var currentMinutes = now.getHours() * 60 + now.getMinutes();
            var totalHeight = scrollerEl.scrollHeight;
            var currentPosition = (currentMinutes / (24 * 60)) * totalHeight;
            scrollerEl.scrollTop = currentPosition - scrollerEl.clientHeight / 2;
            hasScrolledRef.current = true;
          }
        }, 300);
        return function () { clearTimeout(scrollTimeout); };
      }
    },
    [currentView, events, isDayView],
  );

  // Staff Day View: scroll to current time
  useEffect(function () {
    if (!isDayView) return;
    var timeout = setTimeout(function () {
      var now = new Date();
      var isToday = format(currentDate, "yyyy-MM-dd") === format(now, "yyyy-MM-dd");
      
      if (isToday) {
        var indicator = document.getElementById("current-time-indicator");
        if (indicator) {
          indicator.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
        }
      } else {
        var nineAm = document.getElementById("hour-9-indicator");
        if (nineAm) {
          nineAm.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
        }
      }
    }, 300);
    return function () { clearTimeout(timeout); };
  }, [isDayView, currentDate]);

  // Now indicator position for staff day view
  var nowPos = useMemo(function () {
    var now = new Date();
    var todayStr = format(now, "yyyy-MM-dd");
    var dateStr = format(currentDate, "yyyy-MM-dd");
    if (dateStr !== todayStr) return null;
    return (now.getHours() + now.getMinutes() / 60) * HOUR_HEIGHT;
  }, [currentDate]);

  // Re-render now indicator every minute
  var [, setTick] = useState(0);
  useEffect(function () {
    var interval = setInterval(function () { setTick(function (t) { return t + 1; }); }, 60000);
    return function () { clearInterval(interval); };
  }, []);

  // Update FullCalendar now indicator time label
  useEffect(
    function () {
      if (isDayView) return;
      var updateCurrentTime = function () {
        var nowLine = calendarRef.current?.elRef?.current?.querySelector(".fc-timegrid-now-indicator-line");
        if (nowLine) {
          nowLine.setAttribute("data-time", format(new Date(), "HH:mm"));
        }
      };
      var timeout = setTimeout(updateCurrentTime, 100);
      var interval = setInterval(updateCurrentTime, 60000);
      return function () { clearTimeout(timeout); clearInterval(interval); };
    },
    [events, isDayView],
  );

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

  var activeStaff = staff && Array.isArray(staff) ? staff : [];
  if (filters.staff && filters.staff.length > 0) {
    activeStaff = activeStaff.filter(s => filters.staff.includes(s.id));
  }
  var hours = [];
  for (var h = START_HOUR; h < END_HOUR; h++) { hours.push(h); }

  return (
    <div className="flex flex-col relative min-h-[500px]">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-4 border-b sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold min-w-[240px] text-center">
            {getDateRangeDisplay()}
          </h2>
          <Button variant="outline" size="sm" onClick={handleNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="rounded-full h-9 px-4">
                {filters.staff && filters.staff.length > 0 ? filters.staff.length + " selected" : "All team"}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="end">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Filter by Team</span>
                  {filters.staff && filters.staff.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => setFilters(prev => ({ ...prev, staff: [] }))}>
                      Clear
                    </Button>
                  )}
                </div>
                <ScrollArea className="h-48">
                  <div className="space-y-2">
                    {staff && Array.isArray(staff) && staff.map(function (member, index) {
                      var color = member.color || getStaffColor(index).hex;
                      return (
                        <div key={member.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50">
                          <Checkbox
                            id={"staff-" + member.id}
                            checked={filters.staff && filters.staff.includes(member.id)}
                            onCheckedChange={function () {
                              setFilters(prev => ({
                                ...prev,
                                staff: prev.staff.includes(member.id)
                                  ? prev.staff.filter(id => id !== member.id)
                                  : [...prev.staff, member.id]
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

          <Sheet open={isFilterDrawerOpen} onOpenChange={setIsFilterDrawerOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-full h-9 w-9">
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[400px] sm:w-[540px] flex flex-col p-0">
              <SheetHeader className="p-6 pb-2">
                <div className="flex items-center justify-between">
                  <SheetTitle className="text-xl">All filters</SheetTitle>
                </div>
              </SheetHeader>

              <ScrollArea className="flex-1 px-6 py-4">
                <div className="space-y-4">
                  <FilterSection
                    title="Appointment status" icon={<CalendarDays className="w-5 h-5" />}
                    options={[{ id: 'pending', label: 'Pending' }, { id: 'confirmed', label: 'Confirmed' }, { id: 'completed', label: 'Completed' }, { id: 'cancelled', label: 'Cancelled' }, { id: 'no-show', label: 'No-Show' }]}
                    selected={draftFilters.status}
                    onChange={(id) => setDraftFilters(p => ({ ...p, status: p.status.includes(id) ? p.status.filter(x => x !== id) : [...p.status, id] }))}
                  />
                  <FilterSection
                    title="Type" icon={<ClipboardList className="w-5 h-5" />}
                    options={[{ id: 'physical', label: 'In-Salon' }, { id: 'mobile', label: 'Mobile' }, { id: 'virtual', label: 'Virtual' }, { id: 'time_off', label: 'Time Off' }]}
                    selected={draftFilters.type}
                    onChange={(id) => setDraftFilters(p => ({ ...p, type: p.type.includes(id) ? p.type.filter(x => x !== id) : [...p.type, id] }))}
                  />
                  <FilterSection
                    title="Payment status" icon={<Coins className="w-5 h-5" />}
                    options={[{ id: 'pending', label: 'Pending' }, { id: 'partially_paid', label: 'Partially Paid' }, { id: 'paid', label: 'Paid' }]}
                    selected={draftFilters.paymentStatus}
                    onChange={(id) => setDraftFilters(p => ({ ...p, paymentStatus: p.paymentStatus.includes(id) ? p.paymentStatus.filter(x => x !== id) : [...p.paymentStatus, id] }))}
                  />
                  <FilterSection
                    title="Services" icon={<Tag className="w-5 h-5" />}
                    options={(salonServices || []).map(s => ({ id: String(s.id), label: s.name }))}
                    selected={draftFilters.services}
                    onChange={(id) => setDraftFilters(p => ({ ...p, services: p.services.includes(id) ? p.services.filter(x => x !== id) : [...p.services, id] }))}
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
                          <Input type="date" value={draftFilters.creationDate.start} onChange={e => setDraftFilters(p => ({ ...p, creationDate: { ...p.creationDate, start: e.target.value } }))} />
                        </div>
                        <div className="space-y-1">
                          <Label>To</Label>
                          <Input type="date" value={draftFilters.creationDate.end} onChange={e => setDraftFilters(p => ({ ...p, creationDate: { ...p.creationDate, end: e.target.value } }))} />
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  <FilterSection
                    title="Requested team member" icon={<Heart className="w-5 h-5" />}
                    options={(staff || []).map(s => ({ id: s.id, label: `${s.firstName} ${s.lastName}` }))}
                    selected={draftFilters.staff}
                    onChange={(id) => setDraftFilters(p => ({ ...p, staff: p.staff.includes(id) ? p.staff.filter(x => x !== id) : [...p.staff, id] }))}
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
          <div className="flex border rounded-md">
            <Button
              variant={currentView === "timeGridDay" ? "secondary" : "ghost"}
              size="sm"
              className="rounded-r-none"
              onClick={function () { handleViewChange("timeGridDay"); }}
            >
              Day
            </Button>
            <Button
              variant={currentView === "timeGridWeek" ? "secondary" : "ghost"}
              size="sm"
              className="rounded-none border-x"
              onClick={function () { handleViewChange("timeGridWeek"); }}
            >
              Week
            </Button>
            <Button
              variant={currentView === "dayGridMonth" ? "secondary" : "ghost"}
              size="sm"
              className="rounded-l-none"
              onClick={function () { handleViewChange("dayGridMonth"); }}
            >
              Month
            </Button>
          </div>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="ml-2 px-2.5">
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
                    onChange={function (e) { setHourHeight(parseInt(e.target.value)); }}
                    className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
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

      {/* ===== DAY VIEW: Staff Columns ===== */}
      {isDayView && (
        <div className="flex flex-col">
          <div className="flex border-b bg-muted shrink-0 sticky top-[69px] z-20">
            <div className="w-16 shrink-0 border-r" />
            <div className="flex flex-1 overflow-x-auto">
              {activeStaff.map(function (member, index) {
                var color = member.color || getStaffColor(index).hex;
                var initials = (member.firstName?.[0] || "") + (member.lastName?.[0] || "");
                return (
                  <div
                    key={member.id}
                    className="flex-1 min-w-[180px] flex flex-col items-center py-3 border-r last:border-r-0"
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold mb-1.5 ring-2 ring-offset-2 ring-offset-background"
                      style={{ backgroundColor: color, "--tw-ring-color": color }}
                    >
                      {member.avatarUrl ? (
                        <img src={member.avatarUrl} alt={member.firstName} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        initials.toUpperCase()
                      )}
                    </div>
                    <span className="text-xs font-medium text-foreground truncate max-w-[160px]">
                      {member.firstName} {member.lastName}
                    </span>
                  </div>
                );
              })}
              {activeStaff.length === 0 && (
                <div className="flex-1 flex items-center justify-center py-4 text-sm text-muted-foreground">
                  No staff members found
                </div>
              )}
            </div>
          </div>

          {/* Scrollable Time Grid */}
          <div ref={staffScrollRef} className="overflow-x-auto relative">
            <div className="flex" style={{ height: TOTAL_HOURS * HOUR_HEIGHT + "px" }}>
              {/* Time Gutter */}
              <div className="w-16 shrink-0 border-r relative bg-background">
                {hours.map(function (hour) {
                  return (
                    <div
                      key={hour}
                      id={"hour-" + hour + "-indicator"}
                      className="absolute w-full text-right pr-2 text-[11px] font-medium text-muted-foreground"
                      style={{ top: hour * HOUR_HEIGHT - 6 + "px" }}
                    >
                      {hour === 0 ? "" : format(new Date(2000, 0, 1, hour), "HH:mm")}
                    </div>
                  );
                })}
                {/* Now indicator label in time gutter */}
                {nowPos != null && (
                  <div
                    id="current-time-indicator"
                    className="absolute right-0 z-40 pointer-events-none"
                    style={{ top: nowPos - 10 + "px" }}
                  >
                    <div className="bg-red-500 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-sm mr-0.5">
                      {format(new Date(), "HH:mm")}
                    </div>
                  </div>
                )}
              </div>

              {/* Staff Columns */}
              <div className="flex flex-1">
                {activeStaff.map(function (member, index) {
                  var staffId = member.id;
                  var staffEvents = bookingsByStaff[staffId] || [];

                  // ── Separate travel blocks from real bookings ──────────────
                  // Travel blocks must NOT enter layoutOverlappingEvents() because
                  // the column-split algorithm would give them fractional widths/
                  // offsets, making them appear as skinny partial strips instead
                  // of the intended full-width translucent background.
                  var travelEvents = staffEvents.filter(function (e) { return !!e.isTravel; });
                  var realEvents = staffEvents.filter(function (e) { return !e.isTravel; });
                  var layoutedEvents = layoutOverlappingEvents(realEvents);
                  var color = member.color || getStaffColor(index).hex;

                  return (
                    <div
                      key={staffId}
                      className="flex-1 min-w-[180px] border-r last:border-r-0 relative bg-background cursor-pointer hover:bg-muted/[0.04] transition-colors"
                      onClick={function (e) {
                        // Don't open menu if clicking on a booking card or a blocked overlay
                        if (e.target.closest('[data-booking-inner-id]')) return;
                        if (e.target.closest('[data-blocked]')) return;
                        var rect = e.currentTarget.getBoundingClientRect();
                        // getBoundingClientRect() is already scroll-aware (viewport coords),
                        // so we do NOT add scrollTop — that would double-count the offset.
                        var y = e.clientY - rect.top;
                        var clickedHour = y / HOUR_HEIGHT;
                        // Block non-business hours (before 7 or after 21)
                        if (clickedHour < 7 || clickedHour >= 21) return;
                        var clickedDate = new Date(currentDate);
                        clickedDate.setHours(Math.floor(clickedHour), Math.round((clickedHour % 1) * 60), 0, 0);
                        // Only open the slot menu — don't call onDateClick/onNewBooking directly
                        setSlotMenu({ x: e.clientX, y: e.clientY, date: clickedDate, staffId: staffId });
                      }}
                    >
                      {hours.map(function (hour) {
                        var isBusinessHour = hour >= 7 && hour < 21;
                        return (
                          <div
                            key={hour}
                            className={"absolute w-full border-b border-border/50 " + (!isBusinessHour ? "bg-muted dark:bg-muted/40 cursor-not-allowed" : "")}
                            style={{ top: hour * HOUR_HEIGHT + "px", height: HOUR_HEIGHT + "px" }}
                            data-blocked={!isBusinessHour ? "true" : undefined}
                          >
                            <div className="absolute w-full border-b border-border/20" style={{ top: HOUR_HEIGHT / 2 + "px" }} />
                          </div>
                        );
                      })}

                      {/* Now indicator line */}
                      {nowPos != null && (
                        <div className="absolute left-0 right-0 z-30 pointer-events-none" style={{ top: nowPos + "px" }}>
                          <div className="w-full border-t-2 border-red-500" />
                          <div className="absolute -top-[4px] -left-[4px] w-2 h-2 rounded-full bg-red-500" />
                        </div>
                      )}

                      {/* Time-off blocks — clickable for edit/delete */}
                      {(timeOffByStaff[staffId] || []).map(function (to) {
                        var rawStart = to.start || to.startDatetime || "";
                        var rawEnd = to.end || to.endDatetime || "";
                        var top = getTimePosition(rawStart, hourHeight);
                        var height = getEventHeight(rawStart, rawEnd, hourHeight);
                        var label = to.reason || "Blocked";
                        return (
                          <div
                            key={to.id || to.subId}
                            className="absolute z-10 inset-x-0 px-0.5 pb-0.5 cursor-pointer group/timeoff"
                            style={{ top: top + "px", height: height + "px" }}
                            onClick={function (e) {
                              e.stopPropagation();
                              if (onTimeOffClick) onTimeOffClick(Object.assign({}, to, { staffId: staffId }));
                            }}
                          >
                            <div className="h-full rounded-sm border border-dashed border-rose-300/60 dark:border-rose-700/60 flex flex-col items-center justify-center p-1 bg-[repeating-linear-gradient(135deg,rgba(244,63,94,0.04),rgba(244,63,94,0.04)_8px,rgba(244,63,94,0.08)_8px,rgba(244,63,94,0.08)_16px)] group-hover/timeoff:bg-rose-500/10 transition-colors">
                              <div className="text-[10px] sm:text-[11px] uppercase font-bold text-rose-500/80 dark:text-rose-400/80 tracking-wide text-center leading-tight">
                                🔒 {label}
                              </div>
                              <div className="text-[9px] text-rose-400/60 mt-0.5 opacity-0 group-hover/timeoff:opacity-100 transition-opacity">
                                Click to edit
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Travel buffer backgrounds — rendered first, always full-width */}
                      {travelEvents.map(function (booking) {
                        var rawStart = booking.start || booking.startDatetime || "";
                        var rawEnd = booking.end || booking.endDatetime || "";
                        var top = getTimePosition(rawStart, hourHeight);
                        var height = getEventHeight(rawStart, rawEnd, hourHeight);
                        return (
                          <div
                            key={booking.subId || booking.id}
                            className="absolute z-0 inset-x-0 px-0.5 pb-0.5 pointer-events-none"
                            style={{ top: top + "px", height: height + "px" }}
                          >
                            <div className="h-full rounded-sm border border-dashed border-amber-400/50 flex flex-col items-center justify-center p-1 bg-[repeating-linear-gradient(45deg,rgba(245,158,11,0.04),rgba(245,158,11,0.04)_8px,rgba(245,158,11,0.09)_8px,rgba(245,158,11,0.09)_16px)]">
                              <div className="text-[10px] sm:text-[11px] uppercase font-bold text-amber-600 dark:text-amber-400 tracking-wide text-center leading-tight flex flex-col items-center gap-0.5 opacity-80">
                                <span>🚗 Travel ({booking.travelTimeMins}m)</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Real booking events — layered on top with column layout */}
                      {layoutedEvents.map(function (item) {
                        var booking = item.event;
                        var rawStart = booking.start || booking.startDatetime || "";
                        var rawEnd = booking.end || booking.endDatetime || "";
                        var top = getTimePosition(rawStart, hourHeight);
                        var height = getEventHeight(rawStart, rawEnd, hourHeight);
                        var widthPercent = 100 / item.totalColumns;
                        var leftPercent = item.column * widthPercent;
                        var startTime = new Date(String(rawStart).replace(" ", "T"));
                        var endTime = new Date(String(rawEnd).replace(" ", "T"));
                        var clientName = booking.title || (booking.client
                          ? booking.client.firstName + " " + booking.client.lastName
                          : "Walk-in");
                        var servicesText = booking.services
                          ? booking.services.map(function (s) { return s.name; }).join(", ")
                          : "";

                        return (
                          <div
                            key={booking.subId || booking.id}
                            className="absolute z-10 px-0.5 pb-0.5 transition-all duration-200"
                            data-booking-wrapper-id={booking.originalBooking?.id || booking.id}
                            onMouseEnter={function () {
                              var bId = booking.originalBooking?.id || booking.id;
                              if (!bId) return;
                              document.querySelectorAll('[data-booking-wrapper-id="' + bId + '"]').forEach(function (el) {
                                el.classList.add('!z-50');
                              });
                              document.querySelectorAll('[data-booking-inner-id="' + bId + '"]').forEach(function (el) {
                                el.classList.add('ring-[4px]', 'ring-inset', 'ring-foreground/60', 'brightness-110', 'shadow-xl', 'scale-[1.01]');
                              });
                            }}
                            onMouseLeave={function () {
                              var bId = booking.originalBooking?.id || booking.id;
                              if (!bId) return;
                              document.querySelectorAll('[data-booking-wrapper-id="' + bId + '"]').forEach(function (el) {
                                el.classList.remove('!z-50');
                              });
                              document.querySelectorAll('[data-booking-inner-id="' + bId + '"]').forEach(function (el) {
                                el.classList.remove('ring-[4px]', 'ring-inset', 'ring-foreground/60', 'brightness-110', 'shadow-xl', 'scale-[1.01]');
                              });
                            }}
                            style={{
                              top: top + "px",
                              height: height + "px",
                              left: leftPercent + "%",
                              width: widthPercent + "%",
                            }}
                            onClick={function (e) {
                              e.stopPropagation();
                              if (onEventClick) onEventClick(booking.originalBooking || booking);
                            }}
                          >
                            <EventTooltip booking={booking.originalBooking || booking}>
                              <div
                                className="h-full rounded-sm p-1.5 text-white cursor-pointer transition-all hover:brightness-90 hover:shadow-lg group relative overflow-hidden flex flex-col"
                                style={{ backgroundColor: color }}
                                data-status={booking.status}
                                data-booking-inner-id={booking.originalBooking?.id || booking.id}
                              >
                                <EventQuickActions
                                  booking={booking.originalBooking || booking}
                                  onEdit={handleEditBooking}
                                  onConfirm={handleConfirmBooking}
                                  onComplete={handleCompleteBooking}
                                  onCancel={handleCancelBookingAction}
                                />
                                <div className="text-[10px] font-semibold opacity-90 flex items-center gap-1.5">
                                  {booking.status === "pending" && (
                                    <span className="relative flex h-1.5 w-1.5 shrink-0">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                                    </span>
                                  )}
                                  {format(startTime, "HH:mm")} – {format(endTime, "HH:mm")}
                                </div>
                                <div className="text-xs font-medium truncate leading-tight mt-0.5">
                                  {clientName}
                                </div>
                                {booking.originalBooking?.clientIsActive === false && height > 35 && (
                                  <div className="mt-0.5">
                                    <Badge variant="destructive" className="h-3 min-h-3 text-[0.5rem] px-1 py-0 font-bold uppercase tracking-wider leading-none shadow-sm pb-[1px]">
                                      Restricted
                                    </Badge>
                                  </div>
                                )}
                                {height > 45 && servicesText && (
                                  <div className="text-[10px] opacity-80 truncate mt-0.5">
                                    {servicesText}
                                  </div>
                                )}
                              </div>
                            </EventTooltip>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== WEEK VIEW: Custom Staff x Day Matrix ===== */}
      {isWeekView && (
        <div className="bg-background rounded-b-md border-x border-b">
          <div className="h-full overflow-auto">
            {/* Sticky table wrapper */}
            <table className="w-full border-collapse min-w-[700px]" style={{ tableLayout: "fixed" }}>
              {/* Header row: left corner + 7 day columns */}
              <thead className="sticky top-0 z-20 bg-background">
                <tr>
                  {/* Staff label column */}
                  <th className="w-[80px] min-w-[80px] border-b border-r border-border bg-background" />
                  {/* Note: th elements below use group/th for the day-view button hover */}
                  {weekDays.map(function (day) {
                    var isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
                    return (
                      <th
                        key={day.toISOString()}
                        className={"group/th border-b border-r border-border px-2 py-2 text-left font-normal text-sm " + (isToday ? "bg-primary/5" : "bg-background")}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={"inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-semibold " +
                                (isToday ? "bg-primary text-primary-foreground" : "text-foreground")}
                            >
                              {format(day, "d")}
                            </span>
                            <span className={"text-xs font-medium " + (isToday ? "text-primary" : "text-muted-foreground")}>
                              {format(day, "EEE")}
                            </span>
                          </div>
                          <button
                            className="opacity-0 group-hover/th:opacity-100 text-muted-foreground hover:text-primary flex items-center gap-0.5 px-1.5 py-0.5 rounded hover:bg-primary/10 transition-all"
                            title="Switch to Day view"
                            onClick={function (e) {
                              e.stopPropagation();
                              setCurrentDate(day);
                              handleViewChange("timeGridDay");
                            }}
                          >
                            <CalendarDays className="h-3 w-3" />
                          </button>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              {/* Body: one row per staff member */}
              <tbody>
                {(staff && staff.length > 0 ? staff.filter(function (member) {
                  if (!selectedStaff || selectedStaff.length === 0) return true;
                  return selectedStaff.includes(member.id);
                }) : []).map(function (member) {
                  var staffColor = staffColorMap[member.id] || { name: "blue", hex: "#3b82f6" };
                  var initials = ((member.firstName || "")[0] || "") + ((member.lastName || "")[0] || "");

                  return (
                    <tr key={member.id}>
                      {/* Sticky staff label cell */}
                      <td className="sticky left-0 z-10 w-[80px] min-w-[80px] border-b border-r border-border bg-background align-top p-2">
                        <div className="flex flex-col items-center gap-1 py-1">
                          <Avatar className="h-9 w-9 ring-2 ring-offset-1 ring-offset-background" style={{ "--tw-ring-color": staffColor.hex }}>
                            {member.avatarUrl && <AvatarImage src={member.avatarUrl} alt={member.firstName} />}
                            <AvatarFallback
                              className="text-[11px] font-bold text-white"
                              style={{ backgroundColor: staffColor.hex }}
                            >
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-[10px] font-medium text-muted-foreground text-center leading-tight max-w-[72px] truncate">
                            {member.firstName}
                          </span>
                        </div>
                      </td>

                      {/* Day cells */}
                      {weekDays.map(function (day) {
                        var dayStr = format(day, "yyyy-MM-dd");
                        var isToday = dayStr === format(new Date(), "yyyy-MM-dd");

                        // Filter bookings for this staff member on this day (exclude time_off type)
                        var dayBookings = (bookings || []).filter(function (b) {
                          if (b.type === "time_off") return false;
                          var bStart = b.start || b.startDatetime || "";
                          if (!bStart) return false;
                          var bDate = format(new Date(String(bStart).replace(" ", "T")), "yyyy-MM-dd");
                          if (bDate !== dayStr) return false;
                          // Check if any service belongs to this staff member
                          if (b.services && b.services.length > 0) {
                            return b.services.some(function (s) {
                              return (s.staffId || b.staffId || b.staff?.id) === member.id;
                            });
                          }
                          return (b.staffId || b.staff?.id) === member.id;
                        });

                        // Filter time-off blocks for this staff member on this day
                        var dayTimeOff = (timeOffByStaff[member.id] || []).filter(function (to) {
                          var bStart = to.start || to.startDatetime || "";
                          if (!bStart) return false;
                          var bDate = format(new Date(String(bStart).replace(" ", "T")), "yyyy-MM-dd");
                          return bDate === dayStr;
                        });

                        // Sort bookings by start time
                        dayBookings = dayBookings.slice().sort(function (a, b) {
                          var aStart = String(a.start || a.startDatetime || "").replace(" ", "T");
                          var bStart = String(b.start || b.startDatetime || "").replace(" ", "T");
                          return new Date(aStart) - new Date(bStart);
                        });

                        return (
                          <td
                            key={dayStr}
                            className={"border-b border-r border-border align-top p-1 min-h-[80px] relative transition-colors " + (isToday ? "bg-primary/[0.02] hover:bg-primary/[0.05]" : "bg-background hover:bg-muted/30") + (dayTimeOff.length > 0 ? " cursor-not-allowed" : " cursor-pointer")}
                            onClick={function (e) {
                              if (dayTimeOff.length > 0) return; // whole-day time-off blocks clicking
                              // Don't open menu if clicking on a booking card
                              if (e.target.closest('[data-booking-inner-id]')) return;
                              setSlotMenu({ x: e.clientX, y: e.clientY, date: day, staffId: member.id });
                            }}
                          >
                            <div className="flex flex-col gap-1 min-h-[80px]">
                              {/* Time-off chips — clickable */}
                              {dayTimeOff.map(function (to) {
                                var label = to.reason || "Blocked";
                                return (
                                  <div
                                    key={to.id || to.subId}
                                    className="rounded overflow-hidden border border-dashed border-rose-300/70 dark:border-rose-700/60 bg-[repeating-linear-gradient(135deg,rgba(244,63,94,0.04),rgba(244,63,94,0.04)_6px,rgba(244,63,94,0.08)_6px,rgba(244,63,94,0.08)_12px)] px-2 py-1.5 cursor-pointer hover:bg-rose-500/10 transition-colors group/tochip"
                                    onClick={function (e) {
                                      e.stopPropagation();
                                      if (onTimeOffClick) onTimeOffClick(Object.assign({}, to, { staffId: member.id }));
                                    }}
                                  >
                                    <div className="text-[10px] uppercase font-bold text-rose-500/80 dark:text-rose-400/70 tracking-wide flex items-center gap-1">
                                      🔒 {label}
                                    </div>
                                    <div className="text-[9px] text-rose-400/60 mt-0.5 opacity-0 group-hover/tochip:opacity-100 transition-opacity">
                                      Click to edit
                                    </div>
                                  </div>
                                );
                              })}
                              {dayBookings.map(function (booking) {
                                var clientName = booking.clientName ||
                                  (booking.client
                                    ? (booking.client.firstName + " " + booking.client.lastName).trim()
                                    : (booking.client_first_name
                                      ? (booking.client_first_name + " " + (booking.client_last_name || "")).trim()
                                      : "Walk-in"));
                                var rawStart = booking.start || booking.startDatetime || "";
                                var rawEnd = booking.end || booking.endDatetime || "";
                                var startTime = new Date(String(rawStart).replace(" ", "T"));
                                var timeLabel = isNaN(startTime) ? "" : format(startTime, "HH:mm");
                                var isPending = booking.status === "pending";
                                var isRestricted = booking.clientIsActive === false;
                                var servicesText = (booking.services || []).map(function (s) { return s.name; }).join(", ");

                                // Rich tooltip data including the canonical booking object
                                var tooltipBooking = Object.assign({}, booking, {
                                  client: booking.client || {
                                    firstName: booking.client_first_name || clientName,
                                    lastName: booking.client_last_name || "",
                                    phone: booking.clientPhone || "",
                                    email: booking.clientEmail || "",
                                  },
                                  start: rawStart,
                                  end: rawEnd,
                                });

                                return (
                                  <EventTooltip key={booking.id} booking={tooltipBooking}>
                                    <div
                                      className="relative rounded overflow-hidden cursor-pointer select-none group/event"
                                      style={{ borderLeft: "3px solid " + staffColor.hex }}
                                      onClick={function (e) {
                                        e.stopPropagation();
                                        if (onEventClick) onEventClick(booking);
                                      }}
                                    >
                                      <div
                                        className="px-2 py-1.5 transition-all group-hover/event:brightness-110"
                                        style={{ backgroundColor: staffColor.hex + "22" }}
                                      >
                                        <div className="flex items-center gap-1 mb-0.5">
                                          {isPending && (
                                            <span className="relative flex h-1.5 w-1.5 shrink-0">
                                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
                                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-yellow-500" />
                                            </span>
                                          )}
                                          {isRestricted && (
                                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />
                                          )}
                                          <span className="text-[11px] font-semibold text-foreground truncate"
                                            style={{ color: staffColor.hex }}
                                          >
                                            {timeLabel}
                                          </span>
                                          <span className="text-[11px] font-medium text-foreground truncate flex-1">{clientName}</span>
                                        </div>
                                        {servicesText && (
                                          <div className="text-[10px] text-muted-foreground truncate">{servicesText}</div>
                                        )}
                                      </div>
                                      {/* Quick action bar on hover */}
                                      <div className="absolute inset-0 flex items-center justify-end pr-1 opacity-0 group-hover/event:opacity-100 transition-opacity pointer-events-none group-hover/event:pointer-events-auto">
                                        <EventQuickActions
                                          booking={booking}
                                          onEdit={handleEditBooking}
                                          onConfirm={handleConfirmBooking}
                                          onComplete={handleCompleteBooking}
                                          onCancel={handleCancelBookingAction}
                                        />
                                      </div>
                                    </div>
                                  </EventTooltip>
                                );
                              })}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                {/* Empty state if no staff */}
                {(!staff || staff.filter(function (m) {
                  if (!selectedStaff || selectedStaff.length === 0) return true;
                  return selectedStaff.includes(m.id);
                }).length === 0) && (
                    <tr>
                      <td colSpan={8} className="text-center py-16 text-muted-foreground text-sm">
                        No staff members to display.
                      </td>
                    </tr>
                  )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== MONTH VIEW: FullCalendar ===== */}
      {!isDayView && !isWeekView && (
        <div
          className="bg-background rounded-b-md border-x border-b"
          style={{ "--fc-timegrid-slot-height": (hourHeight / 4) + "px" }}
        >
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
            initialView={currentView}
            initialDate={currentDate}
            headerToolbar={false}
            events={events}
            editable={false}
            selectable={true}
            selectMirror={true}
            dayMaxEvents={3}
            weekends={true}
            nowIndicator={true}
            allDaySlot={false}
            height="auto"
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            eventContent={function (arg) {
              var booking = arg.event.extendedProps.booking;
              if (!booking) return null;
              var isPending = booking.status === "pending";
              return (
                <div className="w-full px-1 py-0.5 text-white text-[11px] font-medium truncate flex items-center gap-1 rounded overflow-hidden">
                  {isPending && (
                    <span className="relative flex h-1.5 w-1.5 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-yellow-500" />
                    </span>
                  )}
                  {arg.timeText && <span className="opacity-80 shrink-0">{arg.timeText}</span>}
                  <span className="truncate">{arg.event.title}</span>
                </div>
              );
            }}
            eventDidMount={function (arg) {
              var status = arg.event.extendedProps.status;
              var staffColor = arg.event.extendedProps.staffColor;
              if (status) arg.el.setAttribute("data-status", status);
              if (staffColor) arg.el.setAttribute("data-staff-color", staffColor);
            }}
          />
        </div>
      )}
      {/* ===== Global Slot Action Menu ===== */}
      {slotMenu && (
        <div
          ref={slotMenuRef}
          className="fixed z-[9999] min-w-[200px] bg-popover border border-border rounded-xl shadow-xl py-1 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150"
          style={{
            left: Math.min(slotMenu.x, window.innerWidth - 220) + "px",
            top: Math.min(slotMenu.y, window.innerHeight - 140) + "px",
          }}
          onMouseDown={function (e) { e.stopPropagation(); }}
        >
          {/* Header */}
          <div className="px-3 pt-2 pb-1.5 border-b border-border/50">
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
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/60 transition-colors text-left"
              onClick={function () {
                setSlotMenu(null);
                if (onNewBooking) onNewBooking({ date: slotMenu.date, staffId: slotMenu.staffId, type: "appointment" });
              }}
            >
              <CalendarPlus className="h-4 w-4 text-primary shrink-0" />
              <span>Add appointment</span>
            </button>
            <button
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/60 transition-colors text-left"
              onClick={function () {
                setSlotMenu(null);
                if (onNewBooking) onNewBooking({ date: slotMenu.date, staffId: slotMenu.staffId, type: "block" });
              }}
            >
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Add blocked time</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

