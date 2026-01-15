"use client";

import { DollarSign, Clock } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function StaffWagesTab({ staffId }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Wage Information</CardTitle>
          <CardDescription>Current wage and payment structure</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No wage information set</p>
            <p className="text-sm text-muted-foreground mt-2">
              Configure hourly rate, salary, or commission structure
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Timesheets</CardTitle>
          <CardDescription>Clock in/out history and hours worked</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No timesheet entries</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
