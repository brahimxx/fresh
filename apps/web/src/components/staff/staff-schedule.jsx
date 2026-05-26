'use client';

import { useState, useEffect } from 'react';
import { Loader2, Clock, Copy } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

import { useStaffSchedule, useUpdateStaffSchedule } from '@/hooks/use-staff';

const DAYS = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

const DEFAULT_SCHEDULE = {
  monday: { enabled: true, start: '09:00', end: '18:00' },
  tuesday: { enabled: true, start: '09:00', end: '18:00' },
  wednesday: { enabled: true, start: '09:00', end: '18:00' },
  thursday: { enabled: true, start: '09:00', end: '18:00' },
  friday: { enabled: true, start: '09:00', end: '18:00' },
  saturday: { enabled: true, start: '09:00', end: '17:00' },
  sunday: { enabled: false, start: null, end: null },
};

export function StaffScheduleDialog({ open, onOpenChange, staff, salonId }) {
  const [schedule, setSchedule] = useState(DEFAULT_SCHEDULE);
  const { data: savedSchedule, isLoading } = useStaffSchedule(staff?.id);
  const updateSchedule = useUpdateStaffSchedule();

  useEffect(() => {
    if (savedSchedule) {
      const newSchedule = {};
      DAYS.forEach((day) => {
        newSchedule[day.key] = { enabled: false, start: null, end: null };
      });

      let hasAnySchedule = false;
      savedSchedule.forEach((day) => {
        if (newSchedule[day.day_of_week]) {
          hasAnySchedule = true;
          newSchedule[day.day_of_week] = {
            enabled: day.is_working,
            start: day.start_time ? day.start_time.slice(0, 5) : null,
            end: day.end_time ? day.end_time.slice(0, 5) : null,
          };
        }
      });

      if (hasAnySchedule) {
        setSchedule(newSchedule);
      } else {
        setSchedule(DEFAULT_SCHEDULE);
      }
    }
  }, [savedSchedule, open]);

  function toggleDay(day) {
    setSchedule((prev) => ({
      ...prev,
      [day]: { ...prev[day], enabled: !prev[day].enabled },
    }));
  }

  function updateTime(day, field, value) {
    setSchedule((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  }

  function copyToAll(sourceDay) {
    const source = schedule[sourceDay];
    setSchedule(() => {
      const updated = {};
      DAYS.forEach((d) => { updated[d.key] = { ...source }; });
      return updated;
    });
  }

  function handleSave() {
    if (!staff) return;

    const scheduleData = DAYS.map((day) => {
      const s = schedule[day.key];
      return {
        day_of_week: day.key,
        is_working: s.enabled,
        start_time: s.enabled && s.start ? s.start + ':00' : null,
        end_time: s.enabled && s.end ? s.end + ':00' : null,
      };
    });

    updateSchedule.mutate(
      { staffId: staff.id, schedule: scheduleData },
      { onSuccess: () => onOpenChange(false) }
    );
  }

  if (!staff) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/50">
            <SheetTitle className="text-xl font-bold">Working Hours</SheetTitle>
            <SheetDescription>
              Set when {staff.name} is available for appointments.
            </SheetDescription>
          </SheetHeader>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/30 rounded-xl border border-border/50">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground">Presets:</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-lg text-xs h-7"
                    onClick={() => {
                      setSchedule({
                        monday: { enabled: true, start: '09:00', end: '18:00' },
                        tuesday: { enabled: true, start: '09:00', end: '18:00' },
                        wednesday: { enabled: true, start: '09:00', end: '18:00' },
                        thursday: { enabled: true, start: '09:00', end: '18:00' },
                        friday: { enabled: true, start: '09:00', end: '18:00' },
                        saturday: { enabled: false, start: null, end: null },
                        sunday: { enabled: false, start: null, end: null },
                      });
                    }}
                  >
                    Mon–Fri 9–18
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-lg text-xs h-7"
                    onClick={() => {
                      setSchedule({
                        monday: { enabled: true, start: '10:00', end: '19:00' },
                        tuesday: { enabled: true, start: '10:00', end: '19:00' },
                        wednesday: { enabled: true, start: '10:00', end: '19:00' },
                        thursday: { enabled: true, start: '10:00', end: '19:00' },
                        friday: { enabled: true, start: '10:00', end: '19:00' },
                        saturday: { enabled: true, start: '10:00', end: '17:00' },
                        sunday: { enabled: false, start: null, end: null },
                      });
                    }}
                  >
                    Mon–Sat 10–19
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-lg text-xs h-7"
                    onClick={() => {
                      const allOff = {};
                      DAYS.forEach((d) => { allOff[d.key] = { enabled: false, start: null, end: null }; });
                      setSchedule(allOff);
                    }}
                  >
                    Clear All
                  </Button>
                </div>

                {/* Schedule Grid */}
                <div className="space-y-2">
                  {DAYS.map((day) => {
                    const daySchedule = schedule[day.key];
                    return (
                      <div
                        key={day.key}
                        className={
                          'rounded-xl border p-4 transition-colors ' +
                          (daySchedule.enabled ? 'bg-background border-border/50' : 'bg-muted/20 border-border/30')
                        }
                      >
                        <div className="flex items-center gap-4">
                          {/* Day Toggle */}
                          <div className="flex items-center gap-3 w-28 shrink-0">
                            <Switch
                              checked={daySchedule.enabled}
                              onCheckedChange={() => toggleDay(day.key)}
                            />
                            <Label className={
                              'font-semibold text-sm cursor-pointer ' +
                              (!daySchedule.enabled ? 'text-muted-foreground' : '')
                            }>
                              {day.label.slice(0, 3)}
                            </Label>
                          </div>

                          {/* Time Inputs */}
                          {daySchedule.enabled ? (
                            <div className="flex-1 flex items-center gap-3">
                              <Input
                                type="time"
                                value={daySchedule.start || ''}
                                onChange={(e) => updateTime(day.key, 'start', e.target.value)}
                                className="h-9 w-28"
                              />
                              <span className="text-xs text-muted-foreground font-medium">to</span>
                              <Input
                                type="time"
                                value={daySchedule.end || ''}
                                onChange={(e) => updateTime(day.key, 'end', e.target.value)}
                                className="h-9 w-28"
                              />
                            </div>
                          ) : (
                            <div className="flex-1">
                              <span className="text-sm text-muted-foreground/60 italic">Day off</span>
                            </div>
                          )}

                          {/* Copy Button */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 rounded-lg"
                            onClick={() => copyToAll(day.key)}
                            title={'Copy ' + day.label + ' to all days'}
                            disabled={!daySchedule.enabled}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border/50 px-6 py-4 flex items-center justify-end gap-3 bg-muted/5">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => onOpenChange(false)}
              disabled={updateSchedule.isPending}
            >
              Cancel
            </Button>
            <Button
              className="rounded-xl min-w-[120px]"
              onClick={handleSave}
              disabled={updateSchedule.isPending}
            >
              {updateSchedule.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Schedule"
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
