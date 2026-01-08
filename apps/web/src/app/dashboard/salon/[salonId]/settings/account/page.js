'use client';

import { useEffect, useState } from 'react';
import { User, Lock, Mail, Phone, Bell, Shield } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
    if (user) {
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
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-96 bg-muted rounded" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Account Settings</h1>
        <p className="text-muted-foreground">
          Manage your personal account
        </p>
      </div>
      
      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
          <CardDescription>
            Your personal details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>First Name</Label>
              <Input
                value={profile.first_name}
                onChange={function(e) {
                  setProfile(function(p) { return { ...p, first_name: e.target.value }; });
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Last Name</Label>
              <Input
                value={profile.last_name}
                onChange={function(e) {
                  setProfile(function(p) { return { ...p, last_name: e.target.value }; });
                }}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Address
            </Label>
            <Input
              type="email"
              value={profile.email}
              onChange={function(e) {
                setProfile(function(p) { return { ...p, email: e.target.value }; });
              }}
            />
          </div>
          
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Phone Number
            </Label>
            <Input
              type="tel"
              value={profile.phone}
              onChange={function(e) {
                setProfile(function(p) { return { ...p, phone: e.target.value }; });
              }}
            />
          </div>
          
          <div className="flex justify-end">
            <Button onClick={handleSaveProfile} disabled={updateAccount.isPending}>
              {updateAccount.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Password
          </CardTitle>
          <CardDescription>
            Keep your account secure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Change Password</p>
              <p className="text-sm text-muted-foreground">
                Update your password regularly for security
              </p>
            </div>
            
            <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">Change Password</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Change Password</DialogTitle>
                  <DialogDescription>
                    Enter your current password and a new password
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Current Password</Label>
                    <Input
                      type="password"
                      value={passwordForm.current_password}
                      onChange={function(e) {
                        setPasswordForm(function(p) { return { ...p, current_password: e.target.value }; });
                      }}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>New Password</Label>
                    <Input
                      type="password"
                      value={passwordForm.new_password}
                      onChange={function(e) {
                        setPasswordForm(function(p) { return { ...p, new_password: e.target.value }; });
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Must be at least 8 characters
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Confirm New Password</Label>
                    <Input
                      type="password"
                      value={passwordForm.confirm_password}
                      onChange={function(e) {
                        setPasswordForm(function(p) { return { ...p, confirm_password: e.target.value }; });
                      }}
                    />
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={function() { setPasswordDialogOpen(false); }}>
                    Cancel
                  </Button>
                  <Button onClick={handleChangePassword} disabled={changePassword.isPending}>
                    {changePassword.isPending ? 'Changing...' : 'Change Password'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
      
      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            How you want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive updates via email
              </p>
            </div>
            <Switch
              checked={preferences.email_notifications}
              onCheckedChange={function(checked) {
                setPreferences(function(p) { return { ...p, email_notifications: checked }; });
              }}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">SMS Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive updates via text message
              </p>
            </div>
            <Switch
              checked={preferences.sms_notifications}
              onCheckedChange={function(checked) {
                setPreferences(function(p) { return { ...p, sms_notifications: checked }; });
              }}
            />
          </div>
          
          <Separator />
          
          <div className="flex justify-end">
            <Button onClick={handleSavePreferences} disabled={updateAccount.isPending}>
              Save Preferences
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security
          </CardTitle>
          <CardDescription>
            Additional security options
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Two-Factor Authentication</Label>
              <p className="text-sm text-muted-foreground">
                Add an extra layer of security to your account
              </p>
            </div>
            <Switch
              checked={preferences.two_factor_enabled}
              onCheckedChange={function(checked) {
                setPreferences(function(p) { return { ...p, two_factor_enabled: checked }; });
                // In production, this would open a setup flow
                toast({
                  title: checked ? 'Two-factor authentication enabled' : 'Two-factor authentication disabled',
                  description: checked ? 'Your account is now more secure' : 'Two-factor is no longer required',
                });
              }}
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Delete Account</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all data
              </p>
            </div>
            <Button variant="destructive" size="sm">
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
