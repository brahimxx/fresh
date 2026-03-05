"use client";

import { Search, ChevronDown, Building2, Check } from "lucide-react";
import { NotificationPopover } from "@/components/layout/notification-popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/providers/auth-provider";
import { useSalon } from "@/providers/salon-provider";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api-client";
import { useRouter } from "next/navigation";

export function Header() {
  const { user, logout } = useAuth();
  const { salon, salonId } = useSalon();
  const router = useRouter();

  // Fetch all user's salons for the switcher
  const { data: userSalons = [] } = useQuery({
    queryKey: ["user-salons", user?.id],
    queryFn: () => api.get("/salons"),
    enabled: !!user?.id,
    select: (response) => response.data?.salons || [],
  });

  const initials = user
    ? `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""
      }`.toUpperCase() || "U"
    : "U";

  return (
    <header className="h-16 border-b border-border bg-background px-6 flex items-center justify-between sticky top-0 z-10">
      {/* Left side - Search */}
      <div className="flex items-center gap-4 flex-1">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search clients, bookings..."
            className="pl-10 w-full"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Salon Switcher - Show if user owns salons */}
        {user && salon && userSalons.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Building2 className="h-4 w-4" />
                <span className="max-w-32 truncate">{salon.name}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Switch Salon</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {userSalons.map((s) => (
                <DropdownMenuItem
                  key={s.id}
                  onClick={() => router.push(`/dashboard/salon/${s.id}`)}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <span className="truncate">{s.name}</span>
                  </div>
                  {s.id === Number(salonId) && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/locations/new">+ Add New Location</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <NotificationPopover />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.avatar_url} alt={user?.first_name} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <span className="hidden md:inline-block">
                {user?.first_name} {user?.last_name}
              </span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>
                  {user?.first_name} {user?.last_name}
                </span>
                <span className="text-xs text-muted-foreground font-normal">
                  {user?.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={salonId ? `/dashboard/salon/${salonId}/settings/account` : '/dashboard/settings'}>Account Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings">Change Password</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive">
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
