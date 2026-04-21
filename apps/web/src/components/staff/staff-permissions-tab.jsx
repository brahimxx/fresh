"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldAlert, RotateCcw, Save, Loader2, ShieldCheck, Shield } from "lucide-react";
import api from "@/lib/api-client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { getPermissionsByCategory, getDefaultPermissions } from "@/lib/permissions";

export function StaffPermissionsTab({ staff, staffId, salonId }) {
  // If the staff being viewed is the owner, they always have full access.
  if (staff.role === "owner") {
    return (
      <Card className="border-border shadow-sm">
        <CardContent className="pt-6 flex flex-col items-center text-center py-12">
          <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-bold">Owner Access</h3>
          <p className="text-muted-foreground mt-2 max-w-md">
            As the salon owner, this account always has full, unrestricted access to all features and settings.
          </p>
        </CardContent>
      </Card>
    );
  }

  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);

  // Grouped permissions definition from our permissions engine
  const categories = getPermissionsByCategory();
  const roleDefaults = getDefaultPermissions(staff.role);
  
  // Local state for edits. We start with whatever JSON was passed from the server,
  // or an empty object if there are no custom overrides.
  const initialOverrides = staff.permissions || {};
  const [overrides, setOverrides] = useState(initialOverrides);

  // Check if we have any custom overrides applied
  const hasCustomOverrides = Object.keys(overrides).length > 0;

  const handleToggle = (key, checked) => {
    setOverrides(prev => {
      const next = { ...prev };
      
      // If the owner toggles it back to the role's exact default value, 
      // we remove the override entirely so it falls back to the default naturally.
      // This keeps the JSON clean and minimal.
      if (checked === roleDefaults[key]) {
        delete next[key];
      } else {
        next[key] = checked;
      }
      return next;
    });
  };

  const handleReset = () => {
    setOverrides({});
  };

  const handleSave = async () => {
    try {
      setIsUpdating(true);
      // If overrides is empty, we send null to clear the JSON in DB
      const payload = Object.keys(overrides).length > 0 ? overrides : null;
      
      await api.put(`/salons/${salonId}/staff/${staffId}`, { permissions: payload });
      
      toast.success("Permissions updated successfully");
      queryClient.invalidateQueries({ queryKey: ["staff", staffId] });
      queryClient.invalidateQueries({ queryKey: ["salon-staff", salonId] });
    } catch (err) {
      toast.error(err.message || "Failed to update permissions");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Alert className="bg-primary/5 border-primary/20">
        <Shield className="h-4 w-4 text-primary" />
        <AlertTitle className="text-primary font-semibold">Permission Overrides</AlertTitle>
        <AlertDescription className="text-foreground/80">
          This staff member currently has the <strong>{staff.role}</strong> role. Use these toggles to grant or restrict specific access beyond their default role permissions.
        </AlertDescription>
      </Alert>

      {Object.entries(categories).map(([category, items]) => (
        <Card key={category} className="border-border shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">{category}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0 p-0">
            {items.map((item, index) => {
              // Current value is the override if it exists, otherwise the role default
              const isOverridden = overrides[item.key] !== undefined;
              const currentValue = isOverridden ? overrides[item.key] : roleDefaults[item.key];
              const isLast = index === items.length - 1;

              return (
                <div 
                  key={item.key} 
                  className={`flex items-start justify-between p-6 ${!isLast ? 'border-b border-border/50' : ''} ${isOverridden ? 'bg-muted/30' : ''}`}
                >
                  <div className="space-y-1.5 pr-6">
                    <div className="flex items-center gap-2">
                      <Label className="text-base font-medium cursor-pointer" htmlFor={`perm-${item.key}`}>
                        {item.label}
                      </Label>
                      {isOverridden && (
                        <Badge variant="outline" className="h-5 text-[10px] uppercase tracking-wider bg-background text-primary border-primary/20">
                          Custom
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                    {!isOverridden && (
                      <p className="text-xs text-muted-foreground/70 flex items-center mt-1">
                        Their {staff.role} role defaults to this being <strong className={`ml-1 ${roleDefaults[item.key] ? 'text-emerald-600/70' : 'text-muted-foreground'}`}>{roleDefaults[item.key] ? 'ON' : 'OFF'}</strong>.
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center justify-end">
                    <Switch 
                      id={`perm-${item.key}`}
                      checked={currentValue} 
                      disabled={isUpdating}
                      onCheckedChange={(checked) => handleToggle(item.key, checked)}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      <div className="flex items-center justify-between pt-4 pb-10">
        <Button 
          variant="outline" 
          onClick={handleReset}
          disabled={!hasCustomOverrides || isUpdating}
          className="text-muted-foreground"
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset to {staff.role} defaults
        </Button>
        <Button 
          onClick={handleSave} 
          disabled={isUpdating}
          className="shadow-sm shadow-primary/20 min-w-[120px]"
        >
          {isUpdating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" /> Save Permissions
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
