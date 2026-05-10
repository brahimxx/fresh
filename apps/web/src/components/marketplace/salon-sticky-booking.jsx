"use client";

import Link from "next/link";
import { useState } from "react";
import { Clock, MapPin, Star, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { motion, AnimatePresence } from "framer-motion";

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function SalonStickyBooking({ salon, isMobile = false }) {
  const [hoursOpen, setHoursOpen] = useState(false);

  const formatTime = (time) => {
    if (!time) return "Closed";
    const parts = time.split(":");
    let hour = parseInt(parts[0]);
    const min = parts[1];
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
    return `${hour}:${min} ${ampm}`;
  };

  const getStatus = (hours) => {
    if (salon?.is_closed_today) {
      return { isOpen: false, text: "Closed today", color: "text-red-500" };
    }
    if (!hours || hours.length === 0)
      return { isOpen: false, text: "Closed", color: "text-red-500" };

    const now = new Date();
    const dayOfWeek = now.getDay();
    const currentDay = hours.find((h) => h.day_of_week === dayOfWeek);

    if (!currentDay || currentDay.is_closed)
      return { isOpen: false, text: "Closed today", color: "text-red-500" };

    const nowTotal = now.getHours() * 60 + now.getMinutes();

    const parseTime = (t) => {
      if (!t) return 0;
      const parts = t.split(":");
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    };

    const openTotal = parseTime(currentDay.open_time);
    const closeTotal = parseTime(currentDay.close_time);

    if (nowTotal >= openTotal && nowTotal < closeTotal) {
      return {
        isOpen: true,
        text: "Open",
        color: "text-green-600 dark:text-green-500",
        until: formatTime(currentDay.close_time),
      };
    }
    return { isOpen: false, text: "Closed", color: "text-red-500" };
  };

  const status = getStatus(salon?.business_hours);

  // MOBILE VIEW
  if (isMobile) {
    return (
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-md border-t shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-50 animate-in slide-in-from-bottom-full">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-base truncate">{salon.name}</h4>
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className={status.color}>{status.text} </span>
              <span className="text-muted-foreground truncate hidden sm:inline">
                • {salon.address}
              </span>
            </div>
          </div>
          <Link href={`/book/${salon.id}`} className="shrink-0">
            <Button size="lg" className="rounded-full shadow-lg font-bold px-8 bg-primary text-primary-foreground hover:bg-primary/90">
              Book now
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // DESKTOP VIEW
  return (
    <Card className="sticky top-28 border border-border shadow-xl shadow-black/5 rounded-[2rem] overflow-hidden bg-card">
      <CardContent className="p-8 space-y-6">
        {/* Header section */}
        <div className="space-y-3">
          <h2 className="text-4xl font-black tracking-tight">{salon.name}</h2>
          
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold">{salon.rating?.toFixed(1) || "New"}</span>
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-5 h-5 ${
                    i < Math.round(salon.rating || 0)
                      ? "fill-yellow-400 text-yellow-400"
                      : "fill-muted text-muted"
                  }`}
                />
              ))}
            </div>
            <span className="text-lg font-bold text-primary ml-1">
              ({salon.review_count || 0})
            </span>
          </div>
        </div>

        {/* CTA Button */}
        <Link href={`/book/${salon.id}`} className="block">
          <Button
            className="w-full py-7 text-lg font-bold rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
            size="lg"
          >
            Book now
          </Button>
        </Link>

        <Separator className="my-6" />

        {/* Hours Toggle */}
        <div className="space-y-2">
          <button
            onClick={() => setHoursOpen(!hoursOpen)}
            className="flex items-center gap-3 w-full text-left group cursor-pointer"
          >
            <Clock className="w-5 h-5 shrink-0 text-foreground" />
            <div className="flex-1 flex items-center gap-1.5 text-base font-medium">
              <span className={status.color}>{status.text}</span>
              {status.isOpen && status.until && (
                <span className="text-foreground">until {status.until}</span>
              )}
            </div>
            {hoursOpen ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            )}
          </button>

          <AnimatePresence>
            {hoursOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-4 pl-8 space-y-3">
                  {salon.is_closed_today && salon.closure_reason && (
                    <div className="text-sm font-medium text-red-500 mb-2">
                      Note: {salon.closure_reason}
                    </div>
                  )}
                  {salon.business_hours?.map((hours, idx) => {
                    const today = new Date().getDay();
                    const isToday = hours.day_of_week === today;
                    return (
                      <div
                        key={idx}
                        className={`flex justify-between items-center text-sm ${
                          isToday ? "font-bold text-foreground" : "font-medium text-muted-foreground"
                        }`}
                      >
                        <span className="w-24">{DAYS[hours.day_of_week]}</span>
                        <span>
                          {isToday && salon.is_closed_today
                            ? "Closed"
                            : hours.is_closed
                            ? "Off"
                            : `${formatTime(hours.open_time)} - ${formatTime(hours.close_time)}`}
                        </span>
                      </div>
                    );
                  }) || (
                    <p className="text-sm text-muted-foreground">Hours not available</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Location Info */}
        <div className="flex items-start gap-3 pt-2">
          <MapPin className="w-5 h-5 shrink-0 text-foreground mt-0.5" />
          <div className="text-base">
            <span className="text-foreground">{salon.address}, {salon.city} {salon.state}</span>
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(`${salon.name} ${salon.address} ${salon.city}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary font-bold ml-1.5 hover:underline"
            >
              Get directions
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
