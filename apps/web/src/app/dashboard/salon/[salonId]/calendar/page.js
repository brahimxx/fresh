'use client';

import { useState, useCallback } from 'react';
import { use } from 'react';
import { CalendarView } from '@/components/calendar/calendar-view';
import { BookingFormDialog } from '@/components/bookings/booking-form';
import { BookingDetailSheet } from '@/components/bookings/booking-detail';

export default function CalendarPage({ params }) {
  var resolvedParams = use(params);
  var salonId = resolvedParams.salonId;
  
  var [newBookingOpen, setNewBookingOpen] = useState(false);
  var [selectedDate, setSelectedDate] = useState(null);
  var [selectedBooking, setSelectedBooking] = useState(null);
  var [detailOpen, setDetailOpen] = useState(false);
  
  var handleDateSelect = useCallback(function(date) {
    setSelectedDate(date);
    setNewBookingOpen(true);
  }, []);
  
  var handleEventClick = useCallback(function(booking) {
    setSelectedBooking(booking);
    setDetailOpen(true);
  }, []);
  
  var handleNewBooking = useCallback(function() {
    setSelectedDate(new Date());
    setNewBookingOpen(true);
  }, []);
  
  var handleReschedule = useCallback(function(booking) {
    setDetailOpen(false);
    // Could open a reschedule dialog here
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
        defaultDate={selectedDate}
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
