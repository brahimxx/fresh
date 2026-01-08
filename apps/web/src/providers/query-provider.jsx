'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { ConfirmProvider } from '@/components/ui/confirm-dialog';
import { CommandPalette } from '@/components/command-palette';
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard';
import { SkipToContent } from '@/components/ui/accessibility';

export function QueryProvider({ children }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
            retry: 1,
          },
          mutations: {
            retry: 0,
          },
        },
      })
  );

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ConfirmProvider>
          <SkipToContent />
          <CommandPalette />
          <OnboardingWizard />
          {children}
        </ConfirmProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
