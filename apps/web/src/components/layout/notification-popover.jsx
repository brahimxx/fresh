'use client';

import { useState, useContext } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell, Check, CheckCheck, Trash2, Mail, MessageSquare,
  Smartphone, Loader2, Inbox, Sparkles, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from '@/components/ui/tooltip';
import { useNotifications, useMarkNotificationsRead, useDeleteNotifications } from '@/hooks/use-notifications';
import { useAuth } from '@/providers/auth-provider';
import { SalonContext } from '@/providers/salon-provider';
import { cn } from '@/lib/utils';

function getTimeAgo(dateStr) {
  if (!dateStr) return '';
  var date = new Date(dateStr);
  var now = new Date();
  var diff = Math.floor((now - date) / 1000);

  if (diff < 60) return 'Just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function stripHtml(html) {
  if (!html) return '';
  // Replace common block tags with spaces to maintain spacing
  var formatted = String(html).replace(/<br\s*\/?>/gi, ' ');
  formatted = formatted.replace(/<\/p>|<\/div>|<\/li>|<\/h[1-6]>/gi, ' ');
  // Strip all remaining HTML tags
  formatted = formatted.replace(/<[^>]*>?/gm, '');
  // Collapse multiple spaces
  formatted = formatted.replace(/\s+/g, ' ').trim();
  return formatted;
}

function getTypeIcon(type) {
  switch (type) {
    case 'email': return Mail;
    case 'sms': return MessageSquare;
    case 'push': return Smartphone;
    default: return Bell;
  }
}

function getTypeColor(type) {
  switch (type) {
    case 'email': return 'text-blue-500 bg-blue-500/10';
    case 'sms': return 'text-emerald-500 bg-emerald-500/10';
    case 'push': return 'text-violet-500 bg-violet-500/10';
    default: return 'text-primary bg-primary/10';
  }
}

/**
 * Resolves a notification's data payload into a navigation URL.
 * Returns null if no meaningful link can be built.
 */
function resolveNotificationLink(notification, userRole, salonId) {
  var data = notification.data;
  if (!data) return null;

  // Booking-related notifications (created, confirmed, cancelled, reminder)
  if (data.bookingId) {
    if (data.event === 'review_prompt') {
      return '/bookings/' + data.bookingId + '/review';
    }
    if (userRole === 'client') {
      return '/bookings';
    }
    // Owner/manager/staff/admin → dashboard bookings
    if (salonId) {
      return '/dashboard/salon/' + salonId + '/bookings';
    }
    return '/dashboard';
  }

  // Campaign notifications
  if (data.campaignId) {
    return null; // No specific page to navigate to for campaign emails
  }

  // Refund notifications
  if (data.paymentId) {
    if (userRole === 'client') {
      return '/bookings';
    }
    if (salonId) {
      return '/dashboard/salon/' + salonId + '/bookings';
    }
  }

  return null;
}

export function NotificationPopover() {
  var [open, setOpen] = useState(false);
  var [tab, setTab] = useState('all');
  var router = useRouter();
  var { data, isLoading } = useNotifications({ limit: 20 });
  var markRead = useMarkNotificationsRead();
  var deleteNotifications = useDeleteNotifications();

  // Auth is always available (global provider)
  var { user } = useAuth();
  // Salon context is only available inside dashboard layouts — returns null on marketplace
  var salonCtx = useContext(SalonContext);

  var userRole = user?.role || 'client';
  var salonId = salonCtx?.salonId || null;

  var allNotifications = data?.notifications || [];
  var unreadCount = data?.unreadCount || 0;

  // Filter based on tab
  var notifications = tab === 'unread'
    ? allNotifications.filter(function(n) { return !n.isRead; })
    : allNotifications;

  function handleMarkAllRead() {
    markRead.mutate([]);
  }

  function handleMarkOneRead(id, e) {
    if (e) e.stopPropagation();
    markRead.mutate([id]);
  }

  function handleDelete(id, e) {
    if (e) e.stopPropagation();
    deleteNotifications.mutate([id]);
  }

  function handleNotificationClick(notification) {
    var link = resolveNotificationLink(notification, userRole, salonId);

    // Mark as read on click
    if (!notification.isRead) {
      markRead.mutate([notification.id]);
    }

    // Navigate if we have a link
    if (link) {
      setOpen(false);
      router.push(link);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground ring-2 ring-background">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-96 p-0 rounded-xl shadow-xl border border-border/60"
      >
        {/* Header */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <h4 className="text-base font-semibold">Notifications</h4>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-semibold tabular-nums rounded-md">
                  {unreadCount} new
                </Badge>
              )}
            </div>
            {unreadCount > 0 && (
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={handleMarkAllRead}
                      disabled={markRead.isPending}
                    >
                      {markRead.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCheck className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Mark all as read</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {/* Tabs */}
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full h-9 bg-muted/50 p-0.5">
              <TabsTrigger value="all" className="flex-1 h-full text-xs font-medium">
                All
              </TabsTrigger>
              <TabsTrigger value="unread" className="flex-1 h-full text-xs font-medium">
                Unread{unreadCount > 0 ? ' (' + unreadCount + ')' : ''}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="border-t" />

        {/* Notification List */}
        <div className="max-h-100 overflow-y-auto overscroll-contain">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Loading…</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <div className="h-12 w-12 rounded-full bg-muted/60 flex items-center justify-center mb-3">
                {tab === 'unread' ? (
                  <Sparkles className="h-6 w-6 text-muted-foreground/50" />
                ) : (
                  <Inbox className="h-6 w-6 text-muted-foreground/50" />
                )}
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                {tab === 'unread' ? 'All caught up!' : 'No notifications yet'}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1 max-w-48">
                {tab === 'unread'
                  ? 'You have no unread notifications'
                  : 'When you receive notifications, they\'ll show up here'}
              </p>
            </div>
          ) : (
            <div>
              {notifications.map(function(notification, idx) {
                var TypeIcon = getTypeIcon(notification.type);
                var typeColor = getTypeColor(notification.type);
                var isUnread = !notification.isRead;
                var link = resolveNotificationLink(notification, userRole, salonId);
                var isClickable = !!link;
                return (
                  <div
                    key={notification.id}
                    onClick={function() { handleNotificationClick(notification); }}
                    className={cn(
                      "relative flex items-start gap-3 px-4 py-3.5 transition-all duration-150 group",
                      isUnread && "bg-primary/3",
                      isClickable
                        ? "cursor-pointer hover:bg-muted/50 active:bg-muted/70"
                        : "cursor-default hover:bg-muted/40",
                      idx !== notifications.length - 1 && "border-b border-border/40"
                    )}
                  >
                    {/* Unread indicator dot */}
                    {isUnread && (
                      <div className="absolute left-1.5 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-primary" />
                    )}

                    {/* Icon */}
                    <div className={cn(
                      "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                      isUnread ? typeColor : "bg-muted text-muted-foreground"
                    )}>
                      <TypeIcon className="h-4 w-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn(
                          "text-sm leading-snug",
                          isUnread ? "font-semibold text-foreground" : "font-normal text-foreground/80"
                        )}>
                          {notification.title}
                        </p>
                        {isClickable && (
                          <ExternalLink className="h-3 w-3 shrink-0 mt-1 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                      <p className="text-[13px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                        {stripHtml(notification.message)}
                      </p>
                      <p className="text-[11px] text-muted-foreground/50 mt-1.5 font-medium uppercase tracking-wider">
                        {getTimeAgo(notification.sentAt)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0 -mr-1">
                      {isUnread && (
                        <TooltipProvider delayDuration={300}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-lg"
                                onClick={function(e) { handleMarkOneRead(notification.id, e); }}
                              >
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                              <p>Mark as read</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      <TooltipProvider delayDuration={300}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={function(e) { handleDelete(notification.id, e); }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">
                            <p>Delete</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {allNotifications.length > 0 && (
          <>
            <div className="border-t" />
            <div className="px-4 py-2.5 flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground/60">
                Showing {notifications.length} of {allNotifications.length}
              </p>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs font-medium text-primary hover:text-primary"
                  onClick={handleMarkAllRead}
                  disabled={markRead.isPending}
                >
                  Read all
                </Button>
              )}
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
