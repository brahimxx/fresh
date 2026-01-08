'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Download,
  CalendarRange,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Globe,
  Smartphone,
  Users,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import {
  useBookingsReport,
  DATE_RANGES,
  getDateRange,
  formatDateRange,
  formatPercentage,
  formatChange,
  calculateChange,
  exportToCSV,
} from '@/hooks/use-reports';

function BookingsChart({ data }) {
  var maxValue = Math.max(...(data || [1]));
  
  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2 h-48">
        {(data || []).map(function(value, index) {
          var height = maxValue > 0 ? (value / maxValue) * 100 : 0;
          return (
            <div key={index} className="flex-1 flex flex-col items-center gap-1">
              <div className="text-xs text-muted-foreground">{value}</div>
              <div
                className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-400"
                style={{ height: height + '%', minHeight: '4px' }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  var config = {
    completed: { variant: 'success', icon: CheckCircle, label: 'Completed' },
    confirmed: { variant: 'default', icon: CheckCircle, label: 'Confirmed' },
    pending: { variant: 'secondary', icon: Clock, label: 'Pending' },
    cancelled: { variant: 'destructive', icon: XCircle, label: 'Cancelled' },
    no_show: { variant: 'outline', icon: AlertCircle, label: 'No-Show' },
  };
  
  var item = config[status] || config.pending;
  var Icon = item.icon;
  
  return (
    <Badge variant={item.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {item.label}
    </Badge>
  );
}

export default function BookingsReportPage() {
  var params = useParams();
  var [rangeType, setRangeType] = useState('last_30_days');
  var dateRange = getDateRange(rangeType);
  
  var { data: report, isLoading } = useBookingsReport(params.salonId, dateRange);
  
  // Mock data for demonstration
  var mockReport = {
    total: 156,
    previous: 142,
    completed: 138,
    cancelled: 12,
    noShow: 6,
    pending: 0,
    completionRate: 88.5,
    daily: [5, 8, 6, 7, 12, 4, 3, 6, 9, 7, 8, 5, 6, 10],
    byStatus: [
      { status: 'completed', count: 138, percentage: 88.5 },
      { status: 'cancelled', count: 12, percentage: 7.7 },
      { status: 'no_show', count: 6, percentage: 3.8 },
    ],
    bySource: [
      { source: 'Direct Booking', count: 89, percentage: 57.1, icon: 'globe' },
      { source: 'Marketplace', count: 45, percentage: 28.8, icon: 'users' },
      { source: 'Mobile App', count: 22, percentage: 14.1, icon: 'smartphone' },
    ],
    popularServices: [
      { name: 'Haircut', count: 45, avgDuration: 45 },
      { name: 'Color', count: 28, avgDuration: 90 },
      { name: 'Blowout', count: 32, avgDuration: 30 },
      { name: 'Highlights', count: 15, avgDuration: 120 },
      { name: 'Trim', count: 24, avgDuration: 20 },
    ],
    byTimeSlot: [
      { time: '9:00 - 10:00', count: 18 },
      { time: '10:00 - 11:00', count: 25 },
      { time: '11:00 - 12:00', count: 22 },
      { time: '12:00 - 13:00', count: 12 },
      { time: '13:00 - 14:00', count: 15 },
      { time: '14:00 - 15:00', count: 28 },
      { time: '15:00 - 16:00', count: 20 },
      { time: '16:00 - 17:00', count: 16 },
    ],
  };
  
  var data = report || mockReport;
  var change = calculateChange(data.total, data.previous);
  
  function handleExport() {
    exportToCSV(data.popularServices, 'bookings-by-service');
  }
  
  function getSourceIcon(icon) {
    switch (icon) {
      case 'globe': return Globe;
      case 'smartphone': return Smartphone;
      case 'users': return Users;
      default: return Globe;
    }
  }
  
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(function(i) {
              return <div key={i} className="h-28 bg-muted rounded" />;
            })}
          </div>
          <div className="h-72 bg-muted rounded" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={'/dashboard/salon/' + params.salonId + '/reports'}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Bookings Report</h1>
            <p className="text-muted-foreground">
              {formatDateRange(dateRange.start, dateRange.end)}
            </p>
          </div>
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
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Bookings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.total}</div>
            <div className="flex items-center gap-1 mt-1">
              {change >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span className={'text-sm ' + (change >= 0 ? 'text-green-500' : 'text-red-500')}>
                {formatChange(change)}
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{data.completed}</div>
            <div className="text-sm text-muted-foreground">
              {formatPercentage(data.completionRate)} completion rate
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cancelled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{data.cancelled}</div>
            <div className="text-sm text-muted-foreground">
              {formatPercentage((data.cancelled / data.total) * 100)} of total
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              No-Shows
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{data.noShow}</div>
            <div className="text-sm text-muted-foreground">
              {formatPercentage((data.noShow / data.total) * 100)} of total
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Bookings Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Bookings Trend</CardTitle>
          <CardDescription>Daily bookings over selected period</CardDescription>
        </CardHeader>
        <CardContent>
          <BookingsChart data={data.daily} />
        </CardContent>
      </Card>
      
      {/* Breakdown Row */}
      <div className="grid grid-cols-3 gap-6">
        {/* By Status */}
        <Card>
          <CardHeader>
            <CardTitle>By Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(data.byStatus || []).map(function(item) {
              return (
                <div key={item.status} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <StatusBadge status={item.status} />
                    <div className="text-right">
                      <span className="font-medium">{item.count}</span>
                      <span className="text-muted-foreground ml-2">
                        ({formatPercentage(item.percentage, 0)})
                      </span>
                    </div>
                  </div>
                  <Progress 
                    value={item.percentage} 
                    className={
                      'h-2 ' +
                      (item.status === 'completed' ? '' : 
                       item.status === 'cancelled' ? '[&>div]:bg-amber-500' : 
                       '[&>div]:bg-red-500')
                    }
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
        
        {/* By Source */}
        <Card>
          <CardHeader>
            <CardTitle>By Booking Source</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(data.bySource || []).map(function(item) {
              var Icon = getSourceIcon(item.icon);
              return (
                <div key={item.source} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{item.source}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium">{item.count}</span>
                      <span className="text-muted-foreground ml-2">
                        ({formatPercentage(item.percentage, 0)})
                      </span>
                    </div>
                  </div>
                  <Progress value={item.percentage} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>
        
        {/* Peak Hours */}
        <Card>
          <CardHeader>
            <CardTitle>Peak Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(data.byTimeSlot || []).map(function(slot) {
                var maxCount = Math.max(...(data.byTimeSlot || []).map(function(s) { return s.count; }));
                var width = (slot.count / maxCount) * 100;
                return (
                  <div key={slot.time} className="flex items-center gap-2">
                    <div className="w-24 text-sm text-muted-foreground">{slot.time}</div>
                    <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded"
                        style={{ width: width + '%' }}
                      />
                    </div>
                    <div className="w-8 text-sm text-right">{slot.count}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Popular Services Table */}
      <Card>
        <CardHeader>
          <CardTitle>Most Booked Services</CardTitle>
          <CardDescription>Services ranked by booking count</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Service</TableHead>
                <TableHead className="text-right">Bookings</TableHead>
                <TableHead className="text-right">Avg. Duration</TableHead>
                <TableHead className="w-48">Popularity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data.popularServices || []).map(function(service, index) {
                var maxBookings = Math.max(...(data.popularServices || []).map(function(s) { return s.count; }));
                var percentage = (service.count / maxBookings) * 100;
                return (
                  <TableRow key={service.name}>
                    <TableCell>
                      <Badge variant={index < 3 ? 'default' : 'secondary'}>
                        #{index + 1}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{service.name}</TableCell>
                    <TableCell className="text-right">{service.count}</TableCell>
                    <TableCell className="text-right">{service.avgDuration} min</TableCell>
                    <TableCell>
                      <Progress value={percentage} className="h-2" />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
