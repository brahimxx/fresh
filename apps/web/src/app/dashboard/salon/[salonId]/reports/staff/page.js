'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Download,
  CalendarRange,
  Users,
  Clock,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Star,
  Award,
  Calendar,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  useStaffReport,
  DATE_RANGES,
  getDateRange,
  formatDateRange,
  formatCurrency,
  formatPercentage,
  exportToCSV,
} from '@/hooks/use-reports';

function StaffCard({ staff, rank }) {
  var isTopPerformer = rank === 1;
  
  return (
    <Card className={isTopPerformer ? 'border-amber-500 bg-amber-50/50' : ''}>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="relative">
            <Avatar className="h-14 w-14">
              <AvatarImage src={staff.avatar} />
              <AvatarFallback className="text-lg">
                {(staff.name || 'U')[0]}
              </AvatarFallback>
            </Avatar>
            {isTopPerformer && (
              <div className="absolute -top-1 -right-1 h-6 w-6 bg-amber-500 rounded-full flex items-center justify-center">
                <Award className="h-4 w-4 text-white" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{staff.name}</h3>
              {isTopPerformer && (
                <Badge variant="default" className="bg-amber-500">
                  Top Performer
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{staff.role}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center">
            <div className="text-xl font-bold">{staff.bookings}</div>
            <div className="text-xs text-muted-foreground">Bookings</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold">{formatCurrency(staff.revenue)}</div>
            <div className="text-xs text-muted-foreground">Revenue</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold flex items-center justify-center gap-1">
              <Star className="h-4 w-4 text-amber-500" />
              {staff.rating?.toFixed(1) || 'N/A'}
            </div>
            <div className="text-xs text-muted-foreground">Rating</div>
          </div>
        </div>
        
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Utilization</span>
            <span className="font-medium">{formatPercentage(staff.utilization)}</span>
          </div>
          <Progress value={staff.utilization} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function StaffReportPage() {
  var params = useParams();
  var [rangeType, setRangeType] = useState('last_30_days');
  var dateRange = getDateRange(rangeType);
  
  var { data: report, isLoading } = useStaffReport(params.salonId, dateRange);
  
  // Mock data for demonstration
  var mockReport = {
    totalStaff: 5,
    avgUtilization: 78,
    totalBookings: 156,
    totalRevenue: 12450,
    staff: [
      {
        id: '1',
        name: 'Sophie Martin',
        role: 'Senior Stylist',
        avatar: null,
        bookings: 48,
        revenue: 4250,
        utilization: 92,
        rating: 4.9,
        hoursWorked: 160,
        avgServiceTime: 52,
      },
      {
        id: '2',
        name: 'Marie Dupont',
        role: 'Colorist',
        avatar: null,
        bookings: 35,
        revenue: 3150,
        utilization: 85,
        rating: 4.7,
        hoursWorked: 145,
        avgServiceTime: 75,
      },
      {
        id: '3',
        name: 'Pierre Bernard',
        role: 'Stylist',
        avatar: null,
        bookings: 32,
        revenue: 2400,
        utilization: 72,
        rating: 4.5,
        hoursWorked: 140,
        avgServiceTime: 45,
      },
      {
        id: '4',
        name: 'Jean Moreau',
        role: 'Junior Stylist',
        avatar: null,
        bookings: 28,
        revenue: 1750,
        utilization: 68,
        rating: 4.3,
        hoursWorked: 135,
        avgServiceTime: 40,
      },
      {
        id: '5',
        name: 'Claire Petit',
        role: 'Apprentice',
        avatar: null,
        bookings: 13,
        revenue: 900,
        utilization: 55,
        rating: 4.2,
        hoursWorked: 120,
        avgServiceTime: 35,
      },
    ],
  };
  
  var data = report || mockReport;
  
  // Sort staff by revenue for ranking
  var sortedStaff = [...(data.staff || [])].sort(function(a, b) {
    return b.revenue - a.revenue;
  });
  
  function handleExport() {
    var exportData = sortedStaff.map(function(staff) {
      return {
        Name: staff.name,
        Role: staff.role,
        Bookings: staff.bookings,
        Revenue: staff.revenue,
        Utilization: staff.utilization + '%',
        Rating: staff.rating,
        HoursWorked: staff.hoursWorked,
      };
    });
    exportToCSV(exportData, 'staff-performance');
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
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(function(i) {
              return <div key={i} className="h-64 bg-muted rounded" />;
            })}
          </div>
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
            <h1 className="text-2xl font-bold">Staff Performance</h1>
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
              Total Staff
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div className="text-2xl font-bold">{data.totalStaff}</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg. Utilization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div className="text-2xl font-bold">{formatPercentage(data.avgUtilization)}</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Bookings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div className="text-2xl font-bold">{data.totalBookings}</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <div className="text-2xl font-bold">{formatCurrency(data.totalRevenue)}</div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Staff Cards */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Performance Ranking</h2>
        <div className="grid grid-cols-3 gap-4">
          {sortedStaff.slice(0, 3).map(function(staff, index) {
            return (
              <StaffCard key={staff.id} staff={staff} rank={index + 1} />
            );
          })}
        </div>
      </div>
      
      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Staff</CardTitle>
          <CardDescription>Detailed performance metrics for all team members</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff Member</TableHead>
                <TableHead className="text-right">Bookings</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Utilization</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead className="text-right">Avg. Service</TableHead>
                <TableHead className="text-right">Rating</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedStaff.map(function(staff, index) {
                return (
                  <TableRow key={staff.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={staff.avatar} />
                            <AvatarFallback>
                              {(staff.name || 'U')[0]}
                            </AvatarFallback>
                          </Avatar>
                          {index === 0 && (
                            <div className="absolute -top-1 -right-1 h-4 w-4 bg-amber-500 rounded-full flex items-center justify-center">
                              <Award className="h-2.5 w-2.5 text-white" />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{staff.name}</div>
                          <div className="text-sm text-muted-foreground">{staff.role}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{staff.bookings}</TableCell>
                    <TableCell className="text-right">{formatCurrency(staff.revenue)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Progress value={staff.utilization} className="w-16 h-2" />
                        <span>{formatPercentage(staff.utilization, 0)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{staff.hoursWorked}h</TableCell>
                    <TableCell className="text-right">{staff.avgServiceTime} min</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Star className="h-4 w-4 text-amber-500" />
                        <span className="font-medium">{staff.rating?.toFixed(1) || 'N/A'}</span>
                      </div>
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
