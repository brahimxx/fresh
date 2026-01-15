"use client";

import { useState } from "react";
import { Scissors, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useServices } from "@/hooks/use-services";
import { useStaffServices, useUpdateStaffServices } from "@/hooks/use-staff";

export function StaffServicesTab({ staffId, salonId }) {
  var { data: allServices, isLoading: servicesLoading } = useServices(salonId);
  var { data: staffServices, isLoading: staffServicesLoading } = useStaffServices(staffId);
  var updateServices = useUpdateStaffServices();

  var [selectedServices, setSelectedServices] = useState(staffServices || []);

  function handleToggleService(serviceId) {
    setSelectedServices(function (prev) {
      if (prev.includes(serviceId)) {
        return prev.filter(function (id) { return id !== serviceId; });
      } else {
        return [...prev, serviceId];
      }
    });
  }

  function handleSave() {
    updateServices.mutate({ staffId: staffId, services: selectedServices });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Services</CardTitle>
        <CardDescription>Assign services this staff member can perform</CardDescription>
      </CardHeader>
      <CardContent>
        {servicesLoading ? (
          <p>Loading services...</p>
        ) : allServices && allServices.length > 0 ? (
          <div className="space-y-6">
            {Object.entries(
              allServices.reduce(function (acc, service) {
                var category = service.category_name || "Uncategorized";
                if (!acc[category]) acc[category] = [];
                acc[category].push(service);
                return acc;
              }, {})
            ).map(function ([category, services]) {
              return (
                <div key={category}>
                  <h3 className="font-medium mb-3">{category}</h3>
                  <div className="space-y-2">
                    {services.map(function (service) {
                      var isSelected = selectedServices.includes(service.id);
                      return (
                        <div
                          key={service.id}
                          className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent cursor-pointer"
                          onClick={function () { handleToggleService(service.id); }}
                        >
                          <Checkbox checked={isSelected} />
                          <div className="flex-1">
                            <p className="font-medium">{service.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {service.duration_minutes} min · ${service.price}
                            </p>
                          </div>
                          {isSelected && <Check className="h-5 w-5 text-primary" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <Button onClick={handleSave} disabled={updateServices.isPending}>
              Save Changes
            </Button>
          </div>
        ) : (
          <div className="text-center py-12">
            <Scissors className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No services available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
