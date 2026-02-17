'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Shield, Clock, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
  CANCELLATION_POLICIES,
} from '@/hooks/use-settings';

export default function PoliciesPage() {
  var params = useParams();
  var { toast } = useToast();
  
  var { data: salon, isLoading } = useSalonSettings(params.salonId);
  var updatePolicies = useUpdateSalonPolicies();
  
  var [policies, setPolicies] = useState({
    auto_confirm: true,
    cancellation_policy: 'moderate',
    cancellation_window_hours: 24,
    require_deposit: false,
    deposit_type: 'percentage',
    deposit_amount: 20,
    no_show_fee_enabled: false,
    no_show_fee_type: 'percentage',
    no_show_fee_amount: 50,
    booking_buffer_minutes: 0,
    max_advance_booking_days: 60,
  });
  
  // Load saved policies
  useEffect(function() {
    if (salon?.settings) {
      setPolicies(function(prev) {
        return { ...prev, ...salon.settings };
      });
    }
  }, [salon]);
  
  function updatePolicy(key, value) {
    setPolicies(function(prev) {
      return { ...prev, [key]: value };
    });
  }
  
  function handleSave() {
    updatePolicies.mutate({
      salonId: params.salonId,
      data: policies,
    }, {
      onSuccess: function() {
        toast({ title: 'Policies saved' });
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
        <h1 className="text-2xl font-bold">Booking Policies</h1>
        <p className="text-muted-foreground">
          Configure how bookings are handled
        </p>
      </div>
      
      {/* Auto-Confirm */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Booking Confirmation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Auto-confirm bookings</Label>
              <p className="text-sm text-muted-foreground">
                Automatically confirm new bookings without manual approval
              </p>
            </div>
            <Switch
              checked={policies.auto_confirm}
              onCheckedChange={function(checked) { updatePolicy('auto_confirm', checked); }}
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Cancellation Policy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Cancellation Policy
          </CardTitle>
          <CardDescription>
            Set your cancellation terms
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={policies.cancellation_policy}
            onValueChange={function(value) { updatePolicy('cancellation_policy', value); }}
          >
            {CANCELLATION_POLICIES.map(function(policy) {
              return (
                <div key={policy.value} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value={policy.value} id={policy.value} />
                  <Label htmlFor={policy.value} className="cursor-pointer flex-1">
                    <div className="font-medium">{policy.label}</div>
                    <div className="text-sm text-muted-foreground">{policy.description}</div>
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
          
          {policies.cancellation_policy === 'custom' && (
            <div className="flex items-center gap-2 pt-2">
              <Label>Cancel up to</Label>
              <Input
                type="number"
                value={policies.cancellation_window_hours}
                onChange={function(e) { updatePolicy('cancellation_window_hours', parseInt(e.target.value) || 0); }}
                className="w-20"
                min={0}
              />
              <Label>hours before</Label>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Deposit Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Deposits
          </CardTitle>
          <CardDescription>
            Require a deposit when booking
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Require deposit</Label>
              <p className="text-sm text-muted-foreground">
                Clients must pay a deposit to confirm their booking
              </p>
            </div>
            <Switch
              checked={policies.require_deposit}
              onCheckedChange={function(checked) { updatePolicy('require_deposit', checked); }}
            />
          </div>
          
          {policies.require_deposit && (
            <div className="flex items-center gap-4 pt-2 pl-4 border-l-2">
              <div className="flex items-center gap-2">
                <Select
                  value={policies.deposit_type}
                  onValueChange={function(value) { updatePolicy('deposit_type', value); }}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
                
                <Input
                  type="number"
                  value={policies.deposit_amount}
                  onChange={function(e) { updatePolicy('deposit_amount', parseFloat(e.target.value) || 0); }}
                  className="w-24"
                  min={0}
                />
                
                <span className="text-muted-foreground">
                  {policies.deposit_type === 'percentage' ? '%' : '$'}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* No-Show Fee */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            No-Show Fee
          </CardTitle>
          <CardDescription>
            Charge clients who don&apos;t show up
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Enable no-show fee</Label>
              <p className="text-sm text-muted-foreground">
                Charge clients who miss their appointment
              </p>
            </div>
            <Switch
              checked={policies.no_show_fee_enabled}
              onCheckedChange={function(checked) { updatePolicy('no_show_fee_enabled', checked); }}
            />
          </div>
          
          {policies.no_show_fee_enabled && (
            <div className="flex items-center gap-4 pt-2 pl-4 border-l-2">
              <div className="flex items-center gap-2">
                <Select
                  value={policies.no_show_fee_type}
                  onValueChange={function(value) { updatePolicy('no_show_fee_type', value); }}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
                
                <Input
                  type="number"
                  value={policies.no_show_fee_amount}
                  onChange={function(e) { updatePolicy('no_show_fee_amount', parseFloat(e.target.value) || 0); }}
                  className="w-24"
                  min={0}
                />
                
                <span className="text-muted-foreground">
                  {policies.no_show_fee_type === 'percentage' ? '% of service' : '$'}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Booking Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Booking Rules
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Label className="min-w-48">Buffer between bookings</Label>
            <Select
              value={policies.booking_buffer_minutes.toString()}
              onValueChange={function(value) { updatePolicy('booking_buffer_minutes', parseInt(value)); }}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">No buffer</SelectItem>
                <SelectItem value="5">5 minutes</SelectItem>
                <SelectItem value="10">10 minutes</SelectItem>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-4">
            <Label className="min-w-48">Max advance booking</Label>
            <Select
              value={policies.max_advance_booking_days.toString()}
              onValueChange={function(value) { updatePolicy('max_advance_booking_days', parseInt(value)); }}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">1 week</SelectItem>
                <SelectItem value="14">2 weeks</SelectItem>
                <SelectItem value="30">1 month</SelectItem>
                <SelectItem value="60">2 months</SelectItem>
                <SelectItem value="90">3 months</SelectItem>
                <SelectItem value="180">6 months</SelectItem>
                <SelectItem value="365">1 year</SelectItem>
              </SelectContent>
            </Select>
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
