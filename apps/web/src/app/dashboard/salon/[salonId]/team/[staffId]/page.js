"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { encodeId } from "@/lib/id";
import {
  ArrowLeft,
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
import { motion } from "framer-motion";
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
import { cn } from "@/lib/utils";

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
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      case "stylist":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "receptionist":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
      default:
        return "bg-muted text-muted-foreground border-border/50";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto px-2 pt-4">
        <div className="flex items-center gap-6">
          <Skeleton className="h-28 w-28 rounded-3xl" />
          <div className="space-y-3">
            <Skeleton className="h-10 w-64 rounded-xl" />
            <Skeleton className="h-6 w-40 rounded-lg" />
            <div className="flex gap-2 mt-3">
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
          </div>
        </div>
        <Skeleton className="h-[600px] w-full rounded-3xl mt-8" />
      </div>
    );
  }

  if (error || !staff) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center animate-in fade-in">
        <div className="h-20 w-20 bg-muted/30 rounded-full flex items-center justify-center mb-6">
          <Briefcase className="h-10 w-10 text-muted-foreground opacity-50" />
        </div>
        <h2 className="text-2xl font-extrabold mb-2 tracking-tight">Profile Terminated</h2>
        <p className="text-muted-foreground font-medium mb-8 max-w-md">
          This personnel record cannot be located within the current database schema.
        </p>
        <Button
          variant="outline"
          className="rounded-xl h-12 px-6 shadow-sm border-border/50 font-bold"
          onClick={() =>
            router.push(`/dashboard/salon/${encodeId(salonId)}/team`)
          }
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Return to Directory
        </Button>
      </div>
    );
  }

  const name = `${staff.firstName || ""} ${staff.lastName || ""}`.trim();
  const bgColor = staff.color || "#09090b";

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto pb-24 px-4 sm:px-8 mt-4">
      {/* Navigation Breadcrumb */}
      <Button
        variant="ghost"
        className="text-muted-foreground hover:text-foreground pl-0 -ml-2 hover:bg-transparent font-bold text-[13px] tracking-wider uppercase h-auto pb-2"
        onClick={() =>
          router.push(`/dashboard/salon/${encodeId(salonId)}/team`)
        }
      >
        <ArrowLeft className="mr-2 h-3.5 w-3.5" /> Back to Directory
      </Button>

      {/* Profile Header Pane */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden bg-background/60 backdrop-blur-xl border border-border/50 rounded-[2rem] shadow-sm"
      >
        <div className="absolute top-0 w-full h-32 bg-gradient-to-b from-transparent to-background/60 backdrop-blur-[2px]" />
        <div
          className="h-32 w-full opacity-15"
          style={{ backgroundColor: bgColor }}
        />
        <div className="px-6 sm:px-10 pb-10 -mt-16 relative">
          <div className="flex flex-col md:flex-row gap-8 items-start md:items-end">
            <Avatar className="h-32 w-32 border-[6px] border-background shadow-lg bg-background rounded-full">
              <AvatarImage src={staff.avatarUrl} className="object-cover rounded-full" />
              <AvatarFallback
                className="text-4xl font-black text-white rounded-full"
                style={{ backgroundColor: bgColor }}
              >
                {getInitials(staff.firstName, staff.lastName)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-4 min-w-0 w-full">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-2">
                <div>
                  <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground truncate flex items-center gap-4">
                    {name}
                    {!staff.isActive && (
                      <Badge
                        variant="secondary"
                        className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-0 font-bold uppercase tracking-wider text-[11px] align-middle mt-1.5"
                      >
                        Suspended
                      </Badge>
                    )}
                  </h1>
                  <div className="flex items-center text-[15px] text-foreground mt-3.5 gap-6 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className={`text-[11px] uppercase tracking-wider font-extrabold px-3 py-1 border ${getRoleBadgeColor(staff.role)}`}
                      >
                        {getRoleLabel(staff.role)}
                      </Badge>
                    </div>
                    {staff.title && (
                      <div className="flex items-center gap-2 text-muted-foreground font-semibold">
                        <Briefcase className="h-4 w-4 shrink-0 opacity-50" />
                        {staff.title}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Hub */}
                <div className="flex shrink-0 gap-3 items-center">
                  <Button variant="outline" className="h-12 px-6 rounded-xl shadow-sm border-border/50 bg-background/50 backdrop-blur-md hover:bg-background font-bold text-[14px]">
                    <CalendarClock className="h-4 w-4 mr-2 text-muted-foreground" />
                    Operational Hours
                  </Button>
                  <Button className="h-12 px-6 rounded-xl shadow-md font-bold text-[14px]">
                    <Pencil className="h-4 w-4 mr-2" /> Modify Profile
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tabs Layout Area */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="relative mb-8 overflow-hidden rounded-xl bg-muted/30 p-1.5">
          <TabsList className="w-full justify-start h-auto bg-transparent p-0 flex flex-wrap gap-1 sm:gap-2 overflow-visible">
            {[
              { id: "personal", label: "Identity Data" },
              { id: "addresses", label: "Addresses" },
              { id: "emergency", label: "Emergency" },
              { id: "workplace", label: "Workplace Engine" },
              ...(staff.role !== "receptionist" && staff.role !== "owner" ? [{ id: "pay", label: "Financial Setup" }] : []),
              ...(currentUserRole === "owner" ? [{ id: "permissions", label: "Security & Clearances" }] : [])
            ].map(tab => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  "data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-lg py-2.5 px-4 sm:px-6 font-bold text-[13px] transition-all",
                  "hover:bg-background/50 text-muted-foreground uppercase tracking-wider"
                )}
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

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
            <Tabs defaultValue="services" className="space-y-6">
              <TabsList className="bg-muted/40 p-1.5 rounded-xl border border-border/50">
                <TabsTrigger value="services" className="rounded-lg font-bold text-[13px] px-4">
                  Approved Services
                </TabsTrigger>
                <TabsTrigger value="locations" className="rounded-lg font-bold text-[13px] px-4">
                  Assigned Locations
                </TabsTrigger>
                <TabsTrigger value="settings" className="rounded-lg font-bold text-[13px] px-4">
                  App Settings
                </TabsTrigger>
              </TabsList>

              <div className="bg-background/40 backdrop-blur-md rounded-3xl border border-border/50 overflow-hidden">
                <TabsContent value="services" className="outline-none p-6 pt-6 mt-0">
                  <StaffServicesTab staffId={staffId} salonId={salonId} />
                </TabsContent>

                <TabsContent value="locations" className="outline-none p-6 pt-6 mt-0">
                  <StaffLocationsTab staffId={staffId} salonId={salonId} />
                </TabsContent>

                <TabsContent value="settings" className="outline-none p-6 pt-6 mt-0">
                  <StaffSettingsTab
                    staff={staff}
                    staffId={staffId}
                    salonId={salonId}
                  />
                </TabsContent>
              </div>
            </Tabs>
          </TabsContent>

          <TabsContent value="pay" className="mt-0 outline-none">
            <Tabs defaultValue="wages" className="space-y-6">
              <TabsList className="bg-muted/40 p-1.5 rounded-xl border border-border/50">
                <TabsTrigger value="wages" className="rounded-lg font-bold text-[13px] px-4">
                  Wages & Timesheets
                </TabsTrigger>
                <TabsTrigger value="commissions" className="rounded-lg font-bold text-[13px] px-4">
                  Commissions
                </TabsTrigger>
                <TabsTrigger value="payruns" className="rounded-lg font-bold text-[13px] px-4">
                  Pay Runs
                </TabsTrigger>
              </TabsList>

              <div className="bg-background/40 backdrop-blur-md rounded-3xl border border-border/50 overflow-hidden">
                <TabsContent value="wages" className="outline-none p-6 pt-6 mt-0">
                  <StaffWagesTab staffId={staffId} />
                </TabsContent>

                <TabsContent value="commissions" className="outline-none p-6 pt-6 mt-0">
                  <StaffCommissionsTab staffId={staffId} />
                </TabsContent>

                <TabsContent value="payruns" className="outline-none p-6 pt-6 mt-0">
                  <StaffPayRunsTab staffId={staffId} salonId={salonId} />
                </TabsContent>
              </div>
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
