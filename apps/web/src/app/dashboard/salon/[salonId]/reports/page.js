'use client';

import { useState, useMemo } from 'react';
import { RequirePermission } from '@/components/layout/require-permission';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Users,
  Clock,
  ArrowRight,
  Download,
  CalendarRange,
  BarChart3,
  PieChart,
  Activity,
  LineChart
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';

import {
  useReportsOverview,
  DATE_RANGES,
  getDateRange,
  formatDateRange,
  formatCurrency,
  formatPercentage,
  formatChange,
  calculateChange,
} from '@/hooks/use-reports';
import { useSalon } from '@/providers/salon-provider';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
};

function StatCard({ title, value, change, changeLabel, icon: Icon, href, colorClass = "text-primary" }) {
  var isPositive = change >= 0;
  var TrendIcon = isPositive ? TrendingUp : TrendingDown;
  
  var content = (
    <motion.div 
      variants={itemVariants} 
      className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm overflow-hidden relative group hover:bg-background transition-colors duration-500 h-full flex flex-col"
    >
      <div className={`absolute -right-6 -top-6 transition-transform duration-700 group-hover:scale-125 group-hover:-rotate-12 pointer-events-none opacity-5 ${colorClass}`}>
        <Icon className="w-32 h-32" strokeWidth={1} />
      </div>
      <div className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
        <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{title}</h3>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center opacity-20 bg-current ${colorClass}`}>
          <div className="absolute opacity-100 flex items-center justify-center">
             <Icon className={`h-4 w-4 ${colorClass}`} />
          </div>
        </div>
      </div>
      <div className="relative z-10 mt-2 flex-grow flex flex-col justify-end">
        <p className="text-3xl font-extrabold tracking-tight text-foreground">{value}</p>
        {change !== undefined && (
          <div className="flex items-center gap-1.5 mt-2 bg-muted/30 w-fit px-2 py-1 rounded-md">
            <TrendIcon className={`h-3.5 w-3.5 ${isPositive ? 'text-emerald-500' : 'text-red-500'}`} />
            <span className={`text-[13px] font-bold ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
              {formatChange(change)}
            </span>
            {changeLabel && (
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider ml-1">
                {changeLabel}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
  
  if (href) {
    return <Link href={href} className="block h-full">{content}</Link>;
  }
  
  return content;
}

function MiniChart({ data, label, currency }) {
  // Simple bar chart representation
  var maxValue = Math.max(...(data || [1]));
  
  return (
    <div className="space-y-4 py-4">
      <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="flex items-end gap-1.5 h-32">
        {(data || []).map(function(value, index) {
          var height = maxValue > 0 ? Math.max((value / maxValue) * 100, 2) : 2; // minimum height 2%
          return (
            <div
              key={index}
              className="flex-1 bg-primary/20 hover:bg-primary/50 transition-colors rounded-t cursor-crosshair relative group flex flex-col justify-end"
              style={{ height: height + '%' }}
            >
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-background/90 backdrop-blur border border-border/50 text-xs font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl z-20">
                {formatCurrency(value, currency)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ReportsOverviewPage() {
  return (
    <RequirePermission page="reports">
      <ReportsContent />
    </RequirePermission>
  );
}

function ReportsContent() {
  var params = useParams();
  var { salon } = useSalon();
  var currency = salon?.currency || 'EUR';

  var [rangeType, setRangeType] = useState('last_30_days');
  var dateRange = useMemo(function() {
    return getDateRange(rangeType);
  }, [rangeType]);
  
  var { data: report, isLoading } = useReportsOverview(params.salonId, dateRange);
  
  // Mock data for demonstration (replace with real data)
  var mockReport = {
    revenue: {
      total: 12450,
      previous: 10200,
      daily: [420, 380, 520, 450, 680, 320, 540, 480, 620, 510, 440, 390, 470, 530],
    },
    bookings: {
      total: 156,
      previous: 142,
      completed: 138,
      cancelled: 12,
      noShow: 6,
    },
    clients: {
      total: 89,
      new: 23,
      returning: 66,
      previous: 78,
    },
    staff: {
      utilization: 78,
      topPerformer: 'Sophie',
      topPerformerRevenue: 4250,
    },
    services: {
      popular: [
        { name: 'Haircut', count: 45, revenue: 1575 },
        { name: 'Color', count: 28, revenue: 2100 },
        { name: 'Blowout', count: 32, revenue: 960 },
        { name: 'Trim', count: 24, revenue: 600 },
      ],
    },
  };
  
  var data = report || mockReport;
  
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-8">
        <div className="flex justify-between h-32 bg-muted/30 rounded-3xl" />
        <div className="grid grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(function(i) {
            return <div key={i} className="h-40 bg-muted/20 rounded-3xl" />;
          })}
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="h-96 bg-muted/20 rounded-3xl" />
          <div className="h-96 bg-muted/20 rounded-3xl" />
        </div>
      </div>
    );
  }
  
  var revenueChange = calculateChange(data.revenue?.total, data.revenue?.previous);
  var bookingsChange = calculateChange(data.bookings?.total, data.bookings?.previous);
  var clientsChange = calculateChange(data.clients?.total, data.clients?.previous);
  
  return (
    <div className="space-y-8">
      {/* Decorative Hero */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-8 sm:p-10 flex flex-col md:flex-row md:items-end justify-between gap-6 group"
      >
        <div className="absolute top-0 right-10 p-8 opacity-5 pointer-events-none transition-transform duration-1000 group-hover:scale-125 group-hover:rotate-12 translate-y-[-20%]">
          <LineChart className="w-64 h-64 text-primary" strokeWidth={1} />
        </div>
        
        <div className="relative z-10 flex flex-col gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-background/80 backdrop-blur-md border border-primary/20 text-xs font-semibold text-primary w-fit">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Intelligence Hub</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight max-w-2xl">
            Reports & Analytics
          </h1>
          <p className="text-muted-foreground text-lg font-medium max-w-xl">
            Visualize your business trajectory. Analyze revenue, booking velocity, and client retention across {formatDateRange(dateRange.start, dateRange.end)}.
          </p>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row gap-3 shrink-0 items-center">
           <Select value={rangeType} onValueChange={setRangeType}>
            <SelectTrigger className="w-full sm:w-48 h-12 bg-background/50 backdrop-blur-md rounded-xl border-border/50 shadow-sm font-semibold text-[14px]">
              <CalendarRange className="h-4 w-4 mr-2 opacity-50" />
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border/50 shadow-xl">
              {DATE_RANGES.filter(function(r) { return r.value !== 'custom'; }).map(function(range) {
                return (
                  <SelectItem key={range.value} value={range.value} className="font-semibold rounded-lg">
                    {range.label}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <Button
            className="flex-1 sm:flex-none h-12 px-6 rounded-xl shadow-md text-[15px]"
          >
            <Download className="h-5 w-5 mr-2" />
            Export Data
          </Button>
        </div>
      </motion.div>
      
      {/* Key Metrics */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <StatCard
          title="Total Revenue"
          value={formatCurrency(data.revenue?.total, currency)}
          change={revenueChange}
          changeLabel="vs last period"
          icon={DollarSign}
          colorClass="text-emerald-500"
          href={`/dashboard/salon/${params.salonId}/reports/revenue`}
        />
        <StatCard
          title="Total Bookings"
          value={data.bookings?.total || 0}
          change={bookingsChange}
          changeLabel="vs last period"
          icon={Calendar}
          colorClass="text-blue-500"
          href={`/dashboard/salon/${params.salonId}/reports/bookings`}
        />
        <StatCard
          title="Total Clients"
          value={data.clients?.total || 0}
          change={clientsChange}
          changeLabel="vs last period"
          icon={Users}
          colorClass="text-purple-500"
          href={`/dashboard/salon/${params.salonId}/reports/clients`}
        />
        <StatCard
          title="Staff Utilization"
          value={formatPercentage(data.staff?.utilization)}
          icon={Clock}
          colorClass="text-amber-500"
          href={`/dashboard/salon/${params.salonId}/reports/staff`}
        />
      </motion.div>
      
      {/* Charts Row */}
      <motion.div variants={itemVariants} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm overflow-hidden flex flex-col">
          <div className="flex flex-row items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold">Revenue Trend</h3>
              <p className="text-sm font-medium text-muted-foreground">Daily revenue over selected period</p>
            </div>
            <Link href={`/dashboard/salon/${params.salonId}/reports/revenue`}>
              <Button variant="ghost" size="sm" className="rounded-xl h-9 hover:bg-muted font-bold text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground">
                Drill Down
                <ArrowRight className="h-3.5 w-3.5 ml-2" />
              </Button>
            </Link>
          </div>
          <div className="flex-grow">
            <MiniChart data={data.revenue?.daily} label="Daily Revenue" currency={currency} />
            <div className="mt-6 flex justify-between bg-muted/40 p-4 rounded-2xl border border-border/50">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Average Daily</span>
                <span className="text-lg font-extrabold text-foreground">
                  {formatCurrency((data.revenue?.total || 0) / (data.revenue?.daily?.length || 1), currency)}
                </span>
              </div>
              <div className="h-10 w-px bg-border/50" />
              <div className="flex flex-col items-end">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Highest Peak</span>
                <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(Math.max(...(data.revenue?.daily || [0])), currency)}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Bookings Breakdown */}
        <div className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm overflow-hidden flex flex-col">
          <div className="flex flex-row items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold">Bookings Anatomy</h3>
              <p className="text-sm font-medium text-muted-foreground">Status distribution and fulfillment</p>
            </div>
            <Link href={`/dashboard/salon/${params.salonId}/reports/bookings`}>
              <Button variant="ghost" size="sm" className="rounded-xl h-9 hover:bg-muted font-bold text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground">
                Drill Down
                <ArrowRight className="h-3.5 w-3.5 ml-2" />
              </Button>
            </Link>
          </div>
          <div className="flex-grow flex flex-col justify-center space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="font-bold flex items-center gap-2">
                   <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>Completed
                </span>
                <span className="font-extrabold text-lg">{data.bookings?.completed || 0}</span>
              </div>
              <Progress 
                value={(data.bookings?.completed || 0) / (data.bookings?.total || 1) * 100} 
                className="h-3 rounded-full bg-emerald-500/10 [&>div]:bg-emerald-500"
              />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="font-bold flex items-center gap-2">
                   <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>Cancelled
                </span>
                <span className="font-extrabold text-lg">{data.bookings?.cancelled || 0}</span>
              </div>
              <Progress 
                value={(data.bookings?.cancelled || 0) / (data.bookings?.total || 1) * 100}
                className="h-3 rounded-full bg-amber-500/10 [&>div]:bg-amber-500"
              />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="font-bold flex items-center gap-2">
                   <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>No-Show
                </span>
                <span className="font-extrabold text-lg flex items-center text-red-600">{data.bookings?.noShow || 0}</span>
              </div>
              <Progress 
                value={(data.bookings?.noShow || 0) / (data.bookings?.total || 1) * 100}
                className="h-3 rounded-full bg-red-500/10 [&>div]:bg-red-500"
              />
            </div>
          </div>
        </div>
      </motion.div>
      
      {/* Second Row */}
      <motion.div variants={itemVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* New vs Returning Clients */}
        <div className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm overflow-hidden flex flex-col">
          <div className="mb-4">
            <h3 className="text-lg font-bold">Client Acquisition</h3>
            <p className="text-sm font-medium text-muted-foreground">Demographic splits</p>
          </div>
          <div className="flex-grow flex flex-col justify-center">
            <div className="flex items-center justify-around bg-muted/30 p-6 rounded-2xl border border-border/50 mb-6">
              <div className="text-center">
                <div className="text-4xl font-extrabold text-indigo-500">
                  {data.clients?.new || 0}
                </div>
                <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mt-1">First-Time</div>
              </div>
              <div className="h-16 w-px bg-border/80" />
              <div className="text-center">
                <div className="text-4xl font-extrabold text-blue-500">
                  {data.clients?.returning || 0}
                </div>
                <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mt-1">Loyal Base</div>
              </div>
            </div>
            <div className="mt-auto">
              <div className="h-4 w-full flex rounded-full overflow-hidden mb-2">
                 <div className="bg-indigo-500 h-full" style={{ width: `${(data.clients?.new || 0) / (data.clients?.total || 1) * 100}%` }}></div>
                 <div className="bg-blue-500 h-full" style={{ width: `${(data.clients?.returning || 0) / (data.clients?.total || 1) * 100}%` }}></div>
              </div>
              <div className="flex justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-wider mt-2">
                <span>New {formatPercentage((data.clients?.new || 0) / (data.clients?.total || 1) * 100)}</span>
                <span>Returning {formatPercentage((data.clients?.returning || 0) / (data.clients?.total || 1) * 100)}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Top Performer */}
        <div className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm overflow-hidden flex flex-col">
          <div className="mb-4">
            <h3 className="text-lg font-bold">Staff Ace</h3>
            <p className="text-sm font-medium text-muted-foreground">Top earning operative</p>
          </div>
          <div className="flex-grow flex flex-col items-center justify-center text-center">
            <div className="relative mb-6 group">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl group-hover:bg-primary/40 transition-colors"></div>
                <div className="relative h-24 w-24 rounded-full bg-background border-4 border-primary/20 flex items-center justify-center shadow-xl">
                  <span className="text-4xl font-extrabold text-primary">
                    {(data.staff?.topPerformer || 'N')[0]}
                  </span>
                </div>
            </div>
            <div>
              <div className="text-2xl font-extrabold tracking-tight mb-1">{data.staff?.topPerformer || 'N/A'}</div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-[13px] font-bold text-emerald-600 dark:text-emerald-400">
                Generated {formatCurrency(data.staff?.topPerformerRevenue, currency)}
              </div>
            </div>
          </div>
          <Link href={`/dashboard/salon/${params.salonId}/reports/staff`}>
            <Button variant="outline" size="sm" className="w-full mt-6 rounded-xl border-border/50 bg-background/50 backdrop-blur font-bold text-xs uppercase tracking-wider h-11">
              Analyze Team Directory
            </Button>
          </Link>
        </div>
        
        {/* Popular Services */}
        <div className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm overflow-hidden flex flex-col bg-[url('/bg-patterns/waves.svg')] bg-cover bg-center">
          <div className="mb-6 relative z-10">
            <h3 className="text-lg font-bold">Menu Favorites</h3>
            <p className="text-sm font-medium text-muted-foreground">Most demanded services</p>
          </div>
          <div className="flex-grow flex flex-col space-y-4 relative z-10">
            {(data.services?.popular || []).slice(0, 4).map(function(service, index) {
              return (
                <div key={service.name} className="flex items-center justify-between bg-background/80 backdrop-blur p-3 rounded-2xl border border-border/50 shadow-sm transition-transform hover:scale-[1.02]">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-extrabold text-primary">
                      #{index + 1}
                    </div>
                    <span className="text-[15px] font-bold">{service.name}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="font-extrabold">{service.count}x</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
      
      {/* Quick Links Row */}
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href={`/dashboard/salon/${params.salonId}/reports/revenue`} className="block">
          <div className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm overflow-hidden group hover:bg-background hover:-translate-y-1 transition-all duration-300">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 group-hover:rotate-6">
                <BarChart3 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <div className="font-extrabold text-[15px]">Fiscal Logs</div>
                <div className="text-[12px] font-semibold text-muted-foreground mt-0.5">Micro-analysis</div>
              </div>
            </div>
          </div>
        </Link>
        
        <Link href={`/dashboard/salon/${params.salonId}/reports/bookings`} className="block">
          <div className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm overflow-hidden group hover:bg-background hover:-translate-y-1 transition-all duration-300">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="h-14 w-14 rounded-2xl bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 group-hover:-rotate-6">
                <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="font-extrabold text-[15px]">Booking Logs</div>
                <div className="text-[12px] font-semibold text-muted-foreground mt-0.5">Velocity trends</div>
              </div>
            </div>
          </div>
        </Link>
        
        <Link href={`/dashboard/salon/${params.salonId}/reports/clients`} className="block">
           <div className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm overflow-hidden group hover:bg-background hover:-translate-y-1 transition-all duration-300">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="h-14 w-14 rounded-2xl bg-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 group-hover:rotate-6">
                <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="font-extrabold text-[15px]">Client Logs</div>
                <div className="text-[12px] font-semibold text-muted-foreground mt-0.5">Retention index</div>
              </div>
            </div>
          </div>
        </Link>
        
        <Link href={`/dashboard/salon/${params.salonId}/reports/staff`} className="block">
          <div className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm overflow-hidden group hover:bg-background hover:-translate-y-1 transition-all duration-300">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="h-14 w-14 rounded-2xl bg-amber-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 group-hover:-rotate-6">
                <Activity className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <div className="font-extrabold text-[15px]">Staff Matrix</div>
                <div className="text-[12px] font-semibold text-muted-foreground mt-0.5">Performance</div>
              </div>
            </div>
          </div>
        </Link>
      </motion.div>
    </div>
  );
}

