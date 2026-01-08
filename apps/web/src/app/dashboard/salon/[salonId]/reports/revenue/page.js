'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Download,
  CalendarRange,
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Banknote,
  Gift,
  Scissors,
  Package,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import {
  useRevenueReport,
  DATE_RANGES,
  getDateRange,
  formatDateRange,
  formatCurrency,
  formatPercentage,
  formatChange,
  calculateChange,
  exportToCSV,
} from '@/hooks/use-reports';

function RevenueChart({ data }) {
  var maxValue = Math.max(...(data || [1]));
  var days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2 h-48">
        {(data || []).map(function(value, index) {
          var height = maxValue > 0 ? (value / maxValue) * 100 : 0;
          return (
            <div key={index} className="flex-1 flex flex-col items-center gap-1">
              <div className="text-xs text-muted-foreground">
                {formatCurrency(value)}
              </div>
              <div
                className="w-full bg-primary rounded-t transition-all hover:bg-primary/80"
                style={{ height: height + '%', minHeight: '4px' }}
              />
              <div className="text-xs text-muted-foreground">
                {days[index % 7]}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function RevenueReportPage() {
  var params = useParams();
  var [rangeType, setRangeType] = useState('last_30_days');
  var dateRange = getDateRange(rangeType);
  
  var { data: report, isLoading } = useRevenueReport(params.salonId, dateRange);
  
  // Mock data for demonstration
  var mockReport = {
    total: 12450,
    previous: 10200,
    average: 415,
    highest: 890,
    lowest: 180,
    daily: [420, 380, 520, 450, 680, 320, 540, 480, 620, 510, 440, 390, 470, 530],
    byPaymentMethod: [
      { method: 'Card', amount: 8715, percentage: 70 },
      { method: 'Cash', amount: 2490, percentage: 20 },
      { method: 'Gift Card', amount: 1245, percentage: 10 },
    ],
    byService: [
      { name: 'Haircut', count: 45, revenue: 1575, percentage: 12.6 },
      { name: 'Color', count: 28, revenue: 2100, percentage: 16.9 },
      { name: 'Highlights', count: 15, revenue: 1875, percentage: 15.1 },
      { name: 'Blowout', count: 32, revenue: 960, percentage: 7.7 },
      { name: 'Trim', count: 24, revenue: 600, percentage: 4.8 },
      { name: 'Treatment', count: 18, revenue: 1260, percentage: 10.1 },
      { name: 'Styling', count: 22, revenue: 880, percentage: 7.1 },
      { name: 'Other', count: 40, revenue: 3200, percentage: 25.7 },
    ],
    byCategory: [
      { name: 'Hair Services', revenue: 8250, percentage: 66.3 },
      { name: 'Products', revenue: 2350, percentage: 18.9 },
      { name: 'Packages', revenue: 1850, percentage: 14.8 },
    ],
  };
  
  var data = report || mockReport;
  var change = calculateChange(data.total, data.previous);
  
  function handleExport() {
    exportToCSV(data.byService, 'revenue-by-service');
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
            <h1 className="text-2xl font-bold">Revenue Report</h1>
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
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.total)}</div>
            <div className="flex items-center gap-1 mt-1">
              {change >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span className={'text-sm ' + (change >= 0 ? 'text-green-500' : 'text-red-500')}>
                {formatChange(change)}
              </span>
              <span className="text-sm text-muted-foreground">vs previous</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Daily Average
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.average)}</div>
            <div className="text-sm text-muted-foreground">per day</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Best Day
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(data.highest)}</div>
            <div className="text-sm text-muted-foreground">highest revenue</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Slowest Day
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{formatCurrency(data.lowest)}</div>
            <div className="text-sm text-muted-foreground">lowest revenue</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
          <CardDescription>Daily revenue over selected period</CardDescription>
        </CardHeader>
        <CardContent>
          <RevenueChart data={data.daily} />
        </CardContent>
      </Card>
      
      {/* Breakdown Row */}
      <div className="grid grid-cols-2 gap-6">
        {/* By Payment Method */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Payment Method</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(data.byPaymentMethod || []).map(function(item) {
              var Icon = item.method === 'Card' ? CreditCard : 
                         item.method === 'Cash' ? Banknote : Gift;
              return (
                <div key={item.method} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{item.method}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium">{formatCurrency(item.amount)}</span>
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
        
        {/* By Category */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Category</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(data.byCategory || []).map(function(item) {
              var Icon = item.name === 'Hair Services' ? Scissors : 
                         item.name === 'Packages' ? Package : DollarSign;
              return (
                <div key={item.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium">{formatCurrency(item.revenue)}</span>
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
      </div>
      
      {/* Revenue by Service Table */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue by Service</CardTitle>
          <CardDescription>Detailed breakdown of revenue per service</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead className="text-right">Bookings</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">% of Total</TableHead>
                <TableHead className="w-40">Share</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data.byService || []).map(function(service) {
                return (
                  <TableRow key={service.name}>
                    <TableCell className="font-medium">{service.name}</TableCell>
                    <TableCell className="text-right">{service.count}</TableCell>
                    <TableCell className="text-right">{formatCurrency(service.revenue)}</TableCell>
                    <TableCell className="text-right">{formatPercentage(service.percentage)}</TableCell>
                    <TableCell>
                      <Progress value={service.percentage} className="h-2" />
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
