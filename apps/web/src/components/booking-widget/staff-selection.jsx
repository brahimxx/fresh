"use client";

import { useState, useEffect } from "react";
import { User, Star, Check, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export function StaffSelection({
  salonId,
  selectedServices,
  selected,
  onSelect,
}) {
  var [staff, setStaff] = useState([]);
  var [loading, setLoading] = useState(true);

  useEffect(
    function () {
      async function loadStaff() {
        try {
          // Build service IDs query param
          var serviceIds =
            selectedServices && Array.isArray(selectedServices)
              ? selectedServices
                .map(function (s) {
                  return s.id;
                })
                .join(",")
              : "";
          var res = await fetch(
            "/api/widget/" + salonId + "/staff?services=" + serviceIds
          );
          if (res.ok) {
            var data = await res.json();
            console.log("Loaded staff:", data.data);
            setStaff(data.data || []);
          } else {
            console.error("Staff API error:", res.status, await res.text());
          }
        } catch (error) {
          console.error("Failed to load staff:", error);
        } finally {
          setLoading(false);
        }
      }
      loadStaff();
    },
    [salonId, selectedServices]
  );

  function selectStaff(staffMember) {
    onSelect(staffMember);
  }

  function getInitials(name) {
    return name
      .split(" ")
      .map(function (n) {
        return n[0];
      })
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(function (i) {
            return <Skeleton key={i} className="h-24 w-full" />;
          })}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Staff</CardTitle>
        <p className="text-sm text-muted-foreground">
          Choose a team member for your appointment
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Any Available Option */}
        <div
          onClick={function () {
            selectStaff(null);
          }}
          className={
            "p-5 rounded-lg border cursor-pointer transition-all active:scale-[0.98] " +
            (selected === null
              ? "border-primary bg-primary/5 ring-2 ring-primary/20"
              : "border-border hover:border-primary/20 hover:bg-muted/30")
          }
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Users className="h-7 w-7 text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-medium">Any Available</h4>
                {selected === null && (
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                We'll assign the first available team member
              </p>
            </div>
          </div>
        </div>

        {/* Staff List */}
        {staff.map(function (member) {
          var isSelected = selected?.id === member.id;
          return (
            <div
              key={member.id}
              onClick={function () {
                selectStaff(member);
              }}
              className={
                "p-5 rounded-lg border cursor-pointer transition-all active:scale-[0.98] " +
                (isSelected
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border hover:border-primary/20 hover:bg-muted/30")
              }
            >
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={member.avatar_url} alt={member.name} />
                  <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{member.name}</h4>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>
                  {member.title && (
                    <p className="text-sm text-muted-foreground">
                      {member.title}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    {member.rating && (
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span>{member.rating.toFixed(1)}</span>
                        {member.review_count && (
                          <span className="text-muted-foreground">
                            ({member.review_count})
                          </span>
                        )}
                      </div>
                    )}
                    {member.specialties && member.specialties.length > 0 && (
                      <div className="flex gap-1">
                        {member.specialties
                          .slice(0, 2)
                          .map(function (specialty, idx) {
                            return (
                              <Badge
                                key={idx}
                                variant="secondary"
                                className="text-xs"
                              >
                                {specialty}
                              </Badge>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {staff.length === 0 && (
          <div className="text-center py-8 space-y-2">
            <div className="flex justify-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <User className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>
            <div>
              <p className="font-medium text-sm">No staff available</p>
              <p className="text-xs text-muted-foreground mt-1">
                No team members can provide the selected services
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
