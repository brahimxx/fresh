"use client";

import { Settings } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/api-client";

export function StaffSettingsTab({ staff, staffId, salonId }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const queryClient = useQueryClient();

  const handleUpdate = async (field, value) => {
    try {
      setIsUpdating(true);
      await api.put(`/staff/${staffId}`, { [field]: value });
      toast.success("Settings updated successfully");
      queryClient.invalidateQueries(["staff", staffId]);
      queryClient.invalidateQueries(["salon-staff", salonId]);
    } catch (err) {
      toast.error(err.message || "Failed to update settings");
    } finally {
      setIsUpdating(false);
    }
  };

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
            <Switch 
              checked={staff.isActive || staff.is_active} 
              disabled={isUpdating}
              onCheckedChange={(checked) => handleUpdate('isActive', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Visible on Booking Widget</Label>
              <p className="text-sm text-muted-foreground">
                Show this staff member to clients when booking
              </p>
            </div>
            <Switch 
              checked={staff.isVisible || staff.is_visible} 
              disabled={isUpdating}
              onCheckedChange={(checked) => handleUpdate('isVisible', checked)}
            />
          </div>

          <div className="pt-4 pb-2">
            <h3 className="text-sm font-semibold text-foreground">Fulfillment Capabilities</h3>
            <p className="text-xs text-muted-foreground mt-1">Select the service types this staff member is authorized to perform.</p>
          </div>

          <div className="flex items-center justify-between bg-muted/20 p-4 rounded-xl border border-border/50">
            <div className="space-y-0.5">
              <Label>In-Salon Services</Label>
              <p className="text-sm text-muted-foreground">
                Can perform services at the physical salon location
              </p>
            </div>
            <Switch 
              checked={staff.canPhysical || staff.can_physical} 
              disabled={isUpdating}
              onCheckedChange={(checked) => handleUpdate('canPhysical', checked)}
            />
          </div>

          <div className="flex items-center justify-between bg-muted/20 p-4 rounded-xl border border-border/50">
            <div className="space-y-0.5">
              <Label>Mobile Services</Label>
              <p className="text-sm text-muted-foreground">
                Authorized to travel to client locations
              </p>
            </div>
            <Switch 
              checked={staff.canMobile || staff.can_mobile} 
              disabled={isUpdating}
              onCheckedChange={(checked) => handleUpdate('canMobile', checked)}
            />
          </div>

          <div className="flex items-center justify-between bg-muted/20 p-4 rounded-xl border border-border/50">
            <div className="space-y-0.5">
              <Label>Virtual Services</Label>
              <p className="text-sm text-muted-foreground">
                Can conduct online consultations and sessions
              </p>
            </div>
            <Switch 
              checked={staff.canVirtual || staff.can_virtual} 
              disabled={isUpdating}
              onCheckedChange={(checked) => handleUpdate('canVirtual', checked)}
            />
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
