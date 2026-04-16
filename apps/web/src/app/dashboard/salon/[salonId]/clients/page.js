"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Search,
  Plus,
  MoreHorizontal,
  Mail,
  Phone,
  User,
  Calendar as CalendarIcon,
  Filter,
  Download,
  MapPin,
  Clock,
  ArrowUpDown
} from "lucide-react";

import { encodeId } from "@/lib/id";
import { useClients, useDeleteClient } from "@/hooks/use-clients";
import { ClientFormDialogDialog } from "@/components/clients/client-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { DataError } from "@/components/ui/data-error";
import { EmptyClients } from "@/components/ui/empty-states";

export default function ClientsPage({ params }) {
  const resolvedParams = use(params);
  const salonId = resolvedParams.salonId;
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [createOpen, setCreateOpen] = useState(false);
  const [editClient, setEditClient] = useState(null);

  const filters = {
    salon_id: salonId,
    search: search || undefined,
    sort: sortBy,
    limit: 50,
  };

  const { data, isLoading, error, refetch } = useClients(filters);
  const deleteClientMutation = useDeleteClient();
  const clients = data?.data || [];

  const handleViewClient = (client) => {
    router.push(`/dashboard/salon/${encodeId(salonId)}/clients/${encodeId(client.id)}`);
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-500 pb-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground mt-1">
            Manage your client list, booking history, and preferences.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="hidden sm:flex gap-2 shadow-sm">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => setCreateOpen(true)} className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            Add New Client
          </Button>
        </div>
      </div>

      {error ? (
        <DataError
          title="Failed to load clients"
          message="Unable to fetch your client list. Please try again."
          onRetry={refetch}
          error={error}
        />
      ) : (
        <>
          {/* Main Content Area */}
          <div className="bg-background rounded-xl border border-border shadow-sm flex flex-col flex-1 overflow-hidden">
            {/* Toolbar */}
            <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center gap-4 bg-muted/20">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  className="pl-9 bg-background border-muted shadow-sm hover:border-primary/50 transition-colors"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-9 gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  Filters
                </Button>
                <div className="h-4 w-[1px] bg-border mx-1"></div>
                <div className="text-sm text-muted-foreground px-2">
                  <span className="font-medium text-foreground">{clients.length}</span> clients total
                </div>
              </div>
            </div>

            {/* Table Area */}
            <div className="flex-1 overflow-auto">
              {isLoading ? (
                <div className="p-6 space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 border-b pb-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-[250px]" />
                        <Skeleton className="h-4 w-[200px]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : clients.length === 0 ? (
                <div className="p-12">
                  <EmptyClients onCreate={() => setCreateOpen(true)} />
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-muted/30 sticky top-0 z-10 backdrop-blur-sm">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[300px]">Client Details</TableHead>
                      <TableHead>Contact Information</TableHead>
                      <TableHead>Latest Booking</TableHead>
                      <TableHead className="text-right">Metrics</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.map((client) => {
                      const clientName = `${client.first_name} ${client.last_name || ""}`.trim();
                      const lastBooking = client.last_booking_date ? new Date(client.last_booking_date) : null;

                      return (
                        <TableRow
                          key={client.id}
                          className="cursor-pointer group hover:bg-muted/40 transition-colors"
                          onClick={() => handleViewClient(client)}
                        >
                          <TableCell className="align-top py-4">
                            <div className="flex items-start gap-4">
                              <Avatar className="h-10 w-10 border border-border shadow-sm mt-0.5">
                                <AvatarImage src={client.avatar_url} />
                                <AvatarFallback className="bg-primary/5 text-primary text-xs font-medium">
                                  {getInitials(clientName)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                  {clientName}
                                </p>
                                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                  <CalendarIcon className="h-3 w-3" />
                                  <span>Added {format(new Date(client.created_at || new Date()), "MMM yyyy")}</span>
                                </div>
                                {client.tags?.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mt-2">
                                    {client.tags.slice(0, 3).map((tag) => (
                                      <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 font-medium">
                                        {tag}
                                      </Badge>
                                    ))}
                                    {client.tags.length > 3 && (
                                      <span className="text-[10px] text-muted-foreground flex items-center">+{client.tags.length - 3}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          
                          <TableCell className="align-top py-4">
                            <div className="space-y-2.5">
                              {client.phone ? (
                                <div className="flex items-center gap-2 text-sm text-foreground">
                                  <Phone className="h-3.5 w-3.5 text-muted-foreground mr-0.5" />
                                  <a href={`tel:${client.phone}`} onClick={(e) => e.stopPropagation()} className="hover:underline hover:text-primary">
                                    {client.phone}
                                  </a>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground/60 italic">
                                  <Phone className="h-3.5 w-3.5 mr-0.5" />
                                  No phone
                                </div>
                              )}
                              
                              {client.email ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Mail className="h-3.5 w-3.5 mr-0.5" />
                                  <a href={`mailto:${client.email}`} onClick={(e) => e.stopPropagation()} className="truncate max-w-[200px] hover:underline hover:text-primary">
                                    {client.email}
                                  </a>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground/60 italic">
                                  <Mail className="h-3.5 w-3.5 mr-0.5" />
                                  No email
                                </div>
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="align-top py-4">
                            {lastBooking ? (
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2 text-sm font-medium">
                                  <Clock className="h-3.5 w-3.5 text-primary" />
                                  {format(lastBooking, "MMM d, yyyy")}
                                </div>
                                <span className="text-xs text-muted-foreground block ml-5.5">
                                  {client.last_service_name || "Service visit"}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground/70 flex items-center justify-center p-2 rounded-md bg-muted/20 border border-border/50 max-w-fit italic">
                                No previous bookings
                              </span>
                            )}
                          </TableCell>
                          
                          <TableCell className="text-right align-top py-4">
                            <div className="space-y-1 inline-flex flex-col items-end">
                              <span className="text-sm font-semibold">
                                {client.total_bookings || 0} visits
                              </span>
                              <span className="text-xs text-muted-foreground">
                                ${(client.total_revenue || 0).toLocaleString()} value
                              </span>
                            </div>
                          </TableCell>
                          
                          <TableCell className="align-top py-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 shadow-lg">
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewClient(client); }}>
                                  View Profile
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditClient(client); }}>
                                  Edit Details
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-red-600 focus:text-red-700"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm("Remove this client?")) {
                                      deleteClientMutation.mutate({ salonId, clientId: client.id });
                                    }
                                  }}
                                >
                                  Delete Client
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </>
      )}

      {/* Forms Map To Existing Abstracted Components */}
      {createOpen && (
        <ClientFormDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          salonId={salonId}
        />
      )}
      
      {editClient && (
        <ClientFormDialog
          open={!!editClient}
          onOpenChange={(open) => !open && setEditClient(null)}
          salonId={salonId}
          client={editClient}
        />
      )}
    </div>
  );
}
