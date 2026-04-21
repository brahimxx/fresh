'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Clock, CalendarOff, Plus, Trash2, AlertTriangle, Info, ArrowRight, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

import {
  useSalonSettings,
  useUpdateSalonPolicies,
  DEFAULT_BUSINESS_HOURS,
  formatTime,
} from '@/hooks/use-settings';
import { useSalonClosures, useCreateClosure, useDeleteClosure } from '@/hooks/use-salon-closures';

// Generate time slots
function generateTimeSlots() {
  var slots = [];
  for (var h = 0; h < 24; h++) {
    for (var m = 0; m < 60; m += 30) {
      var hour = h.toString().padStart(2, '0');
      var minute = m.toString().padStart(2, '0');
      slots.push(hour + ':' + minute);
    }
  }
  return slots;
}

var TIME_SLOTS = generateTimeSlots();

export default function BusinessHoursPage() {
  var params = useParams();
  var { toast } = useToast();
  
  var { data: salon, isLoading } = useSalonSettings(params.salonId);
  var updatePolicies = useUpdateSalonPolicies();
  
  var [hours, setHours] = useState(DEFAULT_BUSINESS_HOURS);

  // Closures state
  var { data: closures } = useSalonClosures(params.salonId);
  var createClosure = useCreateClosure();
  var deleteClosure = useDeleteClosure();
  var [closureDate, setClosureDate] = useState('');
  var [closureReason, setClosureReason] = useState('');
  
  // Load saved hours
  useEffect(function() {
    if (salon?.business_hours) {
      setHours(salon.business_hours);
    }
  }, [salon]);
  
  function toggleDay(dayIndex) {
    setHours(function(prev) {
      return prev.map(function(day, i) {
        if (i === dayIndex) {
          return { ...day, enabled: !day.enabled };
        }
        return day;
      });
    });
  }
  
  function updateTime(dayIndex, field, value) {
    setHours(function(prev) {
      return prev.map(function(day, i) {
        if (i === dayIndex) {
          return { ...day, [field]: value };
        }
        return day;
      });
    });
  }
  
  function copyToAll(sourceDayIndex) {
    var sourceDay = hours[sourceDayIndex];
    setHours(function(prev) {
      return prev.map(function(day) {
        return {
          ...day,
          enabled: sourceDay.enabled,
          open: sourceDay.open,
          close: sourceDay.close,
        };
      });
    });
    toast({ title: 'Hours copied to all days' });
  }
  
  function handleSave() {
    updatePolicies.mutate({
      salonId: params.salonId,
      data: { business_hours: hours },
    }, {
      onSuccess: function() {
        toast({ title: 'Business hours saved' });
      },
      onError: function(error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      },
    });
  }

  function handleAddClosure() {
    if (!closureDate) return;
    createClosure.mutate({
      salonId: params.salonId,
      date: closureDate,
      reason: closureReason.trim() || null,
    }, {
      onSuccess: function() {
        setClosureDate('');
        setClosureReason('');
        toast({ title: 'Closure added', description: 'Bookings are now blocked for this date.' });
      },
      onError: function(err) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      },
    });
  }

  function handleDeleteClosure(closureId) {
    deleteClosure.mutate({ salonId: params.salonId, closureId }, {
      onSuccess: function() {
        toast({ title: 'Closure removed' });
      },
    });
  }
  
  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-48 w-full bg-muted/60 rounded-3xl" />
        <div className="space-y-6">
           <div className="h-96 bg-muted/40 rounded-3xl" />
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
    <div className="">
      {/* Decorative Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-8 sm:p-10 mb-8 group"
      >
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:rotate-6">
          <Clock className="w-48 h-48 sm:w-64 sm:h-64 text-primary" strokeWidth={1} />
        </div>
        
        <div className="relative z-10 flex flex-col gap-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-background/80 backdrop-blur-md border border-primary/20 text-xs font-semibold text-primary w-fit">
            <Info className="w-3.5 h-3.5" />
            <span>Scheduling Engine</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Business Hours</h1>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-xl">
            Set your salon&apos;s standard operating hours and manage special closures. Your availability is instantly updated across the platform.
          </p>
        </div>
      </motion.div>
      
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-8"
      >
        {/* Weekly Schedule */}
        <motion.div variants={itemVariants} className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-3 border-b border-border/50 pb-6 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Clock className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Weekly Schedule</h2>
              <p className="text-sm text-muted-foreground">Configure your standard opening hours for each day of the week</p>
            </div>
          </div>
          
          <div className="space-y-4">
            {hours.map(function(day, index) {
              return (
                <div 
                  key={day.day} 
                  className={cn(
                    "flex flex-col sm:flex-row sm:items-center gap-4 p-4 sm:p-5 rounded-2xl transition-all border",
                    day.enabled 
                      ? "bg-background border-border shadow-sm" 
                      : "bg-muted/30 border-dashed border-border/50 opacity-70 hover:opacity-100"
                  )}
                >
                  {/* Day Toggle */}
                  <div className="flex items-center gap-4 w-40 shrink-0">
                    <Switch
                      checked={day.enabled}
                      onCheckedChange={function() { toggleDay(index); }}
                      className="data-[state=checked]:bg-primary"
                    />
                    <Label className={cn("text-base font-bold", day.enabled ? "text-foreground" : "text-muted-foreground")}>
                      {day.name}
                    </Label>
                  </div>
                  
                  {/* Time Controls */}
                  <div className="flex-1">
                    <AnimatePresence mode="popLayout">
                      {day.enabled ? (
                        <motion.div 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="flex flex-col sm:flex-row sm:items-center gap-4"
                        >
                          <div className="flex items-center gap-3">
                            <Select
                              value={day.open}
                              onValueChange={function(value) { updateTime(index, 'open', value); }}
                            >
                              <SelectTrigger className="w-28 h-10 rounded-xl bg-muted/30 border-border/50 focus:ring-primary/50 text-[15px] font-medium">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
                                {TIME_SLOTS.map(function(time) {
                                  return (
                                    <SelectItem key={time} value={time} className="py-2.5">
                                      {formatTime(time)}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                            
                            <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                            
                            <Select
                              value={day.close}
                              onValueChange={function(value) { updateTime(index, 'close', value); }}
                            >
                              <SelectTrigger className="w-28 h-10 rounded-xl bg-muted/30 border-border/50 focus:ring-primary/50 text-[15px] font-medium">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
                                {TIME_SLOTS.map(function(time) {
                                  return (
                                    <SelectItem key={time} value={time} className="py-2.5">
                                      {formatTime(time)}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {/* Copy to all */}
                          <div className="sm:ml-auto">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={function() { copyToAll(index); }}
                              className="text-xs font-semibold rounded-lg text-primary hover:text-primary hover:bg-primary/10 transition-colors gap-2"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Copy to all</span>
                              <span className="sm:hidden">Apply to all days</span>
                            </Button>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.span 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="text-muted-foreground text-sm font-semibold flex items-center h-10"
                        >
                          Closed
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 pt-6 border-t border-border/50 flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground hidden sm:block">
              Updates to your schedule will apply globally.
            </span>
            <Button 
              onClick={handleSave} 
              disabled={updatePolicies.isPending}
              size="lg"
              className="rounded-xl px-8 shadow-md hover:shadow-lg transition-all w-full sm:w-auto"
            >
              {updatePolicies.isPending ? 'Saving Schedule...' : 'Publish Schedule'}
            </Button>
          </div>
        </motion.div>

        {/* Special Closures */}
        <motion.div variants={itemVariants} className="bg-background/60 backdrop-blur-xl border border-destructive/20 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-3 border-b border-destructive/20 pb-6 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <CalendarOff className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-destructive">Special Closures</h2>
              <p className="text-sm text-destructive/80">Override your weekly schedule to block specific dates (e.g. Holidays, Renovations)</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-12 gap-8">
             <div className="lg:col-span-5 space-y-4">
                <div className="p-5 rounded-2xl bg-destructive/5 border border-destructive/10 space-y-4">
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Select Date</Label>
                    <Input
                      type="date"
                      className="h-12 rounded-xl bg-background border-destructive/20 focus-visible:ring-destructive/50"
                      value={closureDate}
                      onChange={function(e) { setClosureDate(e.target.value); }}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Internal Reason <span className="text-muted-foreground font-normal opacity-70">(optional)</span></Label>
                    <Input
                      placeholder="e.g. Public holiday, Renovation"
                      className="h-12 rounded-xl bg-background border-destructive/20 focus-visible:ring-destructive/50"
                      value={closureReason}
                      onChange={function(e) { setClosureReason(e.target.value); }}
                    />
                  </div>
                  <Button
                    onClick={handleAddClosure}
                    disabled={!closureDate || createClosure.isPending}
                    variant="destructive"
                    className="w-full gap-2 rounded-xl h-11"
                  >
                    <Plus className="h-4 w-4" />
                    Block Date
                  </Button>
                </div>
             </div>

             <div className="lg:col-span-7">
               <Label className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4 block">Upcoming Blocked Dates</Label>
               
               {closures && closures.length > 0 ? (
                <div className="space-y-3">
                  <AnimatePresence>
                    {closures.map(function(c) {
                      var d = new Date(c.date + 'T00:00:00');
                      var label = d.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
                      return (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          key={c.id} 
                          className="flex items-center justify-between p-4 rounded-2xl border border-border/50 bg-background/50 hover:bg-background shadow-sm transition-colors group"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0 mt-0.5">
                              <CalendarOff className="w-4 h-4 text-destructive" />
                            </div>
                            <div>
                              <p className="font-bold text-[15px]">{label}</p>
                              <p className="text-xs text-muted-foreground/80 font-medium">{c.reason || 'No specific reason provided'}</p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 text-destructive/70 rounded-xl hover:text-destructive hover:bg-destructive/10 transition-colors"
                            onClick={function() { handleDeleteClosure(c.id); }}
                            disabled={deleteClosure.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border-2 border-dashed border-border text-muted-foreground bg-muted/10 h-[220px]">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <CalendarOff className="h-5 w-5 opacity-50" />
                  </div>
                  <p className="text-sm font-medium">No special closures scheduled.</p>
                </div>
              )}
             </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
