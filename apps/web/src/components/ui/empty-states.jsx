import { 
  Calendar, 
  Users, 
  Scissors, 
  Package, 
  CreditCard,
  MessageSquare,
  Bell,
  Search,
  FileText,
  ShoppingBag,
  Gift,
  Clock,
  BarChart,
  Settings,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

// Base empty state component
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  actionLabel,
  secondaryAction,
  secondaryLabel,
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground max-w-sm mb-6">{description}</p>
        <div className="flex gap-3">
          {action && (
            <Button onClick={action}>
              <Plus className="h-4 w-4 mr-2" />
              {actionLabel}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction}>
              {secondaryLabel}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Pre-configured empty states for common scenarios

export function EmptyBookings({ onAdd }) {
  return (
    <EmptyState
      icon={Calendar}
      title="No bookings yet"
      description="Your upcoming bookings will appear here. Start by creating your first appointment."
      action={onAdd}
      actionLabel="New Booking"
    />
  );
}

export function EmptyClients({ onAdd }) {
  return (
    <EmptyState
      icon={Users}
      title="No clients yet"
      description="Your client list is empty. Add your first client to get started."
      action={onAdd}
      actionLabel="Add Client"
    />
  );
}

export function EmptyServices({ onAdd }) {
  return (
    <EmptyState
      icon={Scissors}
      title="No services yet"
      description="Create your service menu so clients can book appointments."
      action={onAdd}
      actionLabel="Add Service"
    />
  );
}

export function EmptyStaff({ onAdd }) {
  return (
    <EmptyState
      icon={Users}
      title="No team members"
      description="Add your staff members to manage their schedules and assignments."
      action={onAdd}
      actionLabel="Add Staff Member"
    />
  );
}

export function EmptyProducts({ onAdd }) {
  return (
    <EmptyState
      icon={ShoppingBag}
      title="No products yet"
      description="Add retail products to sell to your clients."
      action={onAdd}
      actionLabel="Add Product"
    />
  );
}

export function EmptyPackages({ onAdd }) {
  return (
    <EmptyState
      icon={Package}
      title="No packages yet"
      description="Create service packages to offer bundled deals to clients."
      action={onAdd}
      actionLabel="Create Package"
    />
  );
}

export function EmptyGiftCards({ onAdd }) {
  return (
    <EmptyState
      icon={Gift}
      title="No gift cards yet"
      description="Gift cards haven't been set up yet. Create your first gift card offering."
      action={onAdd}
      actionLabel="Create Gift Card"
    />
  );
}

export function EmptyPayments() {
  return (
    <EmptyState
      icon={CreditCard}
      title="No payments yet"
      description="Payment history will appear here once you start processing transactions."
    />
  );
}

export function EmptyReviews() {
  return (
    <EmptyState
      icon={MessageSquare}
      title="No reviews yet"
      description="Client reviews will appear here as they leave feedback after appointments."
    />
  );
}

export function EmptyNotifications() {
  return (
    <EmptyState
      icon={Bell}
      title="All caught up!"
      description="You have no new notifications. We'll let you know when something needs your attention."
    />
  );
}

export function EmptySearchResults({ query, onClear }) {
  return (
    <EmptyState
      icon={Search}
      title="No results found"
      description={'We couldn\'t find anything matching "' + query + '". Try adjusting your search or filters.'}
      action={onClear}
      actionLabel="Clear Search"
    />
  );
}

export function EmptyReports({ dateRange }) {
  return (
    <EmptyState
      icon={BarChart}
      title="No data available"
      description={'There\'s no data for the selected period (' + (dateRange || 'this period') + '). Try selecting a different date range.'}
    />
  );
}

export function EmptyInvoices({ onAdd }) {
  return (
    <EmptyState
      icon={FileText}
      title="No invoices yet"
      description="Invoices will be automatically created when you complete sales."
      action={onAdd}
      actionLabel="Create Invoice"
    />
  );
}

export function EmptyWaitlist({ onAdd }) {
  return (
    <EmptyState
      icon={Clock}
      title="No waitlist entries"
      description="When time slots are fully booked, clients can join the waitlist here."
      action={onAdd}
      actionLabel="Add to Waitlist"
    />
  );
}

export function EmptyCampaigns({ onAdd }) {
  return (
    <EmptyState
      icon={MessageSquare}
      title="No campaigns yet"
      description="Create marketing campaigns to reach out to your clients."
      action={onAdd}
      actionLabel="Create Campaign"
    />
  );
}

// Inline empty state for smaller areas
export function InlineEmptyState({ icon: Icon, message }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Icon className="h-8 w-8 text-muted-foreground mb-2" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

// Table empty state
export function TableEmptyState({ message, action, actionLabel }) {
  return (
    <tr>
      <td colSpan="100%" className="py-12 text-center">
        <p className="text-muted-foreground mb-4">{message || 'No data available'}</p>
        {action && (
          <Button size="sm" onClick={action}>
            <Plus className="h-4 w-4 mr-2" />
            {actionLabel}
          </Button>
        )}
      </td>
    </tr>
  );
}
