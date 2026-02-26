'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api-client';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Settings, ArrowLeft, Save, Globe, ShieldAlert, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

export default function AdminSettingsPage() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [formData, setFormData] = useState(null);

    const { isLoading } = useQuery({
        queryKey: ['admin-settings'],
        queryFn: async () => {
            const res = await api.get('/admin/settings');
            const data = res?.data?.settings || {};
            setFormData(data);
            return data;
        },
        enabled: !formData, // only fetch once initially
    });

    const updateSettingsMutation = useMutation({
        mutationFn: (newSettings) => api.put('/admin/settings', newSettings),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
            toast({
                title: 'Settings saved',
                description: 'Global platform settings have been updated.',
            });
        },
        onError: (err) => {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: err.message || 'Failed to save settings',
            });
        },
    });

    const handleChange = (key, value) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = () => {
        // Convert string booleans back to actual strings if needed, 
        // Backend handles type conversions, but we want consistent payload
        updateSettingsMutation.mutate(formData);
    };

    if (isLoading || !formData) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-md" />
                    <div>
                        <Skeleton className="h-8 w-48 mb-2" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                    <Skeleton className="h-[300px] rounded-xl" />
                    <Skeleton className="h-[300px] rounded-xl" />
                </div>
            </div>
        );
    }

    const parseBoolean = (val) => val === 'true' || val === true;

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/dashboard/admin">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <Settings className="h-6 w-6 text-primary" />
                            Platform Settings
                        </h1>
                        <p className="text-muted-foreground">
                            Manage global constants and rules
                        </p>
                    </div>
                </div>
                <Button
                    onClick={handleSave}
                    disabled={updateSettingsMutation.isPending}
                    className="gap-2"
                >
                    <Save className="h-4 w-4" />
                    Save Changes
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Financial Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-muted-foreground" />
                            Financial & Booking
                        </CardTitle>
                        <CardDescription>
                            Configure fees and booking constraints
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="platformFeePercent">Platform Fee Percentage (%)</Label>
                            <Input
                                id="platformFeePercent"
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                value={formData.platformFeePercent || ''}
                                onChange={(e) => handleChange('platformFeePercent', e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">The cut taken from each booking (e.g., 2.5)</p>
                        </div>

                        <Separator />

                        <div className="space-y-2">
                            <Label htmlFor="defaultCurrency">Default Currency</Label>
                            <Input
                                id="defaultCurrency"
                                value={formData.defaultCurrency || ''}
                                onChange={(e) => handleChange('defaultCurrency', e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">e.g., USD, EUR, GBP</p>
                        </div>

                        <Separator />

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="minBookingAdvanceHours">Min Advance (Hours)</Label>
                                <Input
                                    id="minBookingAdvanceHours"
                                    type="number"
                                    min="0"
                                    value={formData.minBookingAdvanceHours || ''}
                                    onChange={(e) => handleChange('minBookingAdvanceHours', e.target.value)}
                                />
                                <p className="text-[10px] text-muted-foreground">Minimum notice before booking</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="maxBookingAdvanceDays">Max Advance (Days)</Label>
                                <Input
                                    id="maxBookingAdvanceDays"
                                    type="number"
                                    min="1"
                                    value={formData.maxBookingAdvanceDays || ''}
                                    onChange={(e) => handleChange('maxBookingAdvanceDays', e.target.value)}
                                />
                                <p className="text-[10px] text-muted-foreground">How far in advance clients can book</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* System Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <ShieldAlert className="h-5 w-5 text-muted-foreground" />
                            System Controls
                        </CardTitle>
                        <CardDescription>
                            Critical platform toggles and modes
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Maintenance Mode</Label>
                                <p className="text-xs text-muted-foreground">Blocks all non-admin logins when active</p>
                            </div>
                            <Switch
                                checked={parseBoolean(formData.maintenanceMode)}
                                onCheckedChange={(v) => handleChange('maintenanceMode', v.toString())}
                            />
                        </div>

                        <Separator />

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Allow New Registrations</Label>
                                <p className="text-xs text-muted-foreground">Let new users sign up on the platform</p>
                            </div>
                            <Switch
                                checked={parseBoolean(formData.allowNewRegistrations)}
                                onCheckedChange={(v) => handleChange('allowNewRegistrations', v.toString())}
                            />
                        </div>

                        <Separator />

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Require Email Verification</Label>
                                <p className="text-xs text-muted-foreground">Block actions until email is verified</p>
                            </div>
                            <Switch
                                checked={parseBoolean(formData.requireEmailVerification)}
                                onCheckedChange={(v) => handleChange('requireEmailVerification', v.toString())}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Legal & Support Links */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Globe className="h-5 w-5 text-muted-foreground" />
                            Public Links & Support
                        </CardTitle>
                        <CardDescription>
                            URLs and contact information shown to users
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-6 md:grid-cols-3">
                        <div className="space-y-2">
                            <Label htmlFor="supportEmail">Support Email</Label>
                            <Input
                                id="supportEmail"
                                type="email"
                                value={formData.supportEmail || ''}
                                onChange={(e) => handleChange('supportEmail', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="termsUrl">Terms of Service URL</Label>
                            <Input
                                id="termsUrl"
                                type="url"
                                placeholder="https://"
                                value={formData.termsUrl || ''}
                                onChange={(e) => handleChange('termsUrl', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="privacyUrl">Privacy Policy URL</Label>
                            <Input
                                id="privacyUrl"
                                type="url"
                                placeholder="https://"
                                value={formData.privacyUrl || ''}
                                onChange={(e) => handleChange('privacyUrl', e.target.value)}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
