'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Bell, Mail, MessageSquare, Clock, Calendar, CheckCircle } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

import {
  useSalonSettings,
  useUpdateSalonPolicies,
  REMINDER_OPTIONS,
} from '@/hooks/use-settings';

export default function NotificationsPage() {
  var params = useParams();
  var { toast } = useToast();
  
  var { data: salon, isLoading } = useSalonSettings(params.salonId);
  var updatePolicies = useUpdateSalonPolicies();
  
  var [notifications, setNotifications] = useState({
    // Client notifications
    client_booking_confirmation: true,
    client_booking_confirmation_email: true,
    client_booking_confirmation_sms: false,
    client_reminder_enabled: true,
    client_reminder_timing: '24h',
    client_reminder_email: true,
    client_reminder_sms: true,
    client_cancellation_notification: true,
    client_reschedule_notification: true,
    
    // Staff notifications
    staff_new_booking: true,
    staff_cancellation: true,
    staff_reschedule: true,
    staff_daily_summary: true,
    staff_daily_summary_time: '08:00',
    
    // Owner notifications
    owner_new_booking: false,
    owner_daily_summary: true,
    owner_weekly_report: true,
    owner_low_availability_alert: true,
  });
  
  // Load saved notifications
  useEffect(function() {
    if (salon?.notifications) {
      setNotifications(function(prev) {
        return { ...prev, ...salon.notifications };
      });
    }
  }, [salon]);
  
  function updateNotification(key, value) {
    setNotifications(function(prev) {
      return { ...prev, [key]: value };
    });
  }
  
  function handleSave() {
    updatePolicies.mutate({
      salonId: params.salonId,
      data: { notifications: notifications },
    }, {
      onSuccess: function() {
        toast({ title: 'Notification settings saved' });
      },
      onError: function(error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      },
    });
  }
  
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-96 bg-muted rounded" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Notification Settings</h1>
        <p className="text-muted-foreground">
          Configure how notifications are sent
        </p>
      </div>
      
      {/* Client Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Client Notifications
          </CardTitle>
          <CardDescription>
            Notifications sent to your clients
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Booking Confirmation */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Booking Confirmation</Label>
                <p className="text-sm text-muted-foreground">
                  Send confirmation when a booking is made
                </p>
              </div>
              <Switch
                checked={notifications.client_booking_confirmation}
                onCheckedChange={function(checked) { updateNotification('client_booking_confirmation', checked); }}
              />
            </div>
            
            {notifications.client_booking_confirmation && (
              <div className="flex gap-4 pl-4 border-l-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="confirm_email"
                    checked={notifications.client_booking_confirmation_email}
                    onCheckedChange={function(checked) { updateNotification('client_booking_confirmation_email', checked); }}
                  />
                  <Label htmlFor="confirm_email" className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    Email
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="confirm_sms"
                    checked={notifications.client_booking_confirmation_sms}
                    onCheckedChange={function(checked) { updateNotification('client_booking_confirmation_sms', checked); }}
                  />
                  <Label htmlFor="confirm_sms" className="flex items-center gap-1">
                    <MessageSquare className="h-4 w-4" />
                    SMS
                  </Label>
                </div>
              </div>
            )}
          </div>
          
          {/* Appointment Reminders */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Appointment Reminders</Label>
                <p className="text-sm text-muted-foreground">
                  Remind clients about upcoming appointments
                </p>
              </div>
              <Switch
                checked={notifications.client_reminder_enabled}
                onCheckedChange={function(checked) { updateNotification('client_reminder_enabled', checked); }}
              />
            </div>
            
            {notifications.client_reminder_enabled && (
              <div className="space-y-3 pl-4 border-l-2">
                <div className="flex items-center gap-2">
                  <Label>Send reminder</Label>
                  <Select
                    value={notifications.client_reminder_timing}
                    onValueChange={function(value) { updateNotification('client_reminder_timing', value); }}
                  >
                    <SelectTrigger className="w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REMINDER_OPTIONS.map(function(option) {
                        return (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="reminder_email"
                      checked={notifications.client_reminder_email}
                      onCheckedChange={function(checked) { updateNotification('client_reminder_email', checked); }}
                    />
                    <Label htmlFor="reminder_email" className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      Email
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="reminder_sms"
                      checked={notifications.client_reminder_sms}
                      onCheckedChange={function(checked) { updateNotification('client_reminder_sms', checked); }}
                    />
                    <Label htmlFor="reminder_sms" className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      SMS
                    </Label>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Other Client Notifications */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Cancellation Notification</Label>
              <p className="text-sm text-muted-foreground">
                Notify when their booking is cancelled
              </p>
            </div>
            <Switch
              checked={notifications.client_cancellation_notification}
              onCheckedChange={function(checked) { updateNotification('client_cancellation_notification', checked); }}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Reschedule Notification</Label>
              <p className="text-sm text-muted-foreground">
                Notify when their booking is rescheduled
              </p>
            </div>
            <Switch
              checked={notifications.client_reschedule_notification}
              onCheckedChange={function(checked) { updateNotification('client_reschedule_notification', checked); }}
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Staff Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Staff Notifications
          </CardTitle>
          <CardDescription>
            Notifications sent to your team members
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">New Booking Alert</Label>
              <p className="text-sm text-muted-foreground">
                Notify staff when assigned a new booking
              </p>
            </div>
            <Switch
              checked={notifications.staff_new_booking}
              onCheckedChange={function(checked) { updateNotification('staff_new_booking', checked); }}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Cancellation Alert</Label>
              <p className="text-sm text-muted-foreground">
                Notify when a booking is cancelled
              </p>
            </div>
            <Switch
              checked={notifications.staff_cancellation}
              onCheckedChange={function(checked) { updateNotification('staff_cancellation', checked); }}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Daily Schedule Summary</Label>
              <p className="text-sm text-muted-foreground">
                Send daily appointment summary
              </p>
            </div>
            <Switch
              checked={notifications.staff_daily_summary}
              onCheckedChange={function(checked) { updateNotification('staff_daily_summary', checked); }}
            />
          </div>
          
          {notifications.staff_daily_summary && (
            <div className="flex items-center gap-2 pl-4 border-l-2">
              <Label>Send at</Label>
              <Select
                value={notifications.staff_daily_summary_time}
                onValueChange={function(value) { updateNotification('staff_daily_summary_time', value); }}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="06:00">6:00 AM</SelectItem>
                  <SelectItem value="07:00">7:00 AM</SelectItem>
                  <SelectItem value="08:00">8:00 AM</SelectItem>
                  <SelectItem value="09:00">9:00 AM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Owner Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Owner Notifications
          </CardTitle>
          <CardDescription>
            Business updates and alerts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">New Booking Notification</Label>
              <p className="text-sm text-muted-foreground">
                Get notified for every new booking
              </p>
            </div>
            <Switch
              checked={notifications.owner_new_booking}
              onCheckedChange={function(checked) { updateNotification('owner_new_booking', checked); }}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Daily Business Summary</Label>
              <p className="text-sm text-muted-foreground">
                Receive daily revenue and booking stats
              </p>
            </div>
            <Switch
              checked={notifications.owner_daily_summary}
              onCheckedChange={function(checked) { updateNotification('owner_daily_summary', checked); }}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Weekly Report</Label>
              <p className="text-sm text-muted-foreground">
                Receive weekly performance report
              </p>
            </div>
            <Switch
              checked={notifications.owner_weekly_report}
              onCheckedChange={function(checked) { updateNotification('owner_weekly_report', checked); }}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Low Availability Alert</Label>
              <p className="text-sm text-muted-foreground">
                Alert when calendar is almost fully booked
              </p>
            </div>
            <Switch
              checked={notifications.owner_low_availability_alert}
              onCheckedChange={function(checked) { updateNotification('owner_low_availability_alert', checked); }}
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updatePolicies.isPending}>
          {updatePolicies.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
