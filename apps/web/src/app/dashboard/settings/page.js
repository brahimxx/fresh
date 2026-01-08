'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api-client';
import { Loader2, Building2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DashboardSettingsPage() {
  const router = useRouter();
  const { user } = useAuth();

  // Fetch user's salons to redirect to the first one's settings
  const { data: salons, isLoading } = useQuery({
    queryKey: ['user-salons', user?.id],
    queryFn: () => api.get('/salons'),
    enabled: !!user?.id,
    select: (response) => response.data?.salons || [],
  });

  useEffect(() => {
    if (!isLoading && salons && salons.length > 0) {
      // Redirect to first salon's general settings
      router.replace(`/dashboard/salon/${salons[0].id}/settings/general`);
    }
  }, [salons, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If no salons, prompt to create one
  if (!salons || salons.length === 0) {
    return (
      <div className="flex flex-col h-screen">
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Create Your Salon First</CardTitle>
              <CardDescription>
                You need to create a salon before you can configure settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button onClick={() => router.push('/dashboard/locations/new')}>
                <Plus className="mr-2 h-4 w-4" />
                Create Salon
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
