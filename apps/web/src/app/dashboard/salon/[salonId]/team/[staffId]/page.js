"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import { useStaffMember, STAFF_ROLES } from "@/hooks/use-staff";
import { StaffPersonalTab } from "@/components/staff/staff-personal-tab";
import { StaffAddressesTab } from "@/components/staff/staff-addresses-tab";
import { StaffEmergencyContactsTab } from "@/components/staff/staff-emergency-contacts-tab";
import { StaffServicesTab } from "@/components/staff/staff-services-tab";
import { StaffLocationsTab } from "@/components/staff/staff-locations-tab";
import { StaffSettingsTab } from "@/components/staff/staff-settings-tab";
import { StaffWagesTab } from "@/components/staff/staff-wages-tab";
import { StaffCommissionsTab } from "@/components/staff/staff-commissions-tab";
import { StaffPayRunsTab } from "@/components/staff/staff-pay-runs-tab";

export default function StaffDetailPage({ params }) {
  var resolvedParams = use(params);
  var salonId = resolvedParams.salonId;
  var staffId = resolvedParams.staffId;
  var router = useRouter();

  var [activeTab, setActiveTab] = useState("personal");
  var { data: staff, isLoading, error } = useStaffMember(staffId);

  function getInitials(firstName, lastName) {
    var first = (firstName || "")[0] || "";
    var last = (lastName || "")[0] || "";
    return (first + last).toUpperCase() || "?";
  }

  function getRoleLabel(role) {
    var found = STAFF_ROLES.find(function (r) {
      return r.value === role;
    });
    return found ? found.label : role;
  }

  function getRoleBadgeColor(role) {
    switch (role) {
      case "owner":
        return "bg-purple-100 text-purple-800";
      case "manager":
        return "bg-blue-100 text-blue-800";
      case "receptionist":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-6">
              <Skeleton className="h-24 w-24 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error || !staff) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground mb-4">Staff member not found</p>
        <Button onClick={function () { router.push("/dashboard/salon/" + salonId + "/team"); }}>
          Back to Team
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          asChild
        >
          <Link href={"/dashboard/salon/" + salonId + "/team"}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Team Member Details</h1>
          <p className="text-sm text-muted-foreground">
            Manage all information for this team member
          </p>
        </div>
      </div>

      {/* Staff Profile Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            <Avatar
              className="h-24 w-24"
              style={{ backgroundColor: staff.color || "#3B82F6" }}
            >
              <AvatarFallback className="text-white text-2xl font-semibold">
                {getInitials(staff.firstName || staff.first_name, staff.lastName || staff.last_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">
                {(staff.firstName || staff.first_name || "") + " " + (staff.lastName || staff.last_name || "")}
              </h2>
              <p className="text-muted-foreground">{staff.title || "Team Member"}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={getRoleBadgeColor(staff.role)}>
                  {getRoleLabel(staff.role)}
                </Badge>
                {staff.isActive ? (
                  <Badge className="bg-green-100 text-green-800">Active</Badge>
                ) : (
                  <Badge variant="outline">Inactive</Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-3 lg:grid-cols-5 w-full">
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="addresses">Addresses</TabsTrigger>
          <TabsTrigger value="emergency">Emergency</TabsTrigger>
          <TabsTrigger value="workplace">Workplace</TabsTrigger>
          <TabsTrigger value="pay">Pay</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-4">
          <StaffPersonalTab staff={staff} salonId={salonId} />
        </TabsContent>

        <TabsContent value="addresses" className="space-y-4">
          <StaffAddressesTab staffId={staffId} />
        </TabsContent>

        <TabsContent value="emergency" className="space-y-4">
          <StaffEmergencyContactsTab staffId={staffId} />
        </TabsContent>

        <TabsContent value="workplace" className="space-y-4">
          <Tabs defaultValue="services" className="space-y-4">
            <TabsList>
              <TabsTrigger value="services">Services</TabsTrigger>
              <TabsTrigger value="locations">Locations</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="services">
              <StaffServicesTab staffId={staffId} salonId={salonId} />
            </TabsContent>

            <TabsContent value="locations">
              <StaffLocationsTab staffId={staffId} salonId={salonId} />
            </TabsContent>

            <TabsContent value="settings">
              <StaffSettingsTab staff={staff} staffId={staffId} salonId={salonId} />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="pay" className="space-y-4">
          <Tabs defaultValue="wages" className="space-y-4">
            <TabsList>
              <TabsTrigger value="wages">Wages & Timesheets</TabsTrigger>
              <TabsTrigger value="commissions">Commissions</TabsTrigger>
              <TabsTrigger value="payruns">Pay Runs</TabsTrigger>
            </TabsList>

            <TabsContent value="wages">
              <StaffWagesTab staffId={staffId} />
            </TabsContent>

            <TabsContent value="commissions">
              <StaffCommissionsTab staffId={staffId} />
            </TabsContent>

            <TabsContent value="payruns">
              <StaffPayRunsTab staffId={staffId} salonId={salonId} />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}
