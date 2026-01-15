"use client";

import { MapPin } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

export function StaffLocationsTab({ staffId, salonId }) {
  // For multi-location support - currently shows current salon
  return (
    <Card>
      <CardHeader>
        <CardTitle>Locations</CardTitle>
        <CardDescription>Salons where this staff member works</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center space-x-3 p-3 rounded-lg border bg-accent">
            <Checkbox checked disabled />
            <div className="flex-1">
              <p className="font-medium">Current Salon</p>
              <p className="text-sm text-muted-foreground">Primary location</p>
            </div>
            <Badge>Primary</Badge>
          </div>
          <p className="text-sm text-muted-foreground text-center py-4">
            Multi-location support coming soon
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
