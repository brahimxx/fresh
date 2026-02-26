'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Megaphone, Tag, AlertCircle, PlusCircle } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';

export default function MarketingPage() {
    const [discounts, setDiscounts] = useState([]);
    const [loading, setLoading] = useState(true);

    // Broadcast Form State
    const [broadcastTitle, setBroadcastTitle] = useState('');
    const [broadcastMessage, setBroadcastMessage] = useState('');
    const [isSystemBanner, setIsSystemBanner] = useState(true);
    const [sendingBroadcast, setSendingBroadcast] = useState(false);

    // Discount Form State
    const [promoCode, setPromoCode] = useState('');
    const [promoType, setPromoType] = useState('percentage');
    const [promoValue, setPromoValue] = useState('');
    const [creatingPromo, setCreatingPromo] = useState(false);

    useEffect(() => {
        fetchDiscounts();
    }, []);

    const fetchDiscounts = async () => {
        try {
            const res = await apiClient.get('/admin/global-discounts');
            setDiscounts(res.data);
        } catch (error) {
            console.error('Failed to load discounts', error);
            toast.error('Failed to load global discounts');
        } finally {
            setLoading(false);
        }
    };

    const handleSendBroadcast = async (e) => {
        e.preventDefault();
        setSendingBroadcast(true);
        try {
            await apiClient.post('/admin/broadcasts', {
                title: broadcastTitle,
                message: broadcastMessage,
                isSystemBanner: isSystemBanner,
                type: 'push'
            });
            toast.success('Broadcast sent successfully!');
            setBroadcastTitle('');
            setBroadcastMessage('');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to send broadcast');
        } finally {
            setSendingBroadcast(false);
        }
    };

    const handleCreatePromo = async (e) => {
        e.preventDefault();
        setCreatingPromo(true);
        try {
            await apiClient.post('/admin/global-discounts', {
                code: promoCode,
                type: promoType,
                value: parseFloat(promoValue),
            });
            toast.success('Global promo created!');
            setPromoCode('');
            setPromoValue('');
            fetchDiscounts();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create promo');
        } finally {
            setCreatingPromo(false);
        }
    };

    const toggleDiscountStatus = async (id, currentStatus) => {
        try {
            await apiClient.patch(`/admin/global-discounts/${id}`, {
                isActive: !currentStatus
            });
            toast.success('Discount status updated');
            fetchDiscounts();
        } catch (err) {
            toast.error('Failed to update status');
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Marketing & Communications</h1>
                <p className="text-muted-foreground mt-2">Manage global promotions and broadcast announcements.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Admin Broadcast System */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Megaphone className="w-5 h-5 text-primary" />
                            Admin Broadcast System
                        </CardTitle>
                        <CardDescription>Send announcements to all salon owners and staff</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSendBroadcast} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Broadcast Title</label>
                                <Input
                                    placeholder="e.g. Scheduled Maintenance"
                                    value={broadcastTitle}
                                    onChange={(e) => setBroadcastTitle(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Message Body</label>
                                <textarea
                                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px]"
                                    placeholder="Enter your message here..."
                                    value={broadcastMessage}
                                    onChange={(e) => setBroadcastMessage(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="flex items-center justify-between rounded-lg border p-3">
                                <div className="space-y-0.5">
                                    <label className="text-sm font-medium">Pin as System Banner</label>
                                    <p className="text-xs text-muted-foreground">Forces the message to appear at the top of salon dashboards until dismissed.</p>
                                </div>
                                <Switch checked={isSystemBanner} onCheckedChange={setIsSystemBanner} />
                            </div>
                            <Button type="submit" disabled={sendingBroadcast} className="w-full">
                                {sendingBroadcast ? 'Sending...' : 'Send Broadcast'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Create Global Promo */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Tag className="w-5 h-5 text-green-500" />
                            Platform-Funded Promos
                        </CardTitle>
                        <CardDescription>Create codes that discount checkout totals while leaving salon payouts intact.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Alert className="mb-4 bg-muted/50">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription className="text-xs">
                                Global promos immediately decrease your platform fee payout rather than draining the salon's revenue account.
                            </AlertDescription>
                        </Alert>
                        <form onSubmit={handleCreatePromo} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 col-span-2">
                                    <label className="text-sm font-medium">Promo Code</label>
                                    <Input
                                        placeholder="e.g. FRESH2026"
                                        className="uppercase"
                                        value={promoCode}
                                        onChange={(e) => setPromoCode(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Type</label>
                                    <Select value={promoType} onValueChange={setPromoType}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="percentage">Percentage (%)</SelectItem>
                                            <SelectItem value="fixed">Fixed Amount (€)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Value</label>
                                    <Input
                                        type="number"
                                        min="1"
                                        step="0.01"
                                        placeholder="e.g. 20"
                                        value={promoValue}
                                        onChange={(e) => setPromoValue(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <Button type="submit" disabled={creatingPromo} className="w-full gap-2" variant="outline">
                                <PlusCircle className="w-4 h-4" />
                                {creatingPromo ? 'Creating...' : 'Create Promo Code'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>

            {/* Active Promos List */}
            <Card>
                <CardHeader>
                    <CardTitle>Active Promos</CardTitle>
                    <CardDescription>Manage and monitor global discount usages.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p className="text-sm text-muted-foreground text-center py-6">Loading discounts...</p>
                    ) : discounts.length === 0 ? (
                        <div className="text-center py-8">
                            <Tag className="mx-auto h-8 w-8 text-muted-foreground/50 mb-3" />
                            <p className="text-muted-foreground text-sm">No global promos have been created yet.</p>
                        </div>
                    ) : (
                        <div className="border rounded-md overflow-hidden">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead>Code</TableHead>
                                        <TableHead>Value</TableHead>
                                        <TableHead>Uses</TableHead>
                                        <TableHead className="text-right">Active</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {discounts.map((discount) => (
                                        <TableRow key={discount.id}>
                                            <TableCell className="font-mono font-medium">{discount.code}</TableCell>
                                            <TableCell>
                                                {discount.type === 'percentage' ? `${discount.value}%` : `€${discount.value}`}
                                            </TableCell>
                                            <TableCell>{discount.current_uses} / {discount.max_uses || '∞'}</TableCell>
                                            <TableCell className="text-right">
                                                <Switch
                                                    checked={Boolean(discount.is_active)}
                                                    onCheckedChange={() => toggleDiscountStatus(discount.id, Boolean(discount.is_active))}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
