'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

// Generate breadcrumbs from pathname
export function Breadcrumbs({ items, className = '' }) {
  var pathname = usePathname();
  
  // If items not provided, generate from pathname
  var breadcrumbs = items || generateBreadcrumbs(pathname);
  
  if (breadcrumbs.length <= 1) return null;
  
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex items-center gap-1 text-sm">
        {breadcrumbs.map(function(crumb, index) {
          var isLast = index === breadcrumbs.length - 1;
          
          return (
            <li key={crumb.href} className="flex items-center gap-1">
              {index > 0 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              
              {isLast ? (
                <span className="font-medium text-foreground">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {index === 0 && crumb.label === 'Dashboard' ? (
                    <Home className="h-4 w-4" />
                  ) : (
                    crumb.label
                  )}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// Generate breadcrumbs from pathname
function generateBreadcrumbs(pathname) {
  var segments = pathname.split('/').filter(Boolean);
  var breadcrumbs = [];
  var currentPath = '';
  
  // Label mappings for route segments
  var labels = {
    dashboard: 'Dashboard',
    salon: 'Salon',
    calendar: 'Calendar',
    bookings: 'Bookings',
    clients: 'Clients',
    staff: 'Team',
    services: 'Services',
    products: 'Products',
    packages: 'Packages',
    'gift-cards': 'Gift Cards',
    sales: 'Sales',
    payments: 'Payments',
    invoices: 'Invoices',
    reports: 'Reports',
    settings: 'Settings',
    general: 'General',
    hours: 'Business Hours',
    policies: 'Policies',
    notifications: 'Notifications',
    widget: 'Widget',
    marketplace: 'Marketplace',
    reviews: 'Reviews',
    account: 'Account',
    marketing: 'Marketing',
    campaigns: 'Campaigns',
    discounts: 'Discounts',
    waitlist: 'Waitlist',
    new: 'New',
    edit: 'Edit',
  };
  
  segments.forEach(function(segment, index) {
    currentPath += '/' + segment;
    
    // Skip dynamic segments (UUIDs, IDs)
    if (isUUID(segment) || isNumericId(segment)) {
      // Try to get a more meaningful label for IDs
      var prevSegment = segments[index - 1];
      if (prevSegment) {
        var singularLabel = getSingularLabel(prevSegment);
        breadcrumbs.push({
          href: currentPath,
          label: singularLabel + ' Details',
        });
      }
      return;
    }
    
    var label = labels[segment] || formatLabel(segment);
    breadcrumbs.push({
      href: currentPath,
      label: label,
    });
  });
  
  return breadcrumbs;
}

// Check if string is a UUID
function isUUID(str) {
  var uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Check if string is a numeric ID
function isNumericId(str) {
  return /^\d+$/.test(str);
}

// Get singular form of a label
function getSingularLabel(plural) {
  var singulars = {
    bookings: 'Booking',
    clients: 'Client',
    staff: 'Staff Member',
    services: 'Service',
    products: 'Product',
    packages: 'Package',
    payments: 'Payment',
    invoices: 'Invoice',
    campaigns: 'Campaign',
    discounts: 'Discount',
    reviews: 'Review',
  };
  return singulars[plural] || plural.replace(/s$/, '');
}

// Format segment to label
function formatLabel(segment) {
  return segment
    .split('-')
    .map(function(word) {
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

// Page header with breadcrumbs
export function PageHeader({ 
  title, 
  description, 
  breadcrumbs,
  actions,
  backHref,
  className = '',
}) {
  return (
    <div className={'space-y-2 ' + className}>
      {breadcrumbs && (
        <Breadcrumbs items={breadcrumbs} className="mb-4" />
      )}
      
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            {backHref && (
              <Link
                href={backHref}
                className="p-2 -ml-2 rounded-md hover:bg-muted transition-colors"
              >
                <ChevronRight className="h-5 w-5 rotate-180" />
              </Link>
            )}
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          </div>
          {description && (
            <p className="text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        
        {actions && (
          <div className="flex items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
