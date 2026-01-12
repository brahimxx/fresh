"use client";

import { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export function DateTimeSelection({
  salonId,
  selectedServices,
  selectedStaff,
  selectedDate,
  selectedTime,
  onDateSelect,
  onTimeSelect,
}) {
  var [timeSlots, setTimeSlots] = useState([]);
  var [loading, setLoading] = useState(false);
  var [loadingSlots, setLoadingSlots] = useState(false);
  var [currentMonth, setCurrentMonth] = useState(new Date());

  // Calculate total duration
  var totalDuration =
    selectedServices && Array.isArray(selectedServices)
      ? selectedServices.reduce(function (sum, s) {
        return sum + (s.duration || 30);
      }, 0)
      : 0;

  // Load slots when date is selected
  useEffect(
    function () {
      if (
        !selectedDate ||
        !selectedServices ||
        !Array.isArray(selectedServices) ||
        selectedServices.length === 0
      )
        return;

      async function loadSlots() {
        setLoadingSlots(true);
        try {
          var dateStr = selectedDate.toISOString().slice(0, 10);
          var serviceId =
            selectedServices && selectedServices[0]
              ? selectedServices[0].id
              : "";
          var staffId = selectedStaff?.id || "";

          var url =
            "/api/widget/" +
            salonId +
            "/availability?date=" +
            dateStr +
            "&serviceId=" +
            serviceId +
            (staffId ? "&staffId=" + staffId : "");

          var res = await fetch(url);
          if (res.ok) {
            var data = await res.json();
            setTimeSlots(data.data?.slots || []);
          }
        } catch (error) {
          console.error("Failed to load slots:", error);
        } finally {
          setLoadingSlots(false);
        }
      }
      loadSlots();
    },
    [salonId, selectedServices, selectedStaff, selectedDate]
  );

  // Calendar helpers
  var today = new Date();
  today.setHours(0, 0, 0, 0);

  var monthStart = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  );
  var monthEnd = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  );
  var startDay = monthStart.getDay();

  var days = [];

  // Empty cells for days before month starts
  for (var i = 0; i < startDay; i++) {
    days.push(null);
  }

  // Days in month
  for (var d = 1; d <= monthEnd.getDate(); d++) {
    days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d));
  }

  function formatDate(date) {
    return date.toISOString().slice(0, 10);
  }

  function isDateAvailable(date) {
    if (!date) return false;
    if (date < today) return false;
    // All future dates are potentially available - slots loaded on selection
    return true;
  }

  function isDateSelected(date) {
    if (!date || !selectedDate) return false;
    return formatDate(date) === formatDate(selectedDate);
  }

  function prevMonth() {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  }

  function nextMonth() {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  }

  function selectDate(date) {
    onDateSelect(date);
    onTimeSelect(null); // Reset time when date changes
  }

  // Group time slots by period
  function getHourFromSlot(slot) {
    var time = new Date(slot.startTime);
    return time.getHours();
  }

  var morningSlots = timeSlots.filter(function (s) {
    return getHourFromSlot(s) < 12;
  });
  var afternoonSlots = timeSlots.filter(function (s) {
    var hour = getHourFromSlot(s);
    return hour >= 12 && hour < 17;
  });
  var eveningSlots = timeSlots.filter(function (s) {
    return getHourFromSlot(s) >= 17;
  });

  function formatTime(slot) {
    var time = new Date(slot.startTime);
    return time.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function getSlotKey(slot) {
    return slot.startTime + "-" + slot.staffId;
  }

  function isSlotSelected(slot) {
    return selectedTime && getSlotKey(slot) === selectedTime;
  }

  var monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  var dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Date & Time</CardTitle>
        <p className="text-sm text-muted-foreground">
          Choose when you'd like your appointment
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Calendar */}
        <div>
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="font-semibold">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h3>
            <Button variant="ghost" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map(function (day) {
              return (
                <div
                  key={day}
                  className="text-center text-xs text-muted-foreground font-medium py-2"
                >
                  {day}
                </div>
              );
            })}
          </div>

          {/* Calendar Grid */}
          {loading ? (
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 35 }).map(function (_, i) {
                return <Skeleton key={i} className="h-10 w-full" />;
              })}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {days.map(function (date, idx) {
                if (!date) {
                  return <div key={"empty-" + idx} className="h-10" />;
                }

                var available = isDateAvailable(date);
                var selected = isDateSelected(date);
                var isPast = date < today;

                return (
                  <button
                    key={formatDate(date)}
                    disabled={!available || isPast}
                    onClick={function () {
                      selectDate(date);
                    }}
                    className={
                      "h-10 rounded-lg text-sm font-medium transition-all " +
                      (selected
                        ? "bg-primary text-white"
                        : available
                          ? "bg-muted hover:bg-muted/80 text-foreground"
                          : "text-muted-foreground/30 cursor-not-allowed")
                    }
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Time Slots */}
        {selectedDate && (
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">
                Available Times for{" "}
                {selectedDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
              </h4>
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" />
                {totalDuration} min
              </Badge>
            </div>

            {loadingSlots ? (
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 6].map(function (i) {
                  return <Skeleton key={i} className="h-9 w-20" />;
                })}
              </div>
            ) : timeSlots.length > 0 ? (
              <div className="space-y-4">
                {morningSlots.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">
                      Morning
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {morningSlots.map(function (slot) {
                        var key = getSlotKey(slot);
                        return (
                          <Button
                            key={key}
                            variant={
                              isSlotSelected(slot) ? "default" : "outline"
                            }
                            size="sm"
                            onClick={function () {
                              onTimeSelect(key);
                            }}
                          >
                            {formatTime(slot)}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {afternoonSlots.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">
                      Afternoon
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {afternoonSlots.map(function (slot) {
                        var key = getSlotKey(slot);
                        return (
                          <Button
                            key={key}
                            variant={
                              isSlotSelected(slot) ? "default" : "outline"
                            }
                            size="sm"
                            onClick={function () {
                              onTimeSelect(key);
                            }}
                          >
                            {formatTime(slot)}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {eveningSlots.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">
                      Evening
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {eveningSlots.map(function (slot) {
                        var key = getSlotKey(slot);
                        return (
                          <Button
                            key={key}
                            variant={
                              isSlotSelected(slot) ? "default" : "outline"
                            }
                            size="sm"
                            onClick={function () {
                              onTimeSelect(key);
                            }}
                          >
                            {formatTime(slot)}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                No available times for this date
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
