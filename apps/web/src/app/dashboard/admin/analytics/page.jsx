'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO } from 'date-fns';
import { Loader2, TrendingUp, AlertTriangle, Clock } from 'lucide-react';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function AnalyticsDashboardPage() {
    // 1. GMV Query
    const { data: gmvRes, isLoading: gmvLoading } = useQuery({
        queryKey: ['admin-analytics-gmv'],
        queryFn: () => api.get('/admin/analytics/gmv').then(res => res.data),
    });

    // 2. Engagement Query
    const { data: engRes, isLoading: engLoading } = useQuery({
        queryKey: ['admin-analytics-engagement'],
        queryFn: () => api.get('/admin/analytics/engagement').then(res => res.data),
    });

    // 3. Churn Query
    const { data: churnRes, isLoading: churnLoading } = useQuery({
        queryKey: ['admin-analytics-churn'],
        queryFn: () => api.get('/admin/analytics/churn').then(res => res.data),
    });

    const gmvData = gmvRes?.data || { daily: [], thisMonth: 0, lastMonth: 0 };
    const engData = engRes?.data || { peakHours: [], categories: [] };
    const churnData = churnRes?.data?.atRiskSalons || [];

    // Format GMV chart data
    const chartData = gmvData.daily.map(d => ({
        ...d,
        displayDate: format(parseISO(d.date), 'MMM dd')
    }));

    // Format Peak Hours chart data
    const peakHoursChart = engData.peakHours.map(d => ({
        hourLabel: `${d.hour}:00`,
        count: d.count
    }));

    // GMV Trends
    const gmvGrowth = gmvData.lastMonth > 0
        ? ((gmvData.thisMonth - gmvData.lastMonth) / gmvData.lastMonth) * 100
        : 100;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Platform Analytics</h1>
                <p className="text-muted-foreground">Monitor platform growth, engagement, and salon health.</p>
            </div>

            {/* GMV Top Level KPI */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">This Month GMV</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">€{gmvData.thisMonth.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            <span className={gmvGrowth >= 0 ? "text-green-500" : "text-red-500"}>
                                {gmvGrowth >= 0 ? '+' : ''}{gmvGrowth.toFixed(1)}%
                            </span> from last month (€{gmvData.lastMonth.toLocaleString()})
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* GMV & Categories Charts */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* 60-Day GMV Tracker */}
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Gross Merchandise Value (Last 60 Days)</CardTitle>
                        <CardDescription>Daily volume of paid bookings across all salons</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        {gmvLoading ? (
                            <div className="h-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                        ) : chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorGmv" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                    <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tickMargin={10} minTickGap={30} fontSize={12} />
                                    <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `€${val}`} fontSize={12} />
                                    <Tooltip formatter={(value) => [`€${value}`, 'GMV']} labelClassName="text-black" />
                                    <Area type="monotone" dataKey="gmv" stroke="#3B82F6" fillOpacity={1} fill="url(#colorGmv)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground">No GMV data available.</div>
                        )}
                    </CardContent>
                </Card>

                {/* Categories */}
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Popular Categories</CardTitle>
                        <CardDescription>Booking volume breakdown by salon category</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[350px] flex items-center justify-center">
                        {engLoading ? (
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        ) : engData.categories.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={engData.categories}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="count"
                                        nameKey="name"
                                    >
                                        {engData.categories.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-muted-foreground">No category data.</div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Heatmaps & Churn */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Peak Hours Heatmap */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-primary" />
                            Platform Golden Hours
                        </CardTitle>
                        <CardDescription>Aggregate booking frequencies over the last 30 days</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        {engLoading ? (
                            <div className="h-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                        ) : peakHoursChart.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={peakHoursChart}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                    <XAxis dataKey="hourLabel" fontSize={12} tickLine={false} axisLine={false} minTickGap={20} />
                                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip cursor={{ fill: 'transparent' }} />
                                    <Bar dataKey="count" name="Bookings" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground">No hourly data available.</div>
                        )}
                    </CardContent>
                </Card>

                {/* At-Risk Salons */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-destructive" />
                            At-Risk Salons
                        </CardTitle>
                        <CardDescription>Salons with no bookings or client activities in &gt;30 days</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {churnLoading ? (
                            <div className="py-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                        ) : churnData.length > 0 ? (
                            <div className="overflow-auto max-h-[300px]">
                                <Table>
                                    <TableHeader className="sticky top-0 bg-background z-10">
                                        <TableRow>
                                            <TableHead>Salon Name</TableHead>
                                            <TableHead>Contact</TableHead>
                                            <TableHead>Tier</TableHead>
                                            <TableHead className="text-right">Days Inactive</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {churnData.map(salon => (
                                            <TableRow key={salon.id}>
                                                <TableCell className="font-medium">{salon.salonName}</TableCell>
                                                <TableCell>
                                                    <div className="text-xs">{salon.email}</div>
                                                    <div className="text-xs text-muted-foreground">{salon.phone}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="capitalize">{salon.planTier}</Badge>
                                                </TableCell>
                                                <TableCell className="text-right text-destructive font-bold">
                                                    {salon.daysInactive} days
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <div className="py-12 flex flex-col items-center justify-center text-center">
                                <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                                    <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                                </div>
                                <p className="font-medium">Excellent Retention</p>
                                <p className="text-sm text-muted-foreground">No salons are currently at risk.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
