"use client";

import { useState, useCallback, useEffect } from "react";
import { use } from "react";
import { CalendarView } from "@/components/calendar/calendar-view";
import { BookingFormDialog } from "@/components/bookings/booking-form";
import { BookingDetailSheet } from "@/components/bookings/booking-detail";
import { BlockTimeDialog } from "@/components/bookings/block-time-dialog";

export default function CalendarPage({ params }) {
  var resolvedParams = use(params);
  var salonId = resolvedParams.salonId;

  var [newBookingOpen, setNewBookingOpen] = useState(false);
  var [blockTimeOpen, setBlockTimeOpen] = useState(false);
  var [selectedDate, setSelectedDate] = useState(null);
  var [selectedStaffId, setSelectedStaffId] = useState(null);
  var [editingTimeOff, setEditingTimeOff] = useState(null); // existing time-off for edit mode
  var [pendingSlot, setPendingSlot] = useState(null);
  var [selectedBooking, setSelectedBooking] = useState(null);
  var [detailOpen, setDetailOpen] = useState(false);

  // When pendingSlot is set, open the appropriate dialog
  useEffect(() => {
    if (!pendingSlot) return;
    setSelectedDate(pendingSlot.date);
    setSelectedStaffId(pendingSlot.staffId || null);
    if (pendingSlot.type === "block") {
      setEditingTimeOff(null); // new block, not edit
      setBlockTimeOpen(true);
    } else {
      setNewBookingOpen(true);
    }
    setPendingSlot(null);
  }, [pendingSlot]);

  var handleDateSelect = useCallback(function (date) {
    setPendingSlot({ date, type: "appointment" });
  }, []);

  var handleEventClick = useCallback(function (booking) {
    if (booking.type === "time_off") return;
    setSelectedBooking(booking);
    setDetailOpen(true);
  }, []);

  var handleNewBooking = useCallback(function (slot) {
    setPendingSlot(slot || { date: new Date(), type: "appointment" });
  }, []);

  // Clicking an existing time-off block → open dialog in edit mode
  var handleTimeOffClick = useCallback(function (timeOff) {
    setEditingTimeOff(timeOff);
    setBlockTimeOpen(true);
  }, []);

  var handleReschedule = useCallback(function (booking) {
    setDetailOpen(false);
    setSelectedBooking(booking);
    setNewBookingOpen(true);
  }, []);

  // When block dialog closes, clear the editing state
  function handleBlockTimeOpenChange(open) {
    setBlockTimeOpen(open);
    if (!open) setEditingTimeOff(null);
  }

  return (
    <div className="-mx-4 sm:-mx-8 -my-8 h-[calc(100vh-var(--header-height,64px))]">
      <CalendarView
        onDateClick={handleDateSelect}
        onEventClick={handleEventClick}
        onNewBooking={handleNewBooking}
        onTimeOffClick={handleTimeOffClick}
      />

      <BookingFormDialog
        salonId={salonId}
        open={newBookingOpen}
        onOpenChange={setNewBookingOpen}
        initialDate={selectedDate}
        initialStaffId={selectedStaffId}
      />

      <BlockTimeDialog
        open={blockTimeOpen}
        onOpenChange={handleBlockTimeOpenChange}
        initialDate={selectedDate}
        initialStaffId={selectedStaffId}
        existingTimeOff={editingTimeOff}
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
