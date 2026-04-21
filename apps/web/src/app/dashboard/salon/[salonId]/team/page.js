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
} from "lucide-react";
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
import { Card, CardContent } from "@/components/ui/card";

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
        return "bg-primary/10 text-primary border-primary/20";
      case "manager":
        return "bg-blue-500/10 text-blue-700 border-blue-500/20";
      case "stylist":
        return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20";
      case "receptionist":
        return "bg-purple-500/10 text-purple-700 border-purple-500/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const activeStaff = staff ? staff.filter((s) => s.isActive) : [];
  const inactiveStaff = staff ? staff.filter((s) => !s.isActive) : [];

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
    // Use fallback avatar logic based on existing hook setup or DB
    const bgColor = member.color || "#09090b";

    return (
      <Card
        key={member.id}
        className="group overflow-hidden border-border hover:border-primary/40 hover:shadow-md transition-all bg-background relative cursor-pointer pt-0"
        onClick={() =>
          router.push(
            `/dashboard/salon/${encodeId(salonId)}/team/${encodeId(member.id)}`,
          )
        }
      >
        <CardContent className="p-0">
          {/* Top aesthetic banner */}
          <div
            className="h-16 w-full opacity-10 group-hover:opacity-20 transition-opacity"
            style={{ backgroundColor: bgColor }}
          />

          <div className="px-6 pb-6 -mt-8 relative">
            <div className="flex items-start justify-between">
              <Avatar className="h-16 w-16 border-4 border-background shadow-sm bg-background">
                <AvatarImage src={member.avatarUrl} />
                <AvatarFallback
                  className="text-xl font-medium text-white"
                  style={{ backgroundColor: bgColor }}
                >
                  {getInitials(name)}
                </AvatarFallback>
              </Avatar>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full bg-background shadow-sm border opacity-0 group-hover:opacity-100 transition-opacity mt-4 z-10 hover:bg-muted/50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-48 shadow-lg z-50"
                >
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(
                        `/dashboard/salon/${encodeId(salonId)}/team/${encodeId(member.id)}`,
                      );
                    }}
                  >
                    <User className="mr-2 h-4 w-4" /> View Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(member);
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" /> Edit Details
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSchedule(member);
                    }}
                  >
                    <Calendar className="mr-2 h-4 w-4" /> Working Hours
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-600 focus:text-red-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteStaff(member);
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Remove team member
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="mt-4 space-y-1.5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg leading-tight tracking-tight group-hover:text-primary transition-colors truncate">
                  {name}
                </h3>
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0 h-5 ${getRoleBadgeColor(member.role)}`}
                >
                  {getRoleLabel(member.role)}
                </Badge>
                {member.title && (
                  <span className="text-sm font-medium text-muted-foreground truncate max-w-[120px]">
                    {member.title}
                  </span>
                )}
              </div>
            </div>

            <div className="pt-5 mt-5 border-t border-border/50 space-y-3">
              <div
                className="flex items-center text-sm text-foreground/80 hover:text-primary transition-colors cursor-pointer w-fit"
                onClick={(e) => e.stopPropagation()}
              >
                <Phone className="h-3.5 w-3.5 text-muted-foreground mr-2.5" />
                {member.phone || (
                  <span className="italic opacity-50">No phone</span>
                )}
              </div>
              <div
                className="flex items-center text-sm text-foreground/80 hover:text-primary transition-colors cursor-pointer w-fit truncate"
                onClick={(e) => e.stopPropagation()}
              >
                <Mail className="h-3.5 w-3.5 text-muted-foreground mr-2.5" />
                {member.email || (
                  <span className="italic opacity-50">No email</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-500 pb-10 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Members</h1>
          <p className="text-muted-foreground mt-1">
            Manage your staff, permissions, and working schedules.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="hidden sm:flex shadow-sm bg-background"
            onClick={() => setStaffFormOpen(true)}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Quick Add
          </Button>
          <Button
            className="shadow-sm shadow-primary/20"
            onClick={() => setWizardOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Staff Member
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-[280px] rounded-xl" />
          ))}
        </div>
      ) : staff?.length > 0 ? (
        <div className="pt-2 space-y-10">
          {/* Pending Requests */}
          {requests && requests.length > 0 && (
            <div className="mb-10">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <UserPlus className="w-5 h-5 mr-2 text-primary" />
                Pending Join Requests
                <Badge
                  variant="secondary"
                  className="ml-2 bg-primary/10 text-primary border-0"
                >
                  {requests.length}
                </Badge>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {requests.map((request) => (
                  <Card
                    key={request.id}
                    className="relative overflow-hidden group border-primary/20 bg-card/50"
                  >
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary/50" />
                    <CardContent className="p-5 flex flex-col h-full justify-between">
                      <div>
                        <div className="flex items-center space-x-4 mb-4">
                          <Avatar className="h-12 w-12 border border-border shadow-sm">
                            <AvatarImage src={request.avatar_url || ""} />
                            <AvatarFallback className="bg-primary/10 text-primary font-medium">
                              {request.first_name?.[0]}
                              {request.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-semibold text-[15px] group-hover:text-primary transition-colors flex items-center">
                              {request.first_name} {request.last_name}
                            </div>
                            <div className="flex flex-col text-sm text-muted-foreground mt-0.5">
                              <span className="flex items-center">
                                <Mail className="w-3.5 h-3.5 mr-1" />{" "}
                                {request.email}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Display Message */}
                        {request.message && (
                          <div className="mb-4 bg-muted/50 p-3 rounded-lg border border-border/50 text-sm">
                            <p className="flex items-center text-xs font-semibold text-muted-foreground mb-1">
                              <MessageSquare className="w-3.5 h-3.5 mr-1" />{" "}
                              Note to Salon
                            </p>
                            <p className="text-foreground italic">
                              "{request.message}"
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/50">
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
                          className="flex-1 bg-green-500 hover:bg-green-600 text-white border-0 shadow-sm"
                          size="sm"
                        >
                          <Check className="w-4 h-4 mr-1.5" />
                          Accept
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
                          size="sm"
                          className="flex-1 text-red-500 hover:bg-red-50 hover:text-red-600 border-red-200"
                        >
                          <X className="w-4 h-4 mr-1.5" />
                          Decline
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Active Staff Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeStaff.map(renderStaffCard)}
          </div>

          {/* Inactive Staff Grid */}
          {inactiveStaff.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-lg font-semibold text-muted-foreground flex items-center gap-2">
                  Inactive Accounts
                  <Badge variant="secondary" className="font-normal text-xs">
                    {inactiveStaff.length}
                  </Badge>
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 opacity-60 hover:opacity-100 transition-opacity">
                {inactiveStaff.map(renderStaffCard)}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-16 flex flex-col items-center justify-center text-center bg-muted/5 shadow-sm mt-4">
          <div className="h-20 w-20 bg-background rounded-full border shadow-sm flex items-center justify-center mb-6">
            <Briefcase className="h-10 w-10 text-muted-foreground/40" />
          </div>
          <h2 className="text-xl font-bold mb-2">Build Your Dream Team</h2>
          <p className="text-muted-foreground max-w-md mb-8">
            Add staff members to assign services, manage their working hours,
            and let clients book them directly online.
          </p>
          <Button size="lg" onClick={() => setWizardOpen(true)}>
            Add First Team Member
          </Button>
        </div>
      )}

      {/* Abstracted Components Retained to Prevent Regression */}
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
        staffMember={editStaff}
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
          staffId={scheduleStaff.id}
          salonId={salonId}
          staffName={`${scheduleStaff.firstName || ""} ${scheduleStaff.lastName || ""}`.trim()}
        />
      )}

      <AlertDialog
        open={!!deleteStaff}
        onOpenChange={(open) => !open && setDeleteStaff(null)}
      >
        <AlertDialogContent className="shadow-xl border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">
              Remove Team Member?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base text-foreground mt-2">
              Are you sure you want to permanently remove{" "}
              <strong>
                {deleteStaff?.firstName} {deleteStaff?.lastName}
              </strong>
              ?
              <br />
              <br />
              All their future assigned bookings must be reassigned. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              onClick={handleDeleteConfirm}
            >
              Remove Staff
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
