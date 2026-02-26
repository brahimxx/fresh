'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';

export default function AdminLayout({ children }) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && user?.role !== 'admin') {
            router.replace('/dashboard');
        }
    }, [loading, user, router]);

    if (loading || user?.role !== 'admin') {
        return null;
    }

    return <>{children}</>;
}
