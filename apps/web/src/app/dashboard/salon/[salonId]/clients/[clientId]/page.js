'use client';

import { useState } from 'react';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { 
  ArrowLeft,
  Pencil,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  Clock,
  MessageSquare,
  Plus,
  MoreVertical,
  User
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

import { useClient, useDeleteClient, useClientBookings } from '@/hooks/use-clients';
import { ClientFormDialog } from '@/components/clients/client-form';
import { ClientNotes } from '@/components/clients/client-notes';
import { ClientBookingHistory } from '@/components/clients/client-booking-history';

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(function(n) { return n[0]; }).join('').toUpperCase().slice(0, 2);
}

export default function ClientDetailPage({ params }) {
  var resolvedParams = use(params);
  var salonId = resolvedParams.salonId;
  var clientId = resolvedParams.clientId;
  var router = useRouter();
  
  var [editOpen, setEditOpen] = useState(false);
  var [deleteOpen, setDeleteOpen] = useState(false);
  
  var { data: client, isLoading, error } = useClient(clientId);
  var deleteClient = useDeleteClient();
  
  function handleDelete() {
    deleteClient.mutate(clientId, {
      onSuccess: function() {
        router.push('../clients');
      },
    });
  }
  
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }
  
  if (error || !client) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Client not found</p>
        <Button variant="link" onClick={function() { router.push('../clients'); }}>
          Back to Clients
        </Button>
      </div>
    );
  }
  
  var name = ((client.first_name || '') + ' ' + (client.last_name || '')).trim() || 'Unknown';
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={function() { router.push('../clients'); }}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={client.avatar_url} />
            <AvatarFallback className="text-xl">{getInitials(name)}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">{name}</h1>
            <p className="text-muted-foreground">
              Client since {client.created_at ? format(new Date(client.created_at), 'MMM yyyy') : 'Unknown'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={function() { setEditOpen(true); }}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline" className="text-destructive" onClick={function() { setDeleteOpen(true); }}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Visits</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{client.total_visits || client.visit_count || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Spent</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              EUR {Number(client.total_spent || client.lifetime_value || 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Last Visit</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {client.last_visit ? format(new Date(client.last_visit), 'MMM d') : 'Never'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg. Spend</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              EUR {client.total_visits > 0 
                ? (Number(client.total_spent || 0) / client.total_visits).toFixed(2) 
                : '0.00'}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Client Info */}
        <div className="space-y-6">
          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {client.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={'mailto:' + client.email} className="text-sm hover:underline">
                    {client.email}
                  </a>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={'tel:' + client.phone} className="text-sm hover:underline">
                    {client.phone}
                  </a>
                </div>
              )}
              {(client.address || client.city) && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="text-sm">
                    {client.address && <p>{client.address}</p>}
                    {(client.city || client.postal_code) && (
                      <p className="text-muted-foreground">
                        {[client.city, client.postal_code].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {client.date_of_birth && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {format(new Date(client.date_of_birth), 'MMMM d, yyyy')}
                  </span>
                </div>
              )}
              {!client.email && !client.phone && !client.address && (
                <p className="text-sm text-muted-foreground">No contact information</p>
              )}
            </CardContent>
          </Card>
          
          {/* Tags */}
          {client.tags && client.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {client.tags.map(function(tag) {
                    return (
                      <Badge key={tag} variant="secondary">{tag}</Badge>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Notes */}
          <ClientNotes clientId={clientId} />
        </div>
        
        {/* Right Column - Booking History */}
        <div className="lg:col-span-2">
          <ClientBookingHistory clientId={clientId} salonId={salonId} />
        </div>
      </div>
      
      {/* Edit Dialog */}
      <ClientFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        client={client}
        salonId={salonId}
      />
      
      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {name} and all their booking history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Client
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
