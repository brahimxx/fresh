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
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const params = useParams();
  const [collapsed, setCollapsed] = useState(false);
  const { logout } = useAuth();
  
  const salonId = params?.salonId;
  const basePath = salonId ? `/dashboard/salon/${salonId}` : '/dashboard';
  const hasSalon = !!salonId;

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

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {/* If no salon is selected (new account), keep only Dashboard and Settings, and nudge to create a salon */}
        {!hasSalon && (
          <div className="px-3 pb-2">
            <Link
              href="/dashboard/locations/new"
              className="block w-full rounded-lg bg-primary text-primary-foreground text-center py-2 text-sm font-medium hover:opacity-90"
            >
              Create Your Salon
            </Link>
          </div>
        )}
        {(hasSalon ? navigation : navigation.filter(n => ['Dashboard','Settings'].includes(n.name))).map((item) => {
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
