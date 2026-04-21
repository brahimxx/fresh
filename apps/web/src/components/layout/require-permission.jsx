'use client';

import { useSalon } from '@/providers/salon-provider';
import { canAccessPage } from '@/lib/permissions';
import { ShieldX } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Page-level permission guard.
 * Wraps page content and shows an "Access Denied" card if the user's staffRole
 * (with custom permission overrides) is insufficient for the page.
 *
 * Usage:
 *   <RequirePermission page="reports">
 *     <ReportsContent />
 *   </RequirePermission>
 */
export function RequirePermission({ page, children }) {
  const { staffRole, customPermissions, isLoading } = useSalon();

  // While loading, show nothing (the parent layout already shows skeleton)
  if (isLoading || !staffRole) return null;

  if (!canAccessPage(staffRole, page, customPermissions)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center gap-4 pt-8 pb-8 text-center">
            <div className="rounded-full bg-destructive/10 p-4">
              <ShieldX className="h-8 w-8 text-destructive" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Access Restricted</h2>
              <p className="text-sm text-muted-foreground mt-1">
                You don&apos;t have permission to view this page.
                Contact your salon owner or manager for access.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return children;
}
