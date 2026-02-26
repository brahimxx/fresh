'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Scissors,
  UserCog,
  Package,
  CreditCard,
  Megaphone,
  BarChart3,
  Star,
  Clock,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Shield,
  Building2,
  DollarSign,
  LineChart,
  FileText,
  LifeBuoy,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/providers/auth-provider';

const navigation = [
  { name: 'Dashboard', href: '', icon: LayoutDashboard },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Bookings', href: '/bookings', icon: Clock },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'Services', href: '/services', icon: Scissors },
  { name: 'Team', href: '/team', icon: UserCog },
  { name: 'Products', href: '/products', icon: Package },
  { name: 'Sales', href: '/sales', icon: CreditCard },
  { name: 'Marketing', href: '/marketing', icon: Megaphone },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Reviews', href: '/reviews', icon: Star },
  { name: 'Support', href: '/support', icon: LifeBuoy },
  { name: 'Settings', href: '/settings', icon: Settings },
];

const adminNavigation = [
  { name: 'Dashboard', href: '', icon: Shield },
  { name: 'Analytics', href: '/analytics', icon: LineChart },
  { name: 'Users', href: '/users', icon: Users },
  { name: 'Salons', href: '/salons', icon: Building2 },
  { name: 'Bookings', href: '/bookings', icon: Clock },
  { name: 'Fees', href: '/fees', icon: CreditCard },
  { name: 'Payouts', href: '/payouts', icon: DollarSign },
  { name: 'Marketing', href: '/marketing', icon: Megaphone },
  { name: 'Reviews', href: '/reviews', icon: Star },
  { name: 'Audit Logs', href: '/audit-logs', icon: FileText },
  { name: 'Support', href: '/support', icon: LifeBuoy },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const params = useParams();
  const [collapsed, setCollapsed] = useState(false);
  const { logout, user } = useAuth();

  const isAdmin = user?.role === 'admin';
  const salonId = params?.salonId;
  const basePath = isAdmin
    ? '/dashboard/admin'
    : salonId
      ? `/dashboard/salon/${salonId}`
      : '/dashboard';
  const hasSalon = !!salonId;

  // Determine which navigation items to show
  const navItems = isAdmin
    ? adminNavigation
    : hasSalon
      ? navigation
      : navigation.filter(n => ['Dashboard', 'Settings'].includes(n.name));

  return (
    <aside
      className={cn(
        'flex flex-col bg-background border-r border-border h-screen sticky top-0 transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-border/50">
        <Link href={basePath || '/'} className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-md shadow-primary/20">
            <span className="text-primary-foreground font-bold text-lg">F</span>
          </div>
          {!collapsed && (
            <span className="font-semibold text-xl tracking-tight">Fresh</span>
          )}
        </Link>
      </div>

      {/* Admin Badge */}
      {isAdmin && !collapsed && (
        <div className="px-4 py-2 border-b border-border/50">
          <div className="flex items-center gap-2 text-xs font-medium text-primary bg-primary/10 rounded-md px-2 py-1">
            <Shield className="h-3 w-3" />
            Admin Panel
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {/* If no salon is selected (new account) and not admin, nudge to create a salon */}
        {!hasSalon && !isAdmin && (
          <div className="px-3 pb-2">
            <Link
              href="/dashboard/locations/new"
              className="block w-full rounded-lg bg-primary text-primary-foreground text-center py-2 text-sm font-medium hover:opacity-90"
            >
              Create Your Salon
            </Link>
          </div>
        )}
        {navItems.map((item) => {
          const href = `${basePath}${item.href}`;
          const isActive = pathname === href ||
            (item.href && pathname.startsWith(href));

          return (
            <Link
              key={item.name}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border/50 p-2 space-y-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className={cn(
            'w-full justify-start text-muted-foreground hover:text-foreground',
            collapsed && 'justify-center'
          )}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span className="ml-3">Logout</span>}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full justify-center text-muted-foreground hover:text-foreground"
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </Button>
      </div>
    </aside>
  );
}
