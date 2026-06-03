"use client";

import { useState, use } from "react";
import { RequirePermission } from '@/components/layout/require-permission';
import { useRouter } from "next/navigation";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Calendar,
  Phone,
  Mail,
  Briefcase,
  User,
  Clock,
  ArrowRight,
  UserPlus,
  Check,
  X,
  MessageSquare,
  ChevronRight,
  ShieldCheck,
  Users
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { encodeId } from "@/lib/id";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  useStaff,
  useStaffRequests,
  useAcceptStaffRequest,
  useDeclineStaffRequest,
  useDeleteStaff,
  STAFF_COLORS,
  STAFF_ROLES,
} from "@/hooks/use-staff";
import { StaffCreationWizard } from "@/components/staff/staff-creation-wizard";
import { StaffFormDialog } from "@/components/staff/staff-form";
import { StaffScheduleDialog } from "@/components/staff/staff-schedule";
import { useSalon } from "@/providers/salon-provider";
import { canEditStaffMember, canDeleteStaffMember } from "@/lib/permissions";
import { cn } from "@/lib/utils";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
};

export default function TeamPage({ params }) {
  return (
    <RequirePermission page="team">
      <TeamContent params={params} />
    </RequirePermission>
  );
}

function TeamContent({ params }) {
  const resolvedParams = use(params);
  const salonId = resolvedParams.salonId;
  const router = useRouter();
  const { staffRole: currentUserRole, staffId: currentStaffId, salon } = useSalon();

  const [staffFormOpen, setStaffFormOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [editStaff, setEditStaff] = useState(null);
  const [scheduleStaff, setScheduleStaff] = useState(null);
  const [deleteStaff, setDeleteStaff] = useState(null);

  const { data: staff, isLoading } = useStaff(salonId);
  const { data: requests, isLoading: requestsLoading } =
    useStaffRequests(salonId);
  const acceptRequest = useAcceptStaffRequest();
  const declineRequest = useDeclineStaffRequest();
  const deleteStaffMutation = useDeleteStaff();

  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleLabel = (role) => {
    const found = STAFF_ROLES.find((r) => r.value === role);
    return found ? found.label : role;
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case "owner":
        return "bg-primary/10 text-primary border-0 font-bold tracking-wider";
      case "manager":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-0 font-bold tracking-wider";
      case "stylist":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0 font-bold tracking-wider";
      case "receptionist":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-0 font-bold tracking-wider";
      default:
        return "bg-muted text-muted-foreground border-0 font-bold tracking-wider";
    }
  };

  const activeStaff = staff ? staff.filter((s) => s.isActive) : [];
  const inactiveStaff = staff ? staff.filter((s) => !s.isActive) : [];

  // Permission helpers using centralized engine
  const canEditMember = (member) => {
    const isSelf = member.id === currentStaffId;
    return canEditStaffMember(currentUserRole, member.role, isSelf);
  };

  const canDeleteMember = (member) => {
    const isSelf = member.id === currentStaffId;
    return canDeleteStaffMember(currentUserRole, member.role, isSelf);
  };

  const handleEdit = (member) => {
    setEditStaff(member);
    setStaffFormOpen(true);
  };

  const handleSchedule = (member) => {
    setScheduleStaff(member);
    setScheduleDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (deleteStaff) {
      deleteStaffMutation.mutate(encodeId(deleteStaff.id), {
        onSuccess: () => setDeleteStaff(null),
      });
    }
  };

  const renderStaffCard = (member) => {
    const name =
      `${member.firstName || ""} ${member.lastName || ""}`.trim() ||
      "Unnamed Member";
    const bgColor = member.color || "#09090b";

    return (
      <motion.div
        variants={itemVariants}
        className="group relative cursor-pointer"
        key={member.id}
        onClick={() =>
          router.push(
            `/dashboard/salon/${encodeId(salonId)}/team/${encodeId(member.id)}`,
          )
        }
      >
        <div className="absolute inset-0 bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl transition-transform duration-300  group-hover:shadow-lg pointer-events-none" />
        <div className="relative overflow-hidden rounded-3xl h-full flex flex-col pt-0">
          {/* Top aesthetic banner */}
          <div
            className="h-20 w-full opacity-10 group-hover:opacity-20 transition-all duration-500"
            style={{ backgroundColor: bgColor }}
          />
          <div className="absolute top-0 w-full h-20 bg-gradient-to-b from-transparent to-background/60 backdrop-blur-[2px]" />

          <div className="px-6 sm:px-8 pb-8 -mt-10 relative flex-1 flex flex-col">
            <div className="flex items-start justify-between">
              <Avatar className="h-20 w-20 border-4 border-background shadow-md bg-background transition-transform duration-500 group-hover:scale-105">
                <AvatarImage src={member.avatarUrl} className="object-cover" />
                <AvatarFallback
                  className="text-2xl font-bold text-white shadow-inner"
                  style={{ backgroundColor: bgColor }}
                >
                  {getInitials(name)}
                </AvatarFallback>
              </Avatar>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-10 w-10 p-0 rounded-2xl bg-background shadow-sm border border-border/50 opacity-0 group-hover:opacity-100 transition-all duration-300 mt-6 z-10 hover:bg-muted focus:opacity-100 data-[state=open]:opacity-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 shadow-2xl rounded-2xl p-2 z-50 border-border/50"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DropdownMenuItem
                    onSelect={() => {
                      router.push(
                        `/dashboard/salon/${encodeId(salonId)}/team/${encodeId(member.id)}`,
                      );
                    }}
                    className="rounded-xl font-medium gap-2 py-2"
                  >
                    <User className="h-4 w-4 text-primary" /> View Profile
                  </DropdownMenuItem>
                  {canEditMember(member) && (
                    <DropdownMenuItem
                      onSelect={() => handleEdit(member)}
                      className="rounded-xl font-medium gap-2 py-2"
                    >
                      <Pencil className="h-4 w-4" /> Edit Details
                    </DropdownMenuItem>
                  )}
                  {canEditMember(member) && (
                    <DropdownMenuItem
                      onSelect={() => handleSchedule(member)}
                      className="rounded-xl font-medium gap-2 py-2"
                    >
                      <Calendar className="h-4 w-4" /> Working Hours
                    </DropdownMenuItem>
                  )}
                  {canDeleteMember(member) && (
                    <>
                      <DropdownMenuSeparator className="my-1.5" />
                      <DropdownMenuItem
                        className="rounded-xl text-red-600 focus:text-red-700 focus:bg-red-500/10 font-bold gap-2 py-2 cursor-pointer"
                        onSelect={() => setDeleteStaff(member)}
                      >
                        <Trash2 className="h-4 w-4" /> Remove Member
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="mt-5 space-y-1.5 flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-[19px] leading-tight tracking-tight group-hover:text-primary transition-colors truncate">
                  {name}
                </h3>
                <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-50 -translate-x-2 group-hover:translate-x-0 transition-all duration-300" />
              </div>
              <div className="flex flex-col gap-2 mt-1 -ml-1">
                <div className="flex">
                  <Badge
                    variant="outline"
                    className={`text-[10px] uppercase px-2.5 py-0.5 rounded-md ${getRoleBadgeColor(member.role)}`}
                  >
                    {getRoleLabel(member.role)}
                  </Badge>
                </div>
                {member.title && (
                  <span className="text-[13px] font-semibold text-muted-foreground truncate max-w-[200px] ml-1">
                    {member.title}
                  </span>
                )}
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-border/50 space-y-3.5">
              <div
                className="flex items-center text-[13px] font-medium text-foreground/80 hover:text-primary transition-colors cursor-pointer w-fit"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-6 h-6 rounded-md bg-muted/50 flex items-center justify-center mr-3">
                  <Phone className="h-3.5 w-3.5 opacity-60" />
                </div>
                {member.phone || (
                  <span className="italic opacity-40">No phone</span>
                )}
              </div>
              <div
                className="flex items-center text-[13px] font-medium text-foreground/80 hover:text-primary transition-colors cursor-pointer w-fit truncate max-w-[240px]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-6 h-6 rounded-md bg-muted/50 flex items-center justify-center mr-3 shrink-0">
                  <Mail className="h-3.5 w-3.5 opacity-60" />
                </div>
                <span className="truncate">
                  {member.email || (
                    <span className="italic opacity-40">No email</span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Decorative Hero */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-8 sm:p-10 flex flex-col md:flex-row md:items-end justify-between gap-6 group"
      >
        <div className="absolute top-0 right-10 p-8 opacity-5 pointer-events-none transition-transform duration-1000 group-hover:scale-125 group-hover:rotate-12 translate-y-[-20%]">
          <ShieldCheck className="w-64 h-64 text-primary" strokeWidth={1} />
        </div>
        
        <div className="relative z-10 flex flex-col gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-background/80 backdrop-blur-md border border-primary/20 text-xs font-semibold text-primary w-fit">
            <Users className="w-3.5 h-3.5" />
            <span>Team Management</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight max-w-2xl">
            Team
          </h1>
          <p className="text-muted-foreground text-lg font-medium max-w-xl">
            Manage your team members, roles, and working hours.
          </p>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row gap-3 shrink-0">
          <Button
            variant="outline"
            className="flex-1 sm:flex-none h-12 px-6 rounded-xl border-border/50 bg-background/50 backdrop-blur-md hover:bg-background shadow-sm text-[15px]"
            onClick={() => setStaffFormOpen(true)}
          >
            <UserPlus className="h-5 w-5 mr-2 text-muted-foreground" />
             Add Manually
          </Button>
          <Button
            className="flex-1 sm:flex-none h-12 px-6 rounded-xl shadow-md text-[15px]"
            onClick={() => setWizardOpen(true)}
          >
            <Plus className="h-5 w-5 mr-2" />
            Invite Member
          </Button>
        </div>
      </motion.div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pt-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-[350px] rounded-3xl" />
          ))}
        </div>
      ) : staff?.length > 0 ? (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-12"
        >
          {/* Pending Requests */}
          {requests && requests.length > 0 && (
            <motion.div variants={itemVariants}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight">Pending Requests</h2>
                  <p className="text-[13px] font-semibold text-muted-foreground">People who want to join your team</p>
                </div>
                <Badge
                  variant="secondary"
                  className="ml-auto bg-primary/10 text-primary border-0 text-[13px] px-2.5 py-0.5 rounded-lg"
                >
                  {requests.length} pending
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {requests.map((request) => (
                  <div
                    key={request.id}
                    className="relative overflow-hidden group bg-background/60 backdrop-blur-xl border border-primary/20 rounded-3xl p-6 shadow-sm"
                  >
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-primary/50 pointer-events-none" />
                    <div className="flex flex-col h-full justify-between relative z-10">
                      <div>
                        <div className="flex items-center space-x-5 mb-5">
                          <Avatar className="h-14 w-14 border-2 border-background shadow-sm">
                            <AvatarImage src={request.avatar_url || ""} />
                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                              {request.first_name?.[0]}
                              {request.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-extrabold text-[17px] group-hover:text-primary transition-colors tracking-tight">
                              {request.first_name} {request.last_name}
                            </div>
                            <div className="flex items-center text-[13px] font-medium text-muted-foreground mt-1">
                              <Mail className="w-3.5 h-3.5 mr-1.5 opacity-50" />
                              <span className="truncate max-w-[160px]">{request.email}</span>
                            </div>
                          </div>
                        </div>

                        {/* Display Message */}
                        {request.message && (
                          <div className="mb-4 bg-muted/40 p-4 rounded-2xl border border-border/50 text-sm">
                            <p className="flex items-center text-[11px] uppercase tracking-wider font-bold text-muted-foreground mb-1.5">
                              <MessageSquare className="w-3 h-3 mr-1.5 opacity-60" />
                              Their message
                            </p>
                            <p className="text-[13px] font-medium text-foreground italic leading-relaxed">
                              "{request.message}"
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border/50">
                        <Button
                          onClick={() =>
                            acceptRequest.mutate({
                              salonId,
                              requestId: request.id,
                            })
                          }
                          disabled={
                            acceptRequest.isPending || declineRequest.isPending
                          }
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md h-11 font-bold"
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          onClick={() =>
                            declineRequest.mutate({
                              salonId,
                              requestId: request.id,
                            })
                          }
                          disabled={
                            acceptRequest.isPending || declineRequest.isPending
                          }
                          variant="outline"
                          className="flex-1 text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200 dark:border-red-900/30 rounded-xl h-11 font-bold"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Deny
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Active Staff Grid by Role */}
          <motion.div variants={itemVariants} className="space-y-10">
             <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight">Active Team</h2>
                </div>
              </div>

            <div className="space-y-10">
              {STAFF_ROLES.map((role) => {
                const roleStaff = activeStaff.filter(s => s.role === role.value);
                if (roleStaff.length === 0) return null;
                
                return (
                  <div key={role.value} className="space-y-4">
                    <h3 className="text-lg font-bold text-muted-foreground flex items-center gap-2">
                      {role.label}s
                      <Badge variant="secondary" className="bg-muted text-muted-foreground font-bold border-0 px-2 rounded-md">
                        {roleStaff.length}
                      </Badge>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                      {roleStaff.map(renderStaffCard)}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Inactive Staff Grid */}
          {inactiveStaff.length > 0 && (
            <motion.div variants={itemVariants} className="space-y-6 pt-6">
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <h3 className="text-lg font-bold text-muted-foreground flex items-center gap-2">
                  Inactive Members
                  <Badge variant="secondary" className="bg-muted text-muted-foreground font-bold border-0 px-2 rounded-md">
                    {inactiveStaff.length}
                  </Badge>
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 opacity-60 hover:opacity-100 transition-opacity duration-300">
                {inactiveStaff.map(renderStaffCard)}
              </div>
            </motion.div>
          )}
        </motion.div>
      ) : (
        <div className="rounded-3xl border border-dashed border-border/50 p-16 flex flex-col items-center justify-center text-center bg-muted/5 shadow-sm mt-8 max-w-4xl mx-auto">
          <div className="h-24 w-24 bg-background rounded-full border border-border/50 shadow-sm flex items-center justify-center mb-6">
            <Briefcase className="h-10 w-10 text-muted-foreground opacity-50" />
          </div>
          <h2 className="text-2xl font-extrabold mb-3 tracking-tight">Build Your Team</h2>
          <p className="text-muted-foreground font-medium max-w-lg mb-8 leading-relaxed">
            Add your team members to start managing schedules, assigning services, and tracking performance.
          </p>
          <Button size="lg" className="rounded-xl h-12 px-8 font-bold shadow-md text-[15px]" onClick={() => setWizardOpen(true)}>
            Add First Member
          </Button>
        </div>
      )}

      {/* Abstracted Components Retained */}
      <StaffCreationWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        salonId={salonId}
      />

      <StaffFormDialog
        open={staffFormOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEditStaff(null);
          }
          setStaffFormOpen(open);
        }}
        salonId={salonId}
        staff={editStaff}
      />

      {scheduleStaff && (
        <StaffScheduleDialog
          open={scheduleDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
               setScheduleStaff(null);
            }
            setScheduleDialogOpen(open);
          }}
          staff={{
            id: scheduleStaff.id,
            name: `${scheduleStaff.firstName || ""} ${scheduleStaff.lastName || ""}`.trim()
          }}
          salonId={salonId}
        />
      )}

      <AlertDialog
        open={!!deleteStaff}
        onOpenChange={(open) => !open && setDeleteStaff(null)}
      >
         <AlertDialogContent className="shadow-2xl border-border/50 rounded-3xl max-w-md">
          <AlertDialogHeader>
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6 text-red-600 dark:text-red-500" />
            </div>
            <AlertDialogTitle className="text-2xl font-bold text-red-600 dark:text-red-500">
              Remove team member?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[15px] font-medium text-foreground tracking-tight leading-relaxed">
              Are you sure you want to remove{" "}
              <strong>
                {deleteStaff?.firstName} {deleteStaff?.lastName}
              </strong>{" "}
              from your team?
              <br />
              <br />
              Their existing bookings will need to be reassigned to another team member.
              <br />
              <span className="text-muted-foreground text-[13px] mt-2 block">
                This action cannot be undone.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-2 sm:gap-0">
            <AlertDialogCancel className="rounded-xl h-11 font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600 rounded-xl h-11 font-bold shadow-md"
              onClick={handleDeleteConfirm}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
