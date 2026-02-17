'use client';

import { format } from 'date-fns';
import { 
  X, 
  Calendar, 
  Clock, 
  User, 
  Scissors, 
  UserCog,
  MessageSquare,
  Check,
  XCircle,
  AlertCircle,
  RotateCcw,
  CreditCard
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import { 
  useConfirmBooking, 
  useCancelBooking, 
  useNoShowBooking 
} from '@/hooks/use-bookings';

var STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  confirmed: { label: 'Confirmed', color: 'bg-green-100 text-green-800', icon: Check },
  completed: { label: 'Completed', color: 'bg-blue-100 text-blue-800', icon: Check },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-800', icon: XCircle },
  no_show: { label: 'No Show', color: 'bg-red-100 text-red-800', icon: AlertCircle },
};

export function BookingDetailSheet({ booking, open, onOpenChange, onReschedule }) {
  var confirmBooking = useConfirmBooking();
  var cancelBooking = useCancelBooking();
  var noShowBooking = useNoShowBooking();
  
  if (!booking) return null;
  
  var statusConfig = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
  var StatusIcon = statusConfig.icon;
  
  var startTime = new Date(booking.start_datetime || booking.startDateTime);
  var endTime = new Date(booking.end_datetime || booking.endDateTime);
  
  function handleConfirm() {
    confirmBooking.mutate(booking.id, {
      onSuccess: function() {
        onOpenChange(false);
      },
    });
  }
  
  function handleCancel() {
    cancelBooking.mutate(booking.id, {
      onSuccess: function() {
        onOpenChange(false);
      },
    });
  }
  
  function handleNoShow() {
    noShowBooking.mutate(booking.id, {
      onSuccess: function() {
        onOpenChange(false);
      },
    });
  }
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>Booking Details</SheetTitle>
            <Badge className={statusConfig.color}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusConfig.label}
            </Badge>
          </div>
          <SheetDescription>
            Booking #{booking.id.slice(0, 8)}
          </SheetDescription>
        </SheetHeader>
        
        <div className="mt-6 space-y-6">
          {/* Client Info */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm text-muted-foreground">Client</h3>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">
                  {booking.client
                    ? `${booking.client.firstName || ''} ${booking.client.lastName || ''}`.trim()
                    : (booking.client_name || booking.clientName || 'Walk-in')
                  }
                </p>
                {(booking.client?.email || booking.client_email ||booking.clientEmail) && (
                  <p className="text-sm text-muted-foreground">
                    {booking.client?.email || booking.client_email || booking.clientEmail}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* Service Info */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm text-muted-foreground">
              {booking.services && booking.services.length > 1 ? 'Services' : 'Service'}
            </h3>
            {booking.services && booking.services.length > 0 ? (
              <div className="space-y-2">
                {booking.services.map((service, index) => (
                  <div key={service.id || index} className="flex items-start gap-3">
                    <Scissors className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium">{service.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {service.duration} minutes
                        {service.staffId && booking.services.length > 1 && (
                          <span> • Staff ID: {service.staffId}</span>
                        )}
                      </p>
                    </div>
                    <p className="font-medium">€{Number(service.price).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <Scissors className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">
                    {booking.service_name || booking.serviceName || 'Service'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {booking.duration || 30} minutes
                  </p>
                </div>
              </div>
            )}
          </div>
          
          <Separator />
          
          {/* Date & Time */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm text-muted-foreground">Date & Time</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{format(startTime, 'EEE, MMM d, yyyy')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}</span>
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* Staff */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm text-muted-foreground">Staff Member</h3>
            <div className="flex items-center gap-3">
              <UserCog className="h-5 w-5 text-muted-foreground" />
              <span>
                {booking.staff
                  ? `${booking.staff.firstName || ''} ${booking.staff.lastName || ''}`.trim()
                  : (booking.staff_name || booking.staffName || 'Not assigned')
                }
              </span>
            </div>
          </div>
          
          {/* Notes */}
          {booking.notes && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="font-medium text-sm text-muted-foreground">Notes</h3>
                <div className="flex items-start gap-3">
                  <MessageSquare className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <p className="text-sm">{booking.notes}</p>
                </div>
              </div>
            </>
          )}
          
          {/* Price */}
          {(booking.total_price || booking.totalPrice) && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="font-medium text-sm text-muted-foreground">Total</h3>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold">
                    EUR {Number(booking.total_price || booking.totalPrice).toFixed(2)}
                  </span>
                  <Badge variant="outline">
                    {booking.payment_status || 'Unpaid'}
                  </Badge>
                </div>
              </div>
            </>
          )}
          
          <Separator />
          
          {/* Actions */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm text-muted-foreground">Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              {booking.status === 'pending' && (
                <Button 
                  className="w-full" 
                  onClick={handleConfirm}
                  disabled={confirmBooking.isPending}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Confirm
                </Button>
              )}
              
              {(booking.status === 'pending' || booking.status === 'confirmed') && (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={function() { if (onReschedule) onReschedule(booking); }}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reschedule
                </Button>
              )}
              
              {booking.status === 'confirmed' && (
                <Button variant="outline" className="w-full">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Checkout
                </Button>
              )}
              
              {booking.status === 'confirmed' && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="w-full text-orange-600">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      No Show
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Mark as No Show?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will mark the client as a no-show for this appointment.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleNoShow}>
                        Confirm No Show
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              
              {(booking.status === 'pending' || booking.status === 'confirmed') && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="w-full text-destructive">
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel Booking?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. The client will be notified.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep Booking</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleCancel}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Cancel Booking
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
