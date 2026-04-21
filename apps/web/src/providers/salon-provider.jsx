'use client';

import { createContext, useContext, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/providers/auth-provider';
import api from '@/lib/api-client';

export const SalonContext = createContext(null);

export function SalonProvider({ children }) {
  const params = useParams();
  const salonId = params?.salonId;
  const { user } = useAuth();

  const { data: salon, isLoading, error } = useQuery({
    queryKey: ['salon', salonId],
    queryFn: () => api.get(`/salons/${salonId}`),
    enabled: !!salonId,
    select: (response) => response.data,
  });

  // Derive the current user's salon-specific staff role and custom permissions.
  const { staffRole, staffId, customPermissions } = useMemo(() => {
    if (!user || !salon) return { staffRole: null, staffId: null, customPermissions: null };

    // Admin fast-return: admins always get owner-level access
    if (user.role === 'admin') return { staffRole: 'owner', staffId: null, customPermissions: null };

    // Check if user is the salon owner
    if (salon.ownerId === user.id) return { staffRole: 'owner', staffId: null, customPermissions: null };

    // Otherwise, find the user's staff record in this salon
    const staffRecord = (salon.staff || []).find(
      (s) => s.userId === user.id && s.isActive
    );

    if (staffRecord) {
      return {
        staffRole: staffRecord.role,
        staffId: staffRecord.id,
        customPermissions: staffRecord.permissions || null,
      };
    }

    // Fallback: if they somehow have dashboard access but no staff record
    return { staffRole: 'staff', staffId: null, customPermissions: null };
  }, [user, salon]);

  const value = {
    salon,
    salonId,
    isLoading,
    error,
    staffRole,           // 'owner' | 'manager' | 'receptionist' | 'staff'
    staffId,             // The staff table id for this user at this salon
    customPermissions,   // Custom permission overrides JSON (or null)
  };

  return (
    <SalonContext.Provider value={value}>
      {children}
    </SalonContext.Provider>
  );
}

export function useSalon() {
  const context = useContext(SalonContext);
  if (!context) {
    throw new Error('useSalon must be used within a SalonProvider');
  }
  return context;
}
