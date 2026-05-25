"use client";

import { useRef, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import { format } from "date-fns";

import "@/styles/calendar.css";

export function MonthView({
  currentDate,
  currentView,
  events,
  hourHeight,
  onDateClick,
  onEventClick,
  onEventDrop,
  calendarRef: externalRef,
}) {
  const internalRef = useRef(null);
  const ref = externalRef || internalRef;

  // Sync FullCalendar view
  useEffect(() => {
    if (ref.current) {
      try {
        const api = ref.current.getApi();
        if (api && api.view.type !== currentView) {
          api.changeView(currentView);
          api.gotoDate(currentDate);
        }
      } catch (e) { /* calendar not mounted yet */ }
    }
  }, [currentView, currentDate, ref]);

  // Update now indicator time label
  useEffect(() => {
    const updateCurrentTime = () => {
      const nowLine = ref.current?.elRef?.current?.querySelector(".fc-timegrid-now-indicator-line");
      if (nowLine) {
        nowLine.setAttribute("data-time", format(new Date(), "HH:mm"));
      }
    };
    const timeout = setTimeout(updateCurrentTime, 100);
    const interval = setInterval(updateCurrentTime, 60000);
    return () => { clearTimeout(timeout); clearInterval(interval); };
  }, [events, ref]);

  return (
    <div
      className="bg-background rounded-b-md border-x border-b"
      style={{ "--fc-timegrid-slot-height": (hourHeight / 4) + "px" }}
    >
      <FullCalendar
        ref={ref}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
        initialView={currentView}
        initialDate={currentDate}
        headerToolbar={false}
        events={events}
        editable={true}
        selectable={true}
        selectMirror={true}
        dayMaxEvents={3}
        weekends={true}
        nowIndicator={true}
        allDaySlot={false}
        height="auto"
        dateClick={(arg) => {
          if (onDateClick) onDateClick(arg.date);
        }}
        eventClick={(arg) => {
          const booking = arg.event.extendedProps.booking;
          if (onEventClick && booking) onEventClick(booking);
        }}
        eventDrop={onEventDrop}
        eventContent={(arg) => {
          const booking = arg.event.extendedProps.booking;
          if (!booking) return null;
          const isPending = booking.status === "pending";
          return (
            <div
              className="w-full px-1 py-0.5 text-white text-[11px] font-medium truncate flex items-center gap-1 rounded overflow-hidden"
              role="button"
              tabIndex={0}
              aria-label={`Booking: ${arg.event.title}`}
            >
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
        eventDidMount={(arg) => {
          const status = arg.event.extendedProps.status;
          const staffColor = arg.event.extendedProps.staffColor;
          if (status) arg.el.setAttribute("data-status", status);
          if (staffColor) arg.el.setAttribute("data-staff-color", staffColor);
        }}
      />
    </div>
  );
}
