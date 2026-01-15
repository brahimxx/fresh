"use client";

import { Percent } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useStaffCommissions } from "@/hooks/use-staff";

export function StaffCommissionsTab({ staffId }) {
  var { data: commissions, isLoading } = useStaffCommissions(staffId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Commission Structure</CardTitle>
        <CardDescription>Service and product commission rates</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>Loading...</p>
        ) : commissions && commissions.length > 0 ? (
          <div className="space-y-4">
            {commissions.map(function (commission) {
              return (
                <div key={commission.id} className="border rounded-lg p-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Service Commission</p>
                      <p className="text-lg font-medium">{commission.serviceCommission}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Product Commission</p>
                      <p className="text-lg font-medium">{commission.productCommission}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Tip Commission</p>
                      <p className="text-lg font-medium">{commission.tipCommission}%</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Percent className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No commission structure set</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
