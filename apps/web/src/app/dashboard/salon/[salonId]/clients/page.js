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
  ArrowUpDown,
  Users,
  Contact2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { encodeId } from "@/lib/id";
import { formatCurrency } from "@/lib/format";
import { useClients, useDeleteClient } from "@/hooks/use-clients";
import { ClientFormDialog } from "@/components/clients/client-form";
import { useSalon } from "@/providers/salon-provider";

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
import { cn } from "@/lib/utils";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
};

export default function ClientsPage({ params }) {
  const resolvedParams = use(params);
  const salonId = resolvedParams.salonId;
  const router = useRouter();
  const { salon } = useSalon();

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
    <div className="space-y-8">
      {/* Decorative Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-8 sm:p-10 flex flex-col md:flex-row md:items-end justify-between gap-6 group"
      >
        <div className="absolute top-0 right-10 p-8 opacity-5 pointer-events-none transition-transform duration-1000 group-hover:scale-125 group-hover:rotate-12 translate-y-[-20%]">
          <Contact2 className="w-64 h-64 text-primary" strokeWidth={1} />
        </div>
        
        <div className="relative z-10 flex flex-col gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-background/80 backdrop-blur-md border border-primary/20 text-xs font-semibold text-primary w-fit">
            <Users className="w-3.5 h-3.5" />
            <span>CRM & Profiling</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight max-w-2xl">
            Client Directory
          </h1>
          <p className="text-muted-foreground text-lg font-medium max-w-xl">
            Unify your client relationships. Track contact information, booking history, and platform metrics across the business.
          </p>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row gap-3 shrink-0">
          <Button
            variant="outline"
            className="flex-1 sm:flex-none h-12 px-6 rounded-xl border-border/50 bg-background/50 backdrop-blur-md hover:bg-background shadow-sm text-[15px]"
          >
            <Download className="h-5 w-5 mr-2 text-muted-foreground" />
             Export Data
          </Button>
          <Button
            className="flex-1 sm:flex-none h-12 px-6 rounded-xl shadow-md text-[15px]"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-5 w-5 mr-2" />
            New Client
          </Button>
        </div>
      </motion.div>

      {error ? (
        <DataError
          title="Failed to load client matrix"
          message="Unable to fetch your relationship list. Please try again."
          onRetry={refetch}
          error={error}
        />
      ) : (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="bg-background/60 backdrop-blur-xl rounded-3xl border border-border/50 shadow-sm flex flex-col overflow-hidden"
        >
          {/* Toolbar */}
          <div className="p-5 sm:px-8 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/5">
             <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
                <Input
                  placeholder="Search by identity, email, or digital contact..."
                  className="pl-10 h-11 bg-background rounded-xl border-border/50 focus-visible:ring-primary/50 shadow-sm font-medium"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            
            <div className="flex items-center gap-4">
              <div className="text-[13px] font-bold text-muted-foreground px-2 bg-muted/30 py-1.5 rounded-lg border border-border/50">
                <span className="text-foreground">{clients.length}</span> recorded profiles
              </div>
              <Button variant="outline" className="h-11 rounded-xl shadow-sm border-border/50">
                <Filter className="h-4 w-4 mr-2" />
                Segment
              </Button>
            </div>
          </div>

          {/* Table Area */}
          <div className="overflow-x-auto">
             {isLoading ? (
                <div className="p-6 space-y-3">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                      <Skeleton className="h-4 flex-1 rounded-xl" />
                      <Skeleton className="h-4 w-32 rounded-xl" />
                      <Skeleton className="h-4 w-24 rounded-xl" />
                      <Skeleton className="h-4 w-20 rounded-xl" />
                    </div>
                  ))}
                </div>
              ) : clients.length === 0 ? (
                <div className="p-16">
                  <EmptyClients onCreate={() => setCreateOpen(true)} />
                </div>
              ) : (
              <Table className="px-4">
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border/50 [&_th]:h-14">
                    <TableHead className="pl-8 text-xs font-bold uppercase tracking-wider text-muted-foreground w-[300px]">Client Identity</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Digital Comms</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Booking History</TableHead>
                    <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">Lifetime Value</TableHead>
                    <TableHead className="w-[80px] pr-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                   <AnimatePresence>
                    {clients.map((client, i) => {
                      const clientName = `${client.firstName || ""} ${client.lastName || ""}`.trim();
                      const lastBooking = client.lastVisitDate ? new Date(client.lastVisitDate) : null;

                      return (
                        <motion.tr
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          key={client.id}
                          className="cursor-pointer group hover:bg-muted/5 border-border/50 transition-colors [&_td]:py-5"
                          onClick={() => handleViewClient(client)}
                        >
                          <TableCell className="align-top pl-8">
                            <div className="flex items-start gap-4">
                              <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                                <AvatarImage src={client.avatar_url} />
                                <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold font-mono">
                                  {getInitials(clientName)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-bold text-[15px] leading-none text-foreground group-hover:text-primary transition-colors">
                                  {clientName}
                                </p>
                                <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-muted-foreground">
                                  <CalendarIcon className="h-3.5 w-3.5 opacity-50" />
                                  <span>Acquired {format(new Date(client.firstVisitDate || new Date()), "MMM yyyy")}</span>
                                </div>
                                {client.tags?.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mt-3">
                                    {client.tags.slice(0, 3).map((tag) => (
                                      <Badge key={tag} variant="secondary" className="text-[10px] px-2 py-0 border-0 h-5 bg-primary/10 text-primary font-bold uppercase tracking-wider">
                                        {tag}
                                      </Badge>
                                    ))}
                                    {client.tags.length > 3 && (
                                      <span className="text-[10px] font-bold text-muted-foreground flex items-center">+{client.tags.length - 3}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          
                          <TableCell className="align-top">
                            <div className="space-y-3 mt-1">
                              {client.phone ? (
                                <div className="flex items-center gap-2.5 text-[14px] font-semibold text-foreground">
                                  <Phone className="h-4 w-4 text-muted-foreground opacity-50" />
                                  <a href={`tel:${client.phone}`} onClick={(e) => e.stopPropagation()} className="hover:text-primary transition-colors">
                                    {client.phone}
                                  </a>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2.5 text-[14px] text-muted-foreground/50 italic font-medium">
                                  <Phone className="h-4 w-4 opacity-50" />
                                  Unrecorded
                                </div>
                              )}
                              
                              {client.email ? (
                                <div className="flex items-center gap-2.5 text-sm font-medium text-muted-foreground">
                                  <Mail className="h-4 w-4 opacity-50" />
                                  <a href={`mailto:${client.email}`} onClick={(e) => e.stopPropagation()} className="truncate max-w-[200px] hover:text-primary transition-colors">
                                    {client.email}
                                  </a>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2.5 text-sm text-muted-foreground/50 italic font-medium">
                                  <Mail className="h-4 w-4 opacity-50" />
                                  Unrecorded
                                </div>
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="align-top">
                            {lastBooking ? (
                              <div className="space-y-1.5 mt-1">
                                <div className="flex items-center gap-2 text-[14px] font-bold text-primary">
                                  <Clock className="h-4 w-4" />
                                  {format(lastBooking, "MMM d, yyyy")}
                                </div>
                                <span className="text-xs font-semibold text-muted-foreground block ml-6 truncate max-w-[150px]">
                                  {client.lastServiceName || "Standard Service"}
                                </span>
                              </div>
                            ) : (
                              <div className="mt-1">
                                 <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center p-1.5 px-2.5 rounded-lg bg-muted/30 border border-border/50 max-w-fit">
                                   No booking history
                                 </span>
                              </div>
                            )}
                          </TableCell>
                          
                          <TableCell className="text-right align-top">
                             <div className="space-y-1 mt-1 flex flex-col items-end">
                                <span className="text-[15px] font-extrabold text-foreground">
                                  {client.totalVisits || 0} visits
                                </span>
                                <span className="text-[12px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                                  {formatCurrency(client.totalSpent || 0, salon?.currency)} volume
                                </span>
                             </div>
                          </TableCell>
                          
                          <TableCell className="align-top text-right pr-8">
                             <div className="mt-1 inline-flex">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button
                                      variant="ghost"
                                      className="h-9 w-9 p-0 rounded-xl bg-muted/30 hover:bg-muted text-muted-foreground opacity-50 group-hover:opacity-100 transition-all data-[state=open]:opacity-100"
                                    >
                                      <span className="sr-only">Open menu</span>
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-[180px] rounded-2xl" onClick={(e) => e.stopPropagation()}>
                                  <DropdownMenuItem onClick={() => handleViewClient(client)} className="font-medium gap-2">
                                     <User className="h-4 w-4 text-primary" />
                                    Launch Profile
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setEditClient(client)} className="font-medium gap-2">
                                     Edit Framework
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    className="font-medium gap-2 text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                                    onClick={() => {
                                      if (confirm("Remove this client from the database?")) {
                                        deleteClientMutation.mutate({ salonId, clientId: client.id });
                                      }
                                    }}
                                  >
                                    Terminate Client
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                             </div>
                          </TableCell>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </TableBody>
              </Table>
            )}
          </div>
        </motion.div>
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
