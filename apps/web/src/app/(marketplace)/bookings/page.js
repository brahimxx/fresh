"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
    Calendar,
    Clock,
    MapPin,
    ChevronRight,
    MoreVertical,
    XCircle,
    CheckCircle2,
    AlertCircle,
    Loader2,
    CalendarDays,
    CalendarPlus,
    Navigation,
    Settings,
    Store,
    User,
    Scissors,
    CreditCard,
    FileText,
    Hash,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { DataError } from "@/components/ui/data-error";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/providers/auth-provider";
import { useMyBookings, useCancelBooking } from "@/hooks/use-bookings";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function formatDuration(minutes) {
    if (!minutes) return "";
    if (minutes < 60) return minutes + " min";
    var h = Math.floor(minutes / 60);
    var m = minutes % 60;
    if (m === 0) return h + " hour" + (h > 1 ? "s" : "");
    return h + " hr " + m + " min";
}

function formatPrice(price) {
    if (price == null || isNaN(price)) return "";
    return "DZD " + Number(price).toLocaleString();
}

function BookingsContent() {
    const { user, isAuthenticated, loading: authLoading } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("upcoming");
    const [selectedBookingId, setSelectedBookingId] = useState(null);

    const { data: bookings = [], isLoading, error, refetch } = useMyBookings(activeTab, {
        enabled: isAuthenticated,
    });

    const cancelMutation = useCancelBooking();

    // Auto-select first booking when bookings load
    useEffect(function () {
        if (bookings.length > 0 && !selectedBookingId) {
            setSelectedBookingId(bookings[0].id);
        }
    }, [bookings]);

    // Reset selection when tab changes
    useEffect(function () {
        setSelectedBookingId(null);
    }, [activeTab]);

    // Auto-select first when selection resets and bookings exist
    useEffect(function () {
        if (bookings.length > 0 && selectedBookingId === null) {
            setSelectedBookingId(bookings[0].id);
        }
    }, [bookings, selectedBookingId]);

    const handleCancelClick = async (id) => {
        if (window.confirm("Are you sure you want to cancel this booking? This action cannot be undone.")) {
            await cancelMutation.mutateAsync(id);
        }
    };

    // Redirect if not authenticated
    if (!authLoading && !isAuthenticated) {
        router.push("/login?redirect=/bookings");
        return null;
    }

    const getStatusBadge = (status, size) => {
        var cls = size === "lg" ? "text-sm px-3 py-1" : "";
        switch (status) {
            case "confirmed":
                return <Badge className={"bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20 " + cls}><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Confirmed</Badge>;
            case "pending":
                return <Badge variant="outline" className={"bg-yellow-500/10 text-yellow-500 border-yellow-500/20 " + cls}><AlertCircle className="h-3.5 w-3.5 mr-1" /> Pending</Badge>;
            case "completed":
                return <Badge variant="secondary" className={cls}><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Completed</Badge>;
            case "cancelled":
                return <Badge variant="destructive" className={"bg-red-500/10 text-red-500 border-red-500/20 " + cls}><XCircle className="h-3.5 w-3.5 mr-1" /> Cancelled</Badge>;
            default:
                return <Badge variant="outline" className={cls}>{status}</Badge>;
        }
    };

    if (authLoading || (!isAuthenticated && !authLoading)) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    var selectedBooking = bookings.find(function (b) { return b.id === selectedBookingId; }) || null;

    // Build Google Calendar URL
    function getGoogleCalendarUrl(booking) {
        if (!booking) return "#";
        var start = new Date(booking.startTime);
        var end = new Date(booking.endTime);
        var dtStart = start.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
        var dtEnd = end.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
        var title = encodeURIComponent(booking.services + " at " + booking.salonName);
        var location = encodeURIComponent((booking.salonAddress || "") + ", " + (booking.salonCity || ""));
        return "https://www.google.com/calendar/render?action=TEMPLATE&text=" + title + "&dates=" + dtStart + "/" + dtEnd + "&location=" + location;
    }

    // Build Google Maps URL
    function getMapsUrl(booking) {
        if (!booking) return "#";
        var addr = encodeURIComponent((booking.salonAddress || "") + ", " + (booking.salonCity || ""));
        return "https://www.google.com/maps/search/?api=1&query=" + addr;
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <Breadcrumbs className="mb-6" />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Appointments</h1>
                    <p className="text-muted-foreground mt-1 text-lg">Manage your upcoming and past appointments</p>
                </div>
                <Link href="/salons">
                    <Button className="gap-2 rounded-full px-6">
                        <CalendarDays className="h-4 w-4" />
                        Book New Session
                    </Button>
                </Link>
            </div>

            {/* Split Layout */}
            <div className="flex gap-6">
                {/* LEFT: Booking List */}
                <div className="w-full md:w-[380px] lg:w-[420px] shrink-0">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-6 p-1 bg-muted/50">
                            <TabsTrigger value="upcoming" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                                Upcoming {bookings.length > 0 && activeTab === "upcoming" && (
                                    <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-[10px] rounded-full">{bookings.length}</Badge>
                                )}
                            </TabsTrigger>
                            <TabsTrigger value="past" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                                Past
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value={activeTab} className="mt-0">
                            {error ? (
                                <DataError
                                    title="Failed to load bookings"
                                    message="Unable to fetch your bookings."
                                    onRetry={refetch}
                                    error={error}
                                />
                            ) : isLoading ? (
                                <div className="space-y-3">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                                            <Skeleton className="w-16 h-16 rounded-lg" />
                                            <div className="flex-1 space-y-2">
                                                <Skeleton className="h-4 w-2/3" />
                                                <Skeleton className="h-3 w-1/2" />
                                                <Skeleton className="h-3 w-1/3" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : bookings.length > 0 ? (
                                <div className="space-y-2">
                                    {bookings.map((booking) => {
                                        var isSelected = booking.id === selectedBookingId;
                                        var bookingDate = new Date(booking.startTime);
                                        var isToday = format(bookingDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

                                        return (
                                            <button
                                                key={booking.id}
                                                onClick={() => setSelectedBookingId(booking.id)}
                                                className={
                                                    "w-full text-left flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 cursor-pointer " +
                                                    (isSelected
                                                        ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                                                        : "border-border/50 hover:border-border hover:bg-muted/30")
                                                }
                                            >
                                                {/* Salon image */}
                                                <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-muted flex items-center justify-center">
                                                    {booking.salonImage ? (
                                                        <img
                                                            src={booking.salonImage}
                                                            alt={booking.salonName}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <Store className="h-6 w-6 text-muted-foreground" />
                                                    )}
                                                </div>

                                                {/* Booking info */}
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-semibold text-sm truncate">{booking.salonName}</h3>
                                                    <p className="text-xs text-primary font-medium mt-0.5">
                                                        {isToday ? "Today" : format(bookingDate, "EEE, MMM d, yyyy")} at {format(bookingDate, "h:mm a")}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                        {booking.totalPrice ? formatPrice(booking.totalPrice) : ""} · {booking.serviceDetails ? booking.serviceDetails.length : "1"} item{(booking.serviceDetails && booking.serviceDetails.length > 1) ? "s" : ""}
                                                    </p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <Card className="border-dashed py-12 text-center shadow-none bg-muted/20">
                                    <CardContent>
                                        <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Calendar className="h-7 w-7 text-muted-foreground" />
                                        </div>
                                        <h3 className="text-lg font-bold mb-2">No {activeTab} bookings</h3>
                                        <p className="text-muted-foreground mb-6 text-sm max-w-[280px] mx-auto">
                                            {activeTab === "upcoming"
                                                ? "You don't have any appointments scheduled."
                                                : "You haven't had any appointments yet."}
                                        </p>
                                        <Link href="/salons">
                                            <Button variant="outline" className="rounded-full px-6">Browse Salons</Button>
                                        </Link>
                                    </CardContent>
                                </Card>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>

                {/* RIGHT: Booking Detail */}
                <div className="hidden md:block flex-1 min-w-0">
                    {selectedBooking ? (
                        <div className="sticky top-24">
                            <Card className="overflow-hidden border-border/50 shadow-sm">
                                {/* Salon Banner */}
                                <div className="relative h-48 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center overflow-hidden">
                                    {selectedBooking.salonImage ? (
                                        <img
                                            src={selectedBooking.salonImage}
                                            alt={selectedBooking.salonName}
                                            className="w-full h-full object-cover opacity-80"
                                        />
                                    ) : null}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                                    <div className="absolute bottom-4 left-5 right-5">
                                        <h2 className="text-2xl font-bold text-white tracking-tight">
                                            {selectedBooking.salonName}
                                        </h2>
                                    </div>
                                </div>

                                <CardContent className="p-6 space-y-6">
                                    {/* Status Badge */}
                                    <div>
                                        {getStatusBadge(selectedBooking.status, "lg")}
                                    </div>

                                    {/* Date / Time */}
                                    <div>
                                        <h3 className="text-xl font-bold text-foreground">
                                            {format(new Date(selectedBooking.startTime), "EEE, MMM d, yyyy")} at {format(new Date(selectedBooking.startTime), "h:mm a")}
                                        </h3>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {formatDuration(selectedBooking.duration)} duration
                                        </p>
                                    </div>

                                    {/* Quick Actions */}
                                    <div className="space-y-1">
                                        <a
                                            href={getGoogleCalendarUrl(selectedBooking)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors group"
                                        >
                                            <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                                <CalendarPlus className="h-4.5 w-4.5 text-blue-500" />
                                            </div>
                                            <span className="font-medium text-sm group-hover:text-primary transition-colors">Add to calendar</span>
                                        </a>

                                        <a
                                            href={getMapsUrl(selectedBooking)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors group"
                                        >
                                            <div className="w-9 h-9 rounded-lg bg-rose-500/10 flex items-center justify-center">
                                                <Navigation className="h-4.5 w-4.5 text-rose-500" />
                                            </div>
                                            <span className="font-medium text-sm group-hover:text-primary transition-colors">Get directions</span>
                                        </a>

                                        <Link
                                            href={"/salon/" + selectedBooking.salonId}
                                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors group"
                                        >
                                            <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                                <Store className="h-4.5 w-4.5 text-purple-500" />
                                            </div>
                                            <span className="font-medium text-sm group-hover:text-primary transition-colors">Venue details</span>
                                        </Link>

                                        {activeTab === "upcoming" && (
                                            <button
                                                onClick={() => handleCancelClick(selectedBooking.id)}
                                                disabled={cancelMutation.isPending}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-red-500/5 transition-colors group"
                                            >
                                                <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center">
                                                    <XCircle className="h-4.5 w-4.5 text-red-500" />
                                                </div>
                                                <span className="font-medium text-sm text-red-500 group-hover:text-red-600 transition-colors">
                                                    {cancelMutation.isPending ? "Cancelling..." : "Cancel appointment"}
                                                </span>
                                            </button>
                                        )}
                                    </div>

                                    <Separator />

                                    {/* Overview - Services */}
                                    <div>
                                        <h4 className="font-bold text-base mb-3">Overview</h4>
                                        <div className="space-y-2">
                                            {selectedBooking.serviceDetails && selectedBooking.serviceDetails.length > 0 ? (
                                                selectedBooking.serviceDetails.map(function (svc, i) {
                                                    return (
                                                        <div key={i} className="flex items-center justify-between">
                                                            <div>
                                                                <p className="font-medium text-sm text-primary">{svc.name}</p>
                                                                {svc.duration > 0 && (
                                                                    <p className="text-xs text-muted-foreground">{formatDuration(svc.duration)}</p>
                                                                )}
                                                            </div>
                                                            {svc.price > 0 && (
                                                                <span className="text-sm font-medium">{formatPrice(svc.price)}</span>
                                                            )}
                                                        </div>
                                                    );
                                                })
                                            ) : selectedBooking.services ? (
                                                <div className="flex items-center justify-between">
                                                    <p className="font-medium text-sm text-primary">{selectedBooking.services}</p>
                                                    {selectedBooking.totalPrice && (
                                                        <span className="text-sm font-medium">{formatPrice(selectedBooking.totalPrice)}</span>
                                                    )}
                                                </div>
                                            ) : null}
                                        </div>

                                        {/* Total */}
                                        {selectedBooking.totalPrice && (
                                            <>
                                                <Separator className="my-3" />
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-sm">Total</span>
                                                    <span className="font-bold text-sm text-primary">{formatPrice(selectedBooking.totalPrice)}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Staff */}
                                    {selectedBooking.staffName && (
                                        <>
                                            <Separator />
                                            <div>
                                                <h4 className="font-bold text-base mb-2">Staff</h4>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                        <User className="h-4 w-4 text-primary" />
                                                    </div>
                                                    <span className="text-sm font-medium">{selectedBooking.staffName}</span>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {/* Notes */}
                                    {selectedBooking.notes && (
                                        <>
                                            <Separator />
                                            <div>
                                                <h4 className="font-bold text-base mb-2">Notes</h4>
                                                <p className="text-sm text-muted-foreground">{selectedBooking.notes}</p>
                                            </div>
                                        </>
                                    )}

                                    <Separator />

                                    {/* More Details */}
                                    <div>
                                        <h4 className="font-bold text-base mb-2">More details</h4>
                                        <div className="text-sm text-muted-foreground space-y-1.5">
                                            <p><span className="font-medium text-foreground">Cancellation policy</span></p>
                                            <p>Please cancel at least 48 hours before appointment.</p>
                                        </div>
                                    </div>

                                    {/* Reference */}
                                    <div className="text-center pt-2">
                                        <p className="text-xs text-muted-foreground">
                                            Booking reference <span className="font-mono font-medium">{("CDC" + String(selectedBooking.id).padStart(5, "0")).toUpperCase()}</span>
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    ) : (
                        <Card className="border-dashed py-24 text-center shadow-none bg-muted/10">
                            <CardContent>
                                <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FileText className="h-7 w-7 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-semibold mb-1">No booking selected</h3>
                                <p className="text-sm text-muted-foreground">Select a booking to view its details</p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function BookingsPage() {
    return (
        <div className="min-h-screen bg-background">
            <Suspense fallback={
                <div className="flex items-center justify-center min-h-[60vh]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            }>
                <BookingsContent />
            </Suspense>
        </div>
    );
}
