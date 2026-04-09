'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api-client';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, DollarSign, CheckCircle2, AlertCircle, Building2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

export default function AdminPayoutsPage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [selectedSalons, setSelectedSalons] = useState(new Set());

    const { data: payoutsData, isLoading, isError } = useQuery({
        queryKey: ['admin-payouts', page],
        queryFn: async () => {
            const res = await api.get(`/admin/payouts?page=${page}&limit=20`);
            return res.data;
        },
    });

    const approveMutation = useMutation({
        mutationFn: async (payload) => {
            return api.post('/admin/payouts', { payouts: payload });
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries(['admin-payouts']);
            setSelectedSalons(new Set());
            toast({
                title: 'Payouts Approved',
                description: `Successfully processed ${data.data?.successful?.length || 0} payouts through Stripe.`,
            });
        },
        onError: (error) => {
            toast({
                title: 'Failed to approve payouts',
                description: error.message || 'An unexpected error occurred.',
                variant: 'destructive',
            });
        },
    });

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'EUR',
        }).format(amount || 0);
    };

    const handleSelectAll = (checked) => {
        if (checked && payoutsData?.balances) {
            const allIds = payoutsData.balances.map(b => b.salonId);
            setSelectedSalons(new Set(allIds));
        } else {
            setSelectedSalons(new Set());
        }
    };

    const handleSelectRow = (salonId, checked) => {
        const newSet = new Set(selectedSalons);
        if (checked) {
            newSet.add(salonId);
        } else {
            newSet.delete(salonId);
        }
        setSelectedSalons(newSet);
    };

    const handleBulkApprove = () => {
        if (selectedSalons.size === 0 || !payoutsData?.balances) return;

        const payload = payoutsData.balances
            .filter(b => selectedSalons.has(b.salonId))
            .map(b => ({
                salonId: b.salonId,
                amount: b.netPayable
            }));

        approveMutation.mutate(payload);
    };

    const isAllSelected = payoutsData?.balances?.length > 0 && selectedSalons.size === payoutsData.balances.length;

    if (isError) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center text-red-500">
                <AlertCircle className="w-12 h-12 mb-4" />
                <h3 className="text-lg font-medium">Failed to load payouts data</h3>
                <p>Please check your connection and try again.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900">Partner Payouts</h2>
                    <p className="text-slate-500">Manage pending transfers to salon owners.</p>
                </div>
                <div className="flex gap-4">
                    <Button
                        onClick={handleBulkApprove}
                        disabled={selectedSalons.size === 0 || approveMutation.isPending}
                        className="bg-indigo-600 hover:bg-indigo-700"
                    >
                        {approveMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                        )}
                        Pay Selected ({selectedSalons.size})
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Total Gross Volume</CardTitle>
                        <Building2 className="w-4 h-4 text-slate-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : formatCurrency(payoutsData?.summary?.totalGross)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Platform Fees</CardTitle>
                        <DollarSign className="w-4 h-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600">
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : formatCurrency(payoutsData?.summary?.totalFees)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Issued Refunds</CardTitle>
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : formatCurrency(payoutsData?.summary?.totalRefunds)}
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-indigo-200 bg-indigo-50/50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-indigo-900">Total Pending Payout</CardTitle>
                        <DollarSign className="w-4 h-4 text-indigo-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-indigo-700">
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : formatCurrency(payoutsData?.summary?.totalPendingPayouts)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Payouts Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Ready for Payout</CardTitle>
                    <CardDescription>
                        Salons with a positive net balance owing from completed bookings.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">
                                        <Checkbox
                                            checked={isAllSelected}
                                            onCheckedChange={handleSelectAll}
                                            disabled={isLoading || !payoutsData?.balances?.length}
                                        />
                                    </TableHead>
                                    <TableHead>Salon</TableHead>
                                    <TableHead className="text-right">Gross Vol.</TableHead>
                                    <TableHead className="text-right text-emerald-600">- Fees</TableHead>
                                    <TableHead className="text-right text-amber-600">- Refunds</TableHead>
                                    <TableHead className="text-right text-slate-500">- Past Payouts</TableHead>
                                    <TableHead className="text-right font-bold text-indigo-600">= Net Payable</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center">
                                            <Loader2 className="w-6 h-6 mx-auto animate-spin text-slate-400" />
                                        </TableCell>
                                    </TableRow>
                                ) : payoutsData?.balances?.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                                            No pending payouts at this time.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    payoutsData?.balances?.map((balance) => (
                                        <TableRow key={balance.salonId}>
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedSalons.has(balance.salonId)}
                                                    onCheckedChange={(checked) => handleSelectRow(balance.salonId, checked)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium text-slate-900">{balance.salonName}</div>
                                                <div className="text-sm text-slate-500">{balance.ownerEmail}</div>
                                            </TableCell>
                                            <TableCell className="text-right">{formatCurrency(balance.grossVolume)}</TableCell>
                                            <TableCell className="text-right text-emerald-600">-{formatCurrency(balance.platformFees)}</TableCell>
                                            <TableCell className="text-right text-amber-600">-{formatCurrency(balance.refunds)}</TableCell>
                                            <TableCell className="text-right text-slate-500">-{formatCurrency(balance.alreadyPaidOut)}</TableCell>
                                            <TableCell className="text-right font-bold text-indigo-600">{formatCurrency(balance.netPayable)}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {payoutsData?.pagination && payoutsData.pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4">
                            <div className="text-sm text-slate-500">
                                Showing page {payoutsData.pagination.page} of {payoutsData.pagination.totalPages} ({payoutsData.pagination.total} salons)
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                >
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage((p) => Math.min(payoutsData.pagination.totalPages, p + 1))}
                                    disabled={page === payoutsData.pagination.totalPages}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
