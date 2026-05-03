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
  CalendarDays,
  CalendarClock,
  Layers,
  Car,
  Video,
  Store,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
import { cn } from "@/lib/utils";

const STATUS_CONFIG = {
  pending: { label: "Pending", className: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-0" },
  confirmed: { label: "Confirmed", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0" },
  completed: { label: "Completed", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-0" },
  cancelled: { label: "Cancelled", className: "bg-red-500/10 text-red-600 dark:text-red-400 border-0" },
  no_show: { label: "No Show", className: "bg-muted text-muted-foreground border-0" },
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
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
    <div className="space-y-8">
      
      {/* Decorative Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-8 sm:p-10 flex flex-col md:flex-row md:items-end justify-between gap-6 group"
      >
        <div className="absolute top-0 right-10 p-8 opacity-5 pointer-events-none transition-transform duration-1000 group-hover:scale-125 group-hover:rotate-12 translate-y-[-20%]">
          <CalendarClock className="w-64 h-64 text-primary" strokeWidth={1} />
        </div>
        
        <div className="relative z-10 flex flex-col gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-background/80 backdrop-blur-md border border-primary/20 text-xs font-semibold text-primary w-fit">
            <Layers className="w-3.5 h-3.5" />
            <span>Schedule Engine</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight max-w-2xl">
            Booking Roster
          </h1>
          <p className="text-muted-foreground text-lg font-medium">
            Manage your daily workflow, confirm requests, and track your active pipeline.
          </p>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row gap-3 shrink-0">
          <Button
            variant="outline"
            className="flex-1 sm:flex-none h-12 px-6 rounded-xl border-border/50 bg-background/50 backdrop-blur-md hover:bg-background shadow-sm text-[15px]"
            onClick={() => router.push("./calendar")}
          >
            <Calendar className="h-5 w-5 mr-2 text-muted-foreground" />
             Switch to Calendar
          </Button>
          <Button
            className="flex-1 sm:flex-none h-12 px-6 rounded-xl shadow-md text-[15px]"
            onClick={() => setNewBookingOpen(true)}
          >
            <Plus className="h-5 w-5 mr-2" />
            New Appointment
          </Button>
        </div>
      </motion.div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-8"
      >
        {/* Metrics Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <motion.div variants={itemVariants} className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm overflow-hidden relative group hover:bg-background transition-colors duration-500">
            <div className="absolute -right-6 -top-6 text-primary/5 transition-transform duration-700 group-hover:scale-125 group-hover:-rotate-12 pointer-events-none">
              <FileText className="w-32 h-32" strokeWidth={1} />
            </div>
            <div className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Logs</h3>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <FileText className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div className="relative z-10 mt-2">
              <div className="text-3xl font-extrabold tracking-tight">{pagination.total || 0}</div>
              <p className="text-xs font-semibold text-muted-foreground mt-1">Across all pages</p>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm overflow-hidden relative group hover:bg-background transition-colors duration-500">
             <div className="absolute -right-6 -top-6 text-amber-500/5 transition-transform duration-700 group-hover:scale-125 group-hover:rotate-12 pointer-events-none">
              <Clock className="w-32 h-32" strokeWidth={1} />
            </div>
            <div className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Active Pipeline</h3>
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Clock className="h-4 w-4 text-amber-500" />
              </div>
            </div>
            <div className="relative z-10 mt-2">
              <div className="text-3xl font-extrabold tracking-tight">{activeBookings}</div>
              <p className="text-xs font-semibold text-muted-foreground mt-1">Pending or Confirmed</p>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm overflow-hidden relative group hover:bg-background transition-colors duration-500">
            <div className="absolute -right-6 -top-6 text-blue-500/5 transition-transform duration-700 group-hover:scale-125 group-hover:-rotate-12 pointer-events-none">
              <CalendarDays className="w-32 h-32" strokeWidth={1} />
            </div>
            <div className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Due Today</h3>
               <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <CalendarDays className="h-4 w-4 text-blue-500" />
              </div>
            </div>
            <div className="relative z-10 mt-2">
               <div className="text-3xl font-extrabold tracking-tight">{todayBookings}</div>
               <p className="text-xs font-semibold text-muted-foreground mt-1">Scheduled for today</p>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm overflow-hidden relative group hover:bg-background transition-colors duration-500">
            <div className="absolute -right-6 -top-6 text-emerald-500/5 transition-transform duration-700 group-hover:scale-125 group-hover:-rotate-12 pointer-events-none">
              <CheckCircle2 className="w-32 h-32" strokeWidth={1} />
            </div>
            <div className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Completion Run</h3>
               <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
            </div>
            <div className="relative z-10 mt-2">
              <div className="text-3xl font-extrabold tracking-tight">
                {bookings.length > 0
                  ? Math.round(
                      (bookings.filter((b) => b.status === "completed").length / bookings.length) * 100
                    ) + "%"
                  : "0%"}
              </div>
              <p className="text-xs font-semibold text-muted-foreground mt-1">Of current data slice</p>
            </div>
          </motion.div>
        </div>

        {/* Main List Layout */}
        <motion.div variants={itemVariants} className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl shadow-sm overflow-hidden">
          {error ? (
            <div className="p-8">
              <DataError
                title="Failed to load database"
                message="Unable to fetch your records. Please engage retry protocol."
                onRetry={refetch}
                error={error}
              />
            </div>
          ) : (
            <>
              {/* Filter Bar */}
              <div className="p-5 sm:px-8 bg-muted/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/50">
                <Tabs
                  value={statusFilter}
                  onValueChange={(val) => {
                    setStatusFilter(val);
                    setPage(1);
                  }}
                  className="w-full sm:w-auto"
                >
                  <TabsList className="w-full sm:w-auto h-auto p-1.5 grid grid-cols-3 sm:flex rounded-xl bg-background border border-border/50 shadow-sm">
                    <TabsTrigger value="all" className="text-xs sm:text-sm rounded-lg font-semibold data-[state=active]:bg-primary/10 data-[state=active]:text-primary">All Entries</TabsTrigger>
                    <TabsTrigger value="pending" className="text-xs sm:text-sm rounded-lg font-semibold data-[state=active]:bg-yellow-500/10 data-[state=active]:text-yellow-600">Pending</TabsTrigger>
                    <TabsTrigger value="confirmed" className="text-xs sm:text-sm rounded-lg font-semibold data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-600">Confirmed</TabsTrigger>
                    <TabsTrigger value="completed" className="text-xs sm:text-sm hidden sm:inline-flex rounded-lg font-semibold data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-600">Completed</TabsTrigger>
                    <TabsTrigger value="cancelled" className="text-xs sm:text-sm hidden sm:inline-flex rounded-lg font-semibold data-[state=active]:bg-red-500/10 data-[state=active]:text-red-600">Cancelled</TabsTrigger>
                  </TabsList>
                </Tabs>
                <div className="relative w-full sm:max-w-[300px]">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
                  <Input
                    placeholder="Search clients, services, staff..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 h-11 bg-background rounded-xl border-border/50 focus-visible:ring-primary/50 shadow-sm font-medium"
                  />
                </div>
              </div>

              {/* Table Area */}
              <div className="overflow-x-auto">
                {isLoading ? (
                  <div className="p-8">
                    <TableSkeleton rows={8} columns={6} />
                  </div>
                ) : bookings.length === 0 ? (
                  <div className="p-16">
                    <EmptyBookings onAdd={() => setNewBookingOpen(true)} />
                  </div>
                ) : (
                  <Table className="px-4">
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-border/50 [&_th]:h-14">
                        <TableHead className="pl-8 text-xs font-bold uppercase tracking-wider text-muted-foreground">Client Profile</TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Service List</TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Type</TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Assigned Pro</TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                        <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">Settlement</TableHead>
                        <TableHead className="w-[80px] pr-8"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence>
                        {bookings
                          .filter((b) => b && typeof b === "object" && b.id)
                          .map((booking, i) => {
                            const startStr = booking.startDatetime || booking.start_datetime;
                            if (!startStr) return null;

                            let startTime = new Date(typeof startStr === "string" ? startStr.replace(" ", "T") : startStr);
                            if (isNaN(startTime.getTime())) {
                              startTime = new Date();
                            }

                            const statusConfig = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
                            const clientName = booking.client
                              ? `${booking.client.firstName} ${booking.client.lastName}`
                              : "Walk-in Guest";

                            return (
                              <motion.tr 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                key={booking.id} 
                                className="group hover:bg-muted/5 border-border/50 transition-colors cursor-pointer [&_td]:py-4"
                                onClick={() => handleViewBooking(booking)}
                              >
                                <TableCell className="pl-8">
                                  <div className="flex items-center gap-4">
                                    <Avatar className="h-11 w-11 border-2 border-background shadow-sm">
                                      <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary">
                                        {booking.client?.firstName?.charAt(0) || "W"}
                                        {booking.client?.lastName?.charAt(0) || "I"}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="space-y-1">
                                      <p className="font-bold text-[15px] leading-none text-foreground group-hover:text-primary transition-colors">{clientName}</p>
                                      <div className="flex items-center text-xs text-muted-foreground gap-1.5 font-medium">
                                        <Clock className="h-3 w-3" />
                                        <span>{format(startTime, "MMM d • h:mm a")}</span>
                                      </div>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col gap-1 inline-flex max-w-[200px]">
                                    {booking.services && booking.services.length > 0 ? (
                                      <>
                                        <span className="text-[14px] font-semibold text-foreground truncate">
                                          {booking.services[0].name}
                                        </span>
                                        {booking.services.length > 1 && (
                                          <span className="text-[11px] font-bold text-primary uppercase tracking-wider">
                                            + {booking.services.length - 1} additions
                                          </span>
                                        )}
                                      </>
                                    ) : (
                                      <span className="text-sm text-muted-foreground font-medium">-</span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {booking.fulfillmentType === 'mobile' ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-500/10 rounded-md px-2 py-1 w-fit">
                                      <Car className="h-3 w-3" />
                                      Mobile
                                    </span>
                                  ) : booking.fulfillmentType === 'virtual' ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-600 bg-purple-500/10 rounded-md px-2 py-1 w-fit">
                                      <Video className="h-3 w-3" />
                                      Virtual
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-500/10 rounded-md px-2 py-1 w-fit">
                                      <Store className="h-3 w-3" />
                                      In-Salon
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <span className="text-[14px] font-semibold text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-lg">
                                    {booking.staff
                                      ? `${booking.staff.firstName} ${booking.staff.lastName}`
                                      : "Unassigned"}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <Badge className={cn("text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5", statusConfig.className)} variant="secondary">
                                    {statusConfig.label}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex flex-col items-end gap-0.5">
                                    <span className="font-extrabold text-[15px]">
                                      €{Number(booking.total_price || booking.totalPrice || 0).toFixed(2)}
                                    </span>
                                    {booking.travelFeeAmount > 0 && (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600">
                                        <Car className="h-2.5 w-2.5" />
                                        +€{Number(booking.travelFeeAmount).toFixed(2)} travel
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="pr-8 text-right">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                      <Button
                                        variant="ghost"
                                        className="h-9 w-9 p-0 rounded-xl bg-muted/30 hover:bg-muted text-muted-foreground opacity-50 group-hover:opacity-100 transition-all data-[state=open]:opacity-100"
                                      >
                                        <span className="sr-only">Open menu</span>
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-[180px] rounded-2xl" onClick={(e) => e.stopPropagation()}>
                                      <DropdownMenuItem onClick={() => handleViewBooking(booking)} className="font-medium gap-2">
                                        <Eye className="h-4 w-4 text-primary" />
                                        Launch Profile
                                      </DropdownMenuItem>
                                      {booking.status === "pending" && (
                                        <DropdownMenuItem onClick={() => handleQuickConfirm(booking.id)} className="font-medium gap-2 focus:bg-emerald-500/10 focus:text-emerald-600 cursor-pointer">
                                          <Check className="h-4 w-4" />
                                          Confirm Request
                                        </DropdownMenuItem>
                                      )}
                                      {(booking.status === "pending" || booking.status === "confirmed") && (
                                        <>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem
                                            onClick={() => handleQuickCancel(booking.id)}
                                            className="font-medium gap-2 text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                                          >
                                            <XOctagon className="h-4 w-4" />
                                            Terminate Booking
                                          </DropdownMenuItem>
                                        </>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </motion.tr>
                            );
                          })}
                      </AnimatePresence>
                    </TableBody>
                  </Table>
                )}
              </div>

              {/* Pagination */}
              {!isLoading && pagination.pages > 1 && (
                <div className="p-6 border-t border-border/50 bg-muted/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-[13px] font-medium text-muted-foreground text-center sm:text-left">
                    Displaying <span className="font-bold text-foreground">{bookings.length}</span> out of{" "}
                    <span className="font-bold text-foreground">{pagination.total}</span> data records
                  </p>
                  <div className="flex items-center gap-2 bg-background p-1 rounded-xl border border-border/50 shadow-sm">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-lg font-bold text-muted-foreground hover:text-foreground"
                      disabled={page <= 1}
                      onClick={() => setPage(page - 1)}
                    >
                      Prefetch
                    </Button>
                    <div className="px-3 text-xs font-bold text-foreground bg-muted/50 h-8 rounded-lg flex items-center justify-center">
                      {"["} {page} / {pagination.pages} {"]"}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-lg font-bold text-muted-foreground hover:text-foreground"
                      disabled={page >= pagination.pages}
                      onClick={() => setPage(page + 1)}
                    >
                      Advance
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>
      </motion.div>

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
