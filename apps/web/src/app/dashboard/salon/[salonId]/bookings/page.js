'use client';

import { useState } from 'react';
import { use } from 'react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  Filter, 
  Plus, 
  Calendar, 
  ChevronDown,
  MoreHorizontal,
  Eye,
  Check,
  XCircle
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

import { useBookings, useConfirmBooking, useCancelBooking } from '@/hooks/use-bookings';
import { BookingFormDialog } from '@/components/bookings/booking-form';
import { BookingDetailSheet } from '@/components/bookings/booking-detail';

var STATUS_CONFIG = {
  pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'Confirmed', className: 'bg-green-100 text-green-800' },
  completed: { label: 'Completed', className: 'bg-blue-100 text-blue-800' },
  cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-800' },
  no_show: { label: 'No Show', className: 'bg-red-100 text-red-800' },
};

export default function BookingsPage({ params }) {
  var resolvedParams = use(params);
  var salonId = resolvedParams.salonId;
  var router = useRouter();
  
  var [search, setSearch] = useState('');
  var [statusFilter, setStatusFilter] = useState('all');
  var [page, setPage] = useState(1);
  var [newBookingOpen, setNewBookingOpen] = useState(false);
  var [selectedBooking, setSelectedBooking] = useState(null);
  var [detailOpen, setDetailOpen] = useState(false);
  
  var filters = {
    salon_id: salonId,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    search: search || undefined,
    page: page,
    limit: 20,
  };
  
  var { data, isLoading, error } = useBookings(filters);
  var confirmBooking = useConfirmBooking();
  var cancelBooking = useCancelBooking();
  
  var bookings = data?.data || [];
  var pagination = data?.pagination || { total: 0, pages: 1 };
  
  function handleViewBooking(booking) {
    setSelectedBooking(booking);
    setDetailOpen(true);
  }
  
  function handleQuickConfirm(bookingId) {
    confirmBooking.mutate(bookingId);
  }
  
  function handleQuickCancel(bookingId) {
    cancelBooking.mutate(bookingId);
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bookings</h1>
          <p className="text-muted-foreground">
            Manage all your salon appointments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={function() { router.push('./calendar'); }}>
            <Calendar className="h-4 w-4 mr-2" />
            Calendar View
          </Button>
          <Button onClick={function() { setNewBookingOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            New Booking
          </Button>
        </div>
      </div>
      
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search bookings..."
            value={search}
            onChange={function(e) { setSearch(e.target.value); }}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="no_show">No Show</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Staff</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Price</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map(function(_, i) {
                return (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  </TableRow>
                );
              })
            ) : bookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No bookings found
                </TableCell>
              </TableRow>
            ) : (
              bookings.map(function(booking) {
                var startTime = new Date(booking.start_datetime || booking.startDateTime);
                var statusConfig = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
                
                return (
                  <TableRow key={booking.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {booking.client_name || booking.clientName || 'Walk-in'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {booking.client_email || booking.clientEmail || ''}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {booking.service_name || booking.serviceName || '-'}
                    </TableCell>
                    <TableCell>
                      {booking.staff_name || booking.staffName || 'Unassigned'}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p>{format(startTime, 'MMM d, yyyy')}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(startTime, 'HH:mm')}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusConfig.className}>
                        {statusConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      EUR {Number(booking.total_price || booking.totalPrice || 0).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={function() { handleViewBooking(booking); }}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {booking.status === 'pending' && (
                            <DropdownMenuItem onClick={function() { handleQuickConfirm(booking.id); }}>
                              <Check className="h-4 w-4 mr-2" />
                              Confirm
                            </DropdownMenuItem>
                          )}
                          {(booking.status === 'pending' || booking.status === 'confirmed') && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={function() { handleQuickCancel(booking.id); }}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Cancel
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {bookings.length} of {pagination.total} bookings
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={function() { setPage(page - 1); }}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {page} of {pagination.pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.pages}
              onClick={function() { setPage(page + 1); }}
            >
              Next
            </Button>
          </div>
        </div>
      )}
      
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
