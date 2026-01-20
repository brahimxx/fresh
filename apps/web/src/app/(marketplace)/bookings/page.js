"use client";

import { useState, Suspense } from "react";
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
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { DataError } from "@/components/ui/data-error";
import { useAuth } from "@/providers/auth-provider";
import { useMyBookings } from "@/hooks/use-bookings";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

function BookingsContent() {
    const { user, isAuthenticated, loading: authLoading } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("upcoming");

    const { data: bookings = [], isLoading, error, refetch } = useMyBookings(activeTab, {
        enabled: isAuthenticated,
    });

    // Redirect if not authenticated
    if (!authLoading && !isAuthenticated) {
        router.push("/login?redirect=/bookings");
        return null;
    }

    const getStatusBadge = (status) => {
        switch (status) {
            case "confirmed":
                return <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20">Confirmed</Badge>;
            case "pending":
                return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Pending</Badge>;
            case "completed":
                return <Badge variant="secondary">Completed</Badge>;
            case "cancelled":
                return <Badge variant="destructive" className="bg-red-500/10 text-red-500 border-red-500/20">Cancelled</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    if (authLoading || (!isAuthenticated && !authLoading)) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <Breadcrumbs className="mb-6" />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">My Bookings</h1>
                    <p className="text-muted-foreground mt-1 text-lg">Manage your upcoming and past appointments</p>
                </div>
                <Link href="/salons">
                    <Button className="gap-2 rounded-full px-6">
                        <CalendarDays className="h-4 w-4" />
                        Book New Session
                    </Button>
                </Link>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-8 p-1 bg-muted/50">
                    <TabsTrigger value="upcoming" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">Upcoming</TabsTrigger>
                    <TabsTrigger value="past" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">Past</TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-0">
                    {error ? (
                        <DataError
                            title="Failed to load bookings"
                            message="Unable to fetch your bookings. Please try again."
                            onRetry={refetch}
                            error={error}
                        />
                    ) : isLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <Card key={i} className="overflow-hidden border-border/50">
                                    <CardContent className="p-0">
                                        <div className="flex flex-col md:flex-row">
                                            <Skeleton className="w-full md:w-48 h-32 md:h-auto" />
                                            <div className="flex-1 p-6 space-y-3">
                                                <Skeleton className="h-6 w-1/3" />
                                                <Skeleton className="h-4 w-1/4" />
                                                <Skeleton className="h-4 w-1/2" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : bookings.length > 0 ? (
                        <div className="space-y-4">
                            {bookings.map((booking) => (
                                <Card key={booking.id} className="overflow-hidden border-border group hover:border-primary/20 transition-all duration-300 shadow-sm hover:shadow-md">
                                    <CardContent className="p-0">
                                        <div className="flex flex-col md:flex-row">
                                            {/* Salon Image Thumbnail (Fallback for now) */}
                                            <div className="w-full md:w-32 bg-muted flex items-center justify-center shrink-0 border-r border-border/50">
                                                <div className="text-3xl">💇</div>
                                            </div>

                                            <div className="flex-1 p-6">
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="font-bold text-xl group-hover:text-primary transition-colors">{booking.salonName}</h3>
                                                            {getStatusBadge(booking.status)}
                                                        </div>
                                                        <p className="font-medium text-foreground/80">{booking.services}</p>
                                                        <div className="flex flex-wrap items-center gap-y-2 gap-x-4 mt-3 text-sm text-muted-foreground font-medium">
                                                            <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                                                                <Calendar className="h-4 w-4 text-primary/70" />
                                                                {format(new Date(booking.startTime), "EEE, MMM d")}
                                                            </div>
                                                            <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                                                                <Clock className="h-4 w-4 text-primary/70" />
                                                                {format(new Date(booking.startTime), "h:mm a")}
                                                            </div>
                                                            <div className="flex items-center gap-1.5">
                                                                <MapPin className="h-4 w-4" />
                                                                {booking.salonCity}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <Link href={`/salon/${booking.salonId}`}>
                                                            <Button variant="outline" size="sm" className="rounded-full shadow-sm hover:bg-primary/5">
                                                                Salon Page
                                                            </Button>
                                                        </Link>
                                                        {activeTab === "upcoming" && (
                                                            <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-foreground">
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <Card className="border-dashed py-16 text-center shadow-none bg-muted/20">
                            <CardContent>
                                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Calendar className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <h3 className="text-xl font-bold mb-2">No {activeTab} bookings</h3>
                                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                                    {activeTab === "upcoming"
                                        ? "You don't have any appointments scheduled. Why not discover something new?"
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
