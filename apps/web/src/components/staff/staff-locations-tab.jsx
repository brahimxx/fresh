"use client";

import { useState, useEffect } from "react";
import { MapPin, AlertCircle } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useStaffLocations, useUpdateStaffLocations } from "@/hooks/use-staff";

export function StaffLocationsTab({ staffId, salonId }) {
  const { data, isLoading } = useStaffLocations(staffId);
  const updateLocations = useUpdateStaffLocations();
  
  const [selectedLocations, setSelectedLocations] = useState([]);

  useEffect(() => {
    if (data?.locations) {
      setSelectedLocations(data.locations.filter((l) => l.isAssigned).map((l) => l.id));
    }
  }, [data]);

  const handleToggle = (id) => {
    setSelectedLocations((prev) => 
      prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    updateLocations.mutate({ staffId, locations: selectedLocations });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Locations</CardTitle>
          <CardDescription>Salons where this staff member works</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading locations...</p>
        </CardContent>
      </Card>
    );
  }

  const locations = data?.locations || [];
  const canEdit = data?.canEdit;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Locations</CardTitle>
        <CardDescription>Salons where this staff member works</CardDescription>
      </CardHeader>
      <CardContent>
        {!canEdit && (
          <div className="mb-6 flex items-center space-x-2 text-sm text-amber-600 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
            <AlertCircle className="h-4 w-4" />
            <p>Only the salon owner can assign staff to multiple locations.</p>
          </div>
        )}
        <div className="space-y-4">
          {locations.map((loc) => {
            const isSelected = selectedLocations.includes(loc.id);
            const isCurrent = loc.id === Number(salonId) || loc.isCurrentContext;
            const disabled = !canEdit || isCurrent; // Cannot unselect current salon

            return (
              <div 
                key={loc.id} 
                className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${isSelected ? 'bg-accent/50' : ''} ${disabled ? 'opacity-70' : 'cursor-pointer hover:bg-accent/30'}`}
                onClick={() => {
                  if (!disabled) handleToggle(loc.id);
                }}
              >
                <Checkbox 
                  checked={isSelected} 
                  disabled={disabled}
                />
                <div className="flex-1">
                  <p className="font-medium flex items-center gap-2">
                    {loc.name}
                  </p>
                </div>
                {isCurrent && <Badge variant="secondary">Current Salon</Badge>}
              </div>
            );
          })}
          
          {canEdit && (
            <div className="pt-4">
              <Button onClick={handleSave} disabled={updateLocations.isPending}>
                {updateLocations.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
