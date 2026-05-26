'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Bell, Mail, MessageSquare, Calendar, CheckCircle, Info, Smartphone, Users, Briefcase } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
import { cn } from '@/lib/utils';

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
      <div className="space-y-8 animate-pulse">
        <div className="h-48 w-full bg-muted/60 rounded-3xl" />
        <div className="space-y-6">
           <div className="h-64 bg-muted/40 rounded-3xl" />
           <div className="h-64 bg-muted/40 rounded-3xl" />
        </div>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };
  
  return (
    <div className="space-y-8 p-6 sm:p-8">
      {/* Decorative Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-8 sm:p-10 group"
      >
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:rotate-6">
          <Bell className="w-48 h-48 sm:w-64 sm:h-64 text-primary" strokeWidth={1} />
        </div>
        
        <div className="relative z-10 flex flex-col gap-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-background/80 backdrop-blur-md border border-primary/20 text-xs font-semibold text-primary w-fit">
            <Info className="w-3.5 h-3.5" />
            <span>Communications Engine</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Notification Preferences</h1>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-xl">
            Control the flow of automated emails, SMS alerts, and internal push notifications across your entire team and client base.
          </p>
        </div>
      </motion.div>
      
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-8"
      >
        <div className="grid lg:grid-cols-2 gap-8">
          
          {/* Column 1 */}
          <div className="space-y-8">
            {/* Client Notifications */}
            <motion.div variants={itemVariants} className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 sm:p-8 shadow-sm">
              <div className="flex items-center gap-3 border-b border-border/50 pb-6 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Client Routing</h2>
                  <p className="text-sm text-muted-foreground">Emails and texts sent to customers</p>
                </div>
              </div>
              
              <div className="space-y-5">
                <div className="p-5 rounded-2xl border border-border/50 bg-muted/10 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center justify-between mb-4">
                    <div className="pr-4">
                      <Label className="text-base font-bold text-foreground">Booking Confirmation</Label>
                      <p className="text-sm text-muted-foreground mt-0.5">Send a confirmation immediately when a booking is made</p>
                    </div>
                    <Switch
                      checked={notifications.client_booking_confirmation}
                      onCheckedChange={function(checked) { updateNotification('client_booking_confirmation', checked); }}
                      className="data-[state=checked]:bg-primary shrink-0"
                    />
                  </div>
                  
                  <AnimatePresence>
                    {notifications.client_booking_confirmation && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-border/50 mt-2">
                          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-border/50 hover:bg-background transition-colors flex-1">
                            <Checkbox
                              checked={notifications.client_booking_confirmation_email}
                              onCheckedChange={function(checked) { updateNotification('client_booking_confirmation_email', checked); }}
                              className="data-[state=checked]:bg-primary"
                            />
                            <div className="flex items-center gap-2 font-medium">
                              <Mail className="h-4 w-4 text-primary" /> Email Receipt
                            </div>
                          </label>
                          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-border/50 hover:bg-background transition-colors flex-1">
                            <Checkbox
                              checked={notifications.client_booking_confirmation_sms}
                              onCheckedChange={function(checked) { updateNotification('client_booking_confirmation_sms', checked); }}
                              className="data-[state=checked]:bg-primary"
                            />
                            <div className="flex items-center gap-2 font-medium">
                              <Smartphone className="h-4 w-4 text-primary" /> SMS Text
                            </div>
                          </label>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                <div className="p-5 rounded-2xl border border-border/50 bg-muted/10 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center justify-between mb-4">
                    <div className="pr-4">
                      <Label className="text-base font-bold text-foreground">Appointment Reminders</Label>
                      <p className="text-sm text-muted-foreground mt-0.5">Automated pings to reduce client no-shows</p>
                    </div>
                    <Switch
                      checked={notifications.client_reminder_enabled}
                      onCheckedChange={function(checked) { updateNotification('client_reminder_enabled', checked); }}
                      className="data-[state=checked]:bg-primary shrink-0"
                    />
                  </div>
                  
                  <AnimatePresence>
                    {notifications.client_reminder_enabled && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden space-y-4"
                      >
                        <div className="pt-4 border-t border-border/50 mt-2 flex flex-col gap-3">
                          <Label className="text-xs font-bold text-primary uppercase tracking-wider">Timing Sequence</Label>
                          <Select
                            value={notifications.client_reminder_timing}
                            onValueChange={function(value) { updateNotification('client_reminder_timing', value); }}
                          >
                            <SelectTrigger className="w-full sm:w-64 h-11 rounded-xl bg-background border-border/50 focus:ring-primary/50 text-[15px] font-medium">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
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
                        
                        <div className="flex flex-col sm:flex-row gap-4">
                          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-border/50 hover:bg-background transition-colors flex-1">
                            <Checkbox
                              checked={notifications.client_reminder_email}
                              onCheckedChange={function(checked) { updateNotification('client_reminder_email', checked); }}
                              className="data-[state=checked]:bg-primary"
                            />
                            <div className="flex items-center gap-2 font-medium">
                              <Mail className="h-4 w-4 text-primary" /> Email Blast
                            </div>
                          </label>
                          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-border/50 hover:bg-background transition-colors flex-1">
                            <Checkbox
                              checked={notifications.client_reminder_sms}
                              onCheckedChange={function(checked) { updateNotification('client_reminder_sms', checked); }}
                              className="data-[state=checked]:bg-primary"
                            />
                            <div className="flex items-center gap-2 font-medium">
                              <MessageSquare className="h-4 w-4 text-primary" /> Text Ping
                            </div>
                          </label>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                <div className="h-px bg-border/50 my-2" />

                <div className="flex items-center justify-between px-2">
                  <div className="pr-4">
                    <Label className="text-[15px] font-bold text-foreground">Cancellation Alert</Label>
                    <p className="text-sm text-muted-foreground">Notify client when booking is cancelled</p>
                  </div>
                  <Switch
                    checked={notifications.client_cancellation_notification}
                    onCheckedChange={function(checked) { updateNotification('client_cancellation_notification', checked); }}
                    className="data-[state=checked]:bg-primary shrink-0"
                  />
                </div>
                
                <div className="flex items-center justify-between px-2">
                  <div className="pr-4">
                    <Label className="text-[15px] font-bold text-foreground">Reschedule Notice</Label>
                    <p className="text-sm text-muted-foreground">Notify client when booking date changes</p>
                  </div>
                  <Switch
                    checked={notifications.client_reschedule_notification}
                    onCheckedChange={function(checked) { updateNotification('client_reschedule_notification', checked); }}
                    className="data-[state=checked]:bg-primary shrink-0"
                  />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Column 2 */}
          <div className="space-y-8">
            
            {/* Staff Notifications */}
            <motion.div variants={itemVariants} className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 sm:p-8 shadow-sm">
              <div className="flex items-center gap-3 border-b border-border/50 pb-6 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-indigo-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Team Operations</h2>
                  <p className="text-sm text-muted-foreground">Internal triggers for staff members</p>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <div className="pr-4">
                    <Label className="text-[15px] font-bold text-foreground">New Booking Alert</Label>
                    <p className="text-sm text-muted-foreground mt-0.5">Ping provider when assigned a slot</p>
                  </div>
                  <Switch
                    checked={notifications.staff_new_booking}
                    onCheckedChange={function(checked) { updateNotification('staff_new_booking', checked); }}
                  />
                </div>
                
                <div className="flex items-center justify-between px-2">
                  <div className="pr-4">
                    <Label className="text-[15px] font-bold text-foreground">Cancellation Alert</Label>
                    <p className="text-sm text-muted-foreground mt-0.5">Ping provider if client drops</p>
                  </div>
                  <Switch
                    checked={notifications.staff_cancellation}
                    onCheckedChange={function(checked) { updateNotification('staff_cancellation', checked); }}
                  />
                </div>
                
                <div className="p-5 rounded-2xl border border-border/50 bg-indigo-500/5 hover:bg-indigo-500/10 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="pr-4">
                      <Label className="text-base font-bold text-foreground">Daily Roster Summary</Label>
                      <p className="text-sm text-muted-foreground mt-0.5">Send full schedule digest to staff</p>
                    </div>
                    <Switch
                      checked={notifications.staff_daily_summary}
                      onCheckedChange={function(checked) { updateNotification('staff_daily_summary', checked); }}
                    />
                  </div>
                  
                  <AnimatePresence>
                    {notifications.staff_daily_summary && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="flex items-center gap-3 pt-4 border-t border-border/50 mt-2">
                          <Label className="text-xs font-bold uppercase tracking-wider text-indigo-500">Dispatch Time</Label>
                          <Select
                            value={notifications.staff_daily_summary_time}
                            onValueChange={function(value) { updateNotification('staff_daily_summary_time', value); }}
                          >
                            <SelectTrigger className="w-32 h-10 rounded-xl bg-background border-border/50 focus:ring-indigo-500/50 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="06:00">6:00 AM</SelectItem>
                              <SelectItem value="07:00">7:00 AM</SelectItem>
                              <SelectItem value="08:00">8:00 AM</SelectItem>
                              <SelectItem value="09:00">9:00 AM</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
            
            {/* Owner Notifications */}
            <motion.div variants={itemVariants} className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 sm:p-8 shadow-sm">
               <div className="flex items-center gap-3 border-b border-border/50 pb-6 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                  <Briefcase className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Admin & Owner Alerts</h2>
                  <p className="text-sm text-muted-foreground">High-level insights & business triggers</p>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <div className="pr-4">
                    <Label className="text-[15px] font-bold text-foreground">Global Booking Feed</Label>
                    <p className="text-sm text-muted-foreground mt-0.5">Ping owner for absolutely every booking</p>
                  </div>
                  <Switch
                    checked={notifications.owner_new_booking}
                    onCheckedChange={function(checked) { updateNotification('owner_new_booking', checked); }}
                  />
                </div>
                
                <div className="flex items-center justify-between px-2">
                  <div className="pr-4">
                    <Label className="text-[15px] font-bold text-foreground">Daily Revenue Digest</Label>
                    <p className="text-sm text-muted-foreground mt-0.5">Receive P&L and metrics daily</p>
                  </div>
                  <Switch
                    checked={notifications.owner_daily_summary}
                    onCheckedChange={function(checked) { updateNotification('owner_daily_summary', checked); }}
                  />
                </div>
                
                <div className="flex items-center justify-between px-2">
                  <div className="pr-4">
                    <Label className="text-[15px] font-bold text-foreground">Weekly KPI Report</Label>
                    <p className="text-sm text-muted-foreground mt-0.5">Macro performance trends emailed weekly</p>
                  </div>
                  <Switch
                    checked={notifications.owner_weekly_report}
                    onCheckedChange={function(checked) { updateNotification('owner_weekly_report', checked); }}
                  />
                </div>
                
                <div className="flex items-center justify-between p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 mt-2">
                  <div className="pr-4">
                    <Label className="text-[15px] font-bold text-amber-600 dark:text-amber-400">Low Availability Warning</Label>
                    <p className="text-sm text-muted-foreground mt-0.5">Alert when pipeline is nearing 100% capacity</p>
                  </div>
                  <Switch
                    checked={notifications.owner_low_availability_alert}
                    onCheckedChange={function(checked) { updateNotification('owner_low_availability_alert', checked); }}
                    className="data-[state=checked]:bg-amber-500"
                  />
                </div>
              </div>
            </motion.div>

          </div>
        </div>

        {/* Save Button */}
        <motion.div 
          variants={itemVariants}
          className="sticky bottom-6 z-20 mt-8"
        >
          <div className="flex items-center justify-between p-4 sm:p-6 bg-background/80 backdrop-blur-xl border border-border/50 rounded-3xl shadow-xl shadow-black/5">
            <span className="text-sm font-medium text-muted-foreground hidden sm:inline-block">System overrides update globally in real-time.</span>
            <Button 
              onClick={handleSave} 
              disabled={updatePolicies.isPending}
              size="lg"
              className="rounded-xl px-8 shadow-md hover:shadow-lg transition-all w-full sm:w-auto"
            >
              {updatePolicies.isPending ? 'Syncing Pipeline...' : 'Save Communication Rules'}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
