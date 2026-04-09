"use client";

import { useRef, useState, useCallback, useMemo, useEffect } from "react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, subDays } from "date-fns";
import {
    useCalendarBookings,
    useRescheduleBooking,
    useConfirmBooking,
    useCancelBooking,
    useUpdateBooking,
    useCompleteBooking,
} from "@/hooks/use-bookings";
import { useStaff, getStaffColor } from "@/hooks/use-staff";
import { useSalon } from "@/providers/salon-provider";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarSkeleton } from "@/components/ui/loading-skeletons";
import { DataError } from "@/components/ui/data-error";
import { ChevronLeft, ChevronRight, CalendarDays, Settings } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { EventTooltip } from "./event-tooltip";
import { EventQuickActions } from "./event-quick-actions";

// Constants
var SLOT_MINUTES = 15;
var START_HOUR = 0;
var END_HOUR = 24;
var TOTAL_HOURS = END_HOUR - START_HOUR;

function getTimePosition(dateStr, hourHeight) {
    var d = new Date(String(dateStr).replace(" ", "T"));
    var hours = d.getHours();
    var minutes = d.getMinutes();
    return ((hours - START_HOUR) + minutes / 60) * hourHeight;
}

function getEventHeight(startStr, endStr, hourHeight) {
    var start = new Date(String(startStr).replace(" ", "T"));
    var end = new Date(String(endStr).replace(" ", "T"));
    var diffMs = end - start;
    var diffHours = diffMs / (1000 * 60 * 60);
    return Math.max(diffHours * hourHeight, 20); // minimum 20px
}

export function StaffCalendarView({ onDateClick, onEventClick, onNewBooking, onSwitchView }) {
    var { salonId } = useSalon();
    var scrollContainerRef = useRef(null);
    var hasScrolledRef = useRef(false);

    var [currentDate, setCurrentDate] = useState(new Date());
    var [hourHeight, setHourHeight] = useState(80);
    var HOUR_HEIGHT = hourHeight;

    var confirmBooking = useConfirmBooking();
    var cancelBooking = useCancelBooking();
    var updateBooking = useUpdateBooking();
    var rescheduleBooking = useRescheduleBooking();
    var completeBooking = useCompleteBooking();

    var dateStr = format(currentDate, "yyyy-MM-dd");

    // Fetch bookings for the current date
    var {
        data: bookings,
        isLoading: bookingsLoading,
        error: bookingsError,
        refetch: refetchBookings,
    } = useCalendarBookings(salonId, dateStr, dateStr);

    // Fetch staff
    var {
        data: staff,
        isLoading: staffLoading,
        error: staffError,
        refetch: refetchStaff,
    } = useStaff(salonId);

    // Build staff color map
    var staffColorMap = useMemo(function () {
        var map = {};
        if (staff && Array.isArray(staff)) {
            staff.forEach(function (member, index) {
                var fallbackColor = getStaffColor(index);
                var hex = member.color || fallbackColor.hex;
                map[member.id] = { hex: hex, name: fallbackColor.name };
            });
        }
        return map;
    }, [staff]);

    // Group bookings by staff
    var bookingsByStaff = useMemo(function () {
        var groups = {};
        if (staff && Array.isArray(staff)) {
            staff.forEach(function (member) {
                groups[member.id] = [];
            });
        }
        if (bookings && Array.isArray(bookings)) {
            bookings.forEach(function (booking) {
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
            });
        }
        return groups;
    }, [bookings, staff]);

    // Calculate overlapping events within a staff column
    function layoutEvents(events) {
        if (!events || events.length === 0) return [];

        // Sort by start time
        var sorted = events.slice().sort(function (a, b) {
            var aStart = new Date(String(a.start || a.startDatetime || "").replace(" ", "T"));
            var bStart = new Date(String(b.start || b.startDatetime || "").replace(" ", "T"));
            return aStart - bStart;
        });

        var positioned = [];
        var columns = [];

        sorted.forEach(function (event) {
            var eventStart = new Date(String(event.start || event.startDatetime || "").replace(" ", "T"));
            var eventEnd = new Date(String(event.end || event.endDatetime || "").replace(" ", "T"));

            // Find a column where this event doesn't overlap
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
            return {
                event: item.event,
                column: item.column,
                totalColumns: totalColumns,
            };
        });
    }

    // Navigation
    function handlePrev() {
        setCurrentDate(function (d) { return subDays(d, 1); });
    }
    function handleNext() {
        setCurrentDate(function (d) { return addDays(d, 1); });
    }
    function handleToday() {
        setCurrentDate(new Date());
    }

    // Quick actions
    function handleEditBooking(booking) {
        if (onEventClick) onEventClick(booking);
    }
    function handleConfirmBooking(booking) {
        confirmBooking.mutate(booking.id);
    }
    function handleCompleteBooking(booking) {
        completeBooking.mutate(booking.id);
    }
    function handleCancelBookingAction(booking) {
        if (confirm("Are you sure you want to cancel this booking?")) {
            cancelBooking.mutate(booking.id);
        }
    }

    // Scroll to current time on mount
    useEffect(function () {
        if (!scrollContainerRef.current || hasScrolledRef.current) return;

        var timeout = setTimeout(function () {
            if (hasScrolledRef.current) return;
            var container = scrollContainerRef.current;
            if (!container) return;

            var now = new Date();
            var currentPos = (now.getHours() + now.getMinutes() / 60) * HOUR_HEIGHT;
            container.scrollTop = currentPos - container.clientHeight / 3;
            hasScrolledRef.current = true;
        }, 200);

        return function () { clearTimeout(timeout); };
    }, [currentDate]);

    // Reset scroll flag on date change
    useEffect(function () {
        hasScrolledRef.current = false;
    }, [currentDate]);

    // Now indicator position
    var nowPos = useMemo(function () {
        var now = new Date();
        var todayStr = format(now, "yyyy-MM-dd");
        if (dateStr !== todayStr) return null;
        return (now.getHours() + now.getMinutes() / 60) * HOUR_HEIGHT;
    }, [dateStr]);

    // Re-render now indicator every minute
    var [, setTick] = useState(0);
    useEffect(function () {
        var interval = setInterval(function () {
            setTick(function (t) { return t + 1; });
        }, 60000);
        return function () { clearInterval(interval); };
    }, []);

    if (bookingsLoading || staffLoading) {
        return <CalendarSkeleton />;
    }

    if (bookingsError || staffError) {
        return (
            <DataError
                title="Failed to load calendar"
                message={bookingsError ? "Unable to fetch bookings" : "Unable to fetch staff"}
                onRetry={bookingsError ? refetchBookings : refetchStaff}
                error={bookingsError || staffError}
            />
        );
    }

    var activeStaff = staff && Array.isArray(staff) ? staff : [];
    var hours = [];
    for (var h = START_HOUR; h < END_HOUR; h++) {
        hours.push(h);
    }

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
                        {format(currentDate, "EEEE, MMMM d, yyyy")}
                    </h2>
                    <Button variant="outline" size="sm" onClick={handleNext}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>

                <div className="flex items-center gap-2">
                    {onSwitchView && (
                        <Button variant="outline" size="sm" onClick={onSwitchView} className="gap-2">
                            <CalendarDays className="h-4 w-4" />
                            Week / Month
                        </Button>
                    )}
                    
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button variant="outline" size="sm" className="px-2.5">
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
                              onChange={function(e) { setHourHeight(parseInt(e.target.value)); }}
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

            {/* Staff Headers + Grid */}
            <div className="flex-1 overflow-hidden flex flex-col">
                <div className="flex border-b bg-muted/40 sticky top-0 z-10 shrink-0">
                    {/* Time gutter header */}
                    <div className="w-16 shrink-0 border-r" />

                    {/* Staff columns */}
                    <div className="flex flex-1 overflow-x-auto">
                        {activeStaff.map(function (member, index) {
                            var color = member.color || getStaffColor(index).hex;
                            var initials = (member.firstName?.[0] || "") + (member.lastName?.[0] || "");
                            return (
                                <div
                                    key={member.id}
                                    className="flex-1 min-w-[180px] flex flex-col items-center py-3 border-r last:border-r-0"
                                >
                                    {/* Avatar circle */}
                                    <div
                                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold mb-1.5 ring-2 ring-offset-2 ring-offset-background"
                                        style={{ backgroundColor: color, ringColor: color }}
                                    >
                                        {member.profileImage ? (
                                            <img
                                                src={member.profileImage}
                                                alt={member.firstName}
                                                className="w-full h-full rounded-full object-cover"
                                            />
                                        ) : (
                                            initials.toUpperCase()
                                        )}
                                    </div>
                                    <span className="text-xs font-medium text-foreground truncate max-w-[160px]">
                                        {member.firstName} {member.lastName}
                                    </span>
                                    {member.role && (
                                        <span className="text-[10px] text-muted-foreground capitalize">
                                            {member.role}
                                        </span>
                                    )}
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

                {/* Scrollable time grid */}
                <div
                    ref={scrollContainerRef}
                    className="flex-1 overflow-y-auto overflow-x-auto relative"
                >
                    <div className="flex" style={{ height: TOTAL_HOURS * HOUR_HEIGHT + "px" }}>
                        {/* Time gutter */}
                        <div className="w-16 shrink-0 border-r relative bg-background">
                            {hours.map(function (hour) {
                                return (
                                    <div
                                        key={hour}
                                        className="absolute w-full text-right pr-2 text-[11px] font-medium text-muted-foreground"
                                        style={{ top: (hour - START_HOUR) * HOUR_HEIGHT - 6 + "px" }}
                                    >
                                        {hour === 0 ? "" : format(new Date(2000, 0, 1, hour), "HH:mm")}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Staff columns */}
                        <div className="flex flex-1">
                            {activeStaff.map(function (member, index) {
                                var staffId = member.id;
                                var staffEvents = bookingsByStaff[staffId] || [];
                                var layoutedEvents = layoutEvents(staffEvents);
                                var color = member.color || getStaffColor(index).hex;

                                return (
                                    <div
                                        key={staffId}
                                        className="flex-1 min-w-[180px] border-r last:border-r-0 relative bg-background"
                                        onClick={function (e) {
                                            // Calculate clicked time
                                            var rect = e.currentTarget.getBoundingClientRect();
                                            var y = e.clientY - rect.top + (scrollContainerRef.current?.scrollTop || 0);
                                            var clickedHour = START_HOUR + y / HOUR_HEIGHT;
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
                                                    className={"absolute w-full border-b border-border/50 " +
                                                        (!isBusinessHour ? "bg-muted/20" : "")}
                                                    style={{
                                                        top: (hour - START_HOUR) * HOUR_HEIGHT + "px",
                                                        height: HOUR_HEIGHT + "px",
                                                    }}
                                                >
                                                    {/* Half-hour line */}
                                                    <div
                                                        className="absolute w-full border-b border-border/20"
                                                        style={{ top: HOUR_HEIGHT / 2 + "px" }}
                                                    />
                                                </div>
                                            );
                                        })}

                                        {/* Now indicator */}
                                        {nowPos != null && (
                                            <div
                                                className="absolute left-0 right-0 z-30 pointer-events-none"
                                                style={{ top: nowPos + "px" }}
                                            >
                                                <div className="w-full border-t-2 border-red-500" />
                                                <div className="absolute -top-[4px] -left-[4px] w-2 h-2 rounded-full bg-red-500" />
                                            </div>
                                        )}

                                        {/* Events */}
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
                                                    onMouseEnter={function() {
                                                      var bId = booking.originalBooking?.id || booking.id;
                                                      if (!bId) return;
                                                      document.querySelectorAll('[data-booking-wrapper-id="' + bId + '"]').forEach(function(el) {
                                                        el.classList.add('!z-50');
                                                      });
                                                      document.querySelectorAll('[data-booking-inner-id="' + bId + '"]').forEach(function(el) {
                                                        el.classList.add('ring-[4px]', 'ring-inset', 'ring-foreground/60', 'brightness-110', 'shadow-xl', 'scale-[1.01]');
                                                      });
                                                    }}
                                                    onMouseLeave={function() {
                                                      var bId = booking.originalBooking?.id || booking.id;
                                                      if (!bId) return;
                                                      document.querySelectorAll('[data-booking-wrapper-id="' + bId + '"]').forEach(function(el) {
                                                        el.classList.remove('!z-50');
                                                      });
                                                      document.querySelectorAll('[data-booking-inner-id="' + bId + '"]').forEach(function(el) {
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
                                                            className="h-full rounded-sm p-1.5 text-white cursor-pointer transition-all hover:brightness-90 hover:shadow-lg group relative overflow-hidden"
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
        </div>
    );
}
