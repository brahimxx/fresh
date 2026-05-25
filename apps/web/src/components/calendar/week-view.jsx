"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { getStaffColor } from "@/hooks/use-staff";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { CalendarDays } from "lucide-react";
import { EventTooltip } from "./event-tooltip";
import { EventQuickActions } from "./event-quick-actions";

export function WeekView({
  currentDate,
  weekDays,
  staff,
  bookings,
  timeOffByStaff,
  staffColorMap,
  hoveredBookingId,
  onHoverBooking,
  onEventClick,
  onTimeOffClick,
  onSlotMenu,
  onSwitchToDay,
  onEditBooking,
  onConfirmBooking,
  onCompleteBooking,
  onCheckoutBooking,
  onCancelBooking,
}) {
  const activeStaff = staff && Array.isArray(staff) ? staff : [];

  return (
    <div className="bg-background rounded-b-md border-x border-b">
      <div className="h-full overflow-auto">
        <table className="w-full border-collapse min-w-[700px]" style={{ tableLayout: "fixed" }}>
          {/* Header row */}
          <thead className="sticky top-0 z-20 bg-background">
            <tr>
              <th className="w-[80px] min-w-[80px] border-b border-r border-border bg-background" />
              {weekDays.map((day) => {
                const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
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
                        aria-label={`View ${format(day, "EEEE")} in day view`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSwitchToDay) onSwitchToDay(day);
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
            {activeStaff.map((member) => {
              const staffColor = staffColorMap[member.id] || { name: "blue", hex: "#3b82f6" };
              const initials = ((member.firstName || "")[0] || "") + ((member.lastName || "")[0] || "");

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
                  {weekDays.map((day) => {
                    const dayStr = format(day, "yyyy-MM-dd");
                    const isToday = dayStr === format(new Date(), "yyyy-MM-dd");

                    // Filter bookings for this staff member on this day
                    const dayBookings = (bookings || []).filter((b) => {
                      if (b.type === "time_off") return false;
                      const bStart = b.start || b.startDatetime || "";
                      if (!bStart) return false;
                      const bDate = format(new Date(String(bStart).replace(" ", "T")), "yyyy-MM-dd");
                      if (bDate !== dayStr) return false;
                      if (b.services && b.services.length > 0) {
                        return b.services.some((s) => (s.staffId || b.staffId || b.staff?.id) === member.id);
                      }
                      return (b.staffId || b.staff?.id) === member.id;
                    }).slice().sort((a, b) => {
                      const aStart = String(a.start || a.startDatetime || "").replace(" ", "T");
                      const bStart = String(b.start || b.startDatetime || "").replace(" ", "T");
                      return new Date(aStart) - new Date(bStart);
                    });

                    // Filter time-off blocks for this staff member on this day
                    const dayTimeOff = (timeOffByStaff[member.id] || []).filter((to) => {
                      const bStart = to.start || to.startDatetime || "";
                      if (!bStart) return false;
                      const bDate = format(new Date(String(bStart).replace(" ", "T")), "yyyy-MM-dd");
                      return bDate === dayStr;
                    });

                    return (
                      <td
                        key={dayStr}
                        className={"border-b border-r border-border align-top p-1 min-h-[80px] relative transition-colors " + (isToday ? "bg-primary/[0.02] hover:bg-primary/[0.05]" : "bg-background hover:bg-muted/30") + (dayTimeOff.length > 0 ? " cursor-not-allowed" : " cursor-pointer")}
                        onClick={(e) => {
                          if (dayTimeOff.length > 0) return;
                          if (e.target.closest("[data-booking-inner-id]")) return;
                          if (onSlotMenu) onSlotMenu({ x: e.clientX, y: e.clientY, date: day, staffId: member.id });
                        }}
                      >
                        <div className="flex flex-col gap-1 min-h-[80px]">
                          {/* Time-off chips */}
                          {dayTimeOff.map((to) => {
                            const label = to.reason || "Blocked";
                            return (
                              <div
                                key={to.id || to.subId}
                                role="button"
                                tabIndex={0}
                                aria-label={`Time off: ${label}`}
                                className="rounded overflow-hidden border border-dashed border-rose-300/70 dark:border-rose-700/60 bg-[repeating-linear-gradient(135deg,rgba(244,63,94,0.04),rgba(244,63,94,0.04)_6px,rgba(244,63,94,0.08)_6px,rgba(244,63,94,0.08)_12px)] px-2 py-1.5 cursor-pointer hover:bg-rose-500/10 transition-colors group/tochip"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onTimeOffClick) onTimeOffClick(Object.assign({}, to, { staffId: member.id }));
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (onTimeOffClick) onTimeOffClick(Object.assign({}, to, { staffId: member.id }));
                                  }
                                }}
                              >
                                <div className="text-[10px] uppercase font-bold text-rose-500/80 dark:text-red-400 tracking-wide flex items-center gap-1">
                                  🔒 {label}
                                </div>
                                <div className="text-[9px] text-rose-400/60 mt-0.5 opacity-0 group-hover/tochip:opacity-100 transition-opacity">
                                  Click to edit
                                </div>
                              </div>
                            );
                          })}

                          {/* Booking chips */}
                          {dayBookings.map((booking) => {
                            const clientName = booking.clientName ||
                              (booking.client
                                ? (booking.client.firstName + " " + booking.client.lastName).trim()
                                : (booking.client_first_name
                                  ? (booking.client_first_name + " " + (booking.client_last_name || "")).trim()
                                  : "Walk-in"));
                            const rawStart = booking.start || booking.startDatetime || "";
                            const rawEnd = booking.end || booking.endDatetime || "";
                            const startTime = new Date(String(rawStart).replace(" ", "T"));
                            const timeLabel = isNaN(startTime) ? "" : format(startTime, "HH:mm");
                            const isPending = booking.status === "pending";
                            const isRestricted = booking.clientIsActive === false;
                            const servicesText = (booking.services || []).map((s) => s.name).join(", ");
                            const bookingId = booking.id;
                            const isHovered = hoveredBookingId === bookingId;

                            const tooltipBooking = Object.assign({}, booking, {
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
                                  role="button"
                                  tabIndex={0}
                                  aria-label={`Booking: ${clientName} at ${timeLabel}`}
                                  className={"relative rounded overflow-hidden cursor-pointer select-none group/event " + (isHovered ? "ring-2 ring-foreground/40 shadow-lg" : "")}
                                  style={{ borderLeft: "3px solid " + staffColor.hex }}
                                  data-booking-inner-id={bookingId}
                                  onMouseEnter={() => onHoverBooking(bookingId)}
                                  onMouseLeave={() => onHoverBooking(null)}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onEventClick) onEventClick(booking);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      if (onEventClick) onEventClick(booking);
                                    }
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
                                      <span className="text-[11px] font-semibold text-foreground truncate" style={{ color: staffColor.hex }}>
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
                                      onEdit={onEditBooking}
                                      onConfirm={onConfirmBooking}
                                      onComplete={onCompleteBooking}
                                      onCheckout={onCheckoutBooking}
                                      onCancel={onCancelBooking}
                                    />
                                  </div>
                                </div>
                              </EventTooltip>
                            );
                          })}

                          {/* Empty state */}
                          {dayBookings.length === 0 && dayTimeOff.length === 0 && (
                            <div className="flex items-center justify-center h-full min-h-[60px] opacity-30">
                              <span className="text-[10px] text-muted-foreground">—</span>
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}

            {/* Empty state if no staff */}
            {activeStaff.length === 0 && (
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
  );
}
