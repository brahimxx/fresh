"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

let globalActiveBookingId = null;
let globalHideTimeout = null;
let globalShowTimeout = null;
let globalPosition = { x: 0, y: 0 };
const tooltipSubscribers = new Set();

function notifySubscribers() {
  tooltipSubscribers.forEach(cb => cb());
}
import { format, isValid } from "date-fns";
import { Clock, User, Scissors, FileText, CircleDot, AlertTriangle } from "lucide-react";
import { useSalon } from "@/providers/salon-provider";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDuration } from "@/lib/format";

var statusConfig = {
  pending: {
    label: "Pending",
    dotColor: "bg-amber-500",
    bgColor: "bg-amber-50/50 border border-amber-200",
    textColor: "text-amber-600",
  },
  confirmed: {
    label: "Confirmed",
    dotColor: "bg-slate-500",
    bgColor: "bg-slate-50/50 border border-slate-200",
    textColor: "text-slate-700",
  },
  completed: {
    label: "Completed",
    dotColor: "bg-green-500",
    bgColor: "bg-green-50/50 border border-green-200",
    textColor: "text-green-600",
  },
  cancelled: {
    label: "Cancelled",
    dotColor: "bg-red-500",
    bgColor: "bg-red-50/50 border border-red-200",
    textColor: "text-red-600",
  },
  no_show: {
    label: "No Show",
    dotColor: "bg-orange-500",
    bgColor: "bg-orange-50/50 border border-orange-200",
    textColor: "text-orange-600",
  },
};

export function EventTooltip({ booking, children }) { var { salon } = useSalon() || {};
  var bookingId = booking?.originalBooking?.id || booking?.id;
  var [isVisible, setIsVisible] = useState(false);
  var [position, setPosition] = useState({ x: 0, y: 0 });
  var [isRenderer, setIsRenderer] = useState(false);
  var containerRef = useRef(null);

  useEffect(() => {
    function handleUpdate() {
      if (globalActiveBookingId === bookingId) {
        setIsVisible(true);
        setPosition(globalPosition);
      } else {
        setIsVisible(false);
        setIsRenderer(false);
      }
    }
    tooltipSubscribers.add(handleUpdate);
    handleUpdate();
    return () => tooltipSubscribers.delete(handleUpdate);
  }, [bookingId]);

  useEffect(() => {
    if (isVisible && globalActiveBookingId === bookingId) {
      if (!window.__activeTooltipRenderer) {
        window.__activeTooltipRenderer = bookingId;
        setIsRenderer(true);
      }
    } else {
      if (isRenderer) {
        window.__activeTooltipRenderer = null;
        setIsRenderer(false);
      }
    }
    return () => {
      if (isRenderer) window.__activeTooltipRenderer = null;
    };
  }, [isVisible, bookingId, isRenderer]);

  if (!booking) return children;

  var rawStart = booking.start || booking.startDatetime || "";
  var rawEnd = booking.end || booking.endDatetime || "";
  var startTime = new Date(rawStart.replace(" ", "T"));
  var endTime = new Date(rawEnd.replace(" ", "T"));
  var hasValidDates = isValid(startTime) && isValid(endTime);
  var duration = hasValidDates
    ? Math.round((endTime - startTime) / (1000 * 60))
    : null;

  var status = statusConfig[booking.status] || statusConfig.pending;

  var totalPrice =
    booking.services && booking.services.length > 0
      ? booking.services.reduce(function (sum, s) {
        return sum + (parseFloat(s.price) || 0);
      }, 0)
      : null;

  function handleMouseEnter(e) {
    clearTimeout(globalHideTimeout);
    clearTimeout(globalShowTimeout);
    
    var rect = e.currentTarget.getBoundingClientRect();
    var groupElements = document.querySelectorAll('[data-booking-inner-id="' + bookingId + '"]');
    if (groupElements.length > 0) {
      var minTop = 99999, maxBottom = -99999, minLeft = 99999, maxRight = -99999;
      groupElements.forEach(function(el) {
        var r = el.getBoundingClientRect();
        if (r.top < minTop) minTop = r.top;
        if (r.bottom > maxBottom) maxBottom = r.bottom;
        if (r.left < minLeft) minLeft = r.left;
        if (r.right > maxRight) maxRight = r.right;
      });
      rect = { top: minTop, bottom: maxBottom, left: minLeft, right: maxRight };
    }

    var delay = globalActiveBookingId === bookingId ? 0 : 300;
    
    function triggerShow() {
      var viewportW = window.innerWidth;
      var viewportH = window.innerHeight;
      var cardW = 300;
      var cardH = 320;

      var x = rect.right + 8;
      var y = rect.top;

      if (x + cardW > viewportW - 16) {
        x = rect.left - cardW - 8;
      }
      if (y + cardH > viewportH - 16) {
        y = viewportH - cardH - 16;
      }
      if (y < 16) {
        y = 16;
      }

      globalPosition = { x: x, y: y };
      globalActiveBookingId = bookingId;
      notifySubscribers();
    }

    if (delay === 0) triggerShow();
    else globalShowTimeout = setTimeout(triggerShow, delay);
  }

  function handleMouseLeave() {
    clearTimeout(globalShowTimeout);
    clearTimeout(globalHideTimeout);
    globalHideTimeout = setTimeout(function () {
      if (globalActiveBookingId === bookingId) {
        globalActiveBookingId = null;
        notifySubscribers();
      }
    }, 150);
  }

  function handleCardMouseEnter() {
    clearTimeout(globalHideTimeout);
  }

  function handleCardMouseLeave() {
    clearTimeout(globalHideTimeout);
    globalHideTimeout = setTimeout(function () {
      if (globalActiveBookingId === bookingId) {
        globalActiveBookingId = null;
        notifySubscribers();
      }
    }, 150);
  }

  return (
    <>
      <div
        ref={containerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="w-full h-full"
      >
        {children}
      </div>

      {isVisible && isRenderer && typeof document !== "undefined" && createPortal(
        <div
          className="fixed z-[9999] pointer-events-auto"
          style={{ left: position.x + "px", top: position.y + "px" }}
          onMouseEnter={handleCardMouseEnter}
          onMouseLeave={handleCardMouseLeave}
        >
          <div className="w-[300px] bg-popover border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200">
            {/* Header with colored accent bar */}
            <div
              className="h-1.5 w-full"
              style={{
                backgroundColor:
                  booking.staffColor || booking.staff?.color || "#6366f1",
              }}
            />

            <div className="p-4">
              {booking.clientIsActive === false && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold px-3 py-2 rounded-md mb-3 flex items-center justify-center shadow-sm">
                  <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                  RESTRICTED CLIENT
                </div>
              )}
              {/* Client Name + Status */}
              <div className="flex items-center justify-between mb-3 w-full">
                <h3 className="font-semibold text-sm text-foreground truncate flex-1 flex items-center pr-2">
                  <span className="truncate mr-1.5">
                    {booking.client
                      ? booking.client.firstName + " " + booking.client.lastName
                      : booking.title || "Walk-in"}
                  </span>
                  {booking.clientIsActive === false && (
                    <Badge variant="destructive" className="h-4 min-h-4 px-1 py-0 text-[8px] font-bold uppercase shrink-0 leading-none">
                      Restricted
                    </Badge>
                  )}
                </h3>
                <span
                  className={
                    "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0 whitespace-nowrap " +
                    status.bgColor +
                    " " +
                    status.textColor
                  }
                >
                  {booking.status === 'pending' ? (
                    <span className="relative flex h-1.5 w-1.5 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                    </span>
                  ) : (
                    <span className={"w-1.5 h-1.5 rounded-full " + status.dotColor} />
                  )}
                  {status.label}
                </span>
              </div>

              {/* Time row */}
              <div className="flex items-center gap-3 mb-3 px-3 py-2 bg-muted/50 rounded-lg">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground">
                    {hasValidDates
                      ? format(startTime, "h:mm a") +
                      " – " +
                      format(endTime, "h:mm a")
                      : "—"}
                  </div>
                  {duration != null && (
                    <div className="text-[11px] text-muted-foreground">
                      {formatDuration(duration)}
                    </div>
                  )}
                </div>
              </div>

              {/* Services */}
              {booking.services && booking.services.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Scissors className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Services
                    </span>
                  </div>
                  <div className="space-y-1">
                    {booking.services.map(function (service, index) {
                      return (
                        <div
                          key={index}
                          className="flex justify-between items-center text-xs"
                        >
                          <span className="text-foreground truncate mr-2">
                            {service.name}
                          </span>
                          <span className="text-muted-foreground font-medium shrink-0">
                            {formatCurrency(service.price, salon?.currency)}
                          </span>
                        </div>
                      );
                    })}
                    {totalPrice != null && booking.services.length > 1 && (
                      <div className="flex justify-between items-center text-xs pt-1 border-t border-border/50">
                        <span className="font-medium text-foreground">
                          Total
                        </span>
                        <span className="font-semibold text-foreground">
                          {formatCurrency(totalPrice, salon?.currency)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Staff */}
              {booking.staff && (
                <div className="flex items-center gap-2 mb-3 text-xs">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-foreground">
                    {booking.staff.firstName} {booking.staff.lastName}
                  </span>
                </div>
              )}

              {/* Notes */}
              {booking.notes && (
                <div className="flex items-start gap-2 text-xs px-2.5 py-2 bg-muted/30 rounded-md">
                  <FileText className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                  <span className="text-muted-foreground line-clamp-2">
                    {booking.notes}
                  </span>
                </div>
              )}

              {/* Contact info - compact row */}
              {booking.client &&
                (booking.client.phone || booking.client.email) && (
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/50 text-[11px] text-muted-foreground">
                    {booking.client.phone && (
                      <span className="truncate">{booking.client.phone}</span>
                    )}
                    {booking.client.phone && booking.client.email && (
                      <span className="text-border">·</span>
                    )}
                    {booking.client.email && (
                      <span className="truncate">{booking.client.email}</span>
                    )}
                  </div>
                )}
            </div>
          </div>
        </div>
        , document.body)}
    </>
  );
}
