'use client';

import { useState, useEffect } from 'react';
import { Loader2, Clock, Copy } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

import { useStaffSchedule, useUpdateStaffSchedule } from '@/hooks/use-staff';

var DAYS = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

var DEFAULT_SCHEDULE = {
  monday: { enabled: true, start: '09:00', end: '18:00' },
  tuesday: { enabled: true, start: '09:00', end: '18:00' },
  wednesday: { enabled: true, start: '09:00', end: '18:00' },
  thursday: { enabled: true, start: '09:00', end: '18:00' },
  friday: { enabled: true, start: '09:00', end: '18:00' },
  saturday: { enabled: true, start: '09:00', end: '17:00' },
  sunday: { enabled: false, start: null, end: null },
};

export function StaffScheduleDialog({ 
  open, 
  onOpenChange, 
  staff, 
  salonId 
}) {
  var [schedule, setSchedule] = useState(DEFAULT_SCHEDULE);
  var { data: savedSchedule, isLoading } = useStaffSchedule(staff?.id);
  var updateSchedule = useUpdateStaffSchedule();
  
  // Load saved schedule when available
  useEffect(function() {
    if (savedSchedule && savedSchedule.length > 0) {
      var newSchedule = { ...DEFAULT_SCHEDULE };
      savedSchedule.forEach(function(day) {
        if (newSchedule[day.day_of_week]) {
          newSchedule[day.day_of_week] = {
            enabled: day.is_working,
            start: day.start_time ? day.start_time.slice(0, 5) : null,
            end: day.end_time ? day.end_time.slice(0, 5) : null,
          };
        }
      });
      setSchedule(newSchedule);
    } else if (open && !savedSchedule) {
      setSchedule(DEFAULT_SCHEDULE);
    }
  }, [savedSchedule, open]);
  
  function toggleDay(day) {
    setSchedule(function(prev) {
      var updated = { ...prev };
      updated[day] = {
        ...updated[day],
        enabled: !updated[day].enabled,
      };
      return updated;
    });
  }
  
  function updateTime(day, field, value) {
    setSchedule(function(prev) {
      var updated = { ...prev };
      updated[day] = {
        ...updated[day],
        [field]: value,
      };
      return updated;
    });
  }
  
  function copyToAll(sourceDay) {
    var source = schedule[sourceDay];
    setSchedule(function(prev) {
      var updated = {};
      DAYS.forEach(function(d) {
        updated[d.key] = { ...source };
      });
      return updated;
    });
  }
  
  function handleSave() {
    if (!staff) return;
    
    var scheduleData = DAYS.map(function(day) {
      var s = schedule[day.key];
      return {
        day_of_week: day.key,
        is_working: s.enabled,
        start_time: s.enabled && s.start ? s.start + ':00' : null,
        end_time: s.enabled && s.end ? s.end + ':00' : null,
      };
    });
    
    updateSchedule.mutate(
      { staffId: staff.id, schedule: scheduleData },
      {
        onSuccess: function() {
          onOpenChange(false);
        },
      }
    );
  }
  
  if (!staff) return null;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Set Working Hours
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Define when {staff.name} is available to take appointments
          </p>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Quick Actions */}
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Quick copy:</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={function() { copyToAll('monday'); }}
              >
                Copy Monday to all
              </Button>
            </div>

            {/* Schedule Grid */}
            <div className="space-y-2">
              {DAYS.map(function(day) {
                var daySchedule = schedule[day.key];
                return (
                  <div 
                    key={day.key} 
                    className={
                      'border rounded-lg p-4 transition-colors ' +
                      (daySchedule.enabled ? 'bg-card border-border' : 'bg-muted/30 border-muted')
                    }
                  >
                    <div className="flex items-start gap-4">
                      {/* Day Toggle */}
                      <div className="flex items-center gap-3 w-32">
                        <Switch
                          checked={daySchedule.enabled}
                          onCheckedChange={function() { toggleDay(day.key); }}
                        />
                        <Label className={
                          'font-medium cursor-pointer ' + 
                          (!daySchedule.enabled ? 'text-muted-foreground' : '')
                        }>
                          {day.label}
                        </Label>
                      </div>
                      
                      {/* Time Inputs */}
                      {daySchedule.enabled ? (
                        <div className="flex-1 grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Start Time</Label>
                            <Input
                              type="time"
                              value={daySchedule.start || ''}
                              onChange={function(e) { updateTime(day.key, 'start', e.target.value); }}
                              className="h-9"
                            />
                          </div>
                          
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">End Time</Label>
                            <Input
                              type="time"
                              value={daySchedule.end || ''}
                              onChange={function(e) { updateTime(day.key, 'end', e.target.value); }}
                              className="h-9"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 flex items-center">
                          <span className="text-sm text-muted-foreground">Not working this day</span>
                        </div>
                      )}
                      
                      {/* Copy Button */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={function() { copyToAll(day.key); }}
                        title={'Copy ' + day.label + ' to all days'}
                        disabled={!daySchedule.enabled}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {/* Time Summary */}
                    {daySchedule.enabled && daySchedule.start && daySchedule.end && (
                      <div className="mt-2 pl-44 text-xs text-muted-foreground">
                        Available from {daySchedule.start} to {daySchedule.end}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Quick Actions */}
            <div className="flex items-center gap-2 pt-4 border-t">
              <span className="text-sm text-muted-foreground">Quick set:</span>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={function() {
                  setSchedule({
                    monday: { enabled: true, start: '09:00', end: '18:00', break_start: '12:00', break_end: '13:00' },
                    tuesday: { enabled: true, start: '09:00', end: '18:00', break_start: '12:00', break_end: '13:00' },
                    wednesday: { enabled: true, start: '09:00', end: '18:00', break_start: '12:00', break_end: '13:00' },
                    thursday: { enabled: true, start: '09:00', end: '18:00', break_start: '12:00', break_end: '13:00' },
                    friday: { enabled: true, start: '09:00', end: '18:00', break_start: '12:00', break_end: '13:00' },
                    saturday: { enabled: false, start: null, end: null, break_start: null, break_end: null },
                    sunday: { enabled: false, start: null, end: null, break_start: null, break_end: null },
                  });
                }}
              >
                Mon-Fri 9-18
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={function() {
                  setSchedule({
                    monday: { enabled: true, start: '10:00', end: '19:00', break_start: null, break_end: null },
                    tuesday: { enabled: true, start: '10:00', end: '19:00', break_start: null, break_end: null },
                    wednesday: { enabled: true, start: '10:00', end: '19:00', break_start: null, break_end: null },
                    thursday: { enabled: true, start: '10:00', end: '19:00', break_start: null, break_end: null },
                    friday: { enabled: true, start: '10:00', end: '19:00', break_start: null, break_end: null },
                    saturday: { enabled: true, start: '10:00', end: '17:00', break_start: null, break_end: null },
                    sunday: { enabled: false, start: null, end: null, break_start: null, break_end: null },
                  });
                }}
              >
                Mon-Sat 10-19
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={function() {
                  var allOff = {};
                  DAYS.forEach(function(d) {
                    allOff[d.key] = { enabled: false, start: null, end: null, break_start: null, break_end: null };
                  });
                  setSchedule(allOff);
                }}
              >
                Clear All
              </Button>
            </div>
          </div>
        )}
        
        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={function() { onOpenChange(false); }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={updateSchedule.isPending}
          >
            {updateSchedule.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
