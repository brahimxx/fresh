'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api-client';
import {
    Card,
    CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Search, Building2, ArrowLeft, Power, PowerOff } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

export default function AdminSalonsPage() {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [page, setPage] = useState(1);
    const limit = 20;
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const { data, isLoading } = useQuery({
        queryKey: ['admin-salons', search, statusFilter, page],
        queryFn: () =>
            api.get('/admin/salons', {
                search: search || undefined,
                isActive: statusFilter !== 'all' ? statusFilter : undefined,
                page,
                limit,
            }),
    });

    const toggleStatusMutation = useMutation({
        mutationFn: ({ salonId, isActive }) =>
            api.patch(`/admin/salons/${salonId}/status`, { isActive }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-salons'] });
            toast({
                title: 'Salon status updated',
                description: 'The salon status has been updated successfully.',
            });
        },
        onError: (err) => {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: err.message || 'Failed to update salon status',
            });
        },
    });

    const updateTierMutation = useMutation({
        mutationFn: ({ salonId, planTier }) =>
            api.patch(`/admin/salons/${salonId}/tier`, { planTier }),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['admin-salons'] });
            toast({
                title: 'Plan Tier Updated',
                description: data?.message || 'The subscription plan has been updated.',
            });
        },
        onError: (err) => {
            toast({
                variant: 'destructive',
                title: 'Update Failed',
                description: err.message || 'Failed to update salon tier',
            });
        },
    });

    const salons = data?.data?.salons ?? [];
    const pagination = data?.data?.pagination ?? { page: 1, totalPages: 1, total: 0 };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/dashboard/admin">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Building2 className="h-6 w-6 text-primary" />
                        Salon Management
                    </h1>
                    <p className="text-muted-foreground">
                        {pagination.total} total salons
                    </p>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name, city, or owner email..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                className="pl-9"
                            />
                        </div>
                        <Select
                            value={statusFilter}
                            onValueChange={(v) => {
                                setStatusFilter(v);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="w-[160px]">
                                <SelectValue placeholder="Filter status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="true">Active</SelectItem>
                                <SelectItem value="false">Inactive</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Salons Table */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Salon Name</TableHead>
                                <TableHead>Owner</TableHead>
                                <TableHead>City</TableHead>
                                <TableHead>Staff</TableHead>
                                <TableHead>Bookings</TableHead>
                                <TableHead>Tier</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                    </TableRow>
                                ))
                            ) : salons.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                        No salons found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                salons.map((salon) => (
                                    <TableRow key={salon.id}>
                                        <TableCell className="font-medium">{salon.name}</TableCell>
                                        <TableCell>
                                            <div>
                                                <div className="text-sm">{salon.ownerName}</div>
                                                <div className="text-xs text-muted-foreground">{salon.ownerEmail}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>{salon.city || '—'}</TableCell>
                                        <TableCell>{salon.staffCount}</TableCell>
                                        <TableCell>{salon.bookingCount}</TableCell>
                                        <TableCell>
                                            <Select
                                                value={salon.planTier || 'basic'}
                                                onValueChange={(val) =>
                                                    updateTierMutation.mutate({ salonId: salon.id, planTier: val })
                                                }
                                                disabled={updateTierMutation.isPending}
                                            >
                                                <SelectTrigger className="w-[110px] h-8 text-xs font-medium">
                                                    <SelectValue placeholder="Tier" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="basic">Basic</SelectItem>
                                                    <SelectItem value="pro">Pro</SelectItem>
                                                    <SelectItem value="enterprise">Enterprise</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={salon.isActive ? 'default' : 'secondary'}
                                                className={
                                                    salon.isActive
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                                }
                                            >
                                                {salon.isActive ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    toggleStatusMutation.mutate({
                                                        salonId: salon.id,
                                                        isActive: !salon.isActive,
                                                    })
                                                }
                                                disabled={toggleStatusMutation.isPending}
                                            >
                                                {salon.isActive ? (
                                                    <>
                                                        <PowerOff className="h-4 w-4 mr-1" />
                                                        Deactivate
                                                    </>
                                                ) : (
                                                    <>
                                                        <Power className="h-4 w-4 mr-1" />
                                                        Activate
                                                    </>
                                                )}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        Page {pagination.page} of {pagination.totalPages}
                    </p>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page <= 1}
                            onClick={() => setPage((p) => p - 1)}
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page >= pagination.totalPages}
                            onClick={() => setPage((p) => p + 1)}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
