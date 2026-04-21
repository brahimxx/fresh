'use client';

import { useEffect, useState, useRef } from 'react';
import { User, Lock, Mail, Phone, Bell, Shield, KeyRound, AlertTriangle, Key, Smartphone, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

import {
  useUpdateUserAccount,
  useChangePassword,
} from '@/hooks/use-settings';

// Mock user for demo - in production, get from auth context
function useCurrentUser() {
  return {
    data: {
      id: 1,
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      phone: '+1 234 567 8900',
      two_factor_enabled: false,
      email_notifications: true,
      sms_notifications: false,
    },
    isLoading: false,
  };
}

export default function AccountPage() {
  var { toast } = useToast();
  
  var { data: user, isLoading } = useCurrentUser();
  var updateAccount = useUpdateUserAccount();
  var changePassword = useChangePassword();
  
  var initialized = useRef(false);
  
  var [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
  });
  
  var [preferences, setPreferences] = useState({
    email_notifications: true,
    sms_notifications: false,
    two_factor_enabled: false,
  });
  
  var [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  
  var [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  
  useEffect(function() {
    if (user && !initialized.current) {
      initialized.current = true;
      setProfile({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
      });
      setPreferences({
        email_notifications: user.email_notifications ?? true,
        sms_notifications: user.sms_notifications ?? false,
        two_factor_enabled: user.two_factor_enabled ?? false,
      });
    }
  }, [user]);
  
  function handleSaveProfile() {
    updateAccount.mutate({
      data: profile,
    }, {
      onSuccess: function() {
        toast({ title: 'Profile updated' });
      },
      onError: function(error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      },
    });
  }
  
  function handleSavePreferences() {
    updateAccount.mutate({
      data: preferences,
    }, {
      onSuccess: function() {
        toast({ title: 'Preferences saved' });
      },
      onError: function(error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      },
    });
  }
  
  function handleChangePassword() {
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast({ title: 'Error', description: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    
    if (passwordForm.new_password.length < 8) {
      toast({ title: 'Error', description: 'Password must be at least 8 characters', variant: 'destructive' });
      return;
    }
    
    changePassword.mutate({
      currentPassword: passwordForm.current_password,
      newPassword: passwordForm.new_password,
    }, {
      onSuccess: function() {
        toast({ title: 'Password changed successfully' });
        setPasswordDialogOpen(false);
        setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
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
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:-rotate-6">
          <User className="w-48 h-48 sm:w-64 sm:h-64 text-primary" strokeWidth={1} />
        </div>
        
        <div className="relative z-10 flex flex-col gap-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-background/80 backdrop-blur-md border border-primary/20 text-xs font-semibold text-primary w-fit">
            <Shield className="w-3.5 h-3.5" />
            <span>Identity & Access</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Account Global Settings</h1>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-xl">
            Manage your personal data, global platform access, and fundamental level security constraints.
          </p>
        </div>
      </motion.div>
      
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid lg:grid-cols-12 gap-8 items-start"
      >
        <div className="lg:col-span-7 space-y-8">
          
          {/* Profile Information */}
          <motion.div variants={itemVariants} className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 border-b border-border/50 pb-6 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">Identity Details</h2>
                <p className="text-sm text-muted-foreground">Your primary contact information</p>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">First Name</Label>
                  <Input
                    value={profile.first_name}
                    onChange={function(e) {
                      setProfile(function(p) { return { ...p, first_name: e.target.value }; });
                    }}
                    className="h-12 rounded-xl bg-muted/30 border-border/50 focus-visible:ring-primary/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Last Name</Label>
                  <Input
                    value={profile.last_name}
                    onChange={function(e) {
                      setProfile(function(p) { return { ...p, last_name: e.target.value }; });
                    }}
                    className="h-12 rounded-xl bg-muted/30 border-border/50 focus-visible:ring-primary/50"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  Primary Email Address
                </Label>
                <Input
                  type="email"
                  value={profile.email}
                  onChange={function(e) {
                    setProfile(function(p) { return { ...p, email: e.target.value }; });
                  }}
                  className="h-12 rounded-xl bg-muted/30 border-border/50 focus-visible:ring-primary/50"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  Contact Number
                </Label>
                <Input
                  type="tel"
                  value={profile.phone}
                  onChange={function(e) {
                    setProfile(function(p) { return { ...p, phone: e.target.value }; });
                  }}
                  className="h-12 rounded-xl bg-muted/30 border-border/50 focus-visible:ring-primary/50"
                />
              </div>
            </div>
            
            <div className="pt-8">
              <Button onClick={handleSaveProfile} disabled={updateAccount.isPending} size="lg" className="rounded-xl px-8 shadow-md hover:shadow-lg transition-all w-full sm:w-auto">
                {updateAccount.isPending ? 'Syncing Profile...' : 'Save Identity Data'}
              </Button>
            </div>
          </motion.div>

          {/* Danger Zone */}
          <motion.div variants={itemVariants} className="bg-red-500/5 backdrop-blur-xl border border-red-500/20 rounded-3xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 border-b border-red-500/10 pb-6 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-red-600 dark:text-red-500">Irreversible Action</h2>
                <p className="text-sm text-red-600/80 dark:text-red-500/80">Account deletion and data wipe</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-red-500/10 border border-red-500/20">
              <div className="pr-4">
                <Label className="text-base font-bold text-red-800 dark:text-red-400">Permanently Delete Account</Label>
                <p className="text-sm text-red-700/80 dark:text-red-400/80 mt-1 max-w-sm">
                  This action guarantees a complete wipe of your identity, associated businesses, and financial data. Cannot be undone.
                </p>
              </div>
              <Button variant="destructive" size="lg" className="rounded-xl shadow-md whitespace-nowrap shrink-0 w-full sm:w-auto">
                Terminate Account
              </Button>
            </div>
          </motion.div>
        </div>

        <div className="lg:col-span-5 space-y-8">
          
          {/* Security & Authentication */}
          <motion.div variants={itemVariants} className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 border-b border-border/50 pb-6 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
                <KeyRound className="w-6 h-6 text-indigo-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">Security & Auth</h2>
                <p className="text-sm text-muted-foreground">Keep your data hardened</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Password Action */}
              <div className="p-5 rounded-2xl border border-border/50 bg-muted/10 hover:bg-muted/20 transition-colors flex flex-col gap-4">
                <div>
                  <Label className="text-[15px] font-bold text-foreground">Account Password</Label>
                  <p className="text-sm text-muted-foreground mt-0.5">We recommend rotating your keys every 90 days.</p>
                </div>
                
                <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="rounded-xl border-border/50 w-full justify-between hover:bg-background">
                      <span>Change Private Key</span>
                      <Key className="w-4 h-4 ml-2 opacity-50" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px] rounded-3xl">
                    <DialogHeader className="mb-2">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                        <Lock className="w-6 h-6 text-primary" />
                      </div>
                      <DialogTitle className="text-2xl font-bold">Rotate Password</DialogTitle>
                      <DialogDescription>
                        For your security, please verify your existing credentials before rotating keys.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-5 py-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Current Password</Label>
                        <Input
                          type="password"
                          value={passwordForm.current_password}
                          onChange={function(e) {
                            setPasswordForm(function(p) { return { ...p, current_password: e.target.value }; });
                          }}
                          className="h-12 rounded-xl bg-muted/30"
                        />
                      </div>
                      
                      <Separator className="my-2" />
                      
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-primary">New Password</Label>
                        <Input
                          type="password"
                          value={passwordForm.new_password}
                          onChange={function(e) {
                            setPasswordForm(function(p) { return { ...p, new_password: e.target.value }; });
                          }}
                          className="h-12 rounded-xl bg-muted/30 border-primary/20 focus-visible:ring-primary/50"
                        />
                      </div>
                      
                      <div className="space-y-2">
                         <Label className="text-xs font-bold uppercase tracking-wider text-primary">Confirm New Password</Label>
                        <Input
                          type="password"
                          value={passwordForm.confirm_password}
                          onChange={function(e) {
                            setPasswordForm(function(p) { return { ...p, confirm_password: e.target.value }; });
                          }}
                          className="h-12 rounded-xl bg-muted/30 border-primary/20 focus-visible:ring-primary/50"
                        />
                      </div>
                    </div>
                    
                    <DialogFooter className="mt-2 text-right gap-2 sm:gap-0">
                      <Button variant="ghost" className="rounded-xl" onClick={function() { setPasswordDialogOpen(false); }}>
                        Abort
                      </Button>
                      <Button onClick={handleChangePassword} disabled={changePassword.isPending} className="rounded-xl">
                        {changePassword.isPending ? 'Rotating...' : 'Confirm Rotation'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              
              {/* 2FA Mode */}
              <div className="flex items-center justify-between p-5 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 transition-colors">
                <div className="pr-4">
                  <Label className="text-[15px] font-bold text-indigo-600 dark:text-indigo-400">Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground mt-0.5 leading-tight">Demand a cryptographically secure 6-digit code during logon procedures.</p>
                </div>
                <Switch
                  checked={preferences.two_factor_enabled}
                  onCheckedChange={function(checked) {
                    setPreferences(function(p) { return { ...p, two_factor_enabled: checked }; });
                    toast({
                      title: checked ? '2FA Protocol Armed' : '2FA Protocol Disarmed',
                      description: checked ? 'Your account requires strict verification' : 'Strict verification bypassed',
                    });
                  }}
                  className="data-[state=checked]:bg-indigo-500"
                />
              </div>
            </div>
          </motion.div>

          {/* Device level Prefs */}
          <motion.div variants={itemVariants} className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 border-b border-border/50 pb-6 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">Channel Opt-Ins</h2>
                <p className="text-sm text-muted-foreground">Admin notification routing</p>
              </div>
            </div>
            
            <div className="space-y-4">
               <div className="flex items-center justify-between px-2">
                <div className="pr-4">
                  <Label className="text-[15px] font-bold text-foreground">Email Deliveries</Label>
                  <p className="text-sm text-muted-foreground mt-0.5">Receive platform alerts to {profile.email || 'your inbox'}</p>
                </div>
                <Switch
                  checked={preferences.email_notifications}
                  onCheckedChange={function(checked) {
                    setPreferences(function(p) { return { ...p, email_notifications: checked }; });
                  }}
                />
              </div>
              
              <div className="flex items-center justify-between px-2">
                <div className="pr-4">
                  <Label className="text-[15px] font-bold text-foreground">SMS Deliveries</Label>
                  <p className="text-sm text-muted-foreground mt-0.5">Instant alerts directed to your mobile device</p>
                </div>
                <Switch
                  checked={preferences.sms_notifications}
                  onCheckedChange={function(checked) {
                    setPreferences(function(p) { return { ...p, sms_notifications: checked }; });
                  }}
                />
              </div>
            </div>
            
            <div className="pt-6 mt-6 border-t border-border/50 text-right">
              <Button onClick={handleSavePreferences} disabled={updateAccount.isPending} className="rounded-xl w-full sm:w-auto shadow-sm">
                Save Routing Prefs
              </Button>
            </div>
          </motion.div>

        </div>
      </motion.div>
    </div>
  );
}
