"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, Check, Clock, User } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ServiceSelection({ salonId, selected, onSelect }) {
  var [services, setServices] = useState([]);
  var [categories, setCategories] = useState([]);
  var [loading, setLoading] = useState(true);
  var [search, setSearch] = useState("");
  var [activeCategory, setActiveCategory] = useState(null);

  useEffect(
    function () {
      async function loadServices() {
        try {
          var res = await fetch("/api/widget/" + salonId + "/services");
          if (res.ok) {
            var data = await res.json();
            console.log("Loaded services:", data.data.services);
            setServices(data.data.services || []);
            setCategories(data.data.categories || []);
          } else {
            console.error("Service API error:", res.status, await res.text());
          }
        } catch (error) {
          console.error("Failed to load services:", error);
        } finally {
          setLoading(false);
        }
      }
      loadServices();
    },
    [salonId]
  );

  function toggleService(service) {
    // Prevent selecting services without available staff
    if (!service.availableStaff || service.availableStaff.length === 0) {
      return;
    }

    var isSelected = selected.some(function (s) {
      return s.id === service.id;
    });
    let newSelected;
    if (isSelected) {
      newSelected = selected.filter(function (s) {
        return s.id !== service.id;
      });
    } else {
      // Add service with first available staff as default
      var defaultStaff = service.availableStaff[0];
      newSelected = [...selected, {
        ...service,
        staffId: defaultStaff.id,
        staffName: defaultStaff.name
      }];
    }
    console.log("Service selection changed:", newSelected);
    onSelect(newSelected);
  }

  function updateServiceStaff(serviceId, staffId, staffName) {
    var newSelected = selected.map(function (s) {
      if (s.id === serviceId) {
        return { ...s, staffId: staffId, staffName: staffName };
      }
      return s;
    });
    onSelect(newSelected);
  }

  function isSelected(serviceId) {
    return selected.some(function (s) {
      return s.id === serviceId;
    });
  }

  // Filter services with memoization
  var filteredServices = useMemo(
    function () {
      if (!services || !Array.isArray(services)) return [];
      
      return services.filter(function (service) {
        var matchesSearch =
          !search ||
          service.name.toLowerCase().includes(search.toLowerCase()) ||
          service.description?.toLowerCase().includes(search.toLowerCase());
        var matchesCategory =
          !activeCategory || service.category_id === activeCategory;
        return matchesSearch && matchesCategory;
      });
    },
    [services, search, activeCategory]
  );

  // Group by category with memoization
  var groupedServices = useMemo(
    function () {
      var groups = {};
      filteredServices.forEach(function (service) {
        var catId = service.category_id || "uncategorized";
        if (!groups[catId]) {
          groups[catId] = [];
        }
        groups[catId].push(service);
      });
      return groups;
    },
    [filteredServices]
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4].map(function (i) {
            return <Skeleton key={i} className="h-20 w-full" />;
          })}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Services</CardTitle>
        <p className="text-sm text-muted-foreground">
          Choose one or more services for your appointment
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search services..."
            value={search}
            onChange={function (e) {
              setSearch(e.target.value);
            }}
            className="pl-10"
          />
        </div>

        {/* Category Tabs */}
        {categories.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <Badge
              variant={activeCategory === null ? "default" : "outline"}
              className="cursor-pointer"
              onClick={function () {
                setActiveCategory(null);
              }}
            >
              All
            </Badge>
            {categories.map(function (cat) {
              return (
                <Badge
                  key={cat.id}
                  variant={activeCategory === cat.id ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={function () {
                    setActiveCategory(cat.id);
                  }}
                >
                  {cat.name}
                </Badge>
              );
            })}
          </div>
        )}

        {/* Service List */}
        <div className="space-y-2">
          {Object.entries(groupedServices).map(function ([catId, catServices]) {
            var category = categories.find(function (c) {
              return c.id === parseInt(catId);
            });
            return (
              <div key={catId}>
                {category && !activeCategory && (
                  <h3 className="font-medium text-sm text-muted-foreground mb-2 mt-4">
                    {category.name}
                  </h3>
                )}
                <div className="space-y-2">
                  {catServices.map(function (service) {
                    var selectedService = selected.find(function (s) { return s.id === service.id; });
                    var isServiceSelected = !!selectedService;
                    var hasNoStaff = !service.availableStaff || service.availableStaff.length === 0;

                    return (
                      <div
                        key={service.id}
                        className={
                          "p-5 rounded-lg border transition-all " +
                          (hasNoStaff
                            ? "border-border bg-muted/30 opacity-60 cursor-not-allowed"
                            : isServiceSelected
                            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                            : "border-border hover:border-primary/20 hover:bg-muted/30")
                        }
                      >
                        <div
                          onClick={function () {
                            if (!hasNoStaff) {
                              toggleService(service);
                            }
                          }}
                          className={hasNoStaff ? "cursor-not-allowed" : "cursor-pointer active:scale-[0.98] transition-transform"}
                        >
                          <div className="flex gap-4 min-h-[44px]">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{service.name}</h4>
                                {isServiceSelected && (
                                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                    <Check className="h-3 w-3 text-white" />
                                  </div>
                                )}
                              </div>
                              {service.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {service.description}
                                </p>
                              )}
                              {hasNoStaff && (
                                <p className="text-sm text-destructive mt-1">
                                  No staff available for this service
                                </p>
                              )}
                              <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {service.duration} min
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">
                                ${(parseFloat(service.price) || 0).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Staff selection dropdown - shown when service is selected */}
                        {isServiceSelected && service.availableStaff && service.availableStaff.length > 0 && (
                          <div className="mt-4 pt-4 border-t" onClick={function(e) { e.stopPropagation(); }}>
                            <label className="text-sm font-medium mb-2 flex items-center gap-2">
                              <User className="h-4 w-4" />
                              Select Staff Member
                            </label>
                            <Select 
                              value={selectedService.staffId ? selectedService.staffId.toString() : ""}
                              onValueChange={function(value) {
                                var staff = service.availableStaff.find(function(s) { return s.id.toString() === value; });
                                if (staff) {
                                  updateServiceStaff(service.id, staff.id, staff.name);
                                }
                              }}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Choose a staff member" />
                              </SelectTrigger>
                              <SelectContent>
                                {service.availableStaff.map(function(staff) {
                                  return (
                                    <SelectItem key={staff.id} value={staff.id.toString()}>
                                      <div className="flex items-center gap-2">
                                        <div 
                                          className="w-3 h-3 rounded-full" 
                                          style={{ backgroundColor: staff.color || '#3B82F6' }}
                                        />
                                        <span>{staff.name}</span>
                                        {staff.title && (
                                          <span className="text-xs text-muted-foreground">({staff.title})</span>
                                        )}
                                      </div>
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {filteredServices.length === 0 && (
            <div className="text-center py-12 space-y-2">
              <div className="flex justify-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <Clock className="h-6 w-6 text-muted-foreground" />
                </div>
              </div>
              <div>
                <p className="font-medium text-sm">No services found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try adjusting your search or category filter
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
