'use client';

import { useParams, usePathname } from 'next/navigation';
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
} from 'lucide-react';

import { cn } from '@/lib/utils';

var settingsNav = [
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
  var params = useParams();
  var pathname = usePathname();
  var basePath = '/dashboard/salon/' + params.salonId + '/settings';
  
  function isActive(href) {
    var fullPath = basePath + '/' + href;
    return pathname === fullPath || pathname === basePath && href === 'general';
  }
  
  return (
    <div className="flex min-h-screen">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r bg-muted/30 p-6">
        <h1 className="text-lg font-semibold mb-6">Settings</h1>
        
        <nav className="space-y-6">
          {settingsNav.map(function(section) {
            return (
              <div key={section.title}>
                <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  {section.title}
                </h2>
                <ul className="space-y-1">
                  {section.items.map(function(item) {
                    var Icon = item.icon;
                    var active = isActive(item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={basePath + '/' + item.href}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                            active
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
      </aside>
      
      {/* Content Area */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
