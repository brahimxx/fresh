'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Clock } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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

import {
  useSalonSettings,
  useUpdateSalonPolicies,
  DEFAULT_BUSINESS_HOURS,
  formatTime,
} from '@/hooks/use-settings';

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
        <h1 className="text-2xl font-bold">Business Hours</h1>
        <p className="text-muted-foreground">
          Set when your salon is open for bookings
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Weekly Schedule
          </CardTitle>
          <CardDescription>
            Configure your opening hours for each day of the week
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {hours.map(function(day, index) {
              return (
                <div 
                  key={day.day} 
                  className={
                    'flex items-center gap-4 p-4 rounded-lg border ' +
                    (day.enabled ? 'bg-background' : 'bg-muted/50')
                  }
                >
                  {/* Day Toggle */}
                  <div className="flex items-center gap-3 w-32">
                    <Switch
                      checked={day.enabled}
                      onCheckedChange={function() { toggleDay(index); }}
                    />
                    <Label className="font-medium">{day.name}</Label>
                  </div>
                  
                  {/* Time Selects */}
                  {day.enabled ? (
                    <>
                      <div className="flex items-center gap-2">
                        <Select
                          value={day.open}
                          onValueChange={function(value) { updateTime(index, 'open', value); }}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_SLOTS.map(function(time) {
                              return (
                                <SelectItem key={time} value={time}>
                                  {formatTime(time)}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        
                        <span className="text-muted-foreground">to</span>
                        
                        <Select
                          value={day.close}
                          onValueChange={function(value) { updateTime(index, 'close', value); }}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_SLOTS.map(function(time) {
                              return (
                                <SelectItem key={time} value={time}>
                                  {formatTime(time)}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Copy to all */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={function() { copyToAll(index); }}
                        className="ml-auto text-xs"
                      >
                        Copy to all days
                      </Button>
                    </>
                  ) : (
                    <span className="text-muted-foreground text-sm">Closed</span>
                  )}
                </div>
              );
            })}
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
