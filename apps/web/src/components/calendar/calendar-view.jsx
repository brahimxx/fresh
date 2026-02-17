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

export function CalendarView({ onDateClick, onEventClick, onNewBooking }) {
  var calendarRef = useRef(null);
  var hasScrolledRef = useRef(false);
  var { salonId } = useSalon();

  var [currentDate, setCurrentDate] = useState(new Date());
  var [currentView, setCurrentView] = useState("timeGridDay");
  var [selectedStaff, setSelectedStaff] = useState([]);

  var confirmBooking = useConfirmBooking();
  var cancelBooking = useCancelBooking();
  var updateBooking = useUpdateBooking();
  var rescheduleBooking = useRescheduleBooking();

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
        end = addDays(currentDate, 1);
      }
      return {
        start: format(start, "yyyy-MM-dd"),
        end: format(end, "yyyy-MM-dd"),
      };
    },
    [currentDate, currentView]
  );

  // Fetch bookings
  var { data: bookings, isLoading: bookingsLoading, error: bookingsError, refetch: refetchBookings } = useCalendarBookings(
    salonId,
    dateRange.start,
    dateRange.end
  );

  // Fetch staff
  var { data: staff, isLoading: staffLoading, error: staffError, refetch: refetchStaff } = useStaff(salonId);

  // Build staff color map (use database colors or fallback to generated)
  var staffColorMap = useMemo(
    function () {
      var map = {};
      if (staff && Array.isArray(staff)) {
        staff.forEach(function (member, index) {
          var fallbackColor = getStaffColor(index);
          var hex = member.color || fallbackColor.hex;
          var name = fallbackColor.name; // Use the fallback name based on index
          
          // If member has a custom color, try to find matching color name
          if (member.color) {
            var matchingColor = getStaffColor(0); // Default
            // Find color that matches the hex
            for (var i = 0; i < 10; i++) {
              var c = getStaffColor(i);
              if (c.hex.toLowerCase() === member.color.toLowerCase()) {
                matchingColor = c;
                break;
              }
            }
            name = matchingColor.name;
          }
          
          map[member.id] = { hex: hex, name: name };
        });
      }
      return map;
    },
    [staff]
  );

  // Convert bookings to calendar events
  var events = useMemo(
    function () {
      if (!bookings || !Array.isArray(bookings)) return [];

      return bookings
        .filter(function (booking) {
          if (!selectedStaff || selectedStaff.length === 0) return true;
          return selectedStaff.includes(booking.staff?.id);
        })
        .map(function (booking) {
          var staffId = booking.staff?.id;
          var staffColor = staffColorMap[staffId] || {
            name: "blue",
            hex: "#3b82f6",
          };
          var clientName = booking.client
            ? booking.client.firstName + " " + booking.client.lastName
            : "Walk-in";
          
          // Format services for display
          var servicesText = "";
          if (booking.services && booking.services.length > 0) {
            servicesText = booking.services.map(function(s) { return s.name; }).join(", ");
          }
          
          // Format time
          var startTime = new Date(booking.startDatetime);
          var endTime = new Date(booking.endDatetime);
          var timeText = format(startTime, "HH:mm") + " – " + format(endTime, "HH:mm");
          
          return {
            id: booking.id,
            title: clientName,
            start: booking.startDatetime,
            end: booking.endDatetime,
            backgroundColor: staffColor.hex,
            borderColor: staffColor.hex,
            extendedProps: {
              booking: booking,
              staffColor: staffColor.name,
              status: booking.status,
              servicesText: servicesText,
              timeText: timeText,
              staffName: booking.staff ? booking.staff.firstName + " " + booking.staff.lastName : "",
            },
          };
        });
    },
    [bookings, selectedStaff, staffColorMap]
  );

  // Calendar navigation handlers
  var handlePrev = useCallback(function () {
    var api = calendarRef.current.getApi();
    api.prev();
    setCurrentDate(api.getDate());
  }, []);

  var handleNext = useCallback(function () {
    var api = calendarRef.current.getApi();
    api.next();
    setCurrentDate(api.getDate());
  }, []);

  var handleToday = useCallback(function () {
    var api = calendarRef.current.getApi();
    api.today();
    setCurrentDate(api.getDate());
  }, []);

  var handleViewChange = useCallback(function (view) {
    var api = calendarRef.current.getApi();
    api.changeView(view);
    setCurrentView(view);
  }, []);

  // Event handlers
  var handleDateClick = useCallback(
    function (arg) {
      if (onDateClick) onDateClick(arg.date);
      if (onNewBooking) onNewBooking({ date: arg.date });
    },
    [onDateClick, onNewBooking]
  );

  var handleEventClick = useCallback(
    function (arg) {
      var booking = arg.event.extendedProps.booking;
      if (onEventClick) onEventClick(booking);
    },
    [onEventClick]
  );

  var handleEventDrop = useCallback(
    function (arg) {
      var booking = arg.event.extendedProps.booking;
      var newStart = arg.event.start;
      var newEnd = arg.event.end;

      rescheduleBooking.mutate(
        {
          id: booking.id,
          data: {
            startDateTime: newStart.toISOString(),
            endDateTime: newEnd.toISOString(),
          },
        },
        {
          onError: function () {
            arg.revert();
          },
        }
      );
    },
    [rescheduleBooking]
  );

  // Staff filter toggle
  var toggleStaffFilter = useCallback(function (staffId) {
    setSelectedStaff(function (prev) {
      if (prev.includes(staffId)) {
        return prev.filter(function (id) {
          return id !== staffId;
        });
      }
      return [...prev, staffId];
    });
  }, []);

  var clearStaffFilter = useCallback(function () {
    setSelectedStaff([]);
  }, []);

  // Format date range based on current view
  var getDateRangeDisplay = useCallback(
    function () {
      if (currentView === "dayGridMonth") {
        return format(currentDate, "MMMM yyyy");
      } else if (currentView === "timeGridWeek") {
        var weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        var weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
        
        // If same month, show "Dec 16 - 22, 2024"
        if (weekStart.getMonth() === weekEnd.getMonth()) {
          return format(weekStart, "MMM d") + " - " + format(weekEnd, "d, yyyy");
        }
        // If different months, show "Dec 30 - Jan 5, 2024"
        return format(weekStart, "MMM d") + " - " + format(weekEnd, "MMM d, yyyy");
      } else {
        // Day view
        return format(currentDate, "MMMM d, yyyy");
      }
    },
    [currentDate, currentView]
  );

  // Quick action handlers
  var handleEditBooking = useCallback(
    function (booking) {
      if (onEventClick) onEventClick(booking);
    },
    [onEventClick]
  );

  var handleConfirmBooking = useCallback(
    function (booking) {
      confirmBooking.mutate(booking.id);
    },
    [confirmBooking]
  );

  var handleCompleteBooking = useCallback(
    function (booking) {
      updateBooking.mutate({
        id: booking.id,
        data: { status: "completed" },
      });
    },
    [updateBooking]
  );

  var handleCancelBookingAction = useCallback(
    function (booking) {
      if (confirm("Are you sure you want to cancel this booking?")) {
        cancelBooking.mutate(booking.id);
      }
    },
    [cancelBooking]
  );

  // Center current time on mount and view changes
  useEffect(function () {
    if (!calendarRef.current || !events) return;
    
    var api = calendarRef.current.getApi();
    var view = api.view;
    
    // Only apply to time grid views
    if (view.type.includes('timeGrid')) {
      // Reset scroll flag when view changes
      hasScrolledRef.current = false;
      
      var scrollTimeout = setTimeout(function() {
        if (hasScrolledRef.current) return;
        
        var scrollerEl = calendarRef.current?.elRef?.current?.querySelector('.fc-scroller-liquid-absolute');
        if (scrollerEl && scrollerEl.scrollHeight > 0) {
          var scrollerHeight = scrollerEl.clientHeight;
          var now = new Date();
          var hours = now.getHours();
          var minutes = now.getMinutes();
          
          // Calculate total minutes from midnight
          var currentMinutes = hours * 60 + minutes;
          
          // Total day minutes (24 hours)
          var totalMinutes = 24 * 60;
          
          // Calculate the pixel position
          var totalHeight = scrollerEl.scrollHeight;
          var currentPosition = (currentMinutes / totalMinutes) * totalHeight;
          
          // Scroll to position that centers the current time
          scrollerEl.scrollTop = currentPosition - (scrollerHeight / 2);
          hasScrolledRef.current = true;
        }
      }, 300);
      
      return function() {
        clearTimeout(scrollTimeout);
      };
    }
  }, [currentView, events]);

  // Update current time display dynamically
  useEffect(function () {
    var updateCurrentTime = function() {
      var nowLine = calendarRef.current?.elRef?.current?.querySelector('.fc-timegrid-now-indicator-line');
      if (nowLine) {
        var now = new Date();
        var timeStr = format(now, 'HH:mm');
        nowLine.setAttribute('data-time', timeStr);
      }
    };

    // Wait for calendar to render, then update
    var timeout = setTimeout(updateCurrentTime, 100);
    var interval = setInterval(updateCurrentTime, 60000); // Update every minute

    return function() {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [events]);

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

  return (
    <div className="flex flex-col h-full">
      {/* Custom toolbar */}
      <div className="flex items-center justify-between px-4 pt-4 border-b pb-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold min-w-[200px] text-center">
            {getDateRangeDisplay()}
          </h2>
          <Button variant="outline" size="sm" onClick={handleNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* Staff filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Staff{" "}
                {selectedStaff &&
                  selectedStaff.length > 0 &&
                  "(" + selectedStaff.length + ")"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="end">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Filter by Staff</span>
                  {selectedStaff && selectedStaff.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearStaffFilter}
                    >
                      Clear
                    </Button>
                  )}
                </div>
                <ScrollArea className="h-48">
                  <div className="space-y-2">
                    {staff &&
                      Array.isArray(staff) &&
                      staff.map(function (member, index) {
                        var color = member.color || getStaffColor(index).hex;
                        return (
                          <div
                            key={member.id}
                            className="flex items-center gap-3 p-2 rounded hover:bg-muted/50"
                          >
                            <Checkbox
                              id={"staff-" + member.id}
                              checked={
                                selectedStaff &&
                                selectedStaff.includes(member.id)
                              }
                              onCheckedChange={function () {
                                toggleStaffFilter(member.id);
                              }}
                            />
                            <div
                              className="w-4 h-4 rounded-full border-2 border-background shadow-sm flex-shrink-0"
                              style={{ backgroundColor: color }}
                            />
                            <Label
                              htmlFor={"staff-" + member.id}
                              className="cursor-pointer flex-1 font-medium"
                            >
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

          {/* View buttons */}
          <div className="flex border rounded-md">
            <Button
              variant={currentView === "timeGridDay" ? "secondary" : "ghost"}
              size="sm"
              className="rounded-r-none"
              onClick={function () {
                handleViewChange("timeGridDay");
              }}
            >
              Day
            </Button>
            <Button
              variant={currentView === "timeGridWeek" ? "secondary" : "ghost"}
              size="sm"
              className="rounded-none border-x"
              onClick={function () {
                handleViewChange("timeGridWeek");
              }}
            >
              Week
            </Button>
            <Button
              variant={currentView === "dayGridMonth" ? "secondary" : "ghost"}
              size="sm"
              className="rounded-l-none"
              onClick={function () {
                handleViewChange("dayGridMonth");
              }}
            >
              Month
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="flex-1 px-4 pb-4 relative">
        <FullCalendar
          ref={calendarRef}
          plugins={[
            dayGridPlugin,
            timeGridPlugin,
            interactionPlugin,
            listPlugin,
          ]}
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
          slotLabelFormat={{
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          }}
          eventTimeFormat={{
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          }}
          allDaySlot={false}
          height="100%"
          businessHours={{
            daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
            startTime: '07:00',
            endTime: '21:00'
          }}
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
    </div>
  );
}
