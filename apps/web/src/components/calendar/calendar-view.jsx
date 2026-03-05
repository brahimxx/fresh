"use client";

import { useRef, useState, useCallback, useMemo, useEffect } from "react";
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
  subHours,
} from "date-fns";

import {
  useCalendarBookings,
  useRescheduleBooking,
  useConfirmBooking,
  useCancelBooking,
  useUpdateBooking,
} from "@/hooks/use-bookings";
import { useStaff, getStaffColor } from "@/hooks/use-staff";
import { useSalon } from "@/providers/salon-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CalendarSkeleton } from "@/components/ui/loading-skeletons";
import { DataError } from "@/components/ui/data-error";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight, Filter } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { EventTooltip } from "./event-tooltip";
import { EventQuickActions } from "./event-quick-actions";

import "@/styles/calendar.css";

// Staff Day View constants
var HOUR_HEIGHT = 60;
var START_HOUR = 0;
var END_HOUR = 24;
var TOTAL_HOURS = END_HOUR - START_HOUR;

function getTimePosition(dateStr) {
  var d = new Date(String(dateStr).replace(" ", "T"));
  return (d.getHours() + d.getMinutes() / 60) * HOUR_HEIGHT;
}

function getEventHeight(startStr, endStr) {
  var start = new Date(String(startStr).replace(" ", "T"));
  var end = new Date(String(endStr).replace(" ", "T"));
  var diffHours = (end - start) / (1000 * 60 * 60);
  return Math.max(diffHours * HOUR_HEIGHT, 20);
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

export function CalendarView({ onDateClick, onEventClick, onNewBooking }) {
  var calendarRef = useRef(null);
  var hasScrolledRef = useRef(false);
  var staffScrollRef = useRef(null);
  var { salonId } = useSalon();

  var [currentDate, setCurrentDate] = useState(new Date());
  var [currentView, setCurrentView] = useState("timeGridDay");
  var [selectedStaff, setSelectedStaff] = useState([]);

  var confirmBooking = useConfirmBooking();
  var cancelBooking = useCancelBooking();
  var updateBooking = useUpdateBooking();
  var rescheduleBooking = useRescheduleBooking();

  var isDayView = currentView === "timeGridDay";

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

  // Convert bookings to FullCalendar events (for Week/Month)
  var events = useMemo(
    function () {
      if (!bookings || !Array.isArray(bookings)) return [];
      return bookings
        .filter(function (booking) {
          if (!selectedStaff || selectedStaff.length === 0) return true;
          return selectedStaff.includes(booking.staffId || booking.staff?.id);
        })
        .map(function (booking) {
          var staffId = booking.staffId || booking.staff?.id;
          var staffColor = staffColorMap[staffId] || { name: "blue", hex: "#3b82f6" };
          var clientName = booking.title || (booking.client
            ? booking.client.firstName + " " + booking.client.lastName
            : "Walk-in");
          var servicesText = "";
          if (booking.services && booking.services.length > 0) {
            servicesText = booking.services.map(function (s) { return s.name; }).join(", ");
          }
          var startTime = new Date((booking.start || booking.startDatetime || "").replace(" ", "T"));
          var endTime = new Date((booking.end || booking.endDatetime || "").replace(" ", "T"));
          var timeText = format(startTime, "HH:mm") + " – " + format(endTime, "HH:mm");
          return {
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
          };
        });
    },
    [bookings, selectedStaff, staffColorMap],
  );

  // Group bookings by staff (for Day view)
  var bookingsByStaff = useMemo(function () {
    var groups = {};
    if (staff && Array.isArray(staff)) {
      staff.forEach(function (member) { groups[member.id] = []; });
    }
    if (bookings && Array.isArray(bookings)) {
      bookings.forEach(function (booking) {
        var staffId = booking.staffId || booking.staff?.id;
        if (staffId && groups[staffId]) {
          groups[staffId].push(booking);
        } else if (staffId) {
          groups[staffId] = groups[staffId] || [];
          groups[staffId].push(booking);
        }
      });
    }
    return groups;
  }, [bookings, staff]);

  // Navigation handlers
  var handlePrev = useCallback(function () {
    if (isDayView) {
      setCurrentDate(function (d) { return subDays(d, 1); });
    } else {
      var api = calendarRef.current?.getApi();
      if (api) { api.prev(); setCurrentDate(api.getDate()); }
    }
  }, [isDayView]);

  var handleNext = useCallback(function () {
    if (isDayView) {
      setCurrentDate(function (d) { return addDays(d, 1); });
    } else {
      var api = calendarRef.current?.getApi();
      if (api) { api.next(); setCurrentDate(api.getDate()); }
    }
  }, [isDayView]);

  var handleToday = useCallback(function () {
    if (isDayView) {
      setCurrentDate(new Date());
    } else {
      var api = calendarRef.current?.getApi();
      if (api) { api.today(); setCurrentDate(api.getDate()); }
    }
  }, [isDayView]);

  var handleViewChange = useCallback(function (view) {
    if (view !== "timeGridDay") {
      // Switching to week/month — need to tell FullCalendar
      setCurrentView(view);
      // FullCalendar will mount with the new view
    } else {
      setCurrentView(view);
    }
  }, []);

  // Sync FullCalendar view when switching back from day view
  useEffect(function () {
    if (!isDayView && calendarRef.current) {
      var api = calendarRef.current.getApi();
      if (api.view.type !== currentView) {
        api.changeView(currentView);
        api.gotoDate(currentDate);
      }
    }
  }, [currentView, isDayView, currentDate]);

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
      rescheduleBooking.mutate(
        {
          id: booking.id,
          data: { startDateTime: newStart.toISOString(), endDateTime: newEnd.toISOString() },
        },
        { onError: function () { arg.revert(); } },
      );
    },
    [rescheduleBooking],
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
    updateBooking.mutate({ id: booking.id, data: { status: "completed" } });
  }, [updateBooking]);

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
    if (!isDayView || !staffScrollRef.current) return;
    var timeout = setTimeout(function () {
      var container = staffScrollRef.current;
      if (!container) return;
      var now = new Date();
      var currentPos = (now.getHours() + now.getMinutes() / 60) * HOUR_HEIGHT;
      container.scrollTop = currentPos - container.clientHeight / 3;
    }, 200);
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

  if (bookingsLoading || staffLoading) {
    return <CalendarSkeleton />;
  }

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
  var hours = [];
  for (var h = START_HOUR; h < END_HOUR; h++) { hours.push(h); }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 pt-4 border-b pb-4">
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
          {/* Staff filter (Week/Month only) */}
          {!isDayView && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Staff{" "}
                  {selectedStaff && selectedStaff.length > 0 && "(" + selectedStaff.length + ")"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64" align="end">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Filter by Staff</span>
                    {selectedStaff && selectedStaff.length > 0 && (
                      <Button variant="ghost" size="sm" onClick={clearStaffFilter}>
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
                              checked={selectedStaff && selectedStaff.includes(member.id)}
                              onCheckedChange={function () { toggleStaffFilter(member.id); }}
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
          )}

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
        </div>
      </div>

      {/* ===== DAY VIEW: Staff Columns ===== */}
      {isDayView && (
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Staff Header Row */}
          <div className="flex border-b bg-background shrink-0">
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
                      {member.profileImage ? (
                        <img src={member.profileImage} alt={member.firstName} className="w-full h-full rounded-full object-cover" />
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
          <div ref={staffScrollRef} className="flex-1 overflow-y-auto overflow-x-auto relative">
            <div className="flex" style={{ height: TOTAL_HOURS * HOUR_HEIGHT + "px" }}>
              {/* Time Gutter */}
              <div className="w-16 shrink-0 border-r relative bg-background">
                {hours.map(function (hour) {
                  return (
                    <div
                      key={hour}
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
                  var layoutedEvents = layoutOverlappingEvents(staffEvents);
                  var color = member.color || getStaffColor(index).hex;

                  return (
                    <div
                      key={staffId}
                      className="flex-1 min-w-[180px] border-r last:border-r-0 relative"
                      onClick={function (e) {
                        var rect = e.currentTarget.getBoundingClientRect();
                        var scrollTop = staffScrollRef.current?.scrollTop || 0;
                        var y = e.clientY - rect.top + scrollTop;
                        var clickedHour = y / HOUR_HEIGHT;
                        var clickedDate = new Date(currentDate);
                        clickedDate.setHours(Math.floor(clickedHour), Math.round((clickedHour % 1) * 60), 0, 0);
                        if (onDateClick) onDateClick(clickedDate);
                        if (onNewBooking) onNewBooking({ date: clickedDate, staffId: staffId });
                      }}
                    >
                      {/* Hour grid lines */}
                      {hours.map(function (hour) {
                        var isBusinessHour = hour >= 7 && hour < 21;
                        return (
                          <div
                            key={hour}
                            className={"absolute w-full border-b border-border/50 " + (!isBusinessHour ? "bg-muted/20" : "")}
                            style={{ top: hour * HOUR_HEIGHT + "px", height: HOUR_HEIGHT + "px" }}
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

                      {/* Events */}
                      {layoutedEvents.map(function (item) {
                        var booking = item.event;
                        var rawStart = booking.start || booking.startDatetime || "";
                        var rawEnd = booking.end || booking.endDatetime || "";
                        var top = getTimePosition(rawStart);
                        var height = getEventHeight(rawStart, rawEnd);
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
                            key={booking.id}
                            className="absolute z-10 px-0.5"
                            style={{
                              top: top + "px",
                              height: height + "px",
                              left: leftPercent + "%",
                              width: widthPercent + "%",
                            }}
                            onClick={function (e) {
                              e.stopPropagation();
                              if (onEventClick) onEventClick(booking);
                            }}
                          >
                            <EventTooltip booking={booking}>
                              <div
                                className="h-full rounded-md p-1.5 text-white cursor-pointer transition-all hover:brightness-90 hover:shadow-lg group relative overflow-hidden"
                                style={{ backgroundColor: color }}
                                data-status={booking.status}
                              >
                                <EventQuickActions
                                  booking={booking}
                                  onEdit={handleEditBooking}
                                  onConfirm={handleConfirmBooking}
                                  onComplete={handleCompleteBooking}
                                  onCancel={handleCancelBookingAction}
                                />
                                <div className="text-[10px] font-semibold opacity-90">
                                  {format(startTime, "HH:mm")} – {format(endTime, "HH:mm")}
                                </div>
                                <div className="text-xs font-medium truncate leading-tight">
                                  {clientName}
                                </div>
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

      {/* ===== WEEK / MONTH VIEW: FullCalendar ===== */}
      {!isDayView && (
        <div className="flex-1 px-4 pb-4 relative">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
            initialView={currentView}
            initialDate={currentDate}
            headerToolbar={false}
            events={events}
            editable={true}
            selectable={true}
            selectMirror={true}
            dayMaxEvents={true}
            weekends={true}
            nowIndicator={true}
            slotMinTime="00:00:00"
            slotMaxTime="24:00:00"
            slotDuration="00:15:00"
            slotLabelInterval="01:00:00"
            slotLabelFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
            eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
            allDaySlot={false}
            slotEventOverlap={false}
            height="100%"
            businessHours={{ daysOfWeek: [0, 1, 2, 3, 4, 5, 6], startTime: "07:00", endTime: "21:00" }}
            scrollTime="00:00:00"
            scrollTimeReset={false}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            eventDrop={handleEventDrop}
            eventResize={handleEventDrop}
            eventContent={function (arg) {
              var booking = arg.event.extendedProps.booking;
              var servicesText = arg.event.extendedProps.servicesText;
              var timeText = arg.event.extendedProps.timeText;
              var staffName = arg.event.extendedProps.staffName;
              var isTimeGrid = arg.view.type.includes("timeGrid");
              return (
                <EventTooltip booking={booking}>
                  <div className="fc-event-main-frame w-full h-full relative group">
                    <EventQuickActions
                      booking={booking}
                      onEdit={handleEditBooking}
                      onConfirm={handleConfirmBooking}
                      onComplete={handleCompleteBooking}
                      onCancel={handleCancelBookingAction}
                    />
                    <div className="fc-event-time font-semibold">
                      {isTimeGrid ? arg.timeText : timeText}
                    </div>
                    <div className="fc-event-title font-medium truncate">
                      {arg.event.title}
                    </div>
                    {isTimeGrid && servicesText && (
                      <div className="fc-event-service text-[0.65rem] opacity-90 truncate mt-0.5">
                        {servicesText}
                      </div>
                    )}
                    {isTimeGrid && staffName && (
                      <div className="fc-event-staff text-[0.6rem] opacity-75 truncate">
                        {staffName}
                      </div>
                    )}
                  </div>
                </EventTooltip>
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
    </div>
  );
}
