'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Shield, Clock, DollarSign, AlertTriangle, CheckCircle, Info, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
import { cn } from '@/lib/utils';

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
    deduct_discounts_before_commission: false,
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
      <div className="space-y-8 animate-pulse">
        <div className="h-48 w-full bg-muted/60 rounded-3xl" />
        <div className="space-y-6">
           <div className="h-40 bg-muted/40 rounded-3xl" />
           <div className="h-40 bg-muted/40 rounded-3xl" />
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
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:-rotate-6">
          <Shield className="w-48 h-48 sm:w-64 sm:h-64 text-primary" strokeWidth={1} />
        </div>
        
        <div className="relative z-10 flex flex-col gap-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-background/80 backdrop-blur-md border border-primary/20 text-xs font-semibold text-primary w-fit">
            <Info className="w-3.5 h-3.5" />
            <span>Rules & Terms</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Booking Policies</h1>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-xl">
            Configure how your business handles confirmations, cancellations, deposits, and scheduling rules securely.
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
          <div className="space-y-8">
            {/* Auto-Confirm */}
            <motion.div variants={itemVariants} className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 sm:p-8 shadow-sm">
              <div className="flex items-center gap-3 border-b border-border/50 pb-6 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Booking Approval</h2>
                  <p className="text-sm text-muted-foreground">Automatic or manual review</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-5 rounded-2xl border border-border/50 bg-muted/20 hover:bg-muted/30 transition-colors">
                <div className="pr-4">
                  <Label className="text-base font-bold text-foreground">Auto-Confirm Bookings</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Automatically accept new appointments without requiring manual approval and notify clients immediately.
                  </p>
                </div>
                <Switch
                  checked={policies.auto_confirm}
                  onCheckedChange={function(checked) { updatePolicy('auto_confirm', checked); }}
                  className="data-[state=checked]:bg-primary shrink-0"
                />
              </div>
            </motion.div>

            {/* Deposit Settings */}
            <motion.div variants={itemVariants} className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 sm:p-8 shadow-sm">
              <div className="flex items-center gap-3 border-b border-border/50 pb-6 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Security Deposits</h2>
                  <p className="text-sm text-muted-foreground">Upfront payment collection</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-5 rounded-2xl border border-border/50 bg-muted/20 hover:bg-muted/30 transition-colors">
                <div className="pr-4">
                  <Label className="text-base font-bold text-foreground">Require Deposit</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Clients must pay a portion of the service cost to secure their appointment block.
                  </p>
                </div>
                <Switch
                  checked={policies.require_deposit}
                  onCheckedChange={function(checked) { updatePolicy('require_deposit', checked); }}
                  className="data-[state=checked]:bg-primary shrink-0"
                />
              </div>
              
              <AnimatePresence>
                {policies.require_deposit && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 24 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-5 rounded-2xl border border-primary/20 bg-primary/5 flex flex-col sm:flex-row gap-4 items-start sm:items-center relative">
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-primary rounded-r-md" />
                      <div className="flex-1 space-y-1.5 w-full">
                        <Label className="text-xs font-bold text-primary uppercase tracking-wider">Deposit Rule</Label>
                        <Select
                          value={policies.deposit_type}
                          onValueChange={function(value) { updatePolicy('deposit_type', value); }}
                        >
                          <SelectTrigger className="w-full h-12 rounded-xl bg-background border-primary/20 focus:ring-primary/50 text-base">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="percentage">Percentage based</SelectItem>
                            <SelectItem value="fixed">Fixed Flat Amount</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex-1 space-y-1.5 w-full">
                        <Label className="text-xs font-bold text-primary uppercase tracking-wider">Amount</Label>
                        <div className="relative">
                          <Input
                            type="number"
                            value={policies.deposit_amount}
                            onChange={function(e) { updatePolicy('deposit_amount', parseFloat(e.target.value) || 0); }}
                            className="h-12 rounded-xl bg-background border-primary/20 focus-visible:ring-primary/50 text-base font-semibold pl-10"
                            min={0}
                          />
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-bold">
                            {policies.deposit_type === 'percentage' ? '%' : '$'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* No-Show Fee */}
            <motion.div variants={itemVariants} className="bg-background/60 backdrop-blur-xl border border-destructive/20 rounded-3xl p-6 sm:p-8 shadow-sm">
              <div className="flex items-center gap-3 border-b border-destructive/20 pb-6 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-destructive">No-Show Protection</h2>
                  <p className="text-sm text-destructive/80">Penalize missed appointments</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-5 rounded-2xl border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 transition-colors">
                <div className="pr-4">
                  <Label className="text-base font-bold text-foreground">Enable Penalty Fee</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Automatically charge a penalty to the client&apos;s card on file if they fail to show up.
                  </p>
                </div>
                <Switch
                  checked={policies.no_show_fee_enabled}
                  onCheckedChange={function(checked) { updatePolicy('no_show_fee_enabled', checked); }}
                  className="data-[state=checked]:bg-destructive shrink-0"
                />
              </div>
              
              <AnimatePresence>
                {policies.no_show_fee_enabled && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 24 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-5 rounded-2xl border border-destructive/20 bg-destructive/5 flex flex-col sm:flex-row gap-4 items-start sm:items-center relative">
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-destructive rounded-r-md" />
                      <div className="flex-1 space-y-1.5 w-full">
                        <Label className="text-xs font-bold text-destructive uppercase tracking-wider">Penalty Type</Label>
                        <Select
                          value={policies.no_show_fee_type}
                          onValueChange={function(value) { updatePolicy('no_show_fee_type', value); }}
                        >
                          <SelectTrigger className="w-full h-12 rounded-xl bg-background border-destructive/20 focus:ring-destructive/50 text-base">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="percentage">Percentage based</SelectItem>
                            <SelectItem value="fixed">Fixed Flat Amount</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex-1 space-y-1.5 w-full">
                        <Label className="text-xs font-bold text-destructive uppercase tracking-wider">Amount</Label>
                        <div className="relative">
                          <Input
                            type="number"
                            value={policies.no_show_fee_amount}
                            onChange={function(e) { updatePolicy('no_show_fee_amount', parseFloat(e.target.value) || 0); }}
                            className="h-12 rounded-xl bg-background border-destructive/20 focus-visible:ring-destructive/50 text-base font-semibold pl-10"
                            min={0}
                          />
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-destructive font-bold">
                            {policies.no_show_fee_type === 'percentage' ? '%' : '$'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          <div className="space-y-8">
            {/* Cancellation Policy */}
            <motion.div variants={itemVariants} className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 sm:p-8 shadow-sm">
              <div className="flex items-center gap-3 border-b border-border/50 pb-6 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Cancellation Rules</h2>
                  <p className="text-sm text-muted-foreground">Set boundaries for rescheduling</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <RadioGroup
                  value={policies.cancellation_policy}
                  onValueChange={function(value) { updatePolicy('cancellation_policy', value); }}
                  className="space-y-3"
                >
                  {CANCELLATION_POLICIES.map(function(policy) {
                    const isSelected = policies.cancellation_policy === policy.value;
                    return (
                      <div 
                        key={policy.value} 
                        className={cn(
                          "flex items-start gap-3 p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group",
                          isSelected 
                            ? "bg-primary/5 border-primary/30 ring-1 ring-primary/20 shadow-sm" 
                            : "bg-muted/10 border-border/50 hover:bg-muted/30"
                        )}
                        onClick={() => updatePolicy('cancellation_policy', policy.value)}
                      >
                        <RadioGroupItem value={policy.value} id={policy.value} className="mt-1 bg-background" />
                        <div className="flex-1">
                          <Label htmlFor={policy.value} className="cursor-pointer">
                            <div className="font-bold text-base text-foreground mb-1">{policy.label}</div>
                            <div className="text-sm text-muted-foreground leading-relaxed">{policy.description}</div>
                          </Label>
                        </div>
                        {isSelected && (
                          <div className="absolute right-0 top-0 bottom-0 w-1 bg-primary rounded-l-full" />
                        )}
                      </div>
                    );
                  })}
                </RadioGroup>
                
                <AnimatePresence>
                  {policies.cancellation_policy === 'custom' && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-5 rounded-2xl border border-primary/20 bg-primary/5 flex items-center gap-4">
                        <Label className="text-sm font-bold whitespace-nowrap">Free cancel up to</Label>
                        <div className="relative w-28">
                          <Input
                            type="number"
                            value={policies.cancellation_window_hours}
                            onChange={function(e) { updatePolicy('cancellation_window_hours', parseInt(e.target.value) || 0); }}
                            className="h-12 rounded-xl bg-background border-primary/20 focus-visible:ring-primary/50 font-bold text-center pr-10"
                            min={0}
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                            HRS
                          </span>
                        </div>
                        <Label className="text-sm font-bold whitespace-nowrap">before start</Label>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Booking Rules */}
            <motion.div variants={itemVariants} className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 sm:p-8 shadow-sm">
              <div className="flex items-center gap-3 border-b border-border/50 pb-6 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Calendar Rules</h2>
                  <p className="text-sm text-muted-foreground">Turnover buffers and lead times</p>
                </div>
              </div>
              
              <div className="space-y-5">
                <div className="space-y-3">
                  <Label className="text-sm font-bold text-foreground">Turnover Buffer Gap</Label>
                  <p className="text-sm text-muted-foreground">Automatically block out clean-up time between consecutive appointments.</p>
                  <Select
                    value={policies.booking_buffer_minutes.toString()}
                    onValueChange={function(value) { updatePolicy('booking_buffer_minutes', parseInt(value)); }}
                  >
                    <SelectTrigger className="w-full h-12 rounded-xl bg-muted/30 border-border/50 focus:ring-primary/50 text-base">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="0" className="font-medium">No buffer required</SelectItem>
                      <SelectItem value="5" className="font-medium">5 minutes</SelectItem>
                      <SelectItem value="10" className="font-medium">10 minutes</SelectItem>
                      <SelectItem value="15" className="font-medium">15 minutes</SelectItem>
                      <SelectItem value="30" className="font-medium">30 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="h-px bg-border/50 w-full" />
                
                <div className="space-y-3">
                  <Label className="text-sm font-bold text-foreground">Maximum Booking Lead Time</Label>
                  <p className="text-sm text-muted-foreground">How far in advance clients can secure a spot on your calendar.</p>
                  <Select
                    value={policies.max_advance_booking_days.toString()}
                    onValueChange={function(value) { updatePolicy('max_advance_booking_days', parseInt(value)); }}
                  >
                    <SelectTrigger className="w-full h-12 rounded-xl bg-muted/30 border-border/50 focus:ring-primary/50 text-base">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="7" className="font-medium">Up to 1 week</SelectItem>
                      <SelectItem value="14" className="font-medium">Up to 2 weeks</SelectItem>
                      <SelectItem value="30" className="font-medium">Up to 1 month</SelectItem>
                      <SelectItem value="60" className="font-medium">Up to 2 months</SelectItem>
                      <SelectItem value="90" className="font-medium">Up to 3 months</SelectItem>
                      <SelectItem value="180" className="font-medium">Up to 6 months</SelectItem>
                      <SelectItem value="365" className="font-medium">Up to 1 year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </motion.div>

            {/* Payroll Policies */}
            <motion.div variants={itemVariants} className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 sm:p-8 shadow-sm">
              <div className="flex items-center gap-3 border-b border-border/50 pb-6 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Payroll & Commissions</h2>
                  <p className="text-sm text-muted-foreground">Internal rules for staff payouts</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-5 rounded-2xl border border-border/50 bg-muted/20 hover:bg-muted/30 transition-colors">
                <div className="pr-4">
                  <Label className="text-base font-bold text-foreground">Deduct Promo Discounts from Commissions</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    If enabled, the cost of promotional discounts (e.g. $20 off) will be deducted from the service revenue before staff commission is calculated, so staff share the cost of the promo. If disabled, the salon absorbs the full cost of the promo.
                  </p>
                </div>
                <Switch
                  checked={policies.deduct_discounts_before_commission}
                  onCheckedChange={function(checked) { updatePolicy('deduct_discounts_before_commission', checked); }}
                  className="data-[state=checked]:bg-primary shrink-0"
                />
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
            <span className="text-sm font-medium text-muted-foreground hidden sm:inline-block">Save your policy changes.</span>
            <Button 
              onClick={handleSave} 
              disabled={updatePolicies.isPending}
              size="lg"
              className="rounded-xl px-8 shadow-md hover:shadow-lg transition-all w-full sm:w-auto"
            >
              {updatePolicies.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
