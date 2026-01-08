'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { 
  Clock, 
  Search, 
  Bell, 
  Calendar, 
  User, 
  MoreHorizontal,
  CheckCircle,
  XCircle,
  AlertCircle,
  Trash2,
  Phone,
  Mail
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

import { 
  useWaitlist, 
  useNotifyWaitlist,
  useConvertWaitlistToBooking,
  useRemoveFromWaitlist,
  WAITLIST_STATUSES,
  PRIORITY_LEVELS
} from '@/hooks/use-waitlist';
import { WaitlistForm } from '@/components/marketing/waitlist-form';
import { NotifyDialog } from '@/components/marketing/notify-dialog';

function getStatusBadge(status) {
  var variants = {
    waiting: { variant: 'secondary', icon: Clock, label: 'Waiting' },
    notified: { variant: 'default', icon: Bell, label: 'Notified' },
    booked: { variant: 'success', icon: CheckCircle, label: 'Booked' },
    expired: { variant: 'outline', icon: AlertCircle, label: 'Expired' },
    cancelled: { variant: 'destructive', icon: XCircle, label: 'Cancelled' },
  };
  
  var config = variants[status] || variants.waiting;
  var Icon = config.icon;
  
  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

function getPriorityBadge(priority) {
  var variants = {
    low: 'outline',
    normal: 'secondary',
    high: 'default',
    urgent: 'destructive',
  };
  
  return (
    <Badge variant={variants[priority] || 'secondary'} className="capitalize">
      {priority}
    </Badge>
  );
}

export default function WaitlistPage() {
  var params = useParams();
  var { toast } = useToast();
  
  var [search, setSearch] = useState('');
  var [statusFilter, setStatusFilter] = useState('all');
  var [showForm, setShowForm] = useState(false);
  var [showNotifyDialog, setShowNotifyDialog] = useState(false);
  var [showDeleteDialog, setShowDeleteDialog] = useState(false);
  var [selectedEntry, setSelectedEntry] = useState(null);
  
  var { data: waitlist, isLoading } = useWaitlist(params.salonId);
  var notifyWaitlist = useNotifyWaitlist();
  var convertToBooking = useConvertWaitlistToBooking();
  var removeFromWaitlist = useRemoveFromWaitlist();
  
  // Filter waitlist
  var filteredWaitlist = (waitlist || []).filter(function(entry) {
    var matchesSearch = !search || 
      (entry.client_name && entry.client_name.toLowerCase().includes(search.toLowerCase())) ||
      (entry.service_name && entry.service_name.toLowerCase().includes(search.toLowerCase()));
    var matchesStatus = statusFilter === 'all' || entry.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  
  // Stats
  var stats = {
    total: (waitlist || []).length,
    waiting: (waitlist || []).filter(function(e) { return e.status === 'waiting'; }).length,
    notified: (waitlist || []).filter(function(e) { return e.status === 'notified'; }).length,
    converted: (waitlist || []).filter(function(e) { return e.status === 'booked'; }).length,
  };
  
  function handleNotify(entry) {
    setSelectedEntry(entry);
    setShowNotifyDialog(true);
  }
  
  function handleConvert(entry) {
    convertToBooking.mutate({
      waitlistId: entry.id,
      data: { client_id: entry.client_id, service_id: entry.service_id },
    }, {
      onSuccess: function() {
        toast({ title: 'Converted to booking' });
      },
      onError: function(error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      },
    });
  }
  
  function handleDelete(entry) {
    setSelectedEntry(entry);
    setShowDeleteDialog(true);
  }
  
  function confirmDelete() {
    if (!selectedEntry) return;
    
    removeFromWaitlist.mutate(selectedEntry.id, {
      onSuccess: function() {
        toast({ title: 'Removed from waitlist' });
        setShowDeleteDialog(false);
        setSelectedEntry(null);
      },
      onError: function(error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      },
    });
  }
  
  function formatDate(date) {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }
  
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(function(i) {
              return <div key={i} className="h-24 bg-muted rounded" />;
            })}
          </div>
          <div className="h-96 bg-muted rounded" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Waitlist</h1>
          <p className="text-muted-foreground">
            Manage clients waiting for appointments
          </p>
        </div>
        <Button onClick={function() { setShowForm(true); }}>
          <User className="h-4 w-4 mr-2" />
          Add to Waitlist
        </Button>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Entries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Waiting
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.waiting}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Notified
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.notified}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Converted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.converted}</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by client or service..."
            value={search}
            onChange={function(e) { setSearch(e.target.value); }}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {WAITLIST_STATUSES.map(function(status) {
              return (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
      
      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Preferred Date</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Added</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredWaitlist.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No waitlist entries found
                </TableCell>
              </TableRow>
            ) : (
              filteredWaitlist.map(function(entry) {
                return (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{entry.client_name || 'Unknown'}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                            {entry.client_phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {entry.client_phone}
                              </span>
                            )}
                            {entry.client_email && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {entry.client_email}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{entry.service_name || '-'}</TableCell>
                    <TableCell>
                      {entry.preferred_date ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatDate(entry.preferred_date)}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Any</span>
                      )}
                    </TableCell>
                    <TableCell>{getPriorityBadge(entry.priority || 'normal')}</TableCell>
                    <TableCell>{getStatusBadge(entry.status)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(entry.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {entry.status === 'waiting' && (
                            <>
                              <DropdownMenuItem onClick={function() { handleNotify(entry); }}>
                                <Bell className="h-4 w-4 mr-2" />
                                Notify Client
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={function() { handleConvert(entry); }}>
                                <Calendar className="h-4 w-4 mr-2" />
                                Convert to Booking
                              </DropdownMenuItem>
                            </>
                          )}
                          {entry.status === 'notified' && (
                            <DropdownMenuItem onClick={function() { handleConvert(entry); }}>
                              <Calendar className="h-4 w-4 mr-2" />
                              Convert to Booking
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={function() { handleDelete(entry); }}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
      
      {/* Waitlist Form Dialog */}
      <WaitlistForm
        open={showForm}
        onOpenChange={setShowForm}
        salonId={params.salonId}
        onSuccess={function() { setShowForm(false); }}
      />
      
      {/* Notify Dialog */}
      <NotifyDialog
        open={showNotifyDialog}
        onOpenChange={setShowNotifyDialog}
        entry={selectedEntry}
        onSuccess={function() {
          setShowNotifyDialog(false);
          setSelectedEntry(null);
        }}
      />
      
      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Waitlist?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {selectedEntry?.client_name} from the waitlist.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
