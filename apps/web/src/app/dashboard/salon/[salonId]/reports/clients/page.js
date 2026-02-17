'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Download,
  CalendarRange,
  Users,
  UserPlus,
  UserCheck,
  TrendingUp,
  TrendingDown,
  Repeat,
  Clock,
  DollarSign,
  Calendar,
  Star,
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
  useClientsReport,
  DATE_RANGES,
  getDateRange,
  formatDateRange,
  formatCurrency,
  formatPercentage,
  formatChange,
  calculateChange,
  exportToCSV,
} from '@/hooks/use-reports';

function RetentionFunnel({ data }) {
  var stages = [
    { label: 'First Visit', count: data.firstVisit || 0, color: 'bg-blue-500' },
    { label: 'Second Visit', count: data.secondVisit || 0, color: 'bg-green-500' },
    { label: 'Third+ Visit', count: data.thirdVisit || 0, color: 'bg-purple-500' },
    { label: 'Loyal (5+ visits)', count: data.loyal || 0, color: 'bg-amber-500' },
  ];
  
  var maxCount = stages[0].count || 1;
  
  return (
    <div className="space-y-3">
      {stages.map(function(stage, index) {
        var width = (stage.count / maxCount) * 100;
        var retention = index === 0 ? 100 : (stage.count / stages[0].count) * 100;
        return (
          <div key={stage.label}>
            <div className="flex justify-between text-sm mb-1">
              <span>{stage.label}</span>
              <span className="text-muted-foreground">
                {stage.count} ({formatPercentage(retention, 0)})
              </span>
            </div>
            <div className="h-6 bg-muted rounded-full overflow-hidden">
              <div
                className={stage.color + ' h-full rounded-full transition-all'}
                style={{ width: Math.max(width, 4) + '%' }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ClientsReportPage() {
  var params = useParams();
  var [rangeType, setRangeType] = useState('last_30_days');
  var dateRange = getDateRange(rangeType);
  
  var { data: report, isLoading } = useClientsReport(params.salonId, dateRange);
  
  // Mock data for demonstration
  var mockReport = {
    totalClients: 89,
    previous: 78,
    newClients: 23,
    returningClients: 66,
    retentionRate: 74.2,
    avgVisitsPerClient: 2.3,
    avgSpendPerVisit: 79.50,
    lifetimeValue: 285,
    retention: {
      firstVisit: 89,
      secondVisit: 66,
      thirdVisit: 45,
      loyal: 28,
    },
    byAcquisition: [
      { source: 'Direct', count: 35, percentage: 39.3 },
      { source: 'Referral', count: 24, percentage: 27.0 },
      { source: 'Marketplace', count: 18, percentage: 20.2 },
      { source: 'Social Media', count: 8, percentage: 9.0 },
      { source: 'Other', count: 4, percentage: 4.5 },
    ],
    topClients: [
      {
        id: '1',
        name: 'Marie Dupont',
        email: 'marie@email.com',
        visits: 12,
        totalSpent: 1250,
        lastVisit: '2026-01-05',
        avgSpend: 104,
      },
      {
        id: '2',
        name: 'Jean Martin',
        email: 'jean@email.com',
        visits: 10,
        totalSpent: 980,
        lastVisit: '2026-01-04',
        avgSpend: 98,
      },
      {
        id: '3',
        name: 'Sophie Bernard',
        email: 'sophie@email.com',
        visits: 8,
        totalSpent: 850,
        lastVisit: '2026-01-03',
        avgSpend: 106,
      },
      {
        id: '4',
        name: 'Pierre Moreau',
        email: 'pierre@email.com',
        visits: 7,
        totalSpent: 720,
        lastVisit: '2026-01-02',
        avgSpend: 103,
      },
      {
        id: '5',
        name: 'Claire Petit',
        email: 'claire@email.com',
        visits: 6,
        totalSpent: 680,
        lastVisit: '2025-12-28',
        avgSpend: 113,
      },
    ],
    atRisk: [
      { id: '6', name: 'Paul Simon', lastVisit: '2025-10-15', daysSince: 84 },
      { id: '7', name: 'Anne Roux', lastVisit: '2025-10-20', daysSince: 79 },
      { id: '8', name: 'Marc Blanc', lastVisit: '2025-11-01', daysSince: 67 },
    ],
  };
  
  var data = report || mockReport;
  var change = calculateChange(data.totalClients, data.previous);
  
  function handleExport() {
    exportToCSV(data.topClients, 'top-clients');
  }
  
  function formatDate(date) {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
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
          <div className="grid grid-cols-2 gap-6">
            <div className="h-80 bg-muted rounded" />
            <div className="h-80 bg-muted rounded" />
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
            <h1 className="text-2xl font-bold">Clients Report</h1>
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
              Total Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div className="text-2xl font-bold">{data.totalClients}</div>
            </div>
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
              New Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-green-500" />
              <div className="text-2xl font-bold text-green-600">{data.newClients}</div>
            </div>
            <div className="text-sm text-muted-foreground">
              {formatPercentage((data.newClients / data.totalClients) * 100)} of total
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Retention Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Repeat className="h-5 w-5 text-blue-500" />
              <div className="text-2xl font-bold">{formatPercentage(data.retentionRate)}</div>
            </div>
            <div className="text-sm text-muted-foreground">
              clients returned
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg. Lifetime Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-amber-500" />
              <div className="text-2xl font-bold">{formatCurrency(data.lifetimeValue)}</div>
            </div>
            <div className="text-sm text-muted-foreground">
              per client
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Second Row */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Avg. Visits</div>
                <div className="text-xl font-bold">{data.avgVisitsPerClient}</div>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Avg. Spend/Visit</div>
                <div className="text-xl font-bold">{formatCurrency(data.avgSpendPerVisit)}</div>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Returning</div>
                <div className="text-xl font-bold">{data.returningClients}</div>
              </div>
              <UserCheck className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">At Risk</div>
                <div className="text-xl font-bold text-amber-600">
                  {(data.atRisk || []).length}
                </div>
              </div>
              <Clock className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-6">
        {/* Retention Funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Client Retention Funnel</CardTitle>
            <CardDescription>How clients progress through visits</CardDescription>
          </CardHeader>
          <CardContent>
            <RetentionFunnel data={data.retention || {}} />
          </CardContent>
        </Card>
        
        {/* Acquisition Sources */}
        <Card>
          <CardHeader>
            <CardTitle>Acquisition Sources</CardTitle>
            <CardDescription>How clients found your salon</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(data.byAcquisition || []).map(function(source) {
              return (
                <div key={source.source} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{source.source}</span>
                    <div className="text-right">
                      <span className="font-medium">{source.count}</span>
                      <span className="text-muted-foreground ml-2">
                        ({formatPercentage(source.percentage, 0)})
                      </span>
                    </div>
                  </div>
                  <Progress value={source.percentage} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
      
      {/* Top Clients Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Clients</CardTitle>
          <CardDescription>Your most valuable clients by total spend</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Visits</TableHead>
                <TableHead className="text-right">Total Spent</TableHead>
                <TableHead className="text-right">Avg. Spend</TableHead>
                <TableHead className="text-right">Last Visit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data.topClients || []).map(function(client, index) {
                return (
                  <TableRow key={client.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {(client.name || 'U')[0]}
                            </AvatarFallback>
                          </Avatar>
                          {index < 3 && (
                            <div className="absolute -top-1 -right-1 h-4 w-4 bg-amber-500 rounded-full flex items-center justify-center">
                              <Star className="h-2.5 w-2.5 text-white" />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{client.name}</div>
                          <div className="text-sm text-muted-foreground">{client.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{client.visits}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(client.totalSpent)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(client.avgSpend)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatDate(client.lastVisit)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* At Risk Clients */}
      {(data.atRisk || []).length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700">
              <Clock className="h-5 w-5" />
              At Risk Clients
            </CardTitle>
            <CardDescription>
              Clients who haven&apos;t visited in over 60 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(data.atRisk || []).map(function(client) {
                return (
                  <div key={client.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{(client.name || 'U')[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{client.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Last visit: {formatDate(client.lastVisit)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-amber-700 border-amber-300">
                        {client.daysSince} days ago
                      </Badge>
                      <Button size="sm" variant="outline">
                        Send Reminder
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
