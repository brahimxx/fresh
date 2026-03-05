"use client";

import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { format, isValid } from "date-fns";
import { Clock, User, Scissors, FileText, CircleDot } from "lucide-react";

var statusConfig = {
  pending: {
    label: "Pending",
    dotColor: "bg-yellow-400",
    bgColor: "bg-yellow-400/10",
    textColor: "text-yellow-500",
  },
  confirmed: {
    label: "Confirmed",
    dotColor: "bg-green-400",
    bgColor: "bg-green-400/10",
    textColor: "text-green-500",
  },
  completed: {
    label: "Completed",
    dotColor: "bg-blue-400",
    bgColor: "bg-blue-400/10",
    textColor: "text-blue-500",
  },
  cancelled: {
    label: "Cancelled",
    dotColor: "bg-red-400",
    bgColor: "bg-red-400/10",
    textColor: "text-red-500",
  },
  no_show: {
    label: "No Show",
    dotColor: "bg-gray-400",
    bgColor: "bg-gray-400/10",
    textColor: "text-gray-500",
  },
};

export function EventTooltip({ booking, children }) {
  var [isVisible, setIsVisible] = useState(false);
  var [position, setPosition] = useState({ x: 0, y: 0 });
  var timeoutRef = useRef(null);
  var containerRef = useRef(null);

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
    clearTimeout(timeoutRef.current);
    // Capture rect synchronously — currentTarget is null inside setTimeout
    var rect = e.currentTarget.getBoundingClientRect();
    timeoutRef.current = setTimeout(function () {
      var viewportW = window.innerWidth;
      var viewportH = window.innerHeight;
      var cardW = 300;
      var cardH = 320;

      var x = rect.right + 8;
      var y = rect.top;

      // If tooltip would overflow right side, show on left
      if (x + cardW > viewportW - 16) {
        x = rect.left - cardW - 8;
      }
      // If tooltip would overflow bottom, push up
      if (y + cardH > viewportH - 16) {
        y = viewportH - cardH - 16;
      }
      // If tooltip would overflow top
      if (y < 16) {
        y = 16;
      }

      setPosition({ x: x, y: y });
      setIsVisible(true);
    }, 300);
  }

  function handleMouseLeave() {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(function () {
      setIsVisible(false);
    }, 150);
  }

  function handleCardMouseEnter() {
    clearTimeout(timeoutRef.current);
  }

  function handleCardMouseLeave() {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(function () {
      setIsVisible(false);
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

      {isVisible && typeof document !== "undefined" && createPortal(
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
              {/* Client Name + Status */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm text-foreground truncate flex-1 mr-2">
                  {booking.client
                    ? booking.client.firstName + " " + booking.client.lastName
                    : booking.title || "Walk-in"}
                </h3>
                <span
                  className={
                    "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium " +
                    status.bgColor +
                    " " +
                    status.textColor
                  }
                >
                  <span
                    className={
                      "w-1.5 h-1.5 rounded-full " + status.dotColor
                    }
                  />
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
                      {duration} minutes
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
                            ${parseFloat(service.price || 0).toFixed(2)}
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
                          ${totalPrice.toFixed(2)}
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
