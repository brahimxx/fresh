"use client";

import { format } from "date-fns";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  Scissors,
  Check,
  XCircle,
  AlertCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

import { useClientBookings } from "@/hooks/use-clients";

var STATUS_CONFIG = {
  pending: {
    label: "Pending",
    className: "bg-yellow-100 text-yellow-800",
    icon: Clock,
  },
  confirmed: {
    label: "Confirmed",
    className: "bg-green-100 text-green-800",
    icon: Check,
  },
  completed: {
    label: "Completed",
    className: "bg-blue-100 text-blue-800",
    icon: Check,
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-gray-100 text-gray-800",
    icon: XCircle,
  },
  no_show: {
    label: "No Show",
    className: "bg-red-100 text-red-800",
    icon: AlertCircle,
  },
};

export function ClientBookingHistory({ clientId, salonId }) {
  var router = useRouter();
  var { data: bookings, isLoading } = useClientBookings(clientId, salonId);

  function handleViewBooking(bookingId) {
    router.push(
      "/dashboard/salon/" + salonId + "/bookings?selected=" + bookingId,
    );
  }

  // MySQL returns datetimes as "YYYY-MM-DD HH:MM:SS" (space separator).
  // new Date() requires ISO 8601 "YYYY-MM-DDTHH:MM:SS" — replace the space.
  function parseBookingDate(value) {
    if (!value) return new Date(NaN);
    return new Date(String(value).replace(" ", "T"));
  }

  function safeFormat(date, fmt, fallback) {
    if (fallback === undefined) fallback = "—";
    if (!date || isNaN(date.getTime())) return fallback;
    return format(date, fmt);
  }

  // Separate upcoming and past bookings
  var now = new Date();
  var upcomingBookings = [];
  var pastBookings = [];

  if (bookings) {
    bookings.forEach(function (booking) {
      var bookingDate = parseBookingDate(
        booking.start_datetime ||
          booking.startDatetime ||
          booking.startDateTime,
      );
      if (
        bookingDate > now &&
        (booking.status === "pending" || booking.status === "confirmed")
      ) {
        upcomingBookings.push(booking);
      } else {
        pastBookings.push(booking);
      }
    });
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg">Booking History</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map(function (_, i) {
              return (
                <div key={i} className="flex gap-4 p-4 border rounded-lg">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              );
            })}
          </div>
        ) : bookings && bookings.length > 0 ? (
          <div className="space-y-6">
            {/* Upcoming Bookings */}
            {upcomingBookings.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  Upcoming
                </h3>
                <div className="space-y-3">
                  {upcomingBookings.map(function (booking) {
                    var startTime = parseBookingDate(
                      booking.start_datetime ||
                        booking.startDatetime ||
                        booking.startDateTime,
                    );
                    var statusConfig =
                      STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
                    var StatusIcon = statusConfig.icon;
                    var serviceName =
                      booking.service_name ||
                      booking.serviceName ||
                      (booking.services &&
                        booking.services[0] &&
                        booking.services[0].name) ||
                      "Service";

                    return (
                      <div
                        key={booking.id}
                        className="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                        onClick={function () {
                          handleViewBooking(booking.id);
                        }}
                      >
                        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Scissors className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{serviceName}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>{safeFormat(startTime, "EEE, MMM d")}</span>
                            <span>•</span>
                            <Clock className="h-3 w-3" />
                            <span>{safeFormat(startTime, "HH:mm")}</span>
                          </div>
                        </div>
                        <Badge className={statusConfig.className}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Past Bookings */}
            {pastBookings.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  Past
                </h3>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3 pr-4">
                    {pastBookings.map(function (booking) {
                      var startTime = parseBookingDate(
                        booking.start_datetime ||
                          booking.startDatetime ||
                          booking.startDateTime,
                      );
                      var statusConfig =
                        STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
                      var StatusIcon = statusConfig.icon;
                      var serviceName =
                        booking.service_name ||
                        booking.serviceName ||
                        (booking.services &&
                          booking.services[0] &&
                          booking.services[0].name) ||
                        "Service";

                      return (
                        <div
                          key={booking.id}
                          className="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                          onClick={function () {
                            handleViewBooking(booking.id);
                          }}
                        >
                          <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                            <Scissors className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {serviceName}
                            </p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>
                                {safeFormat(startTime, "MMM d, yyyy")}
                              </span>
                              <span>•</span>
                              <span>{safeFormat(startTime, "HH:mm")}</span>
                              {(booking.total_price || booking.totalPrice) && (
                                <>
                                  <span>•</span>
                                  <span>
                                    EUR{" "}
                                    {Number(
                                      booking.total_price || booking.totalPrice,
                                    ).toFixed(2)}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <Badge className={statusConfig.className}>
                            {statusConfig.label}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No bookings yet</p>
            <Button
              variant="link"
              className="mt-2"
              onClick={function () {
                router.push("/dashboard/salon/" + salonId + "/calendar");
              }}
            >
              Create a booking
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
