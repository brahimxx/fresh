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
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, Search, RotateCcw } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

export default function AdminBookingsPage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Pagination & Filters
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [paymentFilter, setPaymentFilter] = useState('all');

    // Refund Modal State
    const [refundModalOpen, setRefundModalOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [refundReason, setRefundReason] = useState('Admin override full refund');

    const { data: bookingsData, isLoading } = useQuery({
        queryKey: ['admin-bookings', page, search, statusFilter, paymentFilter],
        queryFn: async () => {
            let url = `/admin/bookings?page=${page}&limit=15`;
            if (search) url += `&search=${encodeURIComponent(search)}`;
            if (statusFilter !== 'all') url += `&status=${statusFilter}`;
            if (paymentFilter !== 'all') url += `&payment_status=${paymentFilter}`;

            const res = await api.get(url);
            return res.data;
        },
    });

    const refundMutation = useMutation({
        mutationFn: async ({ bookingId, reason }) => {
            return api.post(`/admin/bookings/${bookingId}/refund`, { reason });
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries(['admin-bookings']);
            setRefundModalOpen(false);
            setSelectedBooking(null);
            toast({
                title: 'Refund Processed',
                description: data.message || 'The full payment has been refunded and platform fees waived.',
                variant: 'default',
            });
        },
        onError: (error) => {
            toast({
                title: 'Refund Failed',
                description: error.message || 'An unexpected error occurred.',
                variant: 'destructive',
            });
        },
    });

    const handleOpenRefund = (booking) => {
        setSelectedBooking(booking);
        setRefundReason('Admin override full refund');
        setRefundModalOpen(true);
    };

    const confirmRefund = () => {
        if (!selectedBooking) return;
        refundMutation.mutate({
            bookingId: selectedBooking.id,
            reason: refundReason
        });
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'EUR',
        }).format(amount || 0);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">Global Bookings</h2>
                <p className="text-slate-500">Search and manage all bookings and payments across the platform.</p>
            </div>

            <Card>
                <CardHeader className="pb-3 border-b">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-1 gap-2 max-w-sm">
                            <div className="relative flex-1">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                                <Input
                                    placeholder="Search ID, email, salon..."
                                    className="pl-9"
                                    value={search}
                                    onChange={(e) => {
                                        setSearch(e.target.value);
                                        setPage(1);
                                    }}
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="confirmed">Confirmed</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={paymentFilter} onValueChange={(v) => { setPaymentFilter(v); setPage(1); }}>
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue placeholder="Payment" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Payments</SelectItem>
                                    <SelectItem value="paid">Paid</SelectItem>
                                    <SelectItem value="refunded">Refunded</SelectItem>
                                    <SelectItem value="unpaid">Unpaid/Pending</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[80px]">ID</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Salon</TableHead>
                                    <TableHead>Client</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Price</TableHead>
                                    <TableHead className="text-right">Payment</TableHead>
                                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-24 text-center">
                                            <Loader2 className="w-6 h-6 mx-auto animate-spin text-slate-400" />
                                        </TableCell>
                                    </TableRow>
                                ) : bookingsData?.bookings?.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-24 text-center text-slate-500">
                                            No bookings found matching criteria.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    bookingsData?.bookings?.map((booking) => (
                                        <TableRow key={booking.id}>
                                            <TableCell className="font-medium">#{booking.id}</TableCell>
                                            <TableCell className="text-sm">{formatDate(booking.startDatetime)}</TableCell>
                                            <TableCell>
                                                <div className="text-sm font-medium">{booking.salonName}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm font-medium">{booking.clientName}</div>
                                                <div className="text-xs text-slate-500">{booking.clientEmail}</div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={
                                                    booking.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                        booking.status === 'confirmed' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                            booking.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-200' :
                                                                'bg-slate-50 text-slate-700 border-slate-200'
                                                }>
                                                    {booking.status.toUpperCase()}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatCurrency(booking.totalPrice)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant="secondary" className={
                                                    booking.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                                                        booking.paymentStatus === 'refunded' ? 'bg-purple-100 text-purple-800' :
                                                            'bg-amber-100 text-amber-800'
                                                }>
                                                    {booking.paymentStatus.toUpperCase()}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    disabled={booking.paymentStatus !== 'paid'}
                                                    onClick={() => handleOpenRefund(booking)}
                                                    className={booking.paymentStatus === 'paid' ? "text-purple-600 hover:text-purple-700 hover:bg-purple-50" : ""}
                                                >
                                                    <RotateCcw className="w-4 h-4 mr-1" />
                                                    Refund
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
                {/* Pagination */}
                {bookingsData?.pagination && bookingsData.pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between p-4 border-t">
                        <div className="text-sm text-slate-500">
                            Page {bookingsData.pagination.page} of {bookingsData.pagination.totalPages}
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
                                onClick={() => setPage((p) => Math.min(bookingsData.pagination.totalPages, p + 1))}
                                disabled={page === bookingsData.pagination.totalPages}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            <Dialog open={refundModalOpen} onOpenChange={setRefundModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Issue Global Refund</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to refund this booking? This action is immediate and will:
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                <li>Refund {selectedBooking ? formatCurrency(selectedBooking.totalPrice) : ''} to the client.</li>
                                <li>Waive the platform fee for this booking.</li>
                                <li>Update the booking status to Cancelled.</li>
                            </ul>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Reason for Refund</label>
                            <Input
                                value={refundReason}
                                onChange={(e) => setRefundReason(e.target.value)}
                                placeholder="E.g., Fraud, Customer Complaint, Salon Offline"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRefundModalOpen(false)}>Cancel</Button>
                        <Button
                            onClick={confirmRefund}
                            disabled={refundMutation.isPending}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                            {refundMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            Confirm Refund
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
