'use client';

import { useState } from 'react';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { 
  Search, 
  Plus, 
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Mail,
  Phone,
  User,
  Calendar as CalendarIcon
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
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

import { useClients, useDeleteClient } from '@/hooks/use-clients';
import { ClientFormDialog } from '@/components/clients/client-form';

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(function(n) { return n[0]; }).join('').toUpperCase().slice(0, 2);
}

export default function ClientsPage({ params }) {
  var resolvedParams = use(params);
  var salonId = resolvedParams.salonId;
  var router = useRouter();
  
  var [search, setSearch] = useState('');
  var [sortBy, setSortBy] = useState('name');
  var [page, setPage] = useState(1);
  var [createOpen, setCreateOpen] = useState(false);
  var [editClient, setEditClient] = useState(null);
  var [deleteClient, setDeleteClient] = useState(null);
  
  var filters = {
    salon_id: salonId,
    search: search || undefined,
    sort: sortBy,
    page: page,
    limit: 20,
  };
  
  var { data, isLoading } = useClients(filters);
  var deleteClientMutation = useDeleteClient();
  
  var clients = data?.data || [];
  var pagination = data?.pagination || { total: 0, pages: 1 };
  
  function handleViewClient(client) {
    router.push('./clients/' + client.id);
  }
  
  function handleEditClient(client) {
    setEditClient(client);
  }
  
  function handleDeleteConfirm() {
    if (deleteClient) {
      deleteClientMutation.mutate(deleteClient.id, {
        onSuccess: function() {
          setDeleteClient(null);
        },
      });
    }
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-muted-foreground">
            Manage your salon clients
          </p>
        </div>
        <Button onClick={function() { setCreateOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Client
        </Button>
      </div>
      
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={function(e) { setSearch(e.target.value); }}
            className="pl-10"
          />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name (A-Z)</SelectItem>
            <SelectItem value="-name">Name (Z-A)</SelectItem>
            <SelectItem value="-created_at">Newest First</SelectItem>
            <SelectItem value="created_at">Oldest First</SelectItem>
            <SelectItem value="-last_visit">Recent Visit</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Clients</p>
          <p className="text-2xl font-bold">{pagination.total || 0}</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">New This Month</p>
          <p className="text-2xl font-bold">-</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Active</p>
          <p className="text-2xl font-bold">-</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Avg. Spend</p>
          <p className="text-2xl font-bold">-</p>
        </div>
      </div>
      
      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Last Visit</TableHead>
              <TableHead>Total Visits</TableHead>
              <TableHead>Total Spent</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map(function(_, i) {
                return (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-10 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                );
              })
            ) : clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No clients found
                </TableCell>
              </TableRow>
            ) : (
              clients.map(function(client) {
                var name = (client.first_name || '') + ' ' + (client.last_name || '');
                name = name.trim() || client.name || 'Unknown';
                
                return (
                  <TableRow 
                    key={client.id}
                    className="cursor-pointer"
                    onClick={function() { handleViewClient(client); }}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={client.avatar_url} />
                          <AvatarFallback>{getInitials(name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{name}</p>
                          {client.tags && client.tags.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {client.tags.slice(0, 2).map(function(tag) {
                                return (
                                  <Badge key={tag} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {client.email && (
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <span className="truncate max-w-[180px]">{client.email}</span>
                          </div>
                        )}
                        {client.phone && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{client.phone}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {client.last_visit ? (
                        format(new Date(client.last_visit), 'MMM d, yyyy')
                      ) : (
                        <span className="text-muted-foreground">Never</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {client.total_visits || client.visit_count || 0}
                    </TableCell>
                    <TableCell>
                      EUR {Number(client.total_spent || client.lifetime_value || 0).toFixed(2)}
                    </TableCell>
                    <TableCell onClick={function(e) { e.stopPropagation(); }}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={function() { handleViewClient(client); }}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={function() { handleEditClient(client); }}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={function() { setDeleteClient(client); }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
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
      </div>
      
      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {clients.length} of {pagination.total} clients
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={function() { setPage(page - 1); }}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {page} of {pagination.pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.pages}
              onClick={function() { setPage(page + 1); }}
            >
              Next
            </Button>
          </div>
        </div>
      )}
      
      {/* Create/Edit Dialog */}
      <ClientFormDialog
        open={createOpen || !!editClient}
        onOpenChange={function(open) {
          if (!open) {
            setCreateOpen(false);
            setEditClient(null);
          }
        }}
        client={editClient}
        salonId={salonId}
      />
      
      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteClient} onOpenChange={function(open) { if (!open) setDeleteClient(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this client and all their data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
