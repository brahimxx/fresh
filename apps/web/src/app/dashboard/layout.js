"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { decodeId, encodeId } from "@/lib/id";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useAuth } from "@/providers/auth-provider";
import { SalonProvider } from "@/providers/salon-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api-client";

export default function DashboardLayout({ children }) {
  const { user, loading, isAuthenticated, checkAuth } = useAuth();
  const router = useRouter();
  const [verifying, setVerifying] = useState(false);
  const [hasVerified, setHasVerified] = useState(false);

  // Re-verify client just in case their request was accepted in the background
  useEffect(() => {
    if (!loading && isAuthenticated && user?.role === "client" && !verifying && !hasVerified) {
      let mounted = true;
      setVerifying(true);
      checkAuth().finally(() => {
        if (mounted) {
          setVerifying(false);
          setHasVerified(true);
        }
      });
      return () => { mounted = false; };
    }
  }, [user, loading, isAuthenticated, verifying, hasVerified, checkAuth]);
  const params = useParams();

  const rawSalonId = params?.salonId;
  const decodedSalonId = rawSalonId ? decodeId(rawSalonId) : null;

  const isAdmin = user?.role === "admin";

  const { data: salons, isLoading: salonsLoading } = useQuery({
    queryKey: ["user-salons", user?.id],
    queryFn: () => api.get("/salons"),
    enabled: !!user?.id && !isAdmin && user?.role !== "client",
    select: (response) => response.data?.salons || [],
  });

  useEffect(() => {
    if (loading || verifying) return;
    if (!isAuthenticated) {
      router.push("/login");
    } else if (isAuthenticated && user?.role === "client") {
      // Clients should not be in the management dashboard
      router.push("/");
    } else if (
      !salonsLoading &&
      isAuthenticated &&
      !isAdmin &&
      salons?.length === 0
    ) {
      // If they have 0 salons (e.g. newly registered owner), redirect them to onboarding.
      // But if they are 'staff' with 0 salons, they were likely removed. Send home.
      if (user?.role === "staff") {
        checkAuth(); // Kick off a re-verification to downgrade them to client
        router.replace("/");
      } else {
        router.replace("/onboarding");
      }
    } else if (
      !salonsLoading &&
      isAuthenticated &&
      !isAdmin &&
      salons?.length > 0 &&
      decodedSalonId
    ) {
      // Prevent users from accessing other owners' dashboards
      const hasAccess = salons.some((salon) => salon.id === decodedSalonId);
      if (!hasAccess) {
        router.replace(`/dashboard/salon/${encodeId(salons[0].id)}`);
      }
    }
  }, [
    loading,
    isAuthenticated,
    user,
    router,
    salons,
    salonsLoading,
    isAdmin,
    decodedSalonId,
    verifying,
  ]);

  if (
    loading || verifying ||
    (isAuthenticated && !isAdmin && user?.role !== "client" && salonsLoading)
  ) {
    return (
      <div className="flex h-screen">
        <div className="w-64 border-r border-border p-4 space-y-4">
          <Skeleton className="h-8 w-32" />
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
        <div className="flex-1 p-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (
    !isAuthenticated ||
    user?.role === "client" ||
    (!isAdmin && salons?.length === 0)
  ) {
    return null;
  }

  return (
    <SalonProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto">
            <div className=" mx-auto px-4 sm:px-8 py-8 ">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SalonProvider>
  );
}
