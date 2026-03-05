"use client";

import { useState, useCallback, useEffect } from "react";
import { use } from "react";
import { CalendarView } from "@/components/calendar/calendar-view";
import { BookingFormDialog } from "@/components/bookings/booking-form";
import { BookingDetailSheet } from "@/components/bookings/booking-detail";

export default function CalendarPage({ params }) {
  var resolvedParams = use(params);
  var salonId = resolvedParams.salonId;

  var [newBookingOpen, setNewBookingOpen] = useState(false);
  var [selectedDate, setSelectedDate] = useState(null);
  var [pendingDate, setPendingDate] = useState(null);
  var [selectedBooking, setSelectedBooking] = useState(null);
  var [detailOpen, setDetailOpen] = useState(false);

  // When pendingDate is set, update selectedDate and open dialog
  useEffect(() => {
    if (pendingDate) {
      setSelectedDate(pendingDate);
      setNewBookingOpen(true);
      setPendingDate(null);
    }
  }, [pendingDate]);

  var handleDateSelect = useCallback(function (date) {
    setPendingDate(date);
  }, []);

  var handleEventClick = useCallback(function (booking) {
    setSelectedBooking(booking);
    setDetailOpen(true);
  }, []);

  var handleNewBooking = useCallback(function () {
    setSelectedDate(new Date());
    setNewBookingOpen(true);
  }, []);

  var handleReschedule = useCallback(function (booking) {
    setDetailOpen(false);
    setSelectedBooking(booking);
    setNewBookingOpen(true);
  }, []);

  return (
    <div className="h-full -m-6">
      <CalendarView
        onDateClick={handleDateSelect}
        onEventClick={handleEventClick}
        onNewBooking={handleNewBooking}
      />

      <BookingFormDialog
        salonId={salonId}
        open={newBookingOpen}
        onOpenChange={setNewBookingOpen}
        initialDate={selectedDate}
      />

      <BookingDetailSheet
        booking={selectedBooking}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onReschedule={handleReschedule}
      />
    </div>
  );
}
