"use client";

import { Receipt } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function StaffPayRunsTab({ staffId, salonId }) {
  var payRuns = [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pay Runs</CardTitle>
        <CardDescription>Payment history and upcoming payments</CardDescription>
      </CardHeader>
      <CardContent>
        {payRuns.length === 0 ? (
          <div className="text-center py-12">
            <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No pay runs yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {payRuns.map(function (run) {
              return (
                <div key={run.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {run.payPeriodStart} - {run.payPeriodEnd}
                      </p>
                      <p className="text-sm text-muted-foreground">Pay date: {run.payDate}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold">${run.totalPay}</p>
                      <Badge>{run.status}</Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
