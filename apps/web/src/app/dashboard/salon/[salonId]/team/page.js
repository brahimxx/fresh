"use client";

import { useState } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Calendar,
  Phone,
  Mail,
  Clock,
  Briefcase,
  Eye,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  useDeleteStaff,
  STAFF_COLORS,
  STAFF_ROLES,
} from "@/hooks/use-staff";
import { StaffFormDialog } from "@/components/staff/staff-form";
import { StaffScheduleDialog } from "@/components/staff/staff-schedule";

export default function TeamPage({ params }) {
  var resolvedParams = use(params);
  var salonId = resolvedParams.salonId;
  var router = useRouter();

  var [staffFormOpen, setStaffFormOpen] = useState(false);
  var [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  var [editStaff, setEditStaff] = useState(null);
  var [scheduleStaff, setScheduleStaff] = useState(null);
  var [deleteStaff, setDeleteStaff] = useState(null);

  var { data: staff, isLoading } = useStaff(salonId);
  var deleteStaffMutation = useDeleteStaff();

  function getInitials(name) {
    if (!name) return "?";
    return name
      .split(" ")
      .map(function (n) {
        return n[0];
      })
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  function getRoleLabel(role) {
    var found = STAFF_ROLES.find(function (r) {
      return r.value === role;
    });
    return found ? found.label : role;
  }

  function handleAddStaff() {
    setEditStaff(null);
    setStaffFormOpen(true);
  }

  function handleEditStaff(member) {
    setEditStaff(member);
    setStaffFormOpen(true);
  }

  function handleEditSchedule(member) {
    setScheduleStaff(member);
    setScheduleDialogOpen(true);
  }

  function handleDeleteConfirm() {
    if (!deleteStaff) return;

    deleteStaffMutation.mutate(deleteStaff.id, {
      onSuccess: function () {
        setDeleteStaff(null);
      },
    });
  }

  // Group staff by role
  var staffByRole = {};
  if (Array.isArray(staff)) {
    staff.forEach(function (member) {
      var role = member.role || "staff";
      if (!staffByRole[role]) {
        staffByRole[role] = [];
      }
      staffByRole[role].push(member);
    });
  }

  // Role order for display
  var roleOrder = ["owner", "manager", "staff", "receptionist"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team</h1>
          <p className="text-muted-foreground">
            Manage your staff members and their schedules
          </p>
        </div>
        <Button onClick={handleAddStaff}>
          <Plus className="h-4 w-4 mr-2" />
          Add Team Member
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Staff</p>
          <p className="text-2xl font-bold">{staff?.length || 0}</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Managers</p>
          <p className="text-2xl font-bold">
            {staff?.filter(function (s) {
              return s.role === "manager" || s.role === "owner";
            }).length || 0}
          </p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Service Staff</p>
          <p className="text-2xl font-bold">
            {staff?.filter(function (s) {
              return s.role === "staff";
            }).length || 0}
          </p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Receptionists</p>
          <p className="text-2xl font-bold">
            {staff?.filter(function (s) {
              return s.role === "receptionist";
            }).length || 0}
          </p>
        </div>
      </div>

      {/* Staff List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      ) : staff && staff.length > 0 ? (
        <div className="space-y-6">
          {roleOrder.map(function (role) {
            var members = staffByRole[role];
            if (!members || members.length === 0) return null;

            return (
              <div key={role}>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  {getRoleLabel(role)}s
                  <Badge variant="secondary" className="ml-1">
                    {members.length}
                  </Badge>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {members.map(function (member) {
                    var colorIndex = member.id % STAFF_COLORS.length;
                    var colorClass = STAFF_COLORS[colorIndex];
                    var memberName = `${member.firstName} ${member.lastName}`;

                    return (
                      <div
                        key={member.id}
                        className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12">
                              <AvatarFallback
                                className={
                                  colorClass.light + " " + colorClass.text
                                }
                              >
                                {getInitials(memberName)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h3 className="font-medium">{memberName}</h3>
                              <Badge variant="outline" className="text-xs mt-1">
                                {getRoleLabel(member.role)}
                              </Badge>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={function () {
                                  router.push("/dashboard/salon/" + salonId + "/team/" + member.id);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={function () {
                                  handleEditStaff(member);
                                }}
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                Quick Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={function () {
                                  handleEditSchedule(member);
                                }}
                              >
                                <Calendar className="h-4 w-4 mr-2" />
                                Edit Schedule
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={function () {
                                  setDeleteStaff(member);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="space-y-2 text-sm text-muted-foreground">
                          {member.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              <span className="truncate">{member.email}</span>
                            </div>
                          )}
                          {member.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4" />
                              <span>{member.phone}</span>
                            </div>
                          )}
                          {member.title && (
                            <div className="flex items-center gap-2">
                              <Briefcase className="h-4 w-4" />
                              <span>{member.title}</span>
                            </div>
                          )}
                        </div>

                        <div className="mt-4 pt-4 border-t flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>View Schedule</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={function () {
                              handleEditSchedule(member);
                            }}
                          >
                            Edit Hours
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="border rounded-lg p-12 text-center">
          <p className="text-muted-foreground mb-4">No team members yet</p>
          <Button onClick={handleAddStaff}>
            <Plus className="h-4 w-4 mr-2" />
            Add First Team Member
          </Button>
        </div>
      )}

      {/* Staff Form Dialog */}
      <StaffFormDialog
        open={staffFormOpen}
        onOpenChange={setStaffFormOpen}
        staff={editStaff}
        salonId={salonId}
      />

      {/* Schedule Dialog */}
      <StaffScheduleDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        staff={scheduleStaff}
        salonId={salonId}
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteStaff}
        onOpenChange={function (open) {
          if (!open) setDeleteStaff(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove "{deleteStaff?.name}" from your team. Their
              future appointments will need to be reassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
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
