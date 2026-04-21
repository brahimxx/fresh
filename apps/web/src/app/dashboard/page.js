"use client";

import { useEffect } from "react";
import { encodeId } from "@/lib/id";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api-client";
import { motion } from "framer-motion";
import { Loader2, Store, Plus, MapPin, ChevronRight, Layers, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

export default function DashboardIndexPage() {
  const router = useRouter();
  const { user } = useAuth();

  const { data: salons, isLoading } = useQuery({
    queryKey: ["user-salons", user?.id],
    queryFn: () => api.get("/salons"),
    enabled: !!user?.id && user?.role !== "admin",
    select: (response) => response.data?.salons || [],
  });

  useEffect(() => {
    if (!isLoading && user?.role === "admin") {
      router.replace("/dashboard/admin");
      return;
    }
    if (!isLoading && salons?.length === 0) {
      router.replace("/onboarding/choose");
      return;
    }
    if (!isLoading && salons?.length === 1) {
      router.replace(`/dashboard/salon/${encodeId(salons[0].id)}`);
      return;
    }
  }, [salons, isLoading, router, user]);

  if (isLoading || !salons || salons.length <= 1) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
          <div className="relative h-16 w-16 rounded-2xl bg-background border border-border/50 flex items-center justify-center shadow-xl">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        </div>
        <p className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest animate-pulse">
          Loading workspace...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-8 sm:p-10 flex flex-col md:flex-row md:items-end justify-between gap-6 group"
      >
        <div className="absolute top-0 right-10 p-8 opacity-5 pointer-events-none transition-transform duration-1000 group-hover:scale-125 group-hover:rotate-12 translate-y-[-20%]">
          <Layers className="w-64 h-64 text-primary" strokeWidth={1} />
        </div>

        <div className="relative z-10 flex flex-col gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-background/80 backdrop-blur-md border border-primary/20 text-xs font-semibold text-primary w-fit">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Multi-Location Access</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            Select Workspace
          </h1>
          <p className="text-muted-foreground text-lg font-medium max-w-xl">
            Welcome back, {user?.firstName || "there"}. Choose a location to manage its calendar, staff, and settings.
          </p>
        </div>

        <div className="relative z-10 shrink-0">
          <Button
            onClick={() => router.push("/onboarding")}
            className="h-12 px-6 rounded-xl shadow-md font-bold text-[15px] gap-2"
          >
            <Plus className="h-5 w-5" />
            Add Location
          </Button>
        </div>
      </motion.div>

      {/* Workspace Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid gap-5 md:grid-cols-2 lg:grid-cols-3"
      >
        {salons.map((salon) => (
          <motion.div
            key={salon.id}
            variants={itemVariants}
            onClick={() => router.push(`/dashboard/salon/${encodeId(salon.id)}`)}
            className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm overflow-hidden relative group hover:bg-background hover:-translate-y-1 hover:shadow-lg transition-all duration-300 cursor-pointer"
          >
            {/* Subtle hover glow */}
            <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/3 rounded-3xl transition-colors duration-500 pointer-events-none" />

            {/* Watermark icon */}
            <div className="absolute -right-6 -bottom-6 opacity-0 group-hover:opacity-5 transition-opacity duration-700 pointer-events-none">
              <Store className="w-32 h-32 text-primary" strokeWidth={1} />
            </div>

            <div className="relative z-10 flex flex-col h-full gap-6 min-h-[160px] justify-between">
              {/* Top row */}
              <div className="flex items-start justify-between">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/10 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-500">
                  <Store className="h-5 w-5 text-primary" />
                </div>
                {!salon.is_active && (
                  <Badge
                    variant="outline"
                    className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[11px] font-bold uppercase tracking-wider px-2.5"
                  >
                    Inactive
                  </Badge>
                )}
              </div>

              {/* Bottom row */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-[18px] tracking-tight line-clamp-1 group-hover:text-primary transition-colors duration-300">
                    {salon.name}
                  </h3>
                  <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 shrink-0" />
                </div>
                <div className="flex items-start text-[13px] text-muted-foreground font-medium gap-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground/60" />
                  <span className="line-clamp-2 leading-relaxed">
                    {salon.address || "No address provided"}
                    {salon.city && `, ${salon.city}`}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
