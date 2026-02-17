'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
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

function StatCard({ title, value, change, changeLabel, icon: Icon, trend, href }) {
  var isPositive = change >= 0;
  var TrendIcon = isPositive ? TrendingUp : TrendingDown;
  
  var content = (
    <Card className={href ? 'hover:border-primary/50 transition-colors cursor-pointer' : ''}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <div className="flex items-center gap-1 mt-1">
            <TrendIcon className={'h-4 w-4 ' + (isPositive ? 'text-green-500' : 'text-red-500')} />
            <span className={'text-sm ' + (isPositive ? 'text-green-500' : 'text-red-500')}>
              {formatChange(change)}
            </span>
            {changeLabel && (
              <span className="text-sm text-muted-foreground">
                {changeLabel}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
  
  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  
  return content;
}

function MiniChart({ data, label }) {
  // Simple bar chart representation
  var maxValue = Math.max(...(data || [1]));
  
  return (
    <div className="space-y-2">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="flex items-end gap-1 h-16">
        {(data || []).map(function(value, index) {
          var height = maxValue > 0 ? (value / maxValue) * 100 : 0;
          return (
            <div
              key={index}
              className="flex-1 bg-primary/80 rounded-t"
              style={{ height: height + '%' }}
              title={formatCurrency(value)}
            />
          );
        })}
      </div>
    </div>
  );
}

export default function ReportsOverviewPage() {
  var params = useParams();
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
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="flex justify-between">
            <div className="h-8 w-48 bg-muted rounded" />
            <div className="h-10 w-40 bg-muted rounded" />
          </div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(function(i) {
              return <div key={i} className="h-32 bg-muted rounded" />;
            })}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-80 bg-muted rounded" />
            <div className="h-80 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }
  
  var revenueChange = calculateChange(data.revenue?.total, data.revenue?.previous);
  var bookingsChange = calculateChange(data.bookings?.total, data.bookings?.previous);
  var clientsChange = calculateChange(data.clients?.total, data.clients?.previous);
  
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            {formatDateRange(dateRange.start, dateRange.end)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={rangeType} onValueChange={setRangeType}>
            <SelectTrigger className="w-44">
              <CalendarRange className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGES.filter(function(r) { return r.value !== 'custom'; }).map(function(range) {
                return (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(data.revenue?.total)}
          change={revenueChange}
          changeLabel="vs last period"
          icon={DollarSign}
          href={'/dashboard/salon/' + params.salonId + '/reports/revenue'}
        />
        <StatCard
          title="Total Bookings"
          value={data.bookings?.total || 0}
          change={bookingsChange}
          changeLabel="vs last period"
          icon={Calendar}
          href={'/dashboard/salon/' + params.salonId + '/reports/bookings'}
        />
        <StatCard
          title="Total Clients"
          value={data.clients?.total || 0}
          change={clientsChange}
          changeLabel="vs last period"
          icon={Users}
          href={'/dashboard/salon/' + params.salonId + '/reports/clients'}
        />
        <StatCard
          title="Staff Utilization"
          value={formatPercentage(data.staff?.utilization)}
          icon={Clock}
          href={'/dashboard/salon/' + params.salonId + '/reports/staff'}
        />
      </div>
      
      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Revenue Trend</CardTitle>
              <CardDescription>Daily revenue over selected period</CardDescription>
            </div>
            <Link href={'/dashboard/salon/' + params.salonId + '/reports/revenue'}>
              <Button variant="ghost" size="sm">
                View Details
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <MiniChart data={data.revenue?.daily} label="Daily Revenue" />
            <div className="mt-4 flex justify-between text-sm">
              <div>
                <span className="text-muted-foreground">Average: </span>
                <span className="font-medium">
                  {formatCurrency((data.revenue?.total || 0) / (data.revenue?.daily?.length || 1))}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Best Day: </span>
                <span className="font-medium">
                  {formatCurrency(Math.max(...(data.revenue?.daily || [0])))}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Bookings Breakdown */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Bookings Breakdown</CardTitle>
              <CardDescription>Status distribution</CardDescription>
            </div>
            <Link href={'/dashboard/salon/' + params.salonId + '/reports/bookings'}>
              <Button variant="ghost" size="sm">
                View Details
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Completed</span>
                <span className="font-medium">{data.bookings?.completed || 0}</span>
              </div>
              <Progress 
                value={(data.bookings?.completed || 0) / (data.bookings?.total || 1) * 100} 
                className="h-2"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-amber-600">Cancelled</span>
                <span className="font-medium">{data.bookings?.cancelled || 0}</span>
              </div>
              <Progress 
                value={(data.bookings?.cancelled || 0) / (data.bookings?.total || 1) * 100}
                className="h-2 [&>div]:bg-amber-500"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-red-600">No-Show</span>
                <span className="font-medium">{data.bookings?.noShow || 0}</span>
              </div>
              <Progress 
                value={(data.bookings?.noShow || 0) / (data.bookings?.total || 1) * 100}
                className="h-2 [&>div]:bg-red-500"
              />
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Second Row */}
      <div className="grid grid-cols-3 gap-6">
        {/* New vs Returning Clients */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Client Acquisition</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center gap-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {data.clients?.new || 0}
                </div>
                <div className="text-sm text-muted-foreground">New</div>
              </div>
              <div className="h-16 w-px bg-border" />
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {data.clients?.returning || 0}
                </div>
                <div className="text-sm text-muted-foreground">Returning</div>
              </div>
            </div>
            <div className="mt-4">
              <Progress 
                value={(data.clients?.returning || 0) / (data.clients?.total || 1) * 100}
                className="h-3"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>New {formatPercentage((data.clients?.new || 0) / (data.clients?.total || 1) * 100)}</span>
                <span>Returning {formatPercentage((data.clients?.returning || 0) / (data.clients?.total || 1) * 100)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Top Performer */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Performer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-lg font-semibold text-primary">
                  {(data.staff?.topPerformer || 'N')[0]}
                </span>
              </div>
              <div>
                <div className="font-semibold">{data.staff?.topPerformer || 'N/A'}</div>
                <div className="text-sm text-muted-foreground">
                  {formatCurrency(data.staff?.topPerformerRevenue)} revenue
                </div>
              </div>
            </div>
            <Link href={'/dashboard/salon/' + params.salonId + '/reports/staff'}>
              <Button variant="outline" size="sm" className="w-full mt-4">
                View All Staff
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>
        
        {/* Popular Services */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(data.services?.popular || []).slice(0, 3).map(function(service, index) {
                return (
                  <div key={service.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        #{index + 1}
                      </span>
                      <span className="text-sm">{service.name}</span>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">{service.count}</span>
                      <span className="text-muted-foreground ml-1">bookings</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Quick Links */}
      <div className="grid grid-cols-4 gap-4">
        <Link href={'/dashboard/salon/' + params.salonId + '/reports/revenue'}>
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="font-medium">Revenue Report</div>
                  <div className="text-sm text-muted-foreground">Detailed breakdown</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        
        <Link href={'/dashboard/salon/' + params.salonId + '/reports/bookings'}>
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium">Bookings Report</div>
                  <div className="text-sm text-muted-foreground">Trends & analysis</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        
        <Link href={'/dashboard/salon/' + params.salonId + '/reports/clients'}>
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <div className="font-medium">Clients Report</div>
                  <div className="text-sm text-muted-foreground">Retention & growth</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        
        <Link href={'/dashboard/salon/' + params.salonId + '/reports/staff'}>
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <div className="font-medium">Staff Report</div>
                  <div className="text-sm text-muted-foreground">Performance metrics</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
