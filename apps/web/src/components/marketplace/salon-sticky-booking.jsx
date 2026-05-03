import Link from "next/link";
import { Clock, MapPin, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

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
      return { label: "Closed Today", color: "bg-red-500", isOpen: false };
    }
    if (!hours || hours.length === 0)
      return { label: "Closed", color: "bg-red-500", isOpen: false };
    
    const now = new Date();
    const dayOfWeek = now.getDay();
    const currentDay = hours.find((h) => h.day_of_week === dayOfWeek);

    if (!currentDay || currentDay.is_closed)
      return { label: "Closed", color: "bg-red-500", isOpen: false };

    const nowTotal = now.getHours() * 60 + now.getMinutes();

    const parseTime = (t) => {
      if (!t) return 0;
      const parts = t.split(":");
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    };

    const openTotal = parseTime(currentDay.open_time);
    const closeTotal = parseTime(currentDay.close_time);

    if (nowTotal >= openTotal && nowTotal < closeTotal) {
      return { label: "Open", color: "bg-green-500", isOpen: true };
    }
    return { label: "Closed", color: "bg-red-500", isOpen: false };
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
              <span className={status.isOpen ? "text-green-500" : "text-red-500"}>
                {status.label}
              </span>
              <span className="text-muted-foreground truncate hidden sm:inline">
                • {salon.address}
              </span>
            </div>
          </div>
          <Link href={`/book/${salon.id}`} className="shrink-0">
            <Button size="lg" className="rounded-full shadow-lg font-bold px-8">
              Book Now
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // DESKTOP VIEW
  return (
    <Card className="sticky top-28 border-none !p-0 shadow-2xl rounded-[2.5rem] overflow-hidden group border-border">
      <div className="bg-primary p-8 text-primary-foreground relative overflow-hidden ">
        <div className="relative z-10 space-y-2">
          <h3 className="text-2xl font-black">Experience Beauty</h3>
          <p className="opacity-90 font-medium">Ready for your transformation?</p>
        </div>
        {/* Decorative Elements */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-black/10 rounded-full blur-2xl" />
      </div>
      <CardContent className="p-8 space-y-8 bg-card">
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm font-bold opacity-70">
            <span className={status.isOpen ? "text-green-500" : "text-red-500"}>
              {status.isOpen ? "Available Now" : "Currently Closed"}
            </span>
            <span className="text-green-500 opacity-100">Fast Booking</span>
          </div>
          <Link href={`/book/${salon.id}`} className="block">
            <Button
              className="w-full py-8 text-xl font-black rounded-2xl shadow-xl shadow-primary/30 transition-all hover:scale-[1.02] active:scale-[0.98] gap-2"
              size="lg"
            >
              <Calendar className="w-6 h-6" />
              Book Appointment
            </Button>
          </Link>
        </div>

        <Separator />

        <div className="space-y-6">
          <h4 className="font-bold text-sm uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Working Hours
          </h4>
          
          {salon.is_closed_today && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">
              <span className="text-base leading-none mt-0.5">🚫</span>
              <div className="text-xs font-semibold">
                <p>Closed today</p>
                {salon.closure_reason && (
                  <p className="font-normal opacity-80 mt-0.5">{salon.closure_reason}</p>
                )}
              </div>
            </div>
          )}

          <div className="space-y-3">
            {salon.business_hours?.map((hours, idx) => {
              const today = new Date().getDay();
              const isToday = hours.day_of_week === today;
              return (
                <div
                  key={idx}
                  className={`flex justify-between items-center px-4 py-2.5 rounded-xl transition-all ${
                    isToday
                      ? "bg-primary/5 border border-primary/20 scale-105 shadow-sm"
                      : "hover:bg-muted/30"
                  }`}
                >
                  <span
                    className={`text-sm font-bold ${
                      isToday ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {DAYS[hours.day_of_week]}
                  </span>
                  <span
                    className={`text-sm font-black ${
                      isToday && salon.is_closed_today
                        ? "text-red-500"
                        : hours.is_closed
                        ? "text-muted-foreground/50 line-through"
                        : isToday
                        ? "text-primary"
                        : "text-foreground/80"
                    }`}
                  >
                    {isToday && salon.is_closed_today
                      ? "Closed (Special)"
                      : hours.is_closed
                      ? "Off"
                      : `${formatTime(hours.open_time)} - ${formatTime(
                          hours.close_time
                        )}`}
                  </span>
                </div>
              );
            }) || (
              <p className="text-muted-foreground">Hours not available</p>
            )}
          </div>
        </div>

        <div className="space-y-6 pt-4">
          <h4 className="font-bold text-sm uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Our Location
          </h4>
          <div className="bg-muted/40 p-6 rounded-3xl border border-transparent hover:border-primary/20 transition-all space-y-4">
            <div className="space-y-1">
              <p className="font-black text-lg leading-tight">{salon.address}</p>
              <p className="font-bold text-muted-foreground">
                {salon.city}, {salon.state} {salon.postal_code}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="flex-1 rounded-xl bg-background border-none shadow-sm hover:shadow-md"
              >
                Get Directions
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
