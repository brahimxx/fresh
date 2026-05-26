"use client";

import { useState, useCallback } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
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
  User,
  TrendingUp,
  Gift,
  Ban,
  CheckCircle2,
  MoreHorizontal,
  ExternalLink,
  Cake,
  Activity,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  useClient,
  useDeleteClient,
  useUpdateClientStatus,
} from "@/hooks/use-clients";
import { ClientFormDialog } from "@/components/clients/client-form";
import { ClientNotes } from "@/components/clients/client-notes";
import { ClientBookingHistory } from "@/components/clients/client-booking-history";
import { useSalon } from "@/providers/salon-provider";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

function getInitials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function StatCard({ title, value, subtitle, icon: Icon, color = "primary" }) {
  const colorMap = {
    primary: "bg-primary/10 text-primary",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  };

  return (
    <motion.div
      variants={itemVariants}
      className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-2xl p-5 shadow-sm relative group hover:bg-background transition-colors duration-300"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          {title}
        </span>
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", colorMap[color])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="text-2xl font-extrabold tracking-tight">{value}</div>
      {subtitle && (
        <p className="text-xs font-medium text-muted-foreground mt-1">{subtitle}</p>
      )}
    </motion.div>
  );
}

export default function ClientDetailPage({ params }) {
  const resolvedParams = use(params);
  const salonId = resolvedParams.salonId;
  const clientId = resolvedParams.clientId;
  const router = useRouter();
  const { salon } = useSalon();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const { data: client, isLoading, error } = useClient(clientId, salonId);
  const deleteClient = useDeleteClient();
  const updateStatus = useUpdateClientStatus();

  const handleDelete = useCallback(() => {
    deleteClient.mutate(
      { id: clientId, salonId },
      {
        onSuccess: () => {
          router.push("../clients");
        },
      }
    );
  }, [clientId, salonId, deleteClient, router]);

  const handleToggleStatus = useCallback(() => {
    updateStatus.mutate({
      id: clientId,
      salonId,
      isActive: !client?.isActive,
    });
  }, [clientId, salonId, client?.isActive, updateStatus]);

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-48 w-full bg-muted/40 rounded-3xl" />
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-muted/30 rounded-2xl" />
          ))}
        </div>
        <div className="h-96 bg-muted/30 rounded-3xl" />
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <User className="w-8 h-8 text-muted-foreground opacity-40" />
        </div>
        <h3 className="font-bold text-lg">Client not found</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
          This profile may have been removed or you don't have access.
        </p>
        <Button
          variant="outline"
          className="mt-6 rounded-xl"
          onClick={() => router.push("../clients")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Clients
        </Button>
      </div>
    );
  }

  const name = ((client.firstName || "") + " " + (client.lastName || "")).trim() || "Unknown Client";
  const memberSince = client.createdAt
    ? format(new Date(String(client.createdAt).replace(" ", "T")), "MMMM yyyy")
    : "Unknown";
  const lastVisit = client.salonStats?.lastVisitDate
    ? formatDistanceToNow(new Date(String(client.salonStats.lastVisitDate).replace(" ", "T")), { addSuffix: true })
    : null;
  const totalVisits = client.salonStats?.totalVisits ?? 0;
  const totalSpent = Number(client.salonStats?.totalSpent ?? 0);
  const avgSpend = totalVisits > 0 ? totalSpent / totalVisits : 0;

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-8 sm:p-10"
      >
        {/* Background decoration */}
        <div className="absolute top-0 right-10 p-8 opacity-5 pointer-events-none">
          <User className="w-64 h-64 text-primary" strokeWidth={1} />
        </div>

        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          className="mb-6 -ml-2 text-muted-foreground hover:text-foreground rounded-xl"
          onClick={() => router.push("../clients")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          All Clients
        </Button>

        {/* Profile row */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
              <AvatarImage src={client.avatar_url} />
              <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                {getInitials(name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  {name}
                </h1>
                {client.isActive === false && (
                  <Badge variant="destructive" className="text-[10px] font-bold uppercase tracking-wider">
                    Blocked
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground font-medium mt-1">
                Client since {memberSince}
              </p>
              {lastVisit && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Last seen {lastVisit}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              className="rounded-xl border-border/50 bg-background/50 backdrop-blur-md shadow-sm"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-xl border-border/50 bg-background/50 backdrop-blur-md shadow-sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px] rounded-xl">
                {client.email && (
                  <DropdownMenuItem asChild className="font-medium gap-2">
                    <a href={`mailto:${client.email}`}>
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      Send Email
                    </a>
                  </DropdownMenuItem>
                )}
                {client.phone && (
                  <DropdownMenuItem asChild className="font-medium gap-2">
                    <a href={`tel:${client.phone}`}>
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      Call Client
                    </a>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="font-medium gap-2"
                  onClick={handleToggleStatus}
                >
                  {client.isActive !== false ? (
                    <>
                      <ShieldOff className="h-4 w-4 text-amber-500" />
                      Block Client
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4 text-emerald-500" />
                      Unblock Client
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="font-medium gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Remove Client
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </motion.div>

      {/* Stats Row */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid gap-4 grid-cols-2 lg:grid-cols-4"
      >
        <StatCard
          title="Total Visits"
          value={totalVisits}
          subtitle="appointments completed"
          icon={Calendar}
          color="primary"
        />
        <StatCard
          title="Total Spent"
          value={formatCurrency(totalSpent, salon?.currency)}
          subtitle="lifetime revenue"
          icon={CreditCard}
          color="emerald"
        />
        <StatCard
          title="Average Spend"
          value={formatCurrency(avgSpend, salon?.currency)}
          subtitle="per appointment"
          icon={TrendingUp}
          color="blue"
        />
        <StatCard
          title="Last Visit"
          value={
            client.salonStats?.lastVisitDate
              ? format(new Date(String(client.salonStats.lastVisitDate).replace(" ", "T")), "MMM d")
              : "Never"
          }
          subtitle={lastVisit || "no visits yet"}
          icon={Clock}
          color="amber"
        />
      </motion.div>

      {/* Main Content Tabs */}
      <motion.div
        variants={itemVariants}
        initial="hidden"
        animate="show"
        className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl shadow-sm overflow-hidden"
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b border-border/50 px-6 sm:px-8 py-6">
            <TabsList className="bg-muted/30 rounded-xl p-1 h-auto">
              <TabsTrigger
                value="overview"
                className="cursor-pointer rounded-lg px-5 py-2.5 text-sm font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="bookings"
                className="cursor-pointer rounded-lg px-5 py-2.5 text-sm font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                Appointments
              </TabsTrigger>
              <TabsTrigger
                value="notes"
                className="cursor-pointer rounded-lg px-5 py-2.5 text-sm font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                Notes
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="p-6 sm:p-8 mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Contact Information */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">
                    Contact Information
                  </h3>
                  <div className="space-y-4">
                    <ContactRow
                      icon={Mail}
                      label="Email"
                      value={client.email}
                      href={client.email ? `mailto:${client.email}` : null}
                    />
                    <ContactRow
                      icon={Phone}
                      label="Phone"
                      value={client.phone}
                      href={client.phone ? `tel:${client.phone}` : null}
                    />
                    <ContactRow
                      icon={MapPin}
                      label="Address"
                      value={
                        [client.address, client.city, client.postalCode]
                          .filter(Boolean)
                          .join(", ") || null
                      }
                    />
                    <ContactRow
                      icon={Cake}
                      label="Birthday"
                      value={
                        client.dateOfBirth
                          ? format(new Date(String(client.dateOfBirth).replace(" ", "T")), "MMMM d, yyyy")
                          : null
                      }
                    />
                  </div>
                </div>

                {/* Client Status */}
                <div>
                  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">
                    Status
                  </h3>
                  <div className="flex items-center gap-3 p-4 rounded-2xl border border-border/50 bg-muted/5">
                    {client.isActive !== false ? (
                      <>
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        </div>
                        <div>
                          <p className="font-bold text-sm">Active Client</p>
                          <p className="text-xs text-muted-foreground">Can book appointments normally</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                          <Ban className="h-5 w-5 text-red-500" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-red-600 dark:text-red-400">Blocked</p>
                          <p className="text-xs text-muted-foreground">This client has been restricted</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Tags */}
                {client.tags && client.tags.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">
                      Tags
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {client.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="px-3 py-1 rounded-lg text-xs font-bold bg-primary/10 text-primary border-0"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Booking Summary */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">
                    Relationship Summary
                  </h3>
                  <div className="space-y-3">
                    <SummaryRow
                      label="First visit"
                      value={
                        client.salonStats?.firstVisitDate
                          ? format(new Date(String(client.salonStats.firstVisitDate).replace(" ", "T")), "MMM d, yyyy")
                          : "Not yet"
                      }
                    />
                    <SummaryRow
                      label="Last visit"
                      value={
                        client.salonStats?.lastVisitDate
                          ? format(new Date(String(client.salonStats.lastVisitDate).replace(" ", "T")), "MMM d, yyyy")
                          : "Never"
                      }
                    />
                    <SummaryRow
                      label="Total appointments"
                      value={totalVisits.toString()}
                    />
                    <SummaryRow
                      label="Lifetime value"
                      value={formatCurrency(totalSpent, salon?.currency)}
                      highlight
                    />
                    <SummaryRow
                      label="Average per visit"
                      value={formatCurrency(avgSpend, salon?.currency)}
                    />
                  </div>
                </div>

                {/* Quick Actions */}
                <div>
                  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">
                    Quick Actions
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      className="h-12 rounded-xl border-border/50 justify-start font-bold text-sm hover:bg-primary/5 hover:border-primary/20 hover:text-primary"
                      onClick={() => router.push(`/dashboard/salon/${salonId}/calendar`)}
                    >
                      <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                      Book Now
                    </Button>
                    {client.email && (
                      <Button
                        variant="outline"
                        className="h-12 rounded-xl border-border/50 justify-start font-bold text-sm hover:bg-primary/5 hover:border-primary/20 hover:text-primary"
                        asChild
                      >
                        <a href={`mailto:${client.email}`}>
                          <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                          Email
                        </a>
                      </Button>
                    )}
                    {client.phone && (
                      <Button
                        variant="outline"
                        className="h-12 rounded-xl border-border/50 justify-start font-bold text-sm hover:bg-primary/5 hover:border-primary/20 hover:text-primary"
                        asChild
                      >
                        <a href={`tel:${client.phone}`}>
                          <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                          Call
                        </a>
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="h-12 rounded-xl border-border/50 justify-start font-bold text-sm hover:bg-primary/5 hover:border-primary/20 hover:text-primary"
                      onClick={() => setActiveTab("notes")}
                    >
                      <MessageSquare className="h-4 w-4 mr-2 text-muted-foreground" />
                      Add Note
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Bookings Tab */}
          <TabsContent value="bookings" className="p-6 sm:p-8 mt-0">
            <ClientBookingHistory clientId={clientId} salonId={salonId} />
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes" className="p-6 sm:p-8 mt-0">
            <ClientNotes clientId={clientId} salonId={salonId} />
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Edit Dialog */}
      <ClientFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        client={client}
        salonId={salonId}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this client?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove <span className="font-semibold text-foreground">{name}</span> from
              your client list. Their booking history will be preserved for your records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
            >
              Remove Client
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function ContactRow({ icon: Icon, label, value, href }) {
  return (
    <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/5 transition-colors -mx-3">
      <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {value ? (
          href ? (
            <a
              href={href}
              className="text-sm font-semibold text-foreground hover:text-primary transition-colors truncate block"
            >
              {value}
            </a>
          ) : (
            <p className="text-sm font-semibold text-foreground truncate">{value}</p>
          )
        ) : (
          <p className="text-sm text-muted-foreground/50 italic">Not provided</p>
        )}
      </div>
    </div>
  );
}

function SummaryRow({ label, value, highlight }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/30 last:border-0">
      <span className="text-sm text-muted-foreground font-medium">{label}</span>
      <span className={cn(
        "text-sm font-bold",
        highlight ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
      )}>
        {value}
      </span>
    </div>
  );
}
