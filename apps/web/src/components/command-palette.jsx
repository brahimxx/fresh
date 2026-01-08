'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Calendar, 
  Users, 
  Scissors, 
  ShoppingBag, 
  DollarSign, 
  BarChart3,
  Megaphone,
  Settings,
  Plus,
  Search,
  User,
  FileText,
  CreditCard,
  Gift,
  Clock,
  LogOut
} from 'lucide-react';

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';

var NAVIGATION_ITEMS = [
  { name: 'Dashboard', href: '/dashboard', icon: BarChart3, keywords: ['home', 'overview'] },
  { name: 'Calendar', href: '/dashboard/salon/1/calendar', icon: Calendar, keywords: ['schedule', 'appointments'] },
  { name: 'Bookings', href: '/dashboard/salon/1/bookings', icon: FileText, keywords: ['appointments', 'reservations'] },
  { name: 'Clients', href: '/dashboard/salon/1/clients', icon: Users, keywords: ['customers', 'contacts'] },
  { name: 'Services', href: '/dashboard/salon/1/services', icon: Scissors, keywords: ['menu', 'treatments'] },
  { name: 'Products', href: '/dashboard/salon/1/products', icon: ShoppingBag, keywords: ['inventory', 'retail'] },
  { name: 'Staff', href: '/dashboard/salon/1/staff', icon: User, keywords: ['team', 'employees'] },
  { name: 'Sales', href: '/dashboard/salon/1/sales', icon: DollarSign, keywords: ['transactions', 'payments'] },
  { name: 'Reports', href: '/dashboard/salon/1/reports', icon: BarChart3, keywords: ['analytics', 'statistics'] },
  { name: 'Marketing', href: '/dashboard/salon/1/marketing', icon: Megaphone, keywords: ['campaigns', 'promotions'] },
  { name: 'Settings', href: '/dashboard/salon/1/settings', icon: Settings, keywords: ['preferences', 'configuration'] },
];

var QUICK_ACTIONS = [
  { name: 'New Booking', action: 'new-booking', icon: Plus, keywords: ['create', 'add', 'appointment'] },
  { name: 'New Client', action: 'new-client', icon: Plus, keywords: ['create', 'add', 'customer'] },
  { name: 'New Service', action: 'new-service', icon: Plus, keywords: ['create', 'add'] },
  { name: 'Process Payment', action: 'payment', icon: CreditCard, keywords: ['checkout', 'pay'] },
  { name: 'Create Gift Card', action: 'gift-card', icon: Gift, keywords: ['voucher'] },
];

var REPORT_ITEMS = [
  { name: 'Revenue Report', href: '/dashboard/salon/1/reports/revenue', icon: DollarSign },
  { name: 'Bookings Report', href: '/dashboard/salon/1/reports/bookings', icon: Calendar },
  { name: 'Staff Report', href: '/dashboard/salon/1/reports/staff', icon: Users },
  { name: 'Clients Report', href: '/dashboard/salon/1/reports/clients', icon: User },
];

export function CommandPalette({ salonId }) {
  var [open, setOpen] = useState(false);
  var router = useRouter();
  
  // Use dynamic salonId if provided
  var basePath = salonId ? '/dashboard/salon/' + salonId : '/dashboard/salon/1';
  
  useEffect(function() {
    function handleKeyDown(e) {
      // Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(function(prev) { return !prev; });
      }
      
      // Escape to close
      if (e.key === 'Escape') {
        setOpen(false);
      }
    }
    
    document.addEventListener('keydown', handleKeyDown);
    return function() {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
  
  function handleSelect(href) {
    setOpen(false);
    router.push(href);
  }
  
  function handleAction(action) {
    setOpen(false);
    
    switch (action) {
      case 'new-booking':
        router.push(basePath + '/calendar?action=new');
        break;
      case 'new-client':
        router.push(basePath + '/clients?action=new');
        break;
      case 'new-service':
        router.push(basePath + '/services?action=new');
        break;
      case 'payment':
        router.push(basePath + '/sales');
        break;
      case 'gift-card':
        router.push(basePath + '/marketing/gift-cards?action=new');
        break;
      default:
        break;
    }
  }
  
  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        <CommandGroup heading="Quick Actions">
          {QUICK_ACTIONS.map(function(item) {
            var Icon = item.icon;
            return (
              <CommandItem 
                key={item.action} 
                onSelect={function() { handleAction(item.action); }}
              >
                <Icon className="mr-2 h-4 w-4" />
                <span>{item.name}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>
        
        <CommandSeparator />
        
        <CommandGroup heading="Navigation">
          {NAVIGATION_ITEMS.map(function(item) {
            var Icon = item.icon;
            var href = item.href.replace('/salon/1/', '/salon/' + (salonId || '1') + '/');
            return (
              <CommandItem 
                key={item.href} 
                onSelect={function() { handleSelect(href); }}
              >
                <Icon className="mr-2 h-4 w-4" />
                <span>{item.name}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>
        
        <CommandSeparator />
        
        <CommandGroup heading="Reports">
          {REPORT_ITEMS.map(function(item) {
            var Icon = item.icon;
            var href = item.href.replace('/salon/1/', '/salon/' + (salonId || '1') + '/');
            return (
              <CommandItem 
                key={item.href} 
                onSelect={function() { handleSelect(href); }}
              >
                <Icon className="mr-2 h-4 w-4" />
                <span>{item.name}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>
        
        <CommandSeparator />
        
        <CommandGroup heading="Account">
          <CommandItem onSelect={function() { handleSelect(basePath + '/settings/account'); }}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Account Settings</span>
          </CommandItem>
          <CommandItem onSelect={function() { router.push('/auth/logout'); }}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Logout</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
      
      <div className="border-t px-3 py-2 text-xs text-muted-foreground">
        <span>Press </span>
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
          <span className="text-xs">⌘</span>K
        </kbd>
        <span> to toggle</span>
      </div>
    </CommandDialog>
  );
}

// Hook to open command palette programmatically
export function useCommandPalette() {
  var [isOpen, setIsOpen] = useState(false);
  
  var open = useCallback(function() {
    // Dispatch keyboard event to trigger command palette
    var event = new KeyboardEvent('keydown', {
      key: 'k',
      metaKey: true,
      bubbles: true
    });
    document.dispatchEvent(event);
  }, []);
  
  return { open, isOpen };
}
