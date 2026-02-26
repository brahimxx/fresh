'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { LifeBuoy, AlertCircle, Building2, Ticket, ChevronLeft } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';
import Link from 'next/link';

const STATUS_COLORS = {
    open: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    resolved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    closed: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

const PRIORITY_COLORS = {
    low: 'text-gray-500 border-gray-200',
    normal: 'text-blue-500 border-blue-200',
    high: 'text-orange-500 border-orange-200',
    urgent: 'text-red-500 border-red-200 animate-pulse',
};

export default function AdminSupportPage() {
    const queryClient = useQueryClient();
    const [statusFilter, setStatusFilter] = useState('all');

    // Fetch Tickets
    const { data: ticketsData, isLoading: ticketsLoading } = useQuery({
        queryKey: ['admin-tickets', statusFilter],
        queryFn: () => apiClient.get(`/admin/tickets?status=${statusFilter}`),
    });

    // Fetch Concierge Data
    const { data: conciergeData, isLoading: conciergeLoading } = useQuery({
        queryKey: ['admin-concierge'],
        queryFn: () => apiClient.get('/admin/onboarding'),
    });

    const updateTicketMutation = useMutation({
        mutationFn: ({ id, updates }) => apiClient.put(`/admin/tickets/${id}`, updates),
        onSuccess: () => {
            queryClient.invalidateQueries(['admin-tickets']);
            toast.success('Ticket updated successfully');
        },
        onError: () => {
            toast.error('Failed to update ticket');
        }
    });

    const tickets = ticketsData?.data?.tickets || [];
    const salonsAtRisk = conciergeData?.data || [];

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/dashboard/admin">
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Support Center</h1>
                    <p className="text-muted-foreground mt-2">Manage incoming inquiries and monitor onboarding friction.</p>
                </div>
            </div>

            <Tabs defaultValue="tickets" className="w-full space-y-4">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="tickets" className="flex items-center gap-2">
                        <Ticket className="w-4 h-4" />
                        Support Tickets
                    </TabsTrigger>
                    <TabsTrigger value="concierge" className="flex items-center gap-2">
                        <LifeBuoy className="w-4 h-4" />
                        Onboarding Concierge
                    </TabsTrigger>
                </TabsList>

                {/* Tab 1: Global Ticket Management */}
                <TabsContent value="tickets" className="space-y-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div className="space-y-1">
                                <CardTitle>Global Ticket Queue</CardTitle>
                                <CardDescription>Triaging incoming requests from Salons and Clients.</CardDescription>
                            </div>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[150px]">
                                    <SelectValue placeholder="Filter Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Open/Closed</SelectItem>
                                    <SelectItem value="open">Open</SelectItem>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                    <SelectItem value="resolved">Resolved</SelectItem>
                                    <SelectItem value="closed">Closed</SelectItem>
                                </SelectContent>
                            </Select>
                        </CardHeader>
                        <CardContent>
                            {ticketsLoading ? (
                                <div className="text-center py-8 text-muted-foreground text-sm">Loading queue...</div>
                            ) : tickets.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-lg">
                                    No support tickets match this filter. You're all caught up!
                                </div>
                            ) : (
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader className="bg-muted/50">
                                            <TableRow>
                                                <TableHead>Reporter</TableHead>
                                                <TableHead>Subject & Details</TableHead>
                                                <TableHead>Priority</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Date</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {tickets.map((t) => (
                                                <TableRow key={t.id}>
                                                    <TableCell>
                                                        <div className="font-medium">{t.first_name} {t.last_name}</div>
                                                        <div className="text-xs text-muted-foreground">{t.user_email}</div>
                                                        <Badge variant="outline" className="text-[10px] mt-1">{t.user_role}</Badge>
                                                    </TableCell>
                                                    <TableCell className="max-w-md">
                                                        <div className="font-semibold">{t.subject}</div>
                                                        <div className="text-xs text-muted-foreground line-clamp-2 mt-1 whitespace-pre-wrap">{t.description}</div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Select
                                                            value={t.priority}
                                                            onValueChange={(val) => updateTicketMutation.mutate({ id: t.id, updates: { priority: val } })}
                                                        >
                                                            <SelectTrigger className={`w-[110px] h-8 text-xs ${PRIORITY_COLORS[t.priority]}`}>
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="low">Low</SelectItem>
                                                                <SelectItem value="normal">Normal</SelectItem>
                                                                <SelectItem value="high">High</SelectItem>
                                                                <SelectItem value="urgent">Urgent</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Select
                                                            value={t.status}
                                                            onValueChange={(val) => updateTicketMutation.mutate({ id: t.id, updates: { status: val } })}
                                                        >
                                                            <SelectTrigger className={`w-[130px] h-8 text-xs font-semibold ${STATUS_COLORS[t.status]}`}>
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="open">Open</SelectItem>
                                                                <SelectItem value="in_progress">In Progress</SelectItem>
                                                                <SelectItem value="resolved">Resolved</SelectItem>
                                                                <SelectItem value="closed">Closed</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                                        {format(new Date(t.created_at), 'MMM d, yyyy')}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab 2: Onboarding Concierge */}
                <TabsContent value="concierge" className="space-y-4">
                    <Card className="border-orange-200">
                        <CardHeader className="bg-orange-50/50 dark:bg-orange-950/20">
                            <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
                                <AlertCircle className="w-5 h-5" />
                                Partially Onboarded Salons
                            </CardTitle>
                            <CardDescription>
                                These active salons have missing core data (0 services or 0 business hours).
                                Reach out or impersonate them to help them complete their setup.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            {conciergeLoading ? (
                                <div className="text-center py-8 text-muted-foreground text-sm">Scanning platform...</div>
                            ) : salonsAtRisk.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-lg">
                                    All active salons are fully onboarded!
                                </div>
                            ) : (
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader className="bg-muted/50">
                                            <TableRow>
                                                <TableHead>Salon Entity</TableHead>
                                                <TableHead>Owner Contact</TableHead>
                                                <TableHead>Missing Configuration</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {salonsAtRisk.map((salon) => (
                                                <TableRow key={salon.salonId}>
                                                    <TableCell>
                                                        <div className="font-semibold flex items-center gap-2">
                                                            <Building2 className="w-4 h-4 text-muted-foreground" />
                                                            {salon.salonName}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground mt-1">
                                                            Joined {format(new Date(salon.createdAt), 'MMM d, yyyy')}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="font-medium">{salon.owner.name}</div>
                                                        <div className="text-xs text-muted-foreground">{salon.owner.email}</div>
                                                        <div className="text-xs text-muted-foreground">{salon.owner.phone || 'No phone'}</div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col gap-1">
                                                            {salon.status.missingServices && (
                                                                <Badge variant="destructive" className="w-fit text-[10px]">0 Services Created</Badge>
                                                            )}
                                                            {salon.status.missingHours && (
                                                                <Badge variant="destructive" className="w-fit text-[10px] bg-red-600">No Business Hours</Badge>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Button variant="outline" size="sm" asChild>
                                                                <a href={`mailto:${salon.owner.email}`}>Email Owner</a>
                                                            </Button>
                                                            <Button
                                                                variant="default"
                                                                size="sm"
                                                                className="bg-orange-600 hover:bg-orange-700 text-white"
                                                                onClick={async () => {
                                                                    try {
                                                                        await apiClient.post('/admin/impersonate', { targetUserId: salon.owner.id });
                                                                        toast.success(`Impersonating ${salon.owner.name}...`);
                                                                        window.location.href = '/dashboard/salon';
                                                                    } catch (error) {
                                                                        toast.error(error.message || 'Impersonation failed');
                                                                    }
                                                                }}
                                                            >
                                                                Login As to Fix
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
