'use client';

import { useParams, usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  Clock,
  CreditCard,
  Bell,
  Palette,
  Globe,
  Star,
  User,
  Shield,
  Settings,
  ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';

import { cn } from '@/lib/utils';
import { useSalon } from '@/providers/salon-provider';
import { getVisibleSettingsItems } from '@/lib/permissions';
import { useEffect, useMemo } from 'react';

const settingsNav = [
  {
    title: 'Business',
    items: [
      { href: 'general', label: 'General', icon: Building2, description: 'Name, address, contact' },
      { href: 'hours', label: 'Business Hours', icon: Clock, description: 'Opening hours' },
    ],
  },
  {
    title: 'Booking',
    items: [
      { href: 'policies', label: 'Booking Policies', icon: Shield, description: 'Cancellation, deposits' },
      { href: 'notifications', label: 'Notifications', icon: Bell, description: 'Reminders, alerts' },
    ],
  },
  {
    title: 'Online Presence',
    items: [
      { href: 'widget', label: 'Booking Widget', icon: Palette, description: 'Embed on your site' },
      { href: 'marketplace', label: 'Marketplace', icon: Globe, description: 'Public listing' },
      { href: 'reviews', label: 'Reviews', icon: Star, description: 'Customer feedback' },
    ],
  },
  {
    title: 'Account',
    items: [
      { href: 'account', label: 'My Account', icon: User, description: 'Profile, password' },
      { href: 'billing', label: 'Billing', icon: CreditCard, description: 'Subscription, invoices' },
    ],
  },
];

export default function SettingsLayout({ children }) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const basePath = `/dashboard/salon/${params.salonId}/settings`;

  // Get staff role to filter visible settings pages
  const { staffRole, customPermissions } = useSalon();

  // Filter settings navigation based on role + custom permissions
  const filteredNav = useMemo(
    () => getVisibleSettingsItems(settingsNav, staffRole, customPermissions),
    [staffRole, customPermissions]
  );

  // Collect all allowed hrefs for redirect logic
  const allowedHrefs = useMemo(
    () => filteredNav.flatMap((section) => section.items.map((item) => item.href)),
    [filteredNav]
  );

  // If the user is on a settings page they don't have access to, redirect to account
  useEffect(() => {
    if (!staffRole || allowedHrefs.length === 0) return;
    const currentSub = pathname.replace(basePath + '/', '').split('/')[0];
    if (currentSub && currentSub !== 'settings' && !allowedHrefs.includes(currentSub)) {
      router.replace(basePath + '/account');
    }
  }, [pathname, allowedHrefs, basePath, staffRole, router]);

  function isActive(href) {
    const fullPath = basePath + '/' + href;
    return pathname === fullPath || (pathname === basePath && href === 'general');
  }
  
  return (
    <div className="-mx-4 sm:-mx-8 -my-8 flex min-h-[calc(100vh-4rem)]">
      {/* Sidebar Navigation */}
      <aside className="w-72 border-r border-border/40 bg-background/60 backdrop-blur-xl shrink-0 hidden md:block">
        <div className="sticky top-0 pt-8 flex flex-col h-screen overflow-y-auto w-full">
          <div className="px-6 mb-8 flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10 shadow-sm">
              <Settings className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Configuration</h1>
              <p className="text-xs text-muted-foreground font-medium">Manage preferences</p>
            </div>
          </div>
          
          <nav className="flex-1 px-4 pb-12 space-y-8">
            {filteredNav.map((section) => (
              <div key={section.title} className="relative">
                <h2 className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-widest pl-3 mb-3">
                  {section.title}
                </h2>
                <ul className="space-y-1 relative">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                      <li key={item.href} className="relative z-10 w-full">
                        <Link
                          href={`${basePath}/${item.href}`}
                          className={cn(
                            "relative group flex items-start gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary/50 w-full",
                            active
                              ? "text-primary"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {/* Active background pill */}
                          {active && (
                            <motion.div
                              layoutId="activeSettingsNav"
                              className="absolute inset-0 bg-primary/5 rounded-xl border border-primary/10"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ type: "spring", stiffness: 350, damping: 30 }}
                            />
                          )}

                          <div className={cn(
                            "relative z-10 shrink-0 flex items-center justify-center p-2 rounded-lg transition-colors border",
                            active 
                              ? "bg-background border-primary/20 shadow-sm" 
                              : "bg-transparent border-transparent group-hover:border-border/50 group-hover:bg-muted/30 group-hover:shadow-sm"
                          )}>
                            <Icon className={cn("w-4 h-4 transition-colors", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                          </div>
                          
                          <div className="relative z-10 flex flex-col min-w-0 flex-1 mt-0.5">
                            <span className={cn(
                              "text-sm font-bold tracking-tight transition-colors truncate", 
                              active ? "text-foreground" : ""
                            )}>
                              {item.label}
                            </span>
                            <span className={cn(
                              "text-[11px] leading-tight mt-0.5 truncate transition-colors",
                              active ? "text-muted-foreground/80" : "text-muted-foreground/60 group-hover:text-muted-foreground/80"
                            )}>
                              {item.description}
                            </span>
                          </div>
                          
                          {active && (
                            <div className="relative z-10 shrink-0 h-6 flex items-center px-1">
                              <ChevronRight className="w-4 h-4 text-primary opacity-50" />
                            </div>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </div>
      </aside>
      
      {/* Content Area */}
      <main className="flex-1 w-full min-w-0 bg-background/30 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-primary/5 via-background to-transparent opacity-50 pointer-events-none -z-10" />
        <div className="h-full relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
