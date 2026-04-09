"use client";

import { format, isValid } from "date-fns";
import {
  X,
  Calendar,
  Clock,
  User,
  Scissors,
  UserCog,
  MessageSquare,
  Check,
  XCircle,
  AlertCircle,
  RotateCcw,
  CreditCard,
  Banknote,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";
import { useSalon } from "@/providers/salon-provider";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import {
  useConfirmBooking,
  useCancelBooking,
  useNoShowBooking,
  useDeleteBooking,
  useCompleteBooking,
} from "@/hooks/use-bookings";
import { formatDuration } from "@/lib/format";

var STATUS_CONFIG = {
  pending: {
    label: "Pending",
    color: "bg-amber-50/50 text-amber-600 border-amber-200",
    icon: Clock,
  },
  confirmed: {
    label: "Confirmed",
    color: "bg-slate-50/50 text-slate-700 border-slate-200",
    icon: Check,
  },
  completed: {
    label: "Completed",
    color: "bg-green-50/50 text-green-600 border-green-200",
    icon: Check,
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-red-50/50 text-red-600 border-red-200",
    icon: XCircle,
  },
  no_show: {
    label: "No Show",
    color: "bg-orange-50/50 text-orange-600 border-orange-200",
    icon: AlertCircle,
  },
};

export function BookingDetailSheet({
  booking,
  open,
  onOpenChange,
  onReschedule,
}) {
  var { salon } = useSalon();
  var confirmBooking = useConfirmBooking();
  var cancelBooking = useCancelBooking();
  var noShowBooking = useNoShowBooking();
  var deleteBooking = useDeleteBooking();
  var completeBooking = useCompleteBooking();

  if (!booking) return null;

  var statusConfig = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
  var StatusIcon = statusConfig.icon;

  var startTime = new Date(
    (booking.start_datetime || booking.startDateTime || "").replace(" ", "T"),
  );
  var endTime = new Date(
    (booking.end_datetime || booking.endDateTime || "").replace(" ", "T"),
  );

  // Check for invalid dates
  var hasValidDates = isValid(startTime) && isValid(endTime);

  function handleConfirm() {
    confirmBooking.mutate(booking.id, {
      onSuccess: function () {
        onOpenChange(false);
      },
    });
  }

  function handleComplete() {
    completeBooking.mutate(booking.id, {
      onSuccess: function () {
        onOpenChange(false);
      },
    });
  }

  function handleCancel() {
    cancelBooking.mutate(booking.id, {
      onSuccess: function () {
        onOpenChange(false);
      },
    });
  }

  function handleNoShow() {
    noShowBooking.mutate(booking.id, {
      onSuccess: function () {
        onOpenChange(false);
      },
    });
  }

  function handleDelete() {
    deleteBooking.mutate(booking.id, {
      onSuccess: function () {
        onOpenChange(false);
      },
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
        <SheetHeader className="space-y-3 px-6 pt-6 pb-6 border-b">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <SheetTitle className="text-2xl">Booking Details</SheetTitle>
              <SheetDescription className="text-base">
                #{booking.id}
              </SheetDescription>
            </div>
            <Badge
              variant="outline"
              className={`${statusConfig.color} px-3 py-1 flex items-center w-fit text-xs font-medium`}
            >
              {booking.status === 'pending' ? (
                <span className="relative flex h-2 w-2 mr-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
              ) : (
                <StatusIcon className="h-3.5 w-3.5 mr-1" />
              )}
              {statusConfig.label}
            </Badge>
          </div>
        </SheetHeader>

        <div className="px-6 py-6 space-y-8">
          {/* Client Info */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Client Information
            </h3>
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-base flex items-center gap-2">
                  <span className="truncate">
                    {booking.client
                      ? `${booking.client.firstName || ""} ${booking.client.lastName || ""}`.trim()
                      : booking.client_name || booking.clientName || "Walk-in"}
                  </span>
                  {booking.clientIsActive === false && (
                    <Badge variant="destructive" className="h-4 min-h-4 px-1.5 py-0 text-[9px] font-bold uppercase shrink-0 leading-none">
                      Restricted
                    </Badge>
                  )}
                </div>
                {(booking.client?.email ||
                  booking.client_email ||
                  booking.clientEmail) && (
                  <p className="text-sm text-muted-foreground truncate">
                    {booking.client?.email ||
                      booking.client_email ||
                      booking.clientEmail}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Date & Time */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Date & Time
            </h3>
            {hasValidDates ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Calendar className="h-5 w-5 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="font-medium text-sm truncate">
                      {format(startTime, "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Clock className="h-5 w-5 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Time</p>
                    <p className="font-medium text-sm truncate">
                      {format(startTime, "HH:mm")} - {format(endTime, "HH:mm")}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Date not available
                </span>
              </div>
            )}
          </div>

          {/* Service Info */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {booking.services && booking.services.length > 1
                ? "Services"
                : "Service"}
            </h3>
            <div className="space-y-2">
              {booking.services && booking.services.length > 0 ? (
                booking.services.map((service, index) => (
                  <div
                    key={service.id || index}
                    className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                  >
                    <Scissors className="h-5 w-5 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {service.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDuration(service.duration)}
                      </p>
                    </div>
                    <p className="font-semibold text-sm shrink-0">
                      {formatCurrency(Number(service.price), salon?.currency)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Scissors className="h-5 w-5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {booking.service_name || booking.serviceName || "Service"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDuration(booking.duration || 30)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Staff */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Staff Member
            </h3>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <UserCog className="h-5 w-5 text-primary shrink-0" />
              <span className="font-medium text-sm">
                {booking.staff
                  ? `${booking.staff.firstName || ""} ${booking.staff.lastName || ""}`.trim()
                  : booking.staff_name || booking.staffName || "Not assigned"}
              </span>
            </div>
          </div>

          {/* Notes */}
          {booking.notes && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Notes
              </h3>
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <MessageSquare className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <p className="text-sm leading-relaxed">{booking.notes}</p>
              </div>
            </div>
          )}

          {/* Price */}
          {(booking.total_price || booking.totalPrice) && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Payment
              </h3>
              <div className="flex items-center justify-between p-4 bg-primary/5 border-2 border-primary/10 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Total Amount
                  </p>
                  <span className="text-2xl font-bold text-primary">
                    {formatCurrency(Number(booking.total_price || booking.totalPrice), salon?.currency)}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant="outline" className="text-xs px-3 py-1">
                    {booking.payment_status || booking.paymentStatus || booking.payment?.status || "Unpaid"}
                  </Badge>
                  {(booking.payment_method || booking.paymentMethod || booking.payment?.method) && (
                    <div className="flex items-center text-xs text-muted-foreground">
                      {(booking.payment_method === 'cash' || booking.paymentMethod === 'cash' || booking.payment?.method === 'cash') ? (
                        <Banknote className="w-3 h-3 mr-1" />
                      ) : (
                        <CreditCard className="w-3 h-3 mr-1" />
                      )}
                      <span className="capitalize">{
                        (booking.payment_method === 'cash' || booking.paymentMethod === 'cash' || booking.payment?.method === 'cash')
                          ? 'Pay at Salon'
                          : (booking.payment_method || booking.paymentMethod || booking.payment?.method)
                      }</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions - Fixed at bottom */}
        <div className="sticky bottom-0 bg-background px-6 pt-6 pb-6 border-t space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Actions
          </h3>
          <div className="flex flex-col gap-2">
            {booking.status === "pending" && (
              <Button
                className="w-full"
                onClick={handleConfirm}
                disabled={confirmBooking.isPending}
                size="lg"
              >
                <Check className="h-4 w-4 mr-2" />
                Confirm Booking
              </Button>
            )}

            <div className="grid grid-cols-2 gap-2">
              {(booking.status === "pending" ||
                booking.status === "confirmed") && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={function () {
                    if (onReschedule) onReschedule(booking);
                  }}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reschedule
                </Button>
              )}

              {booking.status === "confirmed" && (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleComplete}
                  disabled={completeBooking.isPending}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Complete (Cash)
                </Button>
              )}

              {booking.status === "confirmed" && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                    >
                      <AlertCircle className="h-4 w-4 mr-2" />
                      No Show
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Mark as No Show?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will mark the client as a no-show for this
                        appointment.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleNoShow}>
                        Confirm No Show
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              {(booking.status === "pending" ||
                booking.status === "confirmed") && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full text-destructive hover:bg-destructive/10"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel Booking?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will mark the booking as cancelled. The client will
                        be notified.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep Booking</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleCancel}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Cancel Booking
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>

            {/* Delete button - always available */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full" size="lg">
                  <XCircle className="h-4 w-4 mr-2" />
                  Delete Permanently
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Delete Booking Permanently?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. The booking will be
                    permanently removed from the database.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep Booking</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete Permanently
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
