"use client";

import {
  CheckCircle,
  Calendar,
  Clock,
  User,
  MapPin,
  Mail,
  Printer,
  CalendarPlus,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export function BookingConfirmation({
  booking,
  salon,
  selectedServices,
  selectedDate,
  selectedTime,
  user,
}) {
  function formatDate(date) {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  function formatTime(time) {
    var parts = time.split(":");
    var hour = parseInt(parts[0]);
    var min = parts[1];
    var ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
    return hour + ":" + min + " " + ampm;
  }

  var totalPrice =
    selectedServices && Array.isArray(selectedServices)
      ? selectedServices.reduce(function (sum, s) {
        var price = parseFloat(s.price);
        return sum + (isNaN(price) ? 0 : price);
      }, 0)
      : 0;

  var totalDuration =
    selectedServices && Array.isArray(selectedServices)
      ? selectedServices.reduce(function (sum, s) {
        var duration = parseInt(s.duration) || 30;
        return sum + duration;
      }, 0)
      : 0;

  function addToCalendar(type) {
    var title = encodeURIComponent("Appointment at " + salon.name);

    // Parse the ISO timestamp from selectedTime (format: "ISO-timestamp-staffId")
    var startTime = selectedTime.split("-")[0];
    var startDate = new Date(startTime);
    var endDate = new Date(startDate.getTime() + totalDuration * 60000);

    var details = encodeURIComponent(
      "Services: " +
      selectedServices
        .map(function (s) {
          return s.name + (s.staffName ? " with " + s.staffName : "");
        })
        .join(", ")
    );

    var location = encodeURIComponent(salon.address || "");

    if (type === "google") {
      var start = startDate.toISOString().replace(/-|:|\.\d\d\d/g, "");
      var end = endDate.toISOString().replace(/-|:|\.\d\d\d/g, "");
      var url =
        "https://calendar.google.com/calendar/render?action=TEMPLATE" +
        "&text=" +
        title +
        "&dates=" +
        start +
        "/" +
        end +
        "&details=" +
        details +
        "&location=" +
        location;
      window.open(url, "_blank");
    }
  }

  function printConfirmation() {
    window.print();
  }

  return (
    <Card className="text-center">
      <CardHeader className="pb-4">
        <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="h-8 w-8 text-green-500" />
        </div>
        <CardTitle className="text-2xl">Booking Confirmed!</CardTitle>
        <p className="text-muted-foreground">
          Your appointment has been successfully booked
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Booking Reference */}
        {booking?.reference && (
          <div className="bg-muted rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">Booking Reference</p>
            <p className="text-2xl font-mono font-bold">{booking.reference}</p>
          </div>
        )}

        <Separator />

        {/* Appointment Details */}
        <div className="text-left space-y-4">
          <h3 className="font-semibold">Appointment Details</h3>

          <div className="space-y-3">
            {/* Date & Time */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{formatDate(selectedDate)}</p>
                <p className="text-sm text-muted-foreground">
                  {formatTime(selectedTime)} - {totalDuration} minutes
                </p>
              </div>
            </div>

            {/* Location */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{salon.name}</p>
                {salon.address && (
                  <p className="text-sm text-muted-foreground">
                    {salon.address}
                  </p>
                )}
              </div>
            </div>

            {/* Staff - show if there's one primary staff */}
            {selectedServices && selectedServices.length === 1 && selectedServices[0].staffName && (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{selectedServices[0].staffName}</p>
                  <p className="text-sm text-muted-foreground">
                    Your stylist
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Services */}
        <div className="text-left">
          <h3 className="font-semibold mb-3">Services</h3>
          <div className="space-y-2">
            {selectedServices &&
              Array.isArray(selectedServices) &&
              selectedServices.map(function (service) {
                return (
                  <div
                    key={service.id}
                    className="flex justify-between items-center"
                  >
                    <div>
                      <p className="font-medium">{service.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {service.duration} min
                        {service.staffName && " • with " + service.staffName}
                      </p>
                    </div>
                    <p className="font-medium">
                      ${(parseFloat(service.price) || 0).toFixed(2)}
                    </p>
                  </div>
                );
              })}
          </div>
          <Separator className="my-3" />
          <div className="flex justify-between items-center font-semibold">
            <span>Total</span>
            <span>${totalPrice.toFixed(2)}</span>
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={function () {
              addToCalendar("google");
            }}
          >
            <CalendarPlus className="h-4 w-4" />
            Add to Google Calendar
          </Button>

          <Button
            variant="ghost"
            className="w-full gap-2"
            onClick={printConfirmation}
          >
            <Printer className="h-4 w-4" />
            Print Confirmation
          </Button>
        </div>

        {/* Cancellation Policy */}
        <div className="bg-yellow-500/10 rounded-lg p-4 text-left border border-yellow-500/20">
          <h4 className="font-medium text-yellow-500 text-sm">
            Cancellation Policy
          </h4>
          <p className="text-sm text-yellow-200/80 mt-1">
            Free cancellation up to 24 hours before your appointment. Late
            cancellations may be subject to a fee.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
