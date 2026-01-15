"use client";

import { Settings } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function StaffSettingsTab({ staff, staffId, salonId }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Settings</CardTitle>
        <CardDescription>Configure staff member preferences and permissions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Active Status</Label>
              <p className="text-sm text-muted-foreground">
                Whether this staff member is currently active
              </p>
            </div>
            <Switch checked={staff.isActive || staff.is_active} />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Visible on Booking Widget</Label>
              <p className="text-sm text-muted-foreground">
                Show this staff member to clients when booking
              </p>
            </div>
            <Switch checked={staff.isVisible || staff.is_visible} />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Accept Online Bookings</Label>
              <p className="text-sm text-muted-foreground">
                Allow clients to book appointments with this staff member
              </p>
            </div>
            <Switch checked />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Send booking confirmations and reminders
              </p>
            </div>
            <Switch checked />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
