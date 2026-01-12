"use client";

import { useRef, useState, useCallback, useMemo } from "react";
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
} from "date-fns";

import {
  useCalendarBookings,
  useRescheduleBooking,
} from "@/hooks/use-bookings";
import { useStaff, getStaffColor } from "@/hooks/use-staff";
import { useSalon } from "@/providers/salon-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight, Filter } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import "@/styles/calendar.css";

export function CalendarView({ onDateClick, onEventClick, onNewBooking }) {
  var calendarRef = useRef(null);
  var { salonId } = useSalon();

  var [currentDate, setCurrentDate] = useState(new Date());
  var [currentView, setCurrentView] = useState("timeGridWeek");
  var [selectedStaff, setSelectedStaff] = useState([]);

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
  var { data: bookings, isLoading: bookingsLoading } = useCalendarBookings(
    salonId,
    dateRange.start,
    dateRange.end
  );

  // Fetch staff
  var { data: staff, isLoading: staffLoading } = useStaff(salonId);

  // Build staff color map
  var staffColorMap = useMemo(
    function () {
      var map = {};
      if (staff && Array.isArray(staff)) {
        staff.forEach(function (member, index) {
          map[member.id] = getStaffColor(index);
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
          return selectedStaff.includes(booking.staff_id);
        })
        .map(function (booking) {
          var staffColor = staffColorMap[booking.staff_id] || {
            name: "blue",
            hex: "#3b82f6",
          };
          return {
            id: booking.id,
            title: booking.client_name || "Walk-in",
            start: booking.start_datetime,
            end: booking.end_datetime,
            backgroundColor: staffColor.hex,
            borderColor: staffColor.hex,
            extendedProps: {
              booking: booking,
              staffColor: staffColor.name,
              status: booking.status,
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

  if (bookingsLoading || staffLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Custom toolbar */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={handleNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="ml-4 text-lg font-semibold">
            {format(currentDate, "MMMM yyyy")}
          </h2>
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
                        var color = getStaffColor(index);
                        return (
                          <div
                            key={member.id}
                            className="flex items-center gap-2"
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
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: color.hex }}
                            />
                            <Label
                              htmlFor={"staff-" + member.id}
                              className="cursor-pointer"
                            >
                              {member.first_name} {member.last_name}
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
      <div className="flex-1 p-4">
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
          slotMinTime="07:00:00"
          slotMaxTime="21:00:00"
          slotDuration="00:15:00"
          slotLabelInterval="01:00:00"
          allDaySlot={false}
          height="100%"
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          eventDrop={handleEventDrop}
          eventResize={handleEventDrop}
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
