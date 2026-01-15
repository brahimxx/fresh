"use client";

import { useState } from "react";
import { Plus, Edit2, Trash2, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function StaffAddressesTab({ staffId }) {
  var [addresses, setAddresses] = useState([]);
  var [showForm, setShowForm] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Addresses</CardTitle>
          <CardDescription>Manage staff member addresses</CardDescription>
        </div>
        <Button size="sm" onClick={function () { setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Address
        </Button>
      </CardHeader>
      <CardContent>
        {addresses.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No addresses added yet</p>
            <Button variant="outline" className="mt-4" onClick={function () { setShowForm(true); }}>
              Add First Address
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {addresses.map(function (address) {
              return (
                <div key={address.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">{address.addressType}</Badge>
                        {address.isPrimary && <Badge>Primary</Badge>}
                      </div>
                      <p className="font-medium">{address.streetAddress}</p>
                      <p className="text-sm text-muted-foreground">
                        {address.city}, {address.state} {address.postalCode}
                      </p>
                      <p className="text-sm text-muted-foreground">{address.country}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
