"use client";

import { useEffect } from "react";
import { encodeId } from "@/lib/id";

import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api-client";
import { Loader2, Building2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Header } from "@/components/layout/header";

export default function DashboardIndexPage() {
  const router = useRouter();
  const { user } = useAuth();

  // Fetch user's salons to redirect to the first one
  const { data: salons, isLoading } = useQuery({
    queryKey: ["user-salons", user?.id],
    queryFn: () => api.get("/salons"),
    enabled: !!user?.id && user?.role !== "admin",
    select: (response) => response.data?.salons || [],
  });

  // Handle redirects based on role, salons, and onboarding status
  useEffect(() => {
    // Admin users go to admin dashboard
    if (!isLoading && user?.role === "admin") {
      router.replace("/dashboard/admin");
      return;
    }

    if (!isLoading && salons) {
      if (salons.length > 0) {
        // Redirect to first salon
        router.replace(`/dashboard/salon/${encodeId(salons[0].id)}`);
      } else {
        // If they have no salons, go to home (avoids getting forced into onboarding)
        router.replace("/");
      }
    }
  }, [salons, isLoading, router, user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show a loading state while redirecting to onboarding
  if (!salons || salons.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
