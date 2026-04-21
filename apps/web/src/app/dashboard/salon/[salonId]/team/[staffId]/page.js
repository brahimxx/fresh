"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { encodeId } from "@/lib/id";
import {
  ArrowLeft,
  Loader2,
  Briefcase,
  Mail,
  Phone,
  Calendar,
  MoreVertical,
  Pencil,
  Trash2,
  Share,
  CalendarClock,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useStaffMember, STAFF_ROLES } from "@/hooks/use-staff";
import { StaffPersonalTab } from "@/components/staff/staff-personal-tab";
import { StaffAddressesTab } from "@/components/staff/staff-addresses-tab";
import { StaffEmergencyContactsTab } from "@/components/staff/staff-emergency-contacts-tab";
import { StaffServicesTab } from "@/components/staff/staff-services-tab";
import { StaffLocationsTab } from "@/components/staff/staff-locations-tab";
import { StaffSettingsTab } from "@/components/staff/staff-settings-tab";
import { StaffPermissionsTab } from "@/components/staff/staff-permissions-tab";
import { StaffWagesTab } from "@/components/staff/staff-wages-tab";
import { StaffCommissionsTab } from "@/components/staff/staff-commissions-tab";
import { StaffPayRunsTab } from "@/components/staff/staff-pay-runs-tab";
import { useSalon } from "@/providers/salon-provider";

export default function StaffDetailPage({ params }) {
  const resolvedParams = use(params);
  const salonId = resolvedParams.salonId;
  const staffId = resolvedParams.staffId;
  const router = useRouter();
  const { staffRole: currentUserRole } = useSalon();

  const [activeTab, setActiveTab] = useState("personal");
  const { data: staff, isLoading, error } = useStaffMember(staffId);

  const getInitials = (firstName, lastName) => {
    const first = (firstName || "")[0] || "";
    const last = (lastName || "")[0] || "";
    return (first + last).toUpperCase() || "?";
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

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto px-2 pt-4">
        <div className="flex items-center gap-6">
          <Skeleton className="h-24 w-24 rounded-full" />
          <div className="space-y-3">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-5 w-40" />
            <div className="flex gap-2 mt-2">
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>
        </div>
        <Skeleton className="h-[500px] w-full rounded-xl" />
      </div>
    );
  }

  if (error || !staff) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in">
        <div className="h-16 w-16 bg-muted/30 rounded-full flex items-center justify-center mb-4">
          <Briefcase className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Team member not found</h2>
        <p className="text-muted-foreground mb-6">
          This staff member might have been removed.
        </p>
        <Button
          variant="outline"
          onClick={() =>
            router.push(`/dashboard/salon/${encodeId(salonId)}/team`)
          }
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Team
        </Button>
      </div>
    );
  }

  const name = `${staff.firstName || ""} ${staff.lastName || ""}`.trim();
  const bgColor = staff.color || "#09090b";

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto pb-10">
      {/* Navigation Breadcrumb */}
      <Button
        variant="ghost"
        className="text-muted-foreground hover:text-foreground pl-0 -ml-2 hover:bg-transparent"
        onClick={() =>
          router.push(`/dashboard/salon/${encodeId(salonId)}/team`)
        }
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Directory
      </Button>

      {/* Profile Header Pane */}
      <Card className="border-border shadow-sm overflow-hidden bg-background pt-0">
        <div
          className="h-24 w-full opacity-15"
          style={{ backgroundColor: bgColor }}
        />
        <CardContent className="p-8 -mt-16 relative">
          <div className="flex flex-col md:flex-row gap-8 items-start md:items-end">
            <Avatar className="h-28 w-28 border-4 border-background shadow-sm bg-background">
              <AvatarImage src={staff.avatarUrl} className="object-cover" />
              <AvatarFallback
                className="text-3xl font-medium text-white"
                style={{ backgroundColor: bgColor }}
              >
                {getInitials(staff.firstName, staff.lastName)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-3 min-w-0 w-full">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-foreground truncate flex items-center gap-3">
                    {name}
                    {!staff.isActive && (
                      <Badge
                        variant="secondary"
                        className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-none font-normal text-sm align-middle mt-1"
                      >
                        Inactive
                      </Badge>
                    )}
                  </h1>
                  <div className="flex items-center text-sm text-foreground/70 mt-3 gap-6 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className={`text-xs uppercase tracking-wider font-semibold px-2 py-0 border ${getRoleBadgeColor(staff.role)}`}
                      >
                        {getRoleLabel(staff.role)}
                      </Badge>
                    </div>
                    {staff.title && (
                      <div className="flex items-center gap-1.5 text-muted-foreground/80 font-medium">
                        <Briefcase className="h-4 w-4 shrink-0" />
                        {staff.title}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Hub */}
                <div className="flex shrink-0 gap-2 items-center">
                  <Button variant="outline" className="shadow-sm">
                    <CalendarClock className="h-4 w-4 mr-2" />
                    View Schedule
                  </Button>
                  <Button className="shadow-sm shadow-primary/20">
                    <Pencil className="h-4 w-4 mr-2" /> Edit Profile
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Layout Area */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start border-b border-border rounded-none h-12 bg-transparent p-0 mb-6 font-medium text-muted-foreground overflow-x-auto overflow-y-hidden whitespace-nowrap flex-nowrap">
          <TabsTrigger
            value="personal"
            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 h-full"
          >
            Personal Details
          </TabsTrigger>
          <TabsTrigger
            value="addresses"
            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 h-full"
          >
            Addresses
          </TabsTrigger>
          <TabsTrigger
            value="emergency"
            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 h-full"
          >
            Emergency Contacts
          </TabsTrigger>
          <TabsTrigger
            value="workplace"
            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 h-full"
          >
            Workplace App
          </TabsTrigger>
          {staff.role !== "receptionist" && staff.role !== "owner" && (
            <TabsTrigger
              value="pay"
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 h-full"
            >
              Pay Setup
            </TabsTrigger>
          )}
          {currentUserRole === "owner" && (
            <TabsTrigger
              value="permissions"
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 h-full"
            >
              Permissions
            </TabsTrigger>
          )}
        </TabsList>

        <div className="animate-in slide-in-from-bottom-2 fade-in duration-300">
          <TabsContent value="personal" className="mt-0 outline-none">
            <StaffPersonalTab staff={staff} salonId={salonId} />
          </TabsContent>

          <TabsContent value="addresses" className="mt-0 outline-none">
            <StaffAddressesTab staffId={staffId} />
          </TabsContent>

          <TabsContent value="emergency" className="mt-0 outline-none">
            <StaffEmergencyContactsTab staffId={staffId} />
          </TabsContent>

          <TabsContent value="workplace" className="mt-0 outline-none">
            <Tabs defaultValue="services" className="space-y-4">
              <TabsList className="bg-muted/50 p-1 rounded-md">
                <TabsTrigger value="services" className="rounded-sm">
                  Assigned Services
                </TabsTrigger>
                <TabsTrigger value="locations" className="rounded-sm">
                  Locations
                </TabsTrigger>
                <TabsTrigger value="settings" className="rounded-sm">
                  Settings
                </TabsTrigger>
              </TabsList>

              <TabsContent value="services" className="outline-none pt-2">
                <StaffServicesTab staffId={staffId} salonId={salonId} />
              </TabsContent>

              <TabsContent value="locations" className="outline-none pt-2">
                <StaffLocationsTab staffId={staffId} salonId={salonId} />
              </TabsContent>

              <TabsContent value="settings" className="outline-none pt-2">
                <StaffSettingsTab
                  staff={staff}
                  staffId={staffId}
                  salonId={salonId}
                />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="pay" className="mt-0 outline-none">
            <Tabs defaultValue="wages" className="space-y-4">
              <TabsList className="bg-muted/50 p-1 rounded-md">
                <TabsTrigger value="wages" className="rounded-sm">
                  Wages & Timesheets
                </TabsTrigger>
                <TabsTrigger value="commissions" className="rounded-sm">
                  Commissions
                </TabsTrigger>
                <TabsTrigger value="payruns" className="rounded-sm">
                  Pay Runs
                </TabsTrigger>
              </TabsList>

              <TabsContent value="wages" className="outline-none pt-2">
                <StaffWagesTab staffId={staffId} />
              </TabsContent>

              <TabsContent value="commissions" className="outline-none pt-2">
                <StaffCommissionsTab staffId={staffId} />
              </TabsContent>

              <TabsContent value="payruns" className="outline-none pt-2">
                <StaffPayRunsTab staffId={staffId} salonId={salonId} />
              </TabsContent>
            </Tabs>
          </TabsContent>

          {currentUserRole === "owner" && (
            <TabsContent value="permissions" className="mt-0 outline-none">
              <StaffPermissionsTab staff={staff} staffId={staffId} salonId={salonId} />
            </TabsContent>
          )}
        </div>
      </Tabs>
    </div>
  );
}
