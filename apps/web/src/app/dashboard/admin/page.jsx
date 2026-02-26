'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api-client';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Users,
    Building2,
    Calendar,
    TrendingUp,
    ArrowRight,
    Shield,
} from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboardPage() {
    // Fetch platform stats
    const { data: usersData, isLoading: usersLoading } = useQuery({
        queryKey: ['admin-users-stats'],
        queryFn: () => api.get('/admin/users', { limit: 1 }),
    });

    const { data: salonsData, isLoading: salonsLoading } = useQuery({
        queryKey: ['admin-salons-stats'],
        queryFn: () => api.get('/admin/salons', { limit: 1 }),
    });

    const totalUsers = usersData?.data?.pagination?.total ?? 0;
    const totalSalons = salonsData?.data?.pagination?.total ?? 0;

    const isLoading = usersLoading || salonsLoading;

    const stats = [
        {
            title: 'Total Users',
            value: totalUsers,
            icon: Users,
            description: 'All registered users',
            href: '/dashboard/admin/users',
            color: 'text-blue-500',
            bgColor: 'bg-blue-500/10',
        },
        {
            title: 'Total Salons',
            value: totalSalons,
            icon: Building2,
            description: 'All registered salons',
            href: '/dashboard/admin/salons',
            color: 'text-purple-500',
            bgColor: 'bg-purple-500/10',
        },
    ];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <Shield className="h-5 w-5 text-primary" />
                    <h1 className="text-2xl font-bold tracking-tight">
                        Admin Dashboard
                    </h1>
                </div>
                <p className="text-muted-foreground">
                    Platform-wide management and overview
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat) => (
                    <Card key={stat.title}>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {stat.title}
                            </CardTitle>
                            <div
                                className={`h-8 w-8 rounded-lg ${stat.bgColor} flex items-center justify-center`}
                            >
                                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <Skeleton className="h-8 w-20" />
                            ) : (
                                <div className="text-2xl font-bold">
                                    {stat.value.toLocaleString()}
                                </div>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                                {stat.description}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">User Management</CardTitle>
                        <CardDescription>
                            View, search, and manage all platform users
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild>
                            <Link href="/dashboard/admin/users">
                                Manage Users
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Salon Management</CardTitle>
                        <CardDescription>
                            View, search, and control all salons on the platform
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild>
                            <Link href="/dashboard/admin/salons">
                                Manage Salons
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
