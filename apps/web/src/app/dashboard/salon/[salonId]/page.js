'use client';

import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Calendar,
  Users,
  CreditCard,
  Clock,
  TrendingUp,
  Plus,
  ChevronRight,
  Megaphone
} from 'lucide-react';
import Link from 'next/link';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useSalon } from '@/providers/salon-provider';
import api from '@/lib/api-client';

function StatCard({ title, value, description, icon: Icon, trend }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">
            {trend && (
              <span className={trend > 0 ? 'text-green-600' : 'text-red-600'}>
                {trend > 0 ? '+' : ''}{trend}%
              </span>
            )}{' '}
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function BookingItem({ booking, salonId }) {
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-red-100 text-red-800',
    no_show: 'bg-gray-100 text-gray-800',
  };

  const startTime = booking.start_datetime || booking.startDateTime;

  return (
    <Link
      href={'/dashboard/salon/' + salonId + '/bookings/' + booking.id}
      className="block"
    >
      <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="text-center min-w-[60px]">
            <div className="text-sm font-medium">
              {format(new Date(startTime), 'HH:mm')}
            </div>
            <div className="text-xs text-muted-foreground">
              {format(new Date(startTime), 'MMM d')}
            </div>
          </div>
          <div>
            <div className="font-medium">
              {booking.client_name || booking.clientName || 'Walk-in'}
            </div>
            <div className="text-sm text-muted-foreground">
              {booking.service_names || booking.serviceName || 'Service'} with {booking.staff_name || booking.staffName || 'Staff'}
            </div>
          </div>
        </div>
        <Badge className={statusColors[booking.status] || 'bg-gray-100'}>
          {booking.status}
        </Badge>
      </div>
    </Link>
  );
}

export default function SalonDashboardPage() {
  const { salon, salonId, isLoading: salonLoading } = useSalon();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['salon-stats', salonId],
    queryFn: function () { return api.get('/reports/overview', { salonId: salonId }); },
    enabled: !!salonId,
    select: function (response) { return response.data || {}; },
  });

  const { data: upcomingBookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ['upcoming-bookings', salonId],
    queryFn: function () {
      return api.get('/bookings', {
        salonId: salonId,
        status: 'confirmed,pending',
        limit: 5
      });
    },
    enabled: !!salonId,
    select: function (response) { return response.data || []; },
  });

  const { data: banners } = useQuery({
    queryKey: ['system-banners', salonId],
    queryFn: () => api.get('/notifications/banners'),
    enabled: !!salonId,
    select: (res) => res.data || []
  });

  const today = format(new Date(), 'EEEE, MMMM d, yyyy');

  if (salonLoading || statsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map(function (_, i) { return <Skeleton key={i} className="h-32" />; })}
        </div>
      </div>
    );
  }

  var dashboardStats = {
    todayBookings: (stats && stats.todayBookings) || (stats && stats.bookingsToday) || 0,
    todayRevenue: (stats && stats.todayRevenue) || (stats && stats.revenueToday) || 0,
    newClients: (stats && stats.newClients) || (stats && stats.newClientsThisWeek) || 0,
    pendingBookings: (stats && stats.pendingBookings) || 0,
  };

  var calendarUrl = '/dashboard/salon/' + salonId + '/calendar';
  var bookingsUrl = '/dashboard/salon/' + salonId + '/bookings';
  var clientsUrl = '/dashboard/salon/' + salonId + '/clients';
  var reportsUrl = '/dashboard/salon/' + salonId + '/reports';
  var servicesUrl = '/dashboard/salon/' + salonId + '/services';

  return (
    <div className="space-y-6">
      {banners && banners.length > 0 && (
        <div className="space-y-4">
          {banners.map(banner => (
            <Alert key={banner.id} className="bg-primary/5 border-primary/20">
              <Megaphone className="h-5 w-5 text-primary" />
              <AlertTitle className="text-primary font-semibold">{banner.title}</AlertTitle>
              <AlertDescription className="text-sm mt-1">
                {banner.message}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">{today}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href={calendarUrl}>
              <Plus className="mr-2 h-4 w-4" />
              New Booking
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Today's Appointments"
          value={dashboardStats.todayBookings}
          icon={Calendar}
          description="scheduled for today"
        />
        <StatCard
          title="Today's Revenue"
          value={'EUR ' + Number(dashboardStats.todayRevenue).toFixed(2)}
          icon={CreditCard}
          trend={12}
          description="from yesterday"
        />
        <StatCard
          title="New Clients"
          value={dashboardStats.newClients}
          icon={Users}
          description="this week"
        />
        <StatCard
          title="Pending Bookings"
          value={dashboardStats.pendingBookings}
          icon={Clock}
          description="awaiting confirmation"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Upcoming Appointments</CardTitle>
              <CardDescription>Your next scheduled bookings</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href={bookingsUrl}>
                View all
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {bookingsLoading ? (
              [...Array(3)].map(function (_, i) { return <Skeleton key={i} className="h-16 w-full" />; })
            ) : upcomingBookings && upcomingBookings.length > 0 ? (
              upcomingBookings.map(function (booking) {
                return <BookingItem key={booking.id} booking={booking} salonId={salonId} />;
              })
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No upcoming appointments
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button variant="outline" className="justify-start" asChild>
              <Link href={calendarUrl}>
                <Calendar className="mr-2 h-4 w-4" />
                Open Calendar
              </Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link href={clientsUrl}>
                <Users className="mr-2 h-4 w-4" />
                View Clients
              </Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link href={reportsUrl}>
                <TrendingUp className="mr-2 h-4 w-4" />
                View Reports
              </Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link href={servicesUrl}>
                <Plus className="mr-2 h-4 w-4" />
                Manage Services
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
