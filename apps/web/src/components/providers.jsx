'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ToastProvider } from '@/hooks/use-toast';
import { ConfirmProvider } from '@/components/ui/confirm-dialog';
import { ErrorBoundary } from '@/components/ui/error-boundary';

export function AppProviders({ children }) {
  var [queryClient] = useState(function() {
    return new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60 * 1000, // 1 minute
          retry: 1,
          refetchOnWindowFocus: false,
        },
        mutations: {
          retry: 0,
        },
      },
    });
  });

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <ConfirmProvider>
            {children}
          </ConfirmProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
