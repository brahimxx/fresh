"use client";

import { format, isValid } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Clock, DollarSign, User, Phone, Mail, FileText } from "lucide-react";

export function EventTooltip({ booking, children }) {
  if (!booking) return children;

  var rawStart = booking.start || booking.startDatetime || "";
  var rawEnd = booking.end || booking.endDatetime || "";
  var startTime = new Date(rawStart.replace(" ", "T"));
  var endTime = new Date(rawEnd.replace(" ", "T"));
  var hasValidDates = isValid(startTime) && isValid(endTime);
  var duration = hasValidDates ? Math.round((endTime - startTime) / (1000 * 60)) : null;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side="right" className="w-72 p-4" align="start">
          <div className="space-y-3">
            {/* Client Info */}
            <div>
              <div className="font-semibold text-base mb-1">
                {booking.client?.firstName} {booking.client?.lastName}
              </div>
              {booking.client?.phone && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  <span>{booking.client.phone}</span>
                </div>
              )}
              {booking.client?.email && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  <span className="truncate">{booking.client.email}</span>
                </div>
              )}
            </div>

            {/* Services */}
            {booking.services && booking.services.length > 0 && (
              <div className="border-t pt-2">
                <div className="text-xs font-medium mb-1.5 text-muted-foreground">
                  Services
                </div>
                <div className="space-y-1">
                  {booking.services.map(function (service, index) {
                    return (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{service.name}</span>
                        <span className="text-muted-foreground">
                          ${service.price}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Time & Duration */}
            <div className="border-t pt-2 space-y-1.5">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span>
                  {hasValidDates
                    ? `${format(startTime, "h:mm a")} – ${format(endTime, "h:mm a")}`
                    : "—"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="ml-5">{duration != null ? `${duration} minutes` : ""}</span>
              </div>
            </div>

            {/* Staff */}
            {booking.staff && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span>
                  {booking.staff.firstName} {booking.staff.lastName}
                </span>
              </div>
            )}

            {/* Notes */}
            {booking.notes && (
              <div className="border-t pt-2">
                <div className="flex items-start gap-2 text-sm">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                  <span className="text-muted-foreground flex-1">
                    {booking.notes}
                  </span>
                </div>
              </div>
            )}

            {/* Status Badge */}
            <div className="border-t pt-2">
              <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted">
                <span
                  className={
                    booking.status === "confirmed"
                      ? "text-green-600"
                      : booking.status === "pending"
                        ? "text-yellow-600"
                        : booking.status === "completed"
                          ? "text-blue-600"
                          : booking.status === "cancelled"
                            ? "text-red-600"
                            : ""
                  }
                >
                  {booking.status.charAt(0).toUpperCase() +
                    booking.status.slice(1)}
                </span>
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
