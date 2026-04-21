'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { 
  LifeBuoy, 
  Plus, 
  MessageSquareCode, 
  CheckCircle2, 
  CircleDashed,
  AlertCircle,
  Clock,
  ArrowRight
} from 'lucide-react';

import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useSupportTickets, useCreateTicket, useUpdateTicket } from '@/hooks/use-support';

const STATUS_ICONS = {
  open: <CircleDashed className="w-4 h-4 text-blue-500" />,
  in_progress: <Clock className="w-4 h-4 text-amber-500" />,
  resolved: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
  closed: <CheckCircle2 className="w-4 h-4 text-slate-500" />,
};

const STATUS_LABELS = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

const PRIORITY_COLORS = {
  low: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  normal: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-500/20',
  high: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
  urgent: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border-red-200 dark:border-red-500/20',
};

export default function SupportPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filter, setFilter] = useState('all');

  // Queries & Mutations
  const { data: tickets = [], isLoading } = useSupportTickets({ 
    status: filter === 'all' ? null : filter 
  });
  const createTicket = useCreateTicket();
  const updateTicket = useUpdateTicket();

  // Form
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    defaultValues: { priority: 'normal', subject: '', description: '' }
  });
  
  const selectedPriority = watch('priority');

  const onSubmit = async (data) => {
    try {
      await createTicket.mutateAsync(data);
      toast({
        title: 'Ticket Submitted',
        description: "We've received your request and will be in touch shortly.",
      });
      reset();
      setIsDialogOpen(false);
    } catch (err) {
      toast({
        title: 'Submission Failed',
        description: err.message || 'There was an error submitting your ticket.',
        variant: 'destructive',
      });
    }
  };

  const markResolved = async (ticketId) => {
    try {
      await updateTicket.mutateAsync({ ticketId, data: { status: 'resolved' } });
      toast({
        title: 'Ticket Resolved',
        description: 'Thank you for confirming the resolution.',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Could not update ticket status.',
        variant: 'destructive',
      });
    }
  };

  // Metrics Logic
  const activeCount = tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;
  const resolvedCount = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-10">
      {/* Header & Metrics */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Support Center</h1>
          <p className="text-muted-foreground max-w-2xl">
            Need help with your salon operations? Submit a technical ticket and our support team will assist you as soon as possible.
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="shrink-0 gap-2 shadow-md">
              <Plus className="w-4 h-4" />
              New Support Ticket
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create a Technical Ticket</DialogTitle>
              <DialogDescription>
                Describe the issue you're experiencing in detail to help us resolve it quickly.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Issue Subject</label>
                <Input 
                  placeholder="e.g. Calendar isn't syncing properly" 
                  {...register('subject', { required: 'Please provide a subject' })}
                />
                {errors.subject && <p className="text-xs text-red-500">{errors.subject.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Priority Level</label>
                <Select 
                  value={selectedPriority} 
                  onValueChange={(val) => setValue('priority', val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low - Minor bug/UI issue</SelectItem>
                    <SelectItem value="normal">Normal - General question/issue</SelectItem>
                    <SelectItem value="high">High - Feature isn't working</SelectItem>
                    <SelectItem value="urgent">Urgent - Platform completely unusable</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Detailed Description</label>
                <Textarea 
                  placeholder="Describe what happened, what you expected, and any steps to reproduce..."
                  className="min-h-[140px] resize-none"
                  {...register('description', { required: 'Please provide a description' })}
                />
                {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
              </div>

              <DialogFooter className="pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createTicket.isPending}>
                  {createTicket.isPending ? 'Submitting...' : 'Submit Ticket'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Metric Cards */}
        <Card className="bg-primary/5 border-primary/10 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium">Active Tickets</p>
              <AlertCircle className="h-4 w-4 text-primary" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-3xl font-bold">{isLoading ? '--' : activeCount}</span>
              <span className="text-xs text-muted-foreground">Currently awaiting review or in progress</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium">Past Tickets</p>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-3xl font-bold">{isLoading ? '--' : resolvedCount}</span>
              <span className="text-xs text-muted-foreground">Successfully resolved issues</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modern Ticket List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Your Tickets</h2>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((val) => (
              <Skeleton key={val} className="h-[120px] w-full rounded-xl" />
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <Card className="border-dashed border-2 bg-transparent shadow-none">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                <MessageSquareCode className="w-8 h-8 text-muted-foreground/60" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No tickets found</h3>
              <p className="text-muted-foreground max-w-sm">
                You don't have any support tickets right now. If you run into an issue, feel free to open one.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {tickets.map((ticket) => (
              <Card key={ticket.id} className="group overflow-hidden border transition-all hover:shadow-md hover:border-border/80">
                <div className="flex flex-col md:flex-row md:items-start p-6 gap-6">
                  {/* Left Column: Icon & Priority */}
                  <div className="flex flex-col items-center gap-3 shrink-0 md:w-24">
                    <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                      <LifeBuoy className="w-6 h-6" />
                    </div>
                    <Badge variant="outline" className={`capitalize shadow-sm w-full justify-center ${PRIORITY_COLORS[ticket.priority]}`}>
                      {ticket.priority}
                    </Badge>
                  </div>

                  {/* Middle Column: Details */}
                  <div className="flex-1 space-y-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                          TICKET #{ticket.id.toString().padStart(4, '0')}
                        </span>
                        <span className="text-muted-foreground/30">•</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(ticket.created_at), 'MMMM d, yyyy · h:mm a')}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold leading-tight">{ticket.subject}</h3>
                    </div>
                    
                    <div className="text-sm text-foreground/80 bg-muted/30 p-4 rounded-lg border border-border/50">
                      <p className="whitespace-pre-wrap">{ticket.description}</p>
                    </div>
                  </div>

                  {/* Right Column: Status & Actions */}
                  <div className="flex flex-col items-start md:items-end gap-3 shrink-0 md:w-48 pt-1">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background border shadow-sm">
                      {STATUS_ICONS[ticket.status]}
                      <span className="text-sm font-medium capitalize">
                        {STATUS_LABELS[ticket.status] || ticket.status}
                      </span>
                    </div>

                    {(ticket.status === 'open' || ticket.status === 'in_progress') && (
                      <Button 
                        variant="ghost" 
                        className="text-sm mt-auto group-hover:text-primary transition-colors"
                        onClick={() => markResolved(ticket.id)}
                        disabled={updateTicket.isPending}
                      >
                        Mark as Resolved
                        <ArrowRight className="w-4 h-4 ml-2 opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
