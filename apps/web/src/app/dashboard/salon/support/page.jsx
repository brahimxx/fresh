'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Ticket } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';

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

export default function SalonSupportPage() {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');

    const fetchTickets = async () => {
        try {
            const res = await apiClient.get('/tickets');
            setTickets(res.data);
        } catch (error) {
            console.error('Failed to load tickets', error);
            toast.error('Failed to load support history.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTickets();
    }, []);

    const handleSubmitTicket = async (e) => {
        e.preventDefault();
        if (!subject.trim() || !description.trim()) {
            toast.error('Subject and description are required.');
            return;
        }

        setIsSubmitting(true);
        try {
            await apiClient.post('/tickets', { subject, description });
            toast.success('Support ticket created successfully. Our team will review it shortly.');
            setSubject('');
            setDescription('');
            setIsCreateOpen(false);
            fetchTickets(); // Refresh table
        } catch (error) {
            console.error('Ticket creation failed', error);
            toast.error(error.message || 'Failed to submit ticket.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Support Tickets</h1>
                    <p className="text-muted-foreground mt-2">Need help configuring your salon or staff? Open a ticket to reach our concierge.</p>
                </div>

                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            New Ticket
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Contact Support</DialogTitle>
                            <DialogDescription>
                                Describe your issue in detail. A support agent will respond to your email.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmitTicket} className="space-y-4">
                            <div className="space-y-2 mt-4">
                                <Label htmlFor="subject">Subject Overview</Label>
                                <Input
                                    id="subject"
                                    placeholder="e.g., Cannot link my bank account"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    maxLength={255}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Detailed Description</Label>
                                <Textarea
                                    id="description"
                                    placeholder="Please provide steps to reproduce your issue..."
                                    className="min-h-[120px]"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    required
                                />
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Ticket className="w-5 h-5 text-primary" />
                        Ticket History
                    </CardTitle>
                    <CardDescription>View your past inquiries and their current resolution status.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">Loading tickets...</div>
                    ) : tickets.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-lg">
                            No support tickets have been opened yet.
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead>Subject</TableHead>
                                        <TableHead>Date Filed</TableHead>
                                        <TableHead>Priority</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {tickets.map((ticket) => (
                                        <TableRow key={ticket.id}>
                                            <TableCell>
                                                <div className="font-medium max-w-sm truncate">{ticket.subject}</div>
                                                <div className="text-xs text-muted-foreground max-w-sm truncate mt-1">{ticket.description}</div>
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                                                {format(new Date(ticket.created_at), 'MMM d, yyyy')}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={`uppercase text-xs font-semibold ${PRIORITY_COLORS[ticket.priority]}`}>
                                                    {ticket.priority}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className={`uppercase text-[10px] font-bold ${STATUS_COLORS[ticket.status]}`}>
                                                    {ticket.status.replace('_', ' ')}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
