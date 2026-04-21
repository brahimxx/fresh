'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LifeBuoy, 
  Plus, 
  MessageSquareCode, 
  CheckCircle2, 
  CircleDashed,
  AlertCircle,
  Clock,
  ArrowRight,
  Headphones,
  Sparkles,
  Send,
  Filter,
  ShieldCheck
} from 'lucide-react';

import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
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

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

const STATUS_CONFIG = {
  open: { icon: CircleDashed, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20', label: 'Open' },
  in_progress: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'In Progress' },
  resolved: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Resolved' },
  closed: { icon: ShieldCheck, color: 'text-muted-foreground', bg: 'bg-muted/30', border: 'border-border/50', label: 'Closed' },
};

const PRIORITY_CONFIG = {
  low: { label: 'Low', color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20' },
  normal: { label: 'Normal', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  high: { label: 'High', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  urgent: { label: 'Urgent', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
};

function TicketCard({ ticket, onResolve, isResolving }) {
  const statusCfg = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
  const priorityCfg = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.normal;
  const StatusIcon = statusCfg.icon;

  return (
    <motion.div 
      variants={itemVariants} 
      className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 sm:p-8 shadow-sm overflow-hidden relative group hover:bg-background/80 transition-all duration-500"
    >
      {/* Priority accent stripe */}
      <div className={`absolute top-0 left-0 w-1 h-full ${
        ticket.priority === 'urgent' ? 'bg-red-500' :
        ticket.priority === 'high' ? 'bg-amber-500' :
        ticket.priority === 'normal' ? 'bg-blue-500' : 'bg-slate-400'
      } rounded-l-3xl`} />

      <div className="flex flex-col md:flex-row md:items-start gap-6">
        {/* Left: Icon + Priority */}
        <div className="flex flex-row md:flex-col items-center gap-3 shrink-0 md:w-20">
          <div className={`p-3 rounded-2xl ${statusCfg.bg} ${statusCfg.border} border`}>
            <LifeBuoy className={`w-6 h-6 ${statusCfg.color}`} />
          </div>
          <Badge variant="outline" className={`capitalize text-[11px] font-bold tracking-wider uppercase ${priorityCfg.color} ${priorityCfg.bg} ${priorityCfg.border} border shadow-none px-2.5 py-0.5`}>
            {priorityCfg.label}
          </Badge>
        </div>

        {/* Middle: Content */}
        <div className="flex-1 min-w-0 space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                TKT-{ticket.id.toString().padStart(4, '0')}
              </span>
              <span className="text-muted-foreground/30">•</span>
              <span className="text-[12px] font-semibold text-muted-foreground">
                {format(new Date(ticket.created_at), 'MMM d, yyyy · h:mm a')}
              </span>
            </div>
            <h3 className="text-lg font-extrabold tracking-tight leading-tight">{ticket.subject}</h3>
          </div>
          
          <div className="bg-muted/20 border border-border/50 rounded-2xl p-4">
            <p className="text-[14px] font-medium text-foreground/80 leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
          </div>
        </div>

        {/* Right: Status + Action */}
        <div className="flex flex-row md:flex-col items-start md:items-end gap-3 shrink-0 md:w-44">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-sm ${statusCfg.bg} ${statusCfg.border}`}>
            <StatusIcon className={`w-3.5 h-3.5 ${statusCfg.color}`} />
            <span className={`text-[13px] font-bold ${statusCfg.color}`}>
              {statusCfg.label}
            </span>
          </div>

          {(ticket.status === 'open' || ticket.status === 'in_progress') && (
            <Button 
              variant="ghost" 
              size="sm"
              className="rounded-xl font-bold text-[12px] uppercase tracking-wider text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10 transition-colors mt-auto"
              onClick={() => onResolve(ticket.id)}
              disabled={isResolving}
            >
              Confirm Resolved
              <ArrowRight className="w-3.5 h-3.5 ml-2 opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

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

  // Metrics
  const activeCount = tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;
  const resolvedCount = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;

  return (
    <div className="space-y-8">
      {/* Decorative Hero */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-500/10 via-background to-transparent border border-blue-500/10 p-8 sm:p-10 flex flex-col md:flex-row md:items-end justify-between gap-6 group"
      >
        <div className="absolute top-0 right-10 p-8 opacity-5 pointer-events-none transition-transform duration-1000 group-hover:scale-125 group-hover:rotate-12 translate-y-[-20%]">
          <Headphones className="w-64 h-64 text-blue-500" strokeWidth={1} />
        </div>
        
        <div className="relative z-10 flex flex-col gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-background/80 backdrop-blur-md border border-blue-500/20 text-xs font-semibold text-blue-600 dark:text-blue-400 w-fit">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Priority Support</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight max-w-2xl">
            Support Center
          </h1>
          <p className="text-muted-foreground text-lg font-medium max-w-xl">
            Technical issues? Our engineering team has your back. Submit a ticket and we'll prioritize your request.
          </p>
        </div>

        <div className="relative z-10 shrink-0">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="h-12 px-6 rounded-xl shadow-md text-[15px] font-bold gap-2">
                <Plus className="w-5 h-5" />
                New Ticket
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[520px] rounded-2xl border-border/50">
              <DialogHeader>
                <DialogTitle className="text-xl font-extrabold tracking-tight">Create a Technical Ticket</DialogTitle>
                <DialogDescription className="text-[14px] font-medium text-muted-foreground">
                  Describe the issue you're experiencing in detail to help us resolve it quickly.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-4">
                <div className="space-y-2">
                  <label className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">Issue Subject</label>
                  <Input 
                    placeholder="e.g. Calendar isn't syncing properly" 
                    className="h-11 rounded-xl border-border/50 bg-background shadow-inner"
                    {...register('subject', { required: 'Please provide a subject' })}
                  />
                  {errors.subject && <p className="text-xs font-semibold text-red-500">{errors.subject.message}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">Priority Level</label>
                  <Select 
                    value={selectedPriority} 
                    onValueChange={(val) => setValue('priority', val)}
                  >
                    <SelectTrigger className="h-11 rounded-xl border-border/50 bg-background shadow-sm font-semibold text-[13px]">
                      <SelectValue placeholder="Select a priority" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border/50 shadow-xl">
                      <SelectItem value="low" className="font-semibold rounded-lg">Low — Minor bug/UI issue</SelectItem>
                      <SelectItem value="normal" className="font-semibold rounded-lg">Normal — General question/issue</SelectItem>
                      <SelectItem value="high" className="font-semibold rounded-lg text-amber-600">High — Feature isn't working</SelectItem>
                      <SelectItem value="urgent" className="font-semibold rounded-lg text-red-600">Urgent — Platform unusable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">Detailed Description</label>
                  <Textarea 
                    placeholder="Describe what happened, what you expected, and any steps to reproduce..."
                    className="min-h-[140px] resize-none rounded-xl border-border/50 bg-background shadow-inner"
                    {...register('description', { required: 'Please provide a description' })}
                  />
                  {errors.description && <p className="text-xs font-semibold text-red-500">{errors.description.message}</p>}
                </div>

                <DialogFooter className="pt-2 gap-2">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    className="rounded-xl font-bold text-[12px] uppercase tracking-wider text-muted-foreground"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Abort
                  </Button>
                  <Button type="submit" disabled={createTicket.isPending} className="rounded-xl font-bold text-[12px] uppercase tracking-wider shadow-md gap-2">
                    <Send className="w-3.5 h-3.5" />
                    {createTicket.isPending ? 'Transmitting...' : 'Submit Ticket'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* Metric Tiles */}
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <motion.div variants={itemVariants} className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm overflow-hidden relative group hover:bg-background transition-colors duration-500">
          <div className="absolute -right-6 -top-6 text-blue-500/5 transition-transform duration-700 group-hover:scale-125 group-hover:-rotate-12 pointer-events-none">
            <AlertCircle className="w-32 h-32" strokeWidth={1} />
          </div>
          <div className="flex flex-row items-center justify-between relative z-10">
            <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Active Tickets</h3>
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <AlertCircle className="h-4 w-4 text-blue-500" />
            </div>
          </div>
          <div className="relative z-10 mt-3">
            <p className="text-4xl font-extrabold tracking-tight">{isLoading ? '—' : activeCount}</p>
            <p className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mt-2">Awaiting review or in progress</p>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm overflow-hidden relative group hover:bg-background transition-colors duration-500">
          <div className="absolute -right-6 -top-6 text-emerald-500/5 transition-transform duration-700 group-hover:scale-125 group-hover:rotate-12 pointer-events-none">
            <CheckCircle2 className="w-32 h-32" strokeWidth={1} />
          </div>
          <div className="flex flex-row items-center justify-between relative z-10">
            <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Resolved</h3>
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
          </div>
          <div className="relative z-10 mt-3">
            <p className="text-4xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">{isLoading ? '—' : resolvedCount}</p>
            <p className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mt-2">Successfully fixed issues</p>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm overflow-hidden relative group hover:bg-background transition-colors duration-500">
          <div className="absolute -right-6 -top-6 text-primary/5 transition-transform duration-700 group-hover:scale-125 group-hover:-rotate-12 pointer-events-none">
            <LifeBuoy className="w-32 h-32" strokeWidth={1} />
          </div>
          <div className="flex flex-row items-center justify-between relative z-10">
            <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total Logged</h3>
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <LifeBuoy className="h-4 w-4 text-primary" />
            </div>
          </div>
          <div className="relative z-10 mt-3">
            <p className="text-4xl font-extrabold tracking-tight">{isLoading ? '—' : tickets.length}</p>
            <p className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mt-2">Lifetime support requests</p>
          </div>
        </motion.div>
      </motion.div>

      {/* Ticket Feed */}
      <motion.div variants={itemVariants} initial="hidden" animate="show" className="space-y-6">
        {/* Filter Bar */}
        <div className="py-4 border-b border-border/50 flex flex-wrap gap-4 items-center justify-between">
          <h2 className="text-xl font-extrabold tracking-tight">Ticket Registry</h2>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40 h-11 bg-background rounded-xl border-border/50 shadow-sm font-semibold text-[13px]">
              <Filter className="h-4 w-4 mr-2 opacity-50" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border/50 shadow-xl">
              <SelectItem value="all" className="font-semibold rounded-lg">All Statuses</SelectItem>
              <SelectItem value="open" className="font-semibold rounded-lg text-blue-600">Open</SelectItem>
              <SelectItem value="in_progress" className="font-semibold rounded-lg text-amber-600">In Progress</SelectItem>
              <SelectItem value="resolved" className="font-semibold rounded-lg text-emerald-600">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Ticket List */}
        <div className="space-y-6 pt-2">
          {isLoading ? (
            <div className="space-y-6">
              {[1, 2, 3].map((val) => (
                <Skeleton key={val} className="h-48 rounded-3xl" />
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-background/40 backdrop-blur-xl border border-dashed border-border/50 rounded-3xl p-16 text-center">
              <div className="h-24 w-24 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <MessageSquareCode className="h-10 w-10 text-muted-foreground opacity-50" />
              </div>
              <p className="text-xl font-bold tracking-tight mb-2">No Tickets Found</p>
              <p className="text-muted-foreground font-medium max-w-sm mx-auto">
                {filter !== 'all'
                  ? 'Try relaxing your filter to see more tickets.'
                  : "You're all clear! If you run into an issue, open a ticket and we'll jump on it."}
              </p>
            </motion.div>
          ) : (
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
              {tickets.map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  onResolve={markResolved}
                  isResolving={updateTicket.isPending}
                />
              ))}
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
