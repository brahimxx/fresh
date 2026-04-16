"use client";

import { useState, useCallback, use } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Calendar,
  MoreHorizontal,
  Eye,
  Check,
  XCircle,
  FileText,
  Clock,
  CheckCircle2,
  XOctagon,
  CalendarDays
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TableSkeleton } from "@/components/ui/loading-skeletons";
import { DataError } from "@/components/ui/data-error";
import { EmptyBookings } from "@/components/ui/empty-states";

import {
  useBookings,
  useConfirmBooking,
  useCancelBooking,
} from "@/hooks/use-bookings";
import { BookingFormDialog } from "@/components/bookings/booking-form";
import { BookingDetailSheet } from "@/components/bookings/booking-detail";

const STATUS_CONFIG = {
  pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200" },
  confirmed: { label: "Confirmed", className: "bg-green-100 text-green-800 hover:bg-green-200 border-green-200" },
  completed: { label: "Completed", className: "bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200" },
  cancelled: { label: "Cancelled", className: "bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-200" },
  no_show: { label: "No Show", className: "bg-red-100 text-red-800 hover:bg-red-200 border-red-200" },
};

export default function BookingsPage({ params }) {
  const resolvedParams = use(params);
  const salonId = resolvedParams.salonId;
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [newBookingOpen, setNewBookingOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const filters = {
    salonId,
    status: statusFilter !== "all" ? statusFilter : undefined,
    search: search || undefined,
    page,
    limit: 20,
  };

  const { data, isLoading, error, refetch } = useBookings(filters);
  const confirmBooking = useConfirmBooking();
  const cancelBooking = useCancelBooking();

  const bookings = data?.data || [];
  const pagination = data?.pagination || { total: 0, pages: 1 };

  // Calculate some lightweight stats locally if available
  const activeBookings = bookings.filter(b => ["pending", "confirmed"].includes(b.status)).length;
  const todayBookings = bookings.filter(b => {
    const d = b.startDatetime || b.start_datetime;
    if (!d) return false;
    const start = new Date(typeof d === "string" ? d.replace(" ", "T") : d);
    if (isNaN(start.getTime())) return false;
    const today = new Date();
    return start.toDateString() === today.toDateString();
  }).length;

  const handleViewBooking = useCallback((booking) => {
    setSelectedBooking(booking);
    setDetailOpen(true);
  }, []);

  const handleQuickConfirm = useCallback((bookingId) => {
    confirmBooking.mutate(bookingId);
  }, [confirmBooking]);

  const handleQuickCancel = useCallback((bookingId) => {
    cancelBooking.mutate(bookingId);
  }, [cancelBooking]);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
          <p className="text-muted-foreground mt-1">
            Manage your schedule and bookings efficiently.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            className="flex-1 sm:flex-none"
            onClick={() => router.push("./calendar")}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Calendar View
          </Button>
          <Button
            className="flex-1 sm:flex-none"
            onClick={() => setNewBookingOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Booking
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pagination.total || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all pages</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active (Visible)</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeBookings}</div>
            <p className="text-xs text-muted-foreground mt-1">Pending or Confirmed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
            <CalendarDays className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayBookings}</div>
            <p className="text-xs text-muted-foreground mt-1">Appointments scheduled for today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {bookings.length > 0
                ? Math.round(
                    (bookings.filter((b) => b.status === "completed").length / bookings.length) * 100
                  ) + "%"
                : "0%"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Of current view</p>
          </CardContent>
        </Card>
      </div>

      {/* Main List Layout */}
      <Card className="border-border shadow-sm">
        {error ? (
          <div className="p-6">
            <DataError
              title="Failed to load bookings"
              message="Unable to fetch your bookings. Please try again."
              onRetry={refetch}
              error={error}
            />
          </div>
        ) : (
          <>
            <div className="p-4 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b">
              <Tabs
                value={statusFilter}
                onValueChange={(val) => {
                  setStatusFilter(val);
                  setPage(1);
                }}
                className="w-full sm:w-auto"
              >
                <TabsList className="w-full sm:w-auto h-auto p-1 grid grid-cols-3 sm:flex">
                  <TabsTrigger value="all" className="text-xs sm:text-sm">All</TabsTrigger>
                  <TabsTrigger value="pending" className="text-xs sm:text-sm">Pending</TabsTrigger>
                  <TabsTrigger value="confirmed" className="text-xs sm:text-sm">Confirmed</TabsTrigger>
                  <TabsTrigger value="completed" className="text-xs sm:text-sm hidden sm:inline-flex">Completed</TabsTrigger>
                  <TabsTrigger value="cancelled" className="text-xs sm:text-sm hidden sm:inline-flex">Cancelled</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search clients or services..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="p-6">
                  <TableSkeleton rows={5} columns={6} />
                </div>
              ) : bookings.length === 0 ? (
                <div className="p-8">
                  <EmptyBookings onAdd={() => setNewBookingOpen(true)} />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-6">Client / Time</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Staff Member</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total Price</TableHead>
                      <TableHead className="w-[60px] pr-6"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings
                      .filter((b) => b && typeof b === "object" && b.id)
                      .map((booking) => {
                        const startStr = booking.startDatetime || booking.start_datetime;
                        if (!startStr) return null;

                        let startTime = new Date(typeof startStr === "string" ? startStr.replace(" ", "T") : startStr);
                        if (isNaN(startTime.getTime())) {
                          startTime = new Date();
                        }

                        const statusConfig = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
                        const clientName = booking.client
                          ? `${booking.client.firstName} ${booking.client.lastName}`
                          : "Walk-in";

                        return (
                          <TableRow key={booking.id} className="group">
                            <TableCell className="pl-6">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                                  <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                                    {booking.client?.firstName?.charAt(0) || "W"}
                                    {booking.client?.lastName?.charAt(0) || "I"}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="space-y-1">
                                  <p className="font-medium text-sm leading-none">{clientName}</p>
                                  <div className="flex items-center text-xs text-muted-foreground gap-1.5">
                                    <Clock className="h-3 w-3" />
                                    <span>{format(startTime, "MMM d, h:mm a")}</span>
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                {booking.services && booking.services.length > 0 ? (
                                  <>
                                    <span className="text-sm font-medium">
                                      {booking.services[0].name}
                                    </span>
                                    {booking.services.length > 1 && (
                                      <span className="text-xs text-muted-foreground">
                                        + {booking.services.length - 1} more
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-sm text-muted-foreground">-</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="text-sm">
                                  {booking.staff
                                    ? `${booking.staff.firstName} ${booking.staff.lastName}`
                                    : "Unassigned"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={statusConfig.className}>
                                {statusConfig.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              €{Number(booking.total_price || booking.totalPrice || 0).toFixed(2)}
                            </TableCell>
                            <TableCell className="pr-6">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity data-[state=open]:opacity-100"
                                  >
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-[160px]">
                                  <DropdownMenuItem onClick={() => handleViewBooking(booking)}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                  {booking.status === "pending" && (
                                    <DropdownMenuItem onClick={() => handleQuickConfirm(booking.id)}>
                                      <Check className="h-4 w-4 mr-2 text-green-600" />
                                      Confirm
                                    </DropdownMenuItem>
                                  )}
                                  {(booking.status === "pending" || booking.status === "confirmed") && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() => handleQuickCancel(booking.id)}
                                        className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                      >
                                        <XOctagon className="h-4 w-4 mr-2" />
                                        Cancel Booking
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* Pagination */}
            {!isLoading && pagination.pages > 1 && (
              <div className="p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-sm text-muted-foreground text-center sm:text-left">
                  Showing <span className="font-medium text-foreground">{bookings.length}</span> of{" "}
                  <span className="font-medium text-foreground">{pagination.total}</span> bookings
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 shadow-none"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Previous
                  </Button>
                  <p className="text-sm text-muted-foreground min-w-[4.5rem] text-center">
                    Page {page} of {pagination.pages}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 shadow-none"
                    disabled={page >= pagination.pages}
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Dialogs */}
      <BookingFormDialog
        salonId={salonId}
        open={newBookingOpen}
        onOpenChange={setNewBookingOpen}
      />

      <BookingDetailSheet
        booking={selectedBooking}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
