'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api-client';

const SalonContext = createContext(null);

export function SalonProvider({ children }) {
  const params = useParams();
  const salonId = params?.salonId;

  const { data: salon, isLoading, error } = useQuery({
    queryKey: ['salon', salonId],
    queryFn: () => api.get(`/salons/${salonId}`),
    enabled: !!salonId,
    select: (response) => response.data,
  });

  const value = {
    salon,
    salonId,
    isLoading,
    error,
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
