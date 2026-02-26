'use client';

import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { AlertTriangle, LogOut } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function ImpersonationBanner() {
    const { user, impersonatorAdminId, checkAuth } = useAuth();
    const router = useRouter();

    if (!impersonatorAdminId) {
        return null;
    }

    const handleStopImpersonating = async () => {
        try {
            await apiClient.post('/admin/impersonate/stop');
            toast.success('Restored to Admin Session');
            // Force a hard auth refresh so the context picks up the admin roles again
            await checkAuth();
            // Redirect back to admin dashboard
            router.push('/dashboard/admin');
            router.refresh();
        } catch (error) {
            console.error('Failed to stop impersonating', error);
            toast.error('Failed to restore session. Please log out and back in.');
        }
    };

    return (
        <div className="relative z-[100] bg-orange-600 text-white font-medium py-2 px-4 shadow-lg border-b border-orange-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-white animate-pulse" />
                <span>
                    <strong>SECURITY WARNING:</strong> You are currently impersonating
                    <span className="font-bold underline ml-1">{user?.email || 'this user'}</span>.
                    All actions taken will be logged under your Admin ID.
                </span>
            </div>

            <Button
                variant="outline"
                size="sm"
                onClick={handleStopImpersonating}
                className="bg-white text-orange-600 hover:bg-orange-50 border-orange-200"
            >
                <LogOut className="h-4 w-4 mr-2" />
                Stop Impersonating
            </Button>
        </div>
    );
}
