"use client";

import { useEffect } from "react";
import { encodeId } from "@/lib/id";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api-client";
import { Loader2, Store, Plus, MapPin, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function DashboardIndexPage() {
  const router = useRouter();
  const { user } = useAuth();

  // Fetch user's salons
  const { data: salons, isLoading } = useQuery({
    queryKey: ["user-salons", user?.id],
    queryFn: () => api.get("/salons"),
    enabled: !!user?.id && user?.role !== "admin",
    select: (response) => response.data?.salons || [],
  });

  // Handle redirects
  useEffect(() => {
    // Admin users go to admin dashboard
    if (!isLoading && user?.role === "admin") {
      router.replace("/dashboard/admin");
      return;
    }

    // Redirect to onboarding choice if 0 salons
    if (!isLoading && salons?.length === 0) {
      router.replace("/onboarding/choose");
      return;
    }

    // Transparently auto-login if exactly 1 salon (Fresha style)
    if (!isLoading && salons?.length === 1) {
      router.replace(`/dashboard/salon/${encodeId(salons[0].id)}`);
      return;
    }
  }, [salons, isLoading, router, user]);

  if (isLoading || !salons || salons.length <= 1) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">
          Loading workspace...
        </p>
      </div>
    );
  }

  // Render Workspace Selection Screen for Multi-location Owners
  return (
    <div className="max-w-5xl mx-auto space-y-8 py-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Select Workspace
          </h1>
          <p className="text-muted-foreground mt-2 text-base">
            Choose a location to manage its calendar, staff, and settings.
          </p>
        </div>
        <Button
          onClick={() => router.push("/onboarding")}
          className="shrink-0 gap-2 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Add New Location
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {salons.map((salon) => (
          <Card
            key={salon.id}
            className="group hover:border-primary/50 cursor-pointer transition-all hover:shadow-md border-border"
            onClick={() =>
              router.push(`/dashboard/salon/${encodeId(salon.id)}`)
            }
          >
            <CardContent className="p-6 flex flex-col justify-between h-full min-h-[140px] gap-4">
              <div className="flex items-start justify-between">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Store className="h-5 w-5" />
                </div>
                {!salon.is_active && (
                  <Badge
                    variant="secondary"
                    className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-none font-normal"
                  >
                    Inactive
                  </Badge>
                )}
              </div>

              <div className="space-y-1.5 mt-auto">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">
                    {salon.name}
                  </h3>
                  <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all shrink-0" />
                </div>
                <div className="flex items-start text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 mr-1.5 shrink-0 mt-0.5" />
                  <span className="line-clamp-2 leading-relaxed">
                    {salon.address || "No address provided"}
                    {salon.city && `, ${salon.city}`}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
