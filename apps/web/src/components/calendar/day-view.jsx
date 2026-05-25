"use client";

import { useRef, useMemo, useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { getStaffColor } from "@/hooks/use-staff";
import { Badge } from "@/components/ui/badge";
import { EventTooltip } from "./event-tooltip";
import {
  START_HOUR,
  END_HOUR,
  TOTAL_HOURS,
  getTimePosition,
  getEventHeight,
  layoutOverlappingEvents,
} from "./calendar-utils";

const SLOT_MINUTES = 15;

export function DayView({
  currentDate,
  activeStaff,
  bookingsByStaff,
  timeOffByStaff,
  staffColorMap,
  hourHeight,
  hoveredBookingId,
  selectedSlot,
  onHoverBooking,
  onEventClick,
  onTimeOffClick,
  onSlotMenu,
}) {
  const staffScrollRef = useRef(null);
  const HOUR_HEIGHT = hourHeight;
  const SLOT_HEIGHT = HOUR_HEIGHT / (60 / SLOT_MINUTES);

  // Track which staff column + slot is hovered
  const [hoveredSlot, setHoveredSlot] = useState(null); // { staffId, slotIndex }

  const hours = useMemo(() => {
    const h = [];
    for (let i = START_HOUR; i < END_HOUR; i++) h.push(i);
    return h;
  }, []);

  // Total number of 15-min slots in the day
  const totalSlots = TOTAL_HOURS * (60 / SLOT_MINUTES);

  // Now indicator position
  const nowPos = useMemo(() => {
    const now = new Date();
    const todayStr = format(now, "yyyy-MM-dd");
    const dateStr = format(currentDate, "yyyy-MM-dd");
    if (dateStr !== todayStr) return null;
    return (now.getHours() + now.getMinutes() / 60) * HOUR_HEIGHT;
  }, [currentDate, HOUR_HEIGHT]);

  // Re-render now indicator every minute
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  // Scroll to current time on mount / date change
  useEffect(() => {
    const timeout = setTimeout(() => {
      const now = new Date();
      const isToday = format(currentDate, "yyyy-MM-dd") === format(now, "yyyy-MM-dd");
      if (isToday) {
        const indicator = document.getElementById("current-time-indicator");
        if (indicator) {
          indicator.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
        }
      } else {
        const nineAm = document.getElementById("hour-9-indicator");
        if (nineAm) {
          nineAm.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
        }
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [currentDate]);

  // Calculate slot index from mouse Y position
  const getSlotFromY = useCallback((y) => {
    return Math.floor(y / SLOT_HEIGHT);
  }, [SLOT_HEIGHT]);

  // Compute selected slot position from selectedSlot prop
  const selectedSlotInfo = useMemo(() => {
    if (!selectedSlot || !selectedSlot.date) return null;
    const date = selectedSlot.date;
    const totalMinutes = date.getHours() * 60 + date.getMinutes();
    const slotIndex = Math.floor(totalMinutes / SLOT_MINUTES);
    const timeLabel = format(date, "HH:mm");
    return { staffId: selectedSlot.staffId, slotIndex, timeLabel };
  }, [selectedSlot]);

  // Handle mouse move on a staff column to track hovered slot
  const handleColumnMouseMove = useCallback((e, staffId) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const slotIndex = getSlotFromY(y);
    setHoveredSlot((prev) => {
      if (prev && prev.staffId === staffId && prev.slotIndex === slotIndex) return prev;
      return { staffId, slotIndex };
    });
  }, [getSlotFromY]);

  const handleColumnMouseLeave = useCallback(() => {
    setHoveredSlot(null);
  }, []);

  return (
    <div className="flex flex-col">
      {/* Staff Headers */}
      <div className="flex border-b bg-muted shrink-0 sticky top-[69px] z-20">
        <div className="w-16 shrink-0 border-r" />
        <div className="flex flex-1 overflow-x-auto">
          {activeStaff.map((member, index) => {
            const color = member.color || getStaffColor(index).hex;
            const initials = (member.firstName?.[0] || "") + (member.lastName?.[0] || "");
            const isColumnHovered = hoveredSlot?.staffId === member.id;

            return (
              <div
                key={member.id}
                className="flex-1 min-w-[180px] flex flex-col items-center py-3 border-r last:border-r-0 transition-all duration-200"
              >
                <div
                  className={"w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold mb-1.5 ring-2 ring-offset-2 ring-offset-background transition-all duration-200 overflow-hidden " + (isColumnHovered ? "scale-110 ring-4 shadow-lg brightness-110" : "")}
                  style={{ backgroundColor: color, "--tw-ring-color": color }}
                >
                  {member.avatarUrl ? (
                    <img
                      src={member.avatarUrl}
                      alt={member.firstName}
                      className={"w-full h-full rounded-full object-cover transition-transform duration-200 " + (isColumnHovered ? "scale-110" : "")}
                    />
                  ) : (
                    initials.toUpperCase()
                  )}
                </div>
                <span className={"text-xs font-medium truncate max-w-[160px] transition-colors duration-200 " + (isColumnHovered ? "text-foreground" : "text-foreground/70")}>
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
            {hours.map((hour) => (
              <div
                key={hour}
                id={"hour-" + hour + "-indicator"}
                className="absolute w-full text-right pr-2 text-[11px] font-medium text-muted-foreground"
                style={{ top: hour * HOUR_HEIGHT - 6 + "px" }}
              >
                {hour === 0 ? "" : format(new Date(2000, 0, 1, hour), "HH:mm")}
              </div>
            ))}
            {/* Now indicator label in time gutter */}
            {nowPos != null && (
              <div
                id="current-time-indicator"
                className="absolute right-0 z-20 pointer-events-none"
                style={{ top: nowPos - 10 + "px" }}
              >
                <div className="bg-rose-400/90 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-sm mr-0.5">
                  {format(new Date(), "HH:mm")}
                </div>
              </div>
            )}
          </div>

          {/* Staff Columns */}
          <div className="flex flex-1">
            {activeStaff.map((member, index) => {
              const staffId = member.id;
              const staffEvents = bookingsByStaff[staffId] || [];

              // Separate travel blocks from real bookings
              const travelEvents = staffEvents.filter((e) => !!e.isTravel);
              const realEvents = staffEvents.filter((e) => !e.isTravel);
              const layoutedEvents = layoutOverlappingEvents(realEvents);
              const color = member.color || getStaffColor(index).hex;

              return (
                <div
                  key={staffId}
                  className="flex-1 min-w-[180px] border-r last:border-r-0 relative bg-background select-none"
                  onMouseMove={(e) => handleColumnMouseMove(e, staffId)}
                  onMouseLeave={handleColumnMouseLeave}
                  onClick={(e) => {
                    if (e.target.closest("[data-booking-inner-id]")) return;
                    if (e.target.closest("[data-blocked]")) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const y = e.clientY - rect.top;
                    const slotIndex = getSlotFromY(y);
                    const totalMinutes = slotIndex * SLOT_MINUTES;
                    const clickedHour = totalMinutes / 60;
                    if (clickedHour < 7 || clickedHour >= 21) return;
                    const clickedDate = new Date(currentDate);
                    clickedDate.setHours(Math.floor(clickedHour), totalMinutes % 60, 0, 0);
                    // Pass column rect and slot position for smart menu placement
                    const slotTop = rect.top + (slotIndex * SLOT_HEIGHT);
                    const slotCenter = slotTop + (SLOT_HEIGHT / 2);
                    if (onSlotMenu) onSlotMenu({
                      x: e.clientX,
                      y: e.clientY,
                      date: clickedDate,
                      staffId,
                      columnRight: rect.right,
                      columnLeft: rect.left,
                      slotCenterY: slotCenter,
                    });
                  }}
                >

                  {/* Hour grid lines */}
                  {hours.map((hour) => {
                    const isBusinessHour = hour >= 7 && hour < 21;
                    return (
                      <div
                        key={hour}
                        className={"absolute w-full border-b border-border/50 " + (!isBusinessHour ? "bg-muted dark:bg-muted/40" : "")}
                        style={{ top: hour * HOUR_HEIGHT + "px", height: HOUR_HEIGHT + "px" }}
                        data-blocked={!isBusinessHour ? "true" : undefined}
                      >
                        {/* Quarter-hour lines */}
                        <div className="absolute w-full border-b border-border/10" style={{ top: HOUR_HEIGHT * 0.25 + "px" }} />
                        <div className="absolute w-full border-b border-border/20" style={{ top: HOUR_HEIGHT * 0.5 + "px" }} />
                        <div className="absolute w-full border-b border-border/10" style={{ top: HOUR_HEIGHT * 0.75 + "px" }} />
                      </div>
                    );
                  })}

                  {/* 15-min slot hover highlight */}
                  {hoveredSlot?.staffId === staffId && (() => {
                    const slotTop = hoveredSlot.slotIndex * SLOT_HEIGHT;
                    const slotHour = (hoveredSlot.slotIndex * SLOT_MINUTES) / 60;
                    const isBusinessHour = slotHour >= 7 && slotHour < 21;
                    // Don't show hover highlight if this is the selected slot
                    const isSelected = selectedSlotInfo && selectedSlotInfo.staffId === staffId && selectedSlotInfo.slotIndex === hoveredSlot.slotIndex;
                    if (!isBusinessHour || isSelected) return null;
                    const hoverMinutes = hoveredSlot.slotIndex * SLOT_MINUTES;
                    const hoverHour = Math.floor(hoverMinutes / 60);
                    const hoverMin = hoverMinutes % 60;
                    const hoverTimeLabel = format(new Date(2000, 0, 1, hoverHour, hoverMin), "HH:mm");
                    return (
                      <div
                        className="absolute inset-x-0 z-[5] pointer-events-none bg-primary/[0.06] dark:bg-primary/[0.10] border-y border-primary/20 transition-all duration-75 flex items-center px-2"
                        style={{ top: slotTop + "px", height: SLOT_HEIGHT + "px" }}
                      >
                        <span className="text-[10px] font-medium text-primary/60 dark:text-primary/70">
                          {hoverTimeLabel}
                        </span>
                      </div>
                    );
                  })()}

                  {/* Selected slot highlight with time label (Fresha-style) */}
                  {selectedSlotInfo && selectedSlotInfo.staffId === staffId && (() => {
                    const slotTop = selectedSlotInfo.slotIndex * SLOT_HEIGHT;
                    return (
                      <div
                        className="absolute inset-x-0 z-[6] pointer-events-none"
                        style={{ top: slotTop + "px", height: SLOT_HEIGHT + "px" }}
                      >
                        <div className="h-full bg-primary/[0.12] dark:bg-primary/[0.18] border border-primary/30 rounded-[3px] flex items-center px-2">
                          <span className="text-[11px] font-semibold text-primary dark:text-primary">
                            {selectedSlotInfo.timeLabel}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Now indicator line */}
                  {nowPos != null && (
                    <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: nowPos + "px" }}>
                      <div className="w-full border-t border-red-400" />
                    </div>
                  )}

                  {/* Time-off blocks */}
                  {(timeOffByStaff[staffId] || []).map((to) => {
                    const rawStart = to.start || to.startDatetime || "";
                    const rawEnd = to.end || to.endDatetime || "";
                    const top = getTimePosition(rawStart, hourHeight);
                    const height = getEventHeight(rawStart, rawEnd, hourHeight);
                    const label = to.reason || "Blocked";
                    return (
                      <div
                        key={to.id || to.subId}
                        role="button"
                        tabIndex={0}
                        aria-label={`Time off: ${label}`}
                        className="absolute z-10 inset-x-0 px-0.5 pb-0.5 cursor-pointer group/timeoff"
                        style={{ top: top + "px", height: height + "px" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onTimeOffClick) onTimeOffClick(Object.assign({}, to, { staffId }));
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.stopPropagation();
                            if (onTimeOffClick) onTimeOffClick(Object.assign({}, to, { staffId }));
                          }
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

                  {/* Travel buffer backgrounds */}
                  {travelEvents.map((booking) => {
                    const rawStart = booking.start || booking.startDatetime || "";
                    const rawEnd = booking.end || booking.endDatetime || "";
                    const top = getTimePosition(rawStart, hourHeight);
                    const height = getEventHeight(rawStart, rawEnd, hourHeight);
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

                  {/* Real booking events */}
                  {layoutedEvents.map((item) => {
                    const booking = item.event;
                    const rawStart = booking.start || booking.startDatetime || "";
                    const rawEnd = booking.end || booking.endDatetime || "";
                    const top = getTimePosition(rawStart, hourHeight);
                    const height = getEventHeight(rawStart, rawEnd, hourHeight);
                    const widthPercent = 100 / item.totalColumns;
                    const leftPercent = item.column * widthPercent;
                    const startTime = new Date(String(rawStart).replace(" ", "T"));
                    const endTime = new Date(String(rawEnd).replace(" ", "T"));
                    const clientName = booking.title || (booking.client
                      ? booking.client.firstName + " " + booking.client.lastName
                      : "Walk-in");
                    const servicesText = booking.services
                      ? booking.services.map((s) => s.name).join(", ")
                      : "";
                    const bookingId = booking.originalBooking?.id || booking.id;
                    const isHovered = hoveredBookingId === bookingId;

                    return (
                      <div
                        key={booking.subId || booking.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`Booking: ${clientName} at ${format(startTime, "HH:mm")}`}
                        className={"absolute px-0.5 pb-0.5 transition-all duration-200 " + (isHovered ? "z-50" : "z-10")}
                        onMouseEnter={() => onHoverBooking(bookingId)}
                        onMouseLeave={() => onHoverBooking(null)}
                        style={{
                          top: top + "px",
                          height: height + "px",
                          left: leftPercent + "%",
                          width: widthPercent + "%",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onEventClick) onEventClick(booking.originalBooking || booking);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.stopPropagation();
                            if (onEventClick) onEventClick(booking.originalBooking || booking);
                          }
                        }}
                      >
                        <EventTooltip booking={booking.originalBooking || booking}>
                          <div
                            className={"h-full rounded-sm text-white cursor-pointer transition-all duration-200 group relative overflow-hidden " + (height <= SLOT_HEIGHT + 4 ? "flex items-center px-2 py-0" : "flex flex-col p-1.5") + " " + (isHovered ? "shadow-lg" : "")}
                            style={{
                              backgroundColor: color,
                              marginRight: isHovered ? "5%" : "0",
                              borderRight: isHovered ? "2px solid rgba(255,255,255,0.4)" : "2px solid transparent",
                              borderTop: isHovered ? "2px solid rgba(255,255,255,0.4)" : "2px solid transparent",
                              borderBottom: isHovered ? "2px solid rgba(255,255,255,0.4)" : "2px solid transparent",
                              borderLeft: isHovered ? "2px solid rgba(255,255,255,0.4)" : "2px solid transparent",
                            }}
                            data-status={booking.status}
                            data-booking-inner-id={bookingId}
                          >
                            {height <= SLOT_HEIGHT + 4 ? (
                              /* Compact single-line layout for short bookings (15min) */
                              <div className="flex items-center gap-1.5 min-w-0 w-full">
                                {booking.status === "pending" && (
                                  <span className="relative flex h-1.5 w-1.5 shrink-0">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                                  </span>
                                )}
                                <span className="text-[10px] font-semibold opacity-90 shrink-0">
                                  {format(startTime, "HH:mm")} – {format(endTime, "HH:mm")}
                                </span>
                                <span className="text-[10px] font-medium truncate opacity-90">
                                  {clientName}
                                </span>
                              </div>
                            ) : (
                              /* Normal stacked layout for longer bookings */
                              <>
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
                              </>
                            )}
                          </div>
                        </EventTooltip>
                      </div>
                    );
                  })}

                  {/* Empty state removed — clean grid like Fresha */}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
