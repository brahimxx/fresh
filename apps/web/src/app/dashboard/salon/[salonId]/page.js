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
  Megaphone,
  Briefcase,
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useSalon } from '@/providers/salon-provider';
import api from '@/lib/api-client';
import { formatCurrency } from '@/lib/format';
import { canSeeFinancials, canSeeAllBookings, canAccessPage } from '@/lib/permissions';
import { cn } from '@/lib/utils';

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

function StatCard({ title, value, description, icon: Icon, trend }) {
  return (
    <motion.div 
      variants={itemVariants} 
      className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm overflow-hidden relative group hover:bg-background transition-colors duration-500"
    >
      <div className="absolute -right-6 -top-6 text-primary/5 transition-transform duration-700 group-hover:scale-125 group-hover:rotate-12 pointer-events-none">
        <Icon className="w-32 h-32" strokeWidth={1} />
      </div>
      
      <div className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
          {title}
        </h3>
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
      <div className="relative z-10 mt-2">
        <div className="text-3xl font-extrabold tracking-tight">{value}</div>
        {description && (
          <div className="flex items-center mt-2.5">
            {trend !== undefined && trend !== 0 && (
              <Badge variant="secondary" className={cn(
                "mr-2 px-1.5 py-0 text-[11px] font-bold border-0 h-5 items-center inline-flex gap-0.5",
                trend > 0 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-red-500/10 text-red-600 dark:text-red-400"
              )}>
                {trend > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {Math.abs(trend)}%
              </Badge>
            )}
            <span className="text-xs font-semibold text-muted-foreground">
              {description}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function BookingItem({ booking, salonId }) {
  const statusConfig = {
    pending: { bg: 'bg-yellow-500/10', text: 'text-yellow-600 dark:text-yellow-400', label: 'Pending' },
    confirmed: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', label: 'Confirmed' },
    completed: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', label: 'Completed' },
    cancelled: { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', label: 'Cancelled' },
    no_show: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'No Show' },
  };

  const status = statusConfig[booking.status] || { bg: 'bg-muted', text: 'text-foreground', label: booking.status };
  const startTime = booking.start_datetime || booking.startDateTime;

  return (
    <Link
      href={'/dashboard/salon/' + salonId + '/bookings/' + booking.id}
      className="block outline-none"
    >
      <div className="flex items-center justify-between p-4 rounded-2xl border border-transparent hover:border-border/50 hover:bg-muted/10 transition-all duration-200 group">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/5 border border-primary/10 flex flex-col items-center justify-center shrink-0 shadow-inner group-hover:bg-primary/10 transition-colors">
             <div className="text-[15px] font-bold text-foreground leading-none mb-0.5">
              {format(new Date(startTime), 'HH:mm')}
            </div>
            <div className="text-[10px] uppercase font-bold tracking-widest text-primary">
              {format(new Date(startTime), 'MMM d')}
            </div>
          </div>
          <div className="min-w-0">
            <div className="font-bold text-[15px] text-foreground truncate">
              {booking.client_name || booking.clientName || 'Walk-in Guest'}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-semibold text-muted-foreground truncate max-w-[120px] sm:max-w-[200px]">
                {booking.service_names || booking.serviceName || 'Standard Service'}
              </span>
              <div className="w-1 h-1 rounded-full bg-border/50" />
              <span className="text-xs font-medium text-muted-foreground truncate">
                with {booking.staff_name || booking.staffName || 'Staff'}
              </span>
            </div>
          </div>
        </div>
        <div className="shrink-0 pl-2">
          <Badge className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border-0", status.bg, status.text)} variant="secondary">
            {status.label}
          </Badge>
        </div>
      </div>
    </Link>
  );
}

export default function SalonDashboardPage() {
  const { salon, salonId, isLoading: salonLoading, staffRole, staffId, customPermissions } = useSalon();

  const showFinancials = canSeeFinancials(staffRole, customPermissions);
  const showAllBookings = canSeeAllBookings(staffRole, customPermissions);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['salon-stats', salonId],
    queryFn: function () { return api.get('/reports/overview', { salonId: salonId }); },
    enabled: !!salonId && showFinancials,
    select: function (response) { return response.data || {}; },
  });

  const { data: upcomingBookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ['upcoming-bookings', salonId, showAllBookings ? 'all' : staffId],
    queryFn: function () {
      var params = {
        salonId: salonId,
        status: 'confirmed,pending',
        limit: 5
      };
      // Staff members only see their own bookings
      if (!showAllBookings && staffId) {
        params.staffId = staffId;
      }
      return api.get('/bookings', params);
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

  if (salonLoading || (statsLoading && showFinancials)) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-40 w-full bg-muted/60 rounded-3xl" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map(function (_, i) { return <div key={i} className="h-32 bg-muted/40 rounded-3xl" />; })}
        </div>
        <div className="grid gap-6 md:grid-cols-12">
           <div className="col-span-12 lg:col-span-8 h-96 bg-muted/40 rounded-3xl" />
           <div className="col-span-12 lg:col-span-4 h-96 bg-muted/40 rounded-3xl" />
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

  // Role-specific greeting
  var greetingText = staffRole === 'owner'
    ? 'Manage your ' + (salon?.salonCategories?.find(c => c.isPrimary)?.name || salon?.category || 'Business')
    : staffRole === 'manager'
      ? 'Manage ' + (salon?.name || 'Salon')
      : 'Welcome back';

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* System Banners */}
      {banners && banners.length > 0 && (
        <div className="space-y-4 mb-4">
          {banners.map(banner => (
            <Alert key={banner.id} className="bg-indigo-500/10 border-indigo-500/20 rounded-2xl">
              <Megaphone className="h-5 w-5 text-indigo-500" />
              <AlertTitle className="text-indigo-600 dark:text-indigo-400 font-bold">{banner.title}</AlertTitle>
              <AlertDescription className="text-sm mt-1 text-indigo-700/80 dark:text-indigo-300/80 font-medium">
                {banner.message}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Hero Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-8 sm:p-10 flex flex-col md:flex-row md:items-end justify-between gap-6 group"
      >
        <div className="absolute top-0 right-10 p-8 opacity-5 pointer-events-none transition-transform duration-1000 group-hover:scale-125 group-hover:rotate-12 translate-y-[-20%]">
          <Activity className="w-64 h-64 text-primary" strokeWidth={1} />
        </div>
        
        <div className="relative z-10 flex flex-col gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-background/80 backdrop-blur-md border border-primary/20 text-xs font-semibold text-primary w-fit">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live Command Center</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight max-w-2xl">
            {greetingText}
          </h1>
          <p className="text-muted-foreground text-lg font-medium">
            {today}
          </p>
        </div>

        <div className="relative z-10 shrink-0">
          <Button asChild size="lg" className="rounded-xl shadow-lg hover:shadow-xl transition-all h-14 px-6 w-full md:w-auto text-base">
            <Link href={calendarUrl}>
              <Plus className="mr-2 h-5 w-5" />
              New Booking
            </Link>
          </Button>
        </div>
      </motion.div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-8"
      >
        {/* Stat cards — full for owner/manager, limited for staff/receptionist */}
        {showFinancials ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Today's Appointments"
              value={dashboardStats.todayBookings}
              icon={Calendar}
              description="scheduled for today"
            />
            <StatCard
              title="Today's Revenue"
              value={formatCurrency(Number(dashboardStats.todayRevenue), salon?.currency)}
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
              title="Pending Requests"
              value={dashboardStats.pendingBookings}
              icon={Clock}
              description="awaiting confirmation"
            />
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <StatCard
              title="My Upcoming Appointments"
              value={upcomingBookings?.length || 0}
              icon={Calendar}
              description="scheduled ahead"
            />
            <StatCard
              title="Today"
              value={format(new Date(), 'EEEE')}
              icon={Clock}
              description={format(new Date(), 'MMMM d, yyyy')}
            />
          </div>
        )}

        {/* Deep Dive Grids */}
        <div className="grid gap-8 lg:grid-cols-12 items-start">
          
          {/* Upcoming Schedule */}
          <motion.div variants={itemVariants} className="lg:col-span-8 bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl overflow-hidden shadow-sm flex flex-col h-full">
            <div className="p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 bg-muted/5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center shrink-0">
                  <Calendar className="w-6 h-6 text-indigo-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">
                    {showAllBookings ? 'Upcoming Pipeline' : 'My Next Appointments'}
                  </h2>
                  <p className="text-sm font-medium text-muted-foreground mt-0.5">
                    {showAllBookings ? 'The business book of work' : 'Your personal assignment queue'}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" asChild className="shrink-0 text-primary hover:text-primary hover:bg-primary/10 rounded-xl font-bold">
                <Link href={bookingsUrl}>
                  View Schedule
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
            
            <div className="p-4 sm:p-6 flex-1 bg-background">
              {bookingsLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map(function (_, i) { return <Skeleton key={i} className="h-20 w-full rounded-2xl" />; })}
                </div>
              ) : upcomingBookings && upcomingBookings.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <AnimatePresence>
                    {upcomingBookings.map(function (booking, i) {
                      return (
                         <motion.div
                           initial={{ opacity: 0, x: -10 }}
                           animate={{ opacity: 1, x: 0 }}
                           transition={{ delay: i * 0.05 }}
                           key={booking.id}
                         >
                           <BookingItem booking={booking} salonId={salonId} />
                         </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center h-full">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Calendar className="w-8 h-8 text-muted-foreground opacity-30" />
                  </div>
                  <h3 className="font-bold text-lg">Your queue is clear</h3>
                  <p className="text-sm font-medium text-muted-foreground mt-1 max-w-[250px]">No immediate appointments require your attention right now.</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div variants={itemVariants} className="lg:col-span-4 bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl overflow-hidden shadow-sm">
             <div className="p-6 sm:p-8 flex items-center gap-4 border-b border-border/50 bg-muted/5">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Briefcase className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Quick Tools</h2>
                  <p className="text-sm font-medium text-muted-foreground mt-0.5">Rapid platform routing</p>
                </div>
             </div>
            
            <div className="p-6 flex flex-col gap-3">
              <Button variant="outline" className="justify-start h-14 rounded-2xl border-border/50 hover:bg-primary/5 hover:border-primary/20 hover:text-primary transition-colors font-bold text-[15px]" asChild>
                <Link href={calendarUrl}>
                  <Calendar className="mr-3 h-5 w-5 text-muted-foreground shrink-0" />
                  Interactive Calendar
                </Link>
              </Button>
              {canAccessPage(staffRole, 'clients', customPermissions) && (
                <Button variant="outline" className="justify-start h-14 rounded-2xl border-border/50 hover:bg-primary/5 hover:border-primary/20 hover:text-primary transition-colors font-bold text-[15px]" asChild>
                  <Link href={clientsUrl}>
                    <Users className="mr-3 h-5 w-5 text-muted-foreground shrink-0" />
                    Client Database
                  </Link>
                </Button>
              )}
              {canAccessPage(staffRole, 'reports', customPermissions) && (
                <Button variant="outline" className="justify-start h-14 rounded-2xl border-border/50 hover:bg-primary/5 hover:border-primary/20 hover:text-primary transition-colors font-bold text-[15px]" asChild>
                  <Link href={reportsUrl}>
                    <TrendingUp className="mr-3 h-5 w-5 text-muted-foreground shrink-0" />
                    Financial Analytics
                  </Link>
                </Button>
              )}
              {canAccessPage(staffRole, 'services', customPermissions) && (
                <Button variant="outline" className="justify-start h-14 rounded-2xl border-border/50 hover:bg-primary/5 hover:border-primary/20 hover:text-primary transition-colors font-bold text-[15px]" asChild>
                  <Link href={servicesUrl}>
                    <Plus className="mr-3 h-5 w-5 text-muted-foreground shrink-0" />
                    Menu & Services
                  </Link>
                </Button>
              )}
            </div>
          </motion.div>

        </div>
      </motion.div>
    </div>
  );
}
